from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date
from app.database import get_db
from app.models import Order, OrderItem, MenuItem, Table, OrderStatus, TableStatus
from app.schemas import OrderCreate, OrderUpdate, OrderOut, OrderItemOut, AddItemsRequest, UpdateItemQtyRequest
from app.auth import get_current_user
from app.websocket import manager

router = APIRouter(prefix="/orders", tags=["Orders"])

# Active order statuses (string values for SQLite compatibility)
ACTIVE_STATUSES = [
    OrderStatus.pending.value,
    OrderStatus.preparing.value,
    OrderStatus.ready.value,
    OrderStatus.served.value,
]


def _build_order_out(order: Order) -> OrderOut:
    items = []
    for oi in order.order_items:
        item_out = OrderItemOut(
            id=oi.id,
            menu_item_id=oi.menu_item_id,
            menu_item_name=oi.menu_item.name if oi.menu_item else None,
            menu_item_image=oi.menu_item.image_url if oi.menu_item else None,
            is_veg=oi.menu_item.is_veg if oi.menu_item else True,
            quantity=oi.quantity,
            unit_price=oi.unit_price,
            notes=oi.notes,
            subtotal=oi.quantity * oi.unit_price,
        )
        items.append(item_out)

    subtotal = sum(i.quantity * i.unit_price for i in order.order_items)
    return OrderOut(
        id=order.id,
        table_id=order.table_id,
        table_number=order.table.number if order.table else None,
        table_name=order.table.name if order.table else None,
        status=order.status,
        customer_name=order.customer_name,
        notes=order.notes,
        items=items,
        subtotal=subtotal,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


# ─── Public: Customer Places Order ────────────────────────────────────────────

@router.post("", response_model=OrderOut)
async def create_order(data: OrderCreate, db: Session = Depends(get_db)):
    """Place a new order by QR table token or table ID (for admin/staff)."""
    table = None
    if data.table_token:
        table = db.query(Table).filter(Table.qr_token == data.table_token, Table.is_active == True).first()
    elif data.table_id:
        table = db.query(Table).filter(Table.id == data.table_id, Table.is_active == True).first()

    if not table:
        raise HTTPException(status_code=404, detail="Invalid table token or table ID")

    # Check if table already has an active order
    existing = db.query(Order).filter(
        Order.table_id == table.id,
        Order.status.in_(ACTIVE_STATUSES)
    ).first()

    if existing:
        # Add items to existing order instead of creating new
        for item_data in data.items:
            menu_item = db.query(MenuItem).filter(
                MenuItem.id == item_data.menu_item_id,
                MenuItem.is_available == True
            ).first()
            if not menu_item:
                raise HTTPException(status_code=404, detail=f"Menu item {item_data.menu_item_id} not found")

            existing_oi = next(
                (oi for oi in existing.order_items if oi.menu_item_id == item_data.menu_item_id), None
            )
            if existing_oi:
                existing_oi.quantity += item_data.quantity
            else:
                oi = OrderItem(
                    order_id=existing.id,
                    menu_item_id=item_data.menu_item_id,
                    quantity=item_data.quantity,
                    unit_price=menu_item.price,
                    notes=item_data.notes,
                )
                db.add(oi)

        db.commit()
        db.refresh(existing)
        order_out = _build_order_out(existing)
        await manager.broadcast_order_update(order_out.model_dump(mode="json"))
        return order_out

    # Create new order
    order = Order(
        table_id=table.id,
        customer_name=data.customer_name,
        notes=data.notes,
        status=OrderStatus.pending.value,
    )
    db.add(order)
    db.flush()

    for item_data in data.items:
        menu_item = db.query(MenuItem).filter(
            MenuItem.id == item_data.menu_item_id,
            MenuItem.is_available == True
        ).first()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item_data.menu_item_id} not found")
        oi = OrderItem(
            order_id=order.id,
            menu_item_id=item_data.menu_item_id,
            quantity=item_data.quantity,
            unit_price=menu_item.price,
            notes=item_data.notes,
        )
        db.add(oi)

    # Mark table as occupied
    table.status = TableStatus.occupied.value
    db.commit()
    db.refresh(order)

    order_out = _build_order_out(order)
    await manager.broadcast_new_order(order_out.model_dump(mode="json"))
    return order_out


