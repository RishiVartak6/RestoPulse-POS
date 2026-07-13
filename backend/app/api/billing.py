from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models import Order, OrderItem, Bill, OrderStatus, TableStatus, RestaurantSettings
from app.schemas import BillCreate, BillOut, OrderItemOut
from app.auth import get_current_user
from app.websocket import manager

router = APIRouter(prefix="/billing", tags=["Billing"])


def _build_bill_out(bill: Bill) -> BillOut:
    order = bill.order
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

    return BillOut(
        id=bill.id,
        order_id=bill.order_id,
        table_number=order.table.number if order.table else None,
        table_name=order.table.name if order.table else None,
        items=items,
        subtotal=bill.subtotal,
        discount_amount=bill.discount_amount,
        discount_percentage=bill.discount_percentage,
        tax_percentage=bill.tax_percentage,
        tax_amount=bill.tax_amount,
        total=bill.total,
        payment_method=bill.payment_method,
        paid_at=bill.paid_at,
        created_at=bill.created_at,
    )


@router.post("/generate", response_model=BillOut)
async def generate_bill(data: BillCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Generate (or update) a bill for an order."""
    order = db.query(Order).filter(Order.id == data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    subtotal = sum(oi.quantity * oi.unit_price for oi in order.order_items)

    # Handle discount
    if data.discount_percentage and data.discount_percentage > 0:
        discount_amount = subtotal * (data.discount_percentage / 100)
    else:
        discount_amount = data.discount_amount or 0.0
        data.discount_percentage = 0.0

    settings = db.query(RestaurantSettings).first()
    tax_pct = settings.gst_percentage if settings else 5.0

    taxable = subtotal - discount_amount
    tax_amount = taxable * (tax_pct / 100)
    total = taxable + tax_amount

    # Check if bill already exists
    existing_bill = db.query(Bill).filter(Bill.order_id == data.order_id).first()
    if existing_bill:
        existing_bill.subtotal = subtotal
        existing_bill.discount_amount = discount_amount
        existing_bill.discount_percentage = data.discount_percentage
        existing_bill.tax_percentage = tax_pct
        existing_bill.tax_amount = tax_amount
        existing_bill.total = total
        existing_bill.payment_method = data.payment_method
        db.commit()
        db.refresh(existing_bill)
        return _build_bill_out(existing_bill)

    bill = Bill(
        order_id=data.order_id,
        subtotal=subtotal,
        discount_amount=discount_amount,
        discount_percentage=data.discount_percentage,
        tax_percentage=tax_pct,
        tax_amount=tax_amount,
        total=total,
        payment_method=data.payment_method,
    )
    db.add(bill)
    db.commit()
    db.refresh(bill)

    # Notify customer their bill is ready
    await manager.broadcast_to_order(order.id, {
        "type": "bill_ready",
        "data": {"order_id": order.id, "total": total}
    })

    return _build_bill_out(bill)


@router.post("/{bill_id}/pay", response_model=BillOut)
async def mark_paid(bill_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Mark bill as paid and close the order."""
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    bill.paid_at = datetime.utcnow()
    bill.order.status = OrderStatus.paid.value
    bill.order.table.status = TableStatus.free.value
    db.commit()
    db.refresh(bill)

    await manager.broadcast_to_order(bill.order_id, {
        "type": "order_paid",
        "data": {"order_id": bill.order_id}
    })
    await manager.broadcast_to_admins({
        "type": "order_paid",
        "data": {"order_id": bill.order_id, "table_number": bill.order.table.number}
    })

    return _build_bill_out(bill)


@router.get("/order/{order_id}", response_model=BillOut)
def get_bill_by_order(order_id: int, db: Session = Depends(get_db)):
    """Public: customer fetches their bill."""
    bill = db.query(Bill).filter(Bill.order_id == order_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return _build_bill_out(bill)


@router.get("/{bill_id}", response_model=BillOut)
def get_bill(bill_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return _build_bill_out(bill)


@router.delete("/{bill_id}")
def delete_bill(bill_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Admin: permanently delete a bill record."""
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    db.delete(bill)
    db.commit()
    return {"message": f"Bill #{bill_id} permanently deleted"}
