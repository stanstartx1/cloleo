# Pydantic models for the Cloléo API
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any


class UserRole:
    CUSTOMER = "customer"
    VENDOR = "vendor"
    ADMIN = "admin"
    DRIVER = "driver"
    DROPSHIPPER = "dropshipper"


class OrderStatus:
    PENDING = "pending"           # Client just placed order
    ASSIGNED = "assigned"         # Driver accepted
    PICKED_UP = "picked_up"       # Driver has the package
    IN_TRANSIT = "in_transit"     # Driver is on the way
    DELIVERED = "delivered"       # Delivered
    CANCELLED = "cancelled"       # Cancelled


# Auth models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = UserRole.CUSTOMER
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# Vendor models
class VendorProduct(BaseModel):
    name: str
    description: str
    price_fcfa: int
    promo_price_fcfa: Optional[int] = None
    stock: int
    condition: str
    category_slug: str
    images: List[str]
    tags: List[str] = []


# Cart models
class CartItemCreate(BaseModel):
    product_id: str
    quantity: int = 1
    session_id: str


class CartItemUpdate(BaseModel):
    quantity: int


# Subscription models
class SubscriptionCheckout(BaseModel):
    plan_id: str
    origin_url: str


# Settings models
class SettingsUpdate(BaseModel):
    settings: Dict[str, Any]


# Driver models
class DriverRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    vehicle_type: str  # moto, voiture, velo
    license_number: str
    city: str
    country: str = "Côte d'Ivoire"


class DriverStatusUpdate(BaseModel):
    status: str  # available, busy, offline


class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float


# Order models
class OrderAddress(BaseModel):
    street: str
    city: str
    country: str = "Côte d'Ivoire"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: str
    name: str


class CreateOrder(BaseModel):
    items: List[dict]  # [{product_id, quantity}]
    delivery_address: OrderAddress
    payment_method: str = "cash"  # cash, card
    notes: Optional[str] = None


class OrderUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


# Dropshipper models
class DropshipperRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    shop_name: str
    shop_description: Optional[str] = None


class DropshippedProductCreate(BaseModel):
    original_product_id: str
    custom_description: Optional[str] = None
    selling_price_fcfa: int


class DropshippedProductUpdate(BaseModel):
    custom_description: Optional[str] = None
    selling_price_fcfa: Optional[int] = None
    is_active: Optional[bool] = None


# Chat/Messaging models
class MessageCreate(BaseModel):
    conversation_id: Optional[str] = None
    product_id: Optional[str] = None  # For starting new conversation
    dropshipped_product_id: Optional[str] = None  # For dropshipped products
    content: str


class ConversationCreate(BaseModel):
    product_id: Optional[str] = None
    dropshipped_product_id: Optional[str] = None


# Review models
class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None


# Category models
class CategoryCreate(BaseModel):
    name: str
    slug: str
    icon: str
    description: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
