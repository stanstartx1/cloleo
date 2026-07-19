# Pydantic models for the Cloléo API
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any


class UserRole:
    CUSTOMER = "customer"
    VENDOR = "vendor"
    ADMIN = "admin"
    DRIVER = "driver"
    DROPSHIPPER = "dropshipper"
    REVENDEUR = "dropshipper"


class OrderStatus:
    PENDING = "pending"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = UserRole.CUSTOMER
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class VendorProduct(BaseModel):
    name: str
    description: str
    price_fcfa: int
    promo_price_fcfa: Optional[int] = None
    wholesale_enabled: bool = False
    wholesale_min_quantity: Optional[int] = None
    wholesale_unit_price_fcfa: Optional[int] = None
    stock: int
    condition: str
    category_slug: str
    subcategory_slug: Optional[str] = None
    images: List[str]
    tags: List[str] = []


class CartItemCreate(BaseModel):
    product_id: str
    quantity: int = 1
    session_id: str
    selected_attributes: Dict[str, Any] = {}


class CartItemUpdate(BaseModel):
    quantity: int


class SubscriptionCheckout(BaseModel):
    plan_id: str
    origin_url: str


class SettingsUpdate(BaseModel):
    settings: Dict[str, Any]


class DriverRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    vehicle_type: str
    license_number: str
    city: str
    country: str = "Côte d'Ivoire"


class DriverStatusUpdate(BaseModel):
    status: str


class DriverLocationUpdate(BaseModel):
    latitude: float
    longitude: float


class OrderAddress(BaseModel):
    street: str
    city: str
    country: str = "Côte d'Ivoire"
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
    custom_images: Optional[List[str]] = None


class DropshippedProductUpdate(BaseModel):
    custom_description: Optional[str] = None
    selling_price_fcfa: Optional[int] = None
    is_active: Optional[bool] = None
    custom_images: Optional[List[str]] = None


class MessageCreate(BaseModel):
    conversation_id: Optional[str] = None
    product_id: Optional[str] = None
    dropshipped_product_id: Optional[str] = None
    content: str


class ConversationCreate(BaseModel):
    product_id: Optional[str] = None
    dropshipped_product_id: Optional[str] = None


class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None


# Custom field definition for categories
class CustomFieldOption(BaseModel):
    label: str
    value: str


class CustomFieldDefinition(BaseModel):
    key: str
    label: str
    field_type: str  # text, number, select, multiselect, color
    options: List[CustomFieldOption] = []
    required: bool = False
    placeholder: Optional[str] = None


# Category models — avec support sous-catégories
class CategoryCreate(BaseModel):
    name: str
    slug: str
    icon: str
    description: Optional[str] = None
    parent_slug: Optional[str] = None  # None = catégorie principale
    custom_fields: List[CustomFieldDefinition] = []


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    parent_slug: Optional[str] = None
    custom_fields: Optional[List[CustomFieldDefinition]] = None


class OfferStatus:
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COUNTER_OFFER = "counter_offer"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"


class OfferCreate(BaseModel):
    product_id: str
    offered_price_fcfa: int
    message: Optional[str] = None
    quantity: int = 1


class OfferResponse(BaseModel):
    status: str
    counter_price_fcfa: Optional[int] = None
    response_message: Optional[str] = None


class OfferCounter(BaseModel):
    counter_price_fcfa: int
    message: Optional[str] = None


class NegotiatedLink(BaseModel):
    offer_id: str
    expires_at: Optional[str] = None
