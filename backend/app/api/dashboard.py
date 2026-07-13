from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, time, timedelta
from typing import List, Optional
from app.database import get_db
from app.models import Order, OrderItem, MenuItem, Table, Bill, OrderStatus, TableStatus, RestaurantSettings
from app.schemas import DashboardStats, RestaurantSettingsBase, RestaurantSettingsOut
from app.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def format_datetime(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    return dt.isoformat()


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    # Calculate timezone offset between local time and UTC
    local_now = datetime.now()
    utc_now = datetime.utcnow()
    offset = local_now - utc_now

    today = date.today()
    local_start = datetime.combine(today, time.min)
    local_end = datetime.combine(today, time.max)

    utc_start = local_start - offset
    utc_end = local_end - offset

    # Today's paid orders revenue
    today_bills = db.query(Bill).join(Order).filter(
        Bill.paid_at >= utc_start,
        Bill.paid_at <= utc_end
    ).all()
    today_revenue = sum(b.total for b in today_bills)
    today_orders = len(today_bills)

    # Order counts by status
    pending = db.query(func.count(Order.id)).filter(Order.status == OrderStatus.pending.value).scalar()
    preparing = db.query(func.count(Order.id)).filter(Order.status == OrderStatus.preparing.value).scalar()
    completed = db.query(func.count(Order.id)).filter(
        Order.status.in_([OrderStatus.served.value, OrderStatus.paid.value]),
        Order.created_at >= utc_start,
        Order.created_at <= utc_end
    ).scalar()

    # Table stats
    total_tables = db.query(func.count(Table.id)).filter(Table.is_active == True).scalar()
    occupied = db.query(func.count(Table.id)).filter(
        Table.status == TableStatus.occupied.value, Table.is_active == True
    ).scalar()
    free = total_tables - occupied

    # Top 5 items today
    top_items_query = (
        db.query(
            MenuItem.name,
            func.sum(OrderItem.quantity).label("qty"),
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("revenue")
        )
        .join(OrderItem, OrderItem.menu_item_id == MenuItem.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.created_at >= utc_start, Order.created_at <= utc_end)
        .group_by(MenuItem.id, MenuItem.name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
        .all()
    )
    top_items = [{"name": r.name, "qty": int(r.qty), "revenue": float(r.revenue)} for r in top_items_query]

    # Recent 10 orders (enriched with bill info for paid orders)
    recent_orders_query = (
        db.query(Order)
        .filter(Order.created_at >= utc_start, Order.created_at <= utc_end)
        .order_by(Order.created_at.desc())
        .limit(10)
        .all()
    )
    recent_orders = []
    for o in recent_orders_query:
        subtotal = sum(oi.quantity * oi.unit_price for oi in o.order_items)
        bill_total = None
        payment_method = None
        paid_at = None
        if o.bill:
            bill_total = o.bill.total
            payment_method = o.bill.payment_method
            paid_at = format_datetime(o.bill.paid_at)
        recent_orders.append({
            "id": o.id,
            "table_number": o.table.number if o.table else None,
            "status": o.status if isinstance(o.status, str) else o.status.value,
            "subtotal": subtotal,
            "bill_total": bill_total,
            "payment_method": payment_method,
            "paid_at": paid_at,
            "created_at": format_datetime(o.created_at),
        })

    return DashboardStats(
        today_revenue=today_revenue,
        today_orders=today_orders,
        pending_orders=pending,
        preparing_orders=preparing,
        completed_orders=completed,
        occupied_tables=occupied,
        free_tables=free,
        total_tables=total_tables,
        top_items=top_items,
        recent_orders=recent_orders,
    )


# ─── Billing History ──────────────────────────────────────────────────────────

@router.get("/billing-history")
def get_billing_history(
    date_filter: Optional[str] = None,      # single day: YYYY-MM-DD
    from_date: Optional[str] = None,        # range start
    to_date: Optional[str] = None,          # range end
    all_time: bool = False,                 # show everything
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    Return paid bills.
    - all_time=true  → all bills ever
    - from_date + to_date → date range
    - date_filter    → single day (defaults to today if nothing else given)
    """
    local_now = datetime.now()
    utc_now = datetime.utcnow()
    offset = local_now - utc_now

    query = db.query(Bill).join(Order).filter(Bill.paid_at.isnot(None))

    range_label = "All Time"

    if all_time:
        # No date filter — return everything
        range_label = "All Time"
    elif from_date or to_date:
        # Date range filter
        if from_date:
            try:
                fd = datetime.strptime(from_date, "%Y-%m-%d").date()
            except ValueError:
                fd = date.today()
            utc_from = datetime.combine(fd, time.min) - offset
            query = query.filter(Bill.paid_at >= utc_from)
        if to_date:
            try:
                td = datetime.strptime(to_date, "%Y-%m-%d").date()
            except ValueError:
                td = date.today()
            utc_to = datetime.combine(td, time.max) - offset
            query = query.filter(Bill.paid_at <= utc_to)
        range_label = f"{from_date or 'start'} – {to_date or 'today'}"
    else:
        # Single date or default to today
        if date_filter:
            try:
                target_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            except ValueError:
                target_date = date.today()
        else:
            target_date = date.today()
        utc_start = datetime.combine(target_date, time.min) - offset
        utc_end = datetime.combine(target_date, time.max) - offset
        query = query.filter(Bill.paid_at >= utc_start, Bill.paid_at <= utc_end)
        range_label = target_date.isoformat()

    bills = query.order_by(Bill.paid_at.desc()).all()

    result = []
    for b in bills:
        order = b.order
        result.append({
            "bill_id": b.id,
            "order_id": b.order_id,
            "table_number": order.table.number if order and order.table else None,
            "table_name": order.table.name if order and order.table else None,
            "items_count": len(order.order_items) if order else 0,
            "subtotal": b.subtotal,
            "discount_amount": b.discount_amount,
            "tax_amount": b.tax_amount,
            "total": b.total,
            "payment_method": b.payment_method,
            "paid_at": format_datetime(b.paid_at),
        })

    return {
        "range": range_label,
        "total_revenue": sum(b["total"] for b in result),
        "total_bills": len(result),
        "bills": result,
    }


# ─── Restaurant Settings ──────────────────────────────────────────────────────

def get_local_ip():
    import socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


@router.get("/settings", response_model=RestaurantSettingsOut)
def get_settings(db: Session = Depends(get_db), _=Depends(get_current_user)):
    settings = db.query(RestaurantSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not initialized")
    local_ip = get_local_ip()
    settings.local_ip_url = f"http://{local_ip}:8000"
    return settings


@router.put("/settings", response_model=RestaurantSettingsOut)
def update_settings(data: RestaurantSettingsBase, db: Session = Depends(get_db), _=Depends(get_current_user)):
    settings = db.query(RestaurantSettings).first()
    if not settings:
        settings = RestaurantSettings()
        db.add(settings)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    local_ip = get_local_ip()
    settings.local_ip_url = f"http://{local_ip}:8000"
    return settings


@router.get("/settings/public", response_model=RestaurantSettingsOut)
def get_settings_public(db: Session = Depends(get_db)):
    """Public endpoint for customer app."""
    settings = db.query(RestaurantSettings).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not initialized")
    local_ip = get_local_ip()
    settings.local_ip_url = f"http://{local_ip}:8000"
    return settings
