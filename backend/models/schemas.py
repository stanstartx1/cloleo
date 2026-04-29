# Pydantic models for API requests/responses
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any

# ============== AUTH MODELS ==============

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "customer"
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# ============== PRODUCT MODELS ==============

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

# ============== CART MODELS ==============

class CartItemCreate(BaseModel):
    product_id: str
    quantity: int = 1
    session_id: str

class CartItemUpdate(BaseModel):
    quantity: int

# ============== SUBSCRIPTION MODELS ==============

class SubscriptionCheckout(BaseModel):
    plan_id: str
    origin_url: str

class SettingsUpdate(BaseModel):
    settings: Dict[str, Any]

# ============== DRIVER MODELS ==============

class DriverRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    vehicle_type: str  # moto, voiture, velo
    license_number: str
    city: str
    country: str = "Cote d'Ivoire"

class DriverStatusUpdate(BaseModel):
    status: str  # available, busy, offline

class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float

# ============== ORDER MODELS ==============

class OrderStatus:
    PENDING = "pending"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class OrderAddress(BaseModel):
    street: str
    city: str
    country: str = "Cote d'Ivoire"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: str
    name: str

class CreateOrder(BaseModel):
    items: List[dict]
    delivery_address: OrderAddress
    payment_method: str = "cash"
    notes: Optional[str] = None

class OrderUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

# ============== DROPSHIPPER MODELS ==============

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

# ============== CHAT MODELS ==============

class MessageCreate(BaseModel):
    conversation_id: Optional[str] = None
    product_id: Optional[str] = None
    dropshipped_product_id: Optional[str] = None
    content: str

class ConversationCreate(BaseModel):
    product_id: Optional[str] = None
    dropshipped_product_id: Optional[str] = None

# ============== CATEGORY MODELS ==============

class CategoryCreate(BaseModel):
    name: str
    slug: str
    icon: Optional[str] = "Package"
    description: Optional[str] = ""
    parent_slug: Optional[str] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    parent_slug: Optional[str] = None

# ============== REVIEW MODELS ==============

class ReviewCreate(BaseModel):
    product_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
    
class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
