from pydantic import BaseModel, EmailStr, field_serializer
from typing import Optional, List
from datetime import datetime
from app.models import OrderStatus, PaymentMethod, TableStatus, UserRole


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True


# ─── Restaurant Settings Schemas ──────────────────────────────────────────────

class RestaurantSettingsBase(BaseModel):
    name: Optional[str] = "My Restaurant"
    tagline: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    currency_symbol: Optional[str] = "₹"
    gst_percentage: Optional[float] = 5.0
    gst_number: Optional[str] = None
    receipt_footer: Optional[str] = "Thank you! Visit Again!"
    wifi_name: Optional[str] = None
    wifi_password: Optional[str] = None
    system_base_url: Optional[str] = None


class RestaurantSettingsOut(RestaurantSettingsBase):
    id: int
    logo_url: Optional[str] = None
    local_ip_url: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Category Schemas ─────────────────────────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: Optional[int] = 0
    is_active: Optional[bool] = True


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    display_order: int
    is_active: bool
    item_count: Optional[int] = 0

    class Config:
        from_attributes = True


# ─── Menu Item Schemas ────────────────────────────────────────────────────────

class MenuItemCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category_id: int
    is_veg: Optional[bool] = True
    is_available: Optional[bool] = True
    is_featured: Optional[bool] = False
    display_order: Optional[int] = 0


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category_id: Optional[int] = None
    is_veg: Optional[bool] = None
    is_available: Optional[bool] = None
    is_featured: Optional[bool] = None
    display_order: Optional[int] = None


class MenuItemOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    category_id: int
    category_name: Optional[str] = None
    image_url: Optional[str] = None
    is_veg: bool
    is_available: bool
    is_featured: bool
    display_order: int

    class Config:
        from_attributes = True


# ─── Table Schemas ────────────────────────────────────────────────────────────

class TableCreate(BaseModel):
    number: int
    name: Optional[str] = None
    capacity: Optional[int] = 4


class TableUpdate(BaseModel):
    name: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[TableStatus] = None
    is_active: Optional[bool] = None


class TableOut(BaseModel):
    id: int
    number: int
    name: Optional[str] = None
    capacity: int
    qr_token: str
    status: TableStatus
    is_active: bool
    active_order_id: Optional[int] = None

    class Config:
        from_attributes = True


# ─── Order Item Schemas ───────────────────────────────────────────────────────

class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = 1
    notes: Optional[str] = None


class OrderItemOut(BaseModel):
    id: int
    menu_item_id: int
    menu_item_name: Optional[str] = None
    menu_item_image: Optional[str] = None
    is_veg: Optional[bool] = True
    quantity: int
    unit_price: float
    notes: Optional[str] = None
    subtotal: float = 0.0

    class Config:
        from_attributes = True


# ─── Order Schemas ────────────────────────────────────────────────────────────

class OrderCreate(BaseModel):
    table_token: Optional[str] = None
    table_id: Optional[int] = None
    items: List[OrderItemCreate]
    customer_name: Optional[str] = None
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    notes: Optional[str] = None


class AddItemsRequest(BaseModel):
    items: List[OrderItemCreate]


class UpdateItemQtyRequest(BaseModel):
    quantity: int


class OrderOut(BaseModel):
    id: int
    table_id: int
    table_number: Optional[int] = None
    table_name: Optional[str] = None
    status: OrderStatus
    customer_name: Optional[str] = None
    notes: Optional[str] = None
    items: List[OrderItemOut] = []
    subtotal: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @field_serializer('created_at', 'updated_at', check_fields=False)
    def serialize_dt(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        return dt.isoformat()


# ─── Bill Schemas ─────────────────────────────────────────────────────────────

class BillCreate(BaseModel):
    order_id: int
    discount_amount: Optional[float] = 0.0
    discount_percentage: Optional[float] = 0.0
    payment_method: Optional[PaymentMethod] = PaymentMethod.cash


class BillOut(BaseModel):
    id: int
    order_id: int
    table_number: Optional[int] = None
    table_name: Optional[str] = None
    items: List[OrderItemOut] = []
    subtotal: float
    discount_amount: float
    discount_percentage: float
    tax_percentage: float
    tax_amount: float
    total: float
    payment_method: PaymentMethod
    paid_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @field_serializer('created_at', 'paid_at', check_fields=False)
    def serialize_dt(self, dt: Optional[datetime]) -> Optional[str]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        return dt.isoformat()


# ─── Dashboard Schemas ────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    today_revenue: float
    today_orders: int
    pending_orders: int
    preparing_orders: int
    completed_orders: int
    occupied_tables: int
    free_tables: int
    total_tables: int
    top_items: List[dict]
    recent_orders: List[dict]