# ─── Customer: Track Order Status ─────────────────────────────────────────────

@router.get("/track/{order_id}", response_model=OrderOut)
def track_order(order_id: int, db: Session = Depends(get_db)):
    """Public: customer tracks their order by ID."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _build_order_out(order)


@router.get("/by-table/{table_token}", response_model=Optional[OrderOut])
def get_order_by_table(table_token: str, db: Session = Depends(get_db)):
    """Public: get active order for a table by QR token."""
    table = db.query(Table).filter(Table.qr_token == table_token).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    order = db.query(Order).filter(
        Order.table_id == table.id,
        Order.status.in_(ACTIVE_STATUSES)
    ).first()
    if not order:
        return None
    return _build_order_out(order)


# ─── Admin: List & Manage Orders ──────────────────────────────────────────────

@router.get("", response_model=List[OrderOut])
def list_orders(
    status: Optional[str] = None,
    date_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    query = db.query(Order)
    if status:
        statuses = [s.strip() for s in status.split(",")]
        query = query.filter(Order.status.in_(statuses))
    if date_filter:
        try:
            filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            query = query.filter(func.date(Order.created_at) == filter_date)
        except ValueError:
            pass
    orders = query.order_by(Order.created_at.desc()).all()
    return [_build_order_out(o) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _build_order_out(order)


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_order_status(order_id: int, data: OrderUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if data.status:
        order.status = data.status.value if hasattr(data.status, 'value') else data.status
        # Free table when paid/cancelled
        if data.status in [OrderStatus.paid, OrderStatus.cancelled]:
            order.table.status = TableStatus.free.value
    if data.notes is not None:
        order.notes = data.notes
    db.commit()
    db.refresh(order)
    order_out = _build_order_out(order)
    await manager.broadcast_order_update(order_out.model_dump(mode="json"))
    return order_out


@router.post("/{order_id}/items", response_model=OrderOut)
async def add_items_to_order(order_id: int, data: AddItemsRequest, db: Session = Depends(get_db), _=Depends(get_current_user)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    for item_data in data.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item_data.menu_item_id).first()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item_data.menu_item_id} not found")
        existing_oi = next(
            (oi for oi in order.order_items if oi.menu_item_id == item_data.menu_item_id), None
        )
        if existing_oi:
            existing_oi.quantity += item_data.quantity
        else:
            oi = OrderItem(
                order_id=order.id,
                menu_item_id=item_data.menu_item_id,
                quantity=item_data.quantity,
                unit_price=menu_item.price,
                notes=item_data.notes,
            )
            db.add(oi)

    db.commit()
    db.refresh(order)
    order_out = _build_order_out(order)
    await manager.broadcast_order_update(order_out.model_dump(mode="json"))
    return order_out


@router.put("/{order_id}/items/{item_id}", response_model=OrderOut)
async def update_order_item_qty(
    order_id: int, item_id: int, data: UpdateItemQtyRequest,
    db: Session = Depends(get_db), _=Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    oi = db.query(OrderItem).filter(OrderItem.id == item_id, OrderItem.order_id == order_id).first()
    if not oi:
        raise HTTPException(status_code=404, detail="Order item not found")
    if data.quantity <= 0:
        db.delete(oi)
    else:
        oi.quantity = data.quantity
    db.commit()
    db.refresh(order)
    order_out = _build_order_out(order)
    await manager.broadcast_order_update(order_out.model_dump(mode="json"))
    return order_out


@router.delete("/{order_id}/items/{item_id}", response_model=OrderOut)
async def remove_order_item(order_id: int, item_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    oi = db.query(OrderItem).filter(OrderItem.id == item_id, OrderItem.order_id == order_id).first()
    if not oi:
        raise HTTPException(status_code=404, detail="Order item not found")
    db.delete(oi)
    db.commit()
    order = db.query(Order).filter(Order.id == order_id).first()
    db.refresh(order)
    order_out = _build_order_out(order)
    await manager.broadcast_order_update(order_out.model_dump(mode="json"))
    return order_out
