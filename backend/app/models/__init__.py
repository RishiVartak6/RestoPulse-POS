from sqlalchemy import (
    Column, Integer, String, Boolean, Float, DateTime,
    ForeignKey, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


# ─── Python Enums (used in code, not as DB types) ─────────────────────────────

class TableStatus(str, enum.Enum):
    free = "free"
    occupied = "occupied"
    reserved = "reserved"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    preparing = "preparing"
    ready = "ready"
    served = "served"
    paid = "paid"
    cancelled = "cancelled"


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    upi = "upi"
    card = "card"
    other = "other"


class UserRole(str, enum.Enum):
    admin = "admin"
    staff = "staff"


# ─── Models ───────────────────────────────────────────────────────────────────

class RestaurantSettings(Base):
    __tablename__ = "restaurant_settings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), default="My Restaurant")
    tagline = Column(String(500), nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(200), nullable=True)
    logo_url = Column(String(500), nullable=True)
    currency_symbol = Column(String(5), default="₹")
    gst_percentage = Column(Float, default=5.0)
    gst_number = Column(String(50), nullable=True)
    receipt_footer = Column(Text, default="Thank you! Visit Again!")
    wifi_name = Column(String(100), nullable=True)
    wifi_password = Column(String(100), nullable=True)
    system_base_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200))
    email = Column(String(200), unique=True, index=True)
    hashed_password = Column(String(500))
    role = Column(String(20), default=UserRole.admin.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    menu_items = relationship("MenuItem", back_populates="category")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(300), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    image_url = Column(String(500), nullable=True)
    is_veg = Column(Boolean, default=True)
    is_available = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    category = relationship("Category", back_populates="menu_items")
    order_items = relationship("OrderItem", back_populates="menu_item")


class Table(Base):
    __tablename__ = "tables"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, unique=True, nullable=False)
    name = Column(String(100), nullable=True)
    capacity = Column(Integer, default=4)
    qr_token = Column(String(100), unique=True, index=True)
    status = Column(String(20), default=TableStatus.free.value)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    orders = relationship("Order", back_populates="table")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("tables.id"), nullable=False)
    status = Column(String(20), default=OrderStatus.pending.value)
    customer_name = Column(String(200), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    table = relationship("Table", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    bill = relationship("Bill", back_populates="order", uselist=False)

    @property
    def subtotal(self):
        return sum(item.quantity * item.unit_price for item in self.order_items)


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, nullable=False)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    order = relationship("Order", back_populates="order_items")
    menu_item = relationship("MenuItem", back_populates="order_items")


class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), unique=True, nullable=False)
    subtotal = Column(Float, nullable=False)
    discount_amount = Column(Float, default=0.0)
    discount_percentage = Column(Float, default=0.0)
    tax_percentage = Column(Float, default=5.0)
    tax_amount = Column(Float, default=0.0)
    total = Column(Float, nullable=False)
    payment_method = Column(String(20), default=PaymentMethod.cash.value)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    order = relationship("Order", back_populates="bill")
