import uuid
import qrcode
import io
import os
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Table, Order, OrderStatus, TableStatus
from app.schemas import TableCreate, TableUpdate, TableOut
from app.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/tables", tags=["Tables"])


def _build_table_out(table: Table, db: Session) -> TableOut:
    out = TableOut.model_validate(table)
    # Check for active order
    active_order = db.query(Order).filter(
        Order.table_id == table.id,
        Order.status.in_([
            OrderStatus.pending.value,
            OrderStatus.preparing.value,
            OrderStatus.ready.value,
            OrderStatus.served.value,
        ])
    ).first()
    out.active_order_id = active_order.id if active_order else None
    return out


@router.get("", response_model=List[TableOut])
def list_tables(db: Session = Depends(get_db), _=Depends(get_current_user)):
    tables = db.query(Table).filter(Table.is_active == True).order_by(Table.number).all()
    return [_build_table_out(t, db) for t in tables]


@router.get("/public", response_model=List[TableOut])
def list_tables_public(db: Session = Depends(get_db)):
    """Public endpoint for customer app to validate table token."""
    tables = db.query(Table).filter(Table.is_active == True).order_by(Table.number).all()
    return [_build_table_out(t, db) for t in tables]


@router.get("/{table_id}", response_model=TableOut)
def get_table(table_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return _build_table_out(table, db)


@router.get("/by-token/{token}", response_model=TableOut)
def get_table_by_token(token: str, db: Session = Depends(get_db)):
    """Public: Customer app uses this to validate QR token."""
    table = db.query(Table).filter(Table.qr_token == token, Table.is_active == True).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found or inactive")
    return _build_table_out(table, db)


@router.post("", response_model=TableOut)
def create_table(data: TableCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    existing = db.query(Table).filter(Table.number == data.number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Table #{data.number} already exists")
    token = str(uuid.uuid4()).replace("-", "")[:16]
    table = Table(
        number=data.number,
        name=data.name,
        capacity=data.capacity,
        qr_token=token,
    )
    db.add(table)
    db.commit()
    db.refresh(table)
    return _build_table_out(table, db)


@router.put("/{table_id}", response_model=TableOut)
def update_table(table_id: int, data: TableUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    for field, value in data.model_dump(exclude_none=True).items():
        # Convert enum values to strings for SQLite
        if hasattr(value, 'value'):
            value = value.value
        setattr(table, field, value)
    db.commit()
    db.refresh(table)
    return _build_table_out(table, db)


@router.delete("/{table_id}")
def delete_table(table_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    table.is_active = False
    db.commit()
    return {"message": "Table deleted"}


@router.post("/{table_id}/regenerate-qr", response_model=TableOut)
def regenerate_qr(table_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    table.qr_token = str(uuid.uuid4()).replace("-", "")[:16]
    db.commit()
    db.refresh(table)
    return _build_table_out(table, db)


@router.get("/{table_id}/qr-image")
def get_qr_image(table_id: int, request: Request, db: Session = Depends(get_db)):
    """Returns QR code as PNG image."""
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    # Determine customer app URL dynamically
    from app.models import RestaurantSettings
    db_settings = db.query(RestaurantSettings).first()
    if db_settings and db_settings.system_base_url:
        customer_url = db_settings.system_base_url.rstrip("/")
    else:
        base_url = str(request.base_url).rstrip("/")
        if settings.CUSTOMER_APP_URL and "localhost" not in settings.CUSTOMER_APP_URL and "127.0.0.1" not in settings.CUSTOMER_APP_URL:
            customer_url = settings.CUSTOMER_APP_URL
        else:
            customer_url = base_url

    url = f"{customer_url}/menu?table={table.qr_token}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.read(), media_type="image/png")
