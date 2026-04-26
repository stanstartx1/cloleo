from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, Request, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import random
import hashlib
import jwt
import secrets
import shutil
import aiofiles
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7

from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

app = FastAPI(title="Cloléo API", version="3.0.0")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== WEBSOCKET CONNECTION MANAGER ==============

class ConnectionManager:
    def __init__(self):
        # Store active WebSocket connections by room
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Store driver locations
        self.driver_locations: Dict[str, dict] = {}
    
    async def connect(self, websocket: WebSocket, room: str):
        await websocket.accept()
        if room not in self.active_connections:
            self.active_connections[room] = []
        self.active_connections[room].append(websocket)
        logger.info(f"WebSocket connected to room: {room}")
    
    def disconnect(self, websocket: WebSocket, room: str):
        if room in self.active_connections:
            if websocket in self.active_connections[room]:
                self.active_connections[room].remove(websocket)
            if not self.active_connections[room]:
                del self.active_connections[room]
        logger.info(f"WebSocket disconnected from room: {room}")
    
    async def broadcast_to_room(self, room: str, message: dict):
        if room in self.active_connections:
            disconnected = []
            for connection in self.active_connections[room]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.append(connection)
            for conn in disconnected:
                self.disconnect(conn, room)
    
    async def broadcast_to_all(self, message: dict):
        for room in list(self.active_connections.keys()):
            await self.broadcast_to_room(room, message)
    
    def update_driver_location(self, driver_id: str, location: dict):
        self.driver_locations[driver_id] = {
            **location,
            "driver_id": driver_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    
    def get_driver_location(self, driver_id: str) -> Optional[dict]:
        return self.driver_locations.get(driver_id)
    
    def get_all_driver_locations(self) -> Dict[str, dict]:
        return self.driver_locations

manager = ConnectionManager()

# ============== CONSTANTS ==============

class UserRole:
    CUSTOMER = "customer"
    VENDOR = "vendor"
    ADMIN = "admin"
    DRIVER = "driver"
    DROPSHIPPER = "dropshipper"

# Upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

class ProductStatus:
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

SUBSCRIPTION_PLANS = {
    "free": {"id": "free", "name": "Débutant", "emoji": "🌱", "price_fcfa": 0, "price_usd": 0.00, "max_products": 3, "commission_percent": 10, "features": ["3 produits maximum", "Commission de 10%", "Support par email"], "badge": None, "priority_support": False, "featured_products": 0},
    "artisan": {"id": "artisan", "name": "Artisan", "emoji": "🎨", "price_fcfa": 5000, "price_usd": 8.00, "max_products": 25, "commission_percent": 7, "features": ["25 produits maximum", "Commission de 7%", "Badge vendeur vérifié", "Support prioritaire"], "badge": "verified", "priority_support": True, "featured_products": 2},
    "commercant": {"id": "commercant", "name": "Commerçant", "emoji": "🏪", "price_fcfa": 15000, "price_usd": 24.00, "max_products": 100, "commission_percent": 5, "features": ["100 produits maximum", "Commission de 5%", "Badge Pro", "5 produits en vedette"], "badge": "pro", "priority_support": True, "featured_products": 5},
    "entreprise": {"id": "entreprise", "name": "Entreprise", "emoji": "🏢", "price_fcfa": 35000, "price_usd": 56.00, "max_products": -1, "commission_percent": 3, "features": ["Produits illimités", "Commission de 3%", "Badge Premium", "Account manager dédié"], "badge": "premium", "priority_support": True, "featured_products": 10}
}

CATEGORIES_DATA = [
    {"name": "Mode & Textile", "slug": "mode-textile", "description": "Tissus wax, prêt-à-porter africain", "image": "https://images.unsplash.com/photo-1768212565426-58b089b6386d?w=800"},
    {"name": "Artisanat & Décoration", "slug": "artisanat-decoration", "description": "Art africain authentique", "image": "https://images.unsplash.com/photo-1717913491672-ec2c1921e81f?w=800"},
    {"name": "Bijoux & Accessoires", "slug": "bijoux-accessoires", "description": "Bijoux artisanaux africains", "image": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800"},
    {"name": "Beauté & Cosmétiques", "slug": "beaute-cosmetiques", "description": "Produits de beauté naturels", "image": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800"},
    {"name": "Électronique & Gadgets", "slug": "electronique-gadgets", "description": "Smartphones et accessoires", "image": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800"},
    {"name": "Maison & Cuisine", "slug": "maison-cuisine", "description": "Ustensiles et décoration", "image": "https://images.unsplash.com/photo-1562860143-2a8fda719599?w=800"},
    {"name": "Produits Locaux", "slug": "produits-locaux-agroalimentaire", "description": "Épices et produits du terroir", "image": "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=800"},
    {"name": "Sport & Loisirs", "slug": "sport-loisirs", "description": "Équipements sportifs", "image": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800"}
]

COUNTRIES = ["Côte d'Ivoire", "Sénégal", "Nigeria", "Cameroun", "Ghana"]
CITIES = {"Côte d'Ivoire": ["Abidjan", "Yamoussoukro", "Bouaké"], "Sénégal": ["Dakar", "Thiès"], "Nigeria": ["Lagos", "Abuja"], "Cameroun": ["Douala", "Yaoundé"], "Ghana": ["Accra", "Kumasi"]}
FCFA_TO_USD = 0.0016

# ============== MODELS ==============

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
    stock: int
    condition: str
    category_slug: str
    images: List[str]
    tags: List[str] = []

class CartItemCreate(BaseModel):
    product_id: str
    quantity: int = 1
    session_id: str

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
class OrderStatus:
    PENDING = "pending"           # Client just placed order
    ASSIGNED = "assigned"         # Driver accepted
    PICKED_UP = "picked_up"       # Driver has the package
    IN_TRANSIT = "in_transit"     # Driver is on the way
    DELIVERED = "delivered"       # Delivered
    CANCELLED = "cancelled"       # Cancelled

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

# ============== AUTH ==============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_token(user_id: str, role: str) -> str:
    return jwt.encode({"user_id": user_id, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except:
        raise HTTPException(status_code=401, detail="Token invalide")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    return user

async def require_vendor(user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.VENDOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Accès réservé aux vendeurs")
    return user

async def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return user

async def require_driver(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Accès réservé aux livreurs")
    return user

async def require_dropshipper(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.DROPSHIPPER:
        raise HTTPException(status_code=403, detail="Accès réservé aux dropshippers")
    return user

def generate_slug(name):
    import re
    slug = name.lower()
    for old, new in {'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'â': 'a', 'î': 'i', 'ô': 'o', 'ù': 'u', 'ç': 'c', "'": ''}.items():
        slug = slug.replace(old, new)
    return re.sub(r'[^a-z0-9]+', '-', slug)[:50] + '-' + str(uuid.uuid4())[:8]

# ============== ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "API Cloléo", "version": "3.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# AUTH
@api_router.post("/auth/register")
async def register(data: UserRegister):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # Vendors need admin approval (like drivers)
    is_vendor = data.role == UserRole.VENDOR
    
    user = {
        "id": str(uuid.uuid4()), 
        "email": data.email, 
        "password": hash_password(data.password), 
        "name": data.name, 
        "role": data.role, 
        "phone": data.phone, 
        "created_at": datetime.now(timezone.utc).isoformat(), 
        "is_active": not is_vendor,  # Vendors start inactive, need approval
        "is_verified": not is_vendor,  # Vendors start unverified
        "subscription_plan": "free" if is_vendor else None, 
        "subscription_expires": None, 
        "shop_name": data.name if is_vendor else None, 
        "location": None, 
        "city": None
    }
    await db.users.insert_one(user)
    return {"token": create_token(user["id"], user["role"]), "user": {k: v for k, v in user.items() if k not in ["password", "_id"]}}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    # Allow drivers and vendors to login even if not active (they'll see pending verification message)
    if not user.get("is_active", True) and user.get("role") not in [UserRole.DRIVER, UserRole.VENDOR]:
        raise HTTPException(status_code=401, detail="Compte désactivé")
    return {"token": create_token(user["id"], user["role"]), "user": {k: v for k, v in user.items() if k != "password"}}

@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password"}

# SUBSCRIPTIONS
@api_router.get("/subscriptions/plans")
async def get_plans():
    return list(SUBSCRIPTION_PLANS.values())

@api_router.post("/subscriptions/checkout")
async def checkout(data: SubscriptionCheckout, request: Request, user: dict = Depends(require_vendor)):
    plan = SUBSCRIPTION_PLANS.get(data.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Plan invalide")
    if plan["price_usd"] == 0:
        await db.users.update_one({"id": user["id"]}, {"$set": {"subscription_plan": "free"}})
        return {"redirect": f"{data.origin_url}/vendeur/abonnement?success=true"}
    
    stripe = StripeCheckout(api_key=os.environ.get('STRIPE_API_KEY'), webhook_url=f"{str(request.base_url).rstrip('/')}/api/webhook/stripe")
    session = await stripe.create_checkout_session(CheckoutSessionRequest(amount=plan["price_usd"], currency="usd", success_url=f"{data.origin_url}/vendeur/abonnement?session_id={{CHECKOUT_SESSION_ID}}", cancel_url=f"{data.origin_url}/vendeur/abonnement?cancelled=true", metadata={"user_id": user["id"], "plan_id": data.plan_id}))
    await db.transactions.insert_one({"id": str(uuid.uuid4()), "session_id": session.session_id, "user_id": user["id"], "user_name": user["name"], "user_email": user["email"], "plan_id": data.plan_id, "amount_usd": plan["price_usd"], "amount_fcfa": plan["price_fcfa"], "status": "pending", "payment_status": "initiated", "type": "subscription", "created_at": datetime.now(timezone.utc).isoformat()})
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/subscriptions/status/{session_id}")
async def check_status(session_id: str, user: dict = Depends(require_vendor)):
    stripe = StripeCheckout(api_key=os.environ.get('STRIPE_API_KEY'), webhook_url="")
    status = await stripe.get_checkout_status(session_id)
    if status.payment_status == "paid":
        plan_id = status.metadata.get("plan_id", "artisan")
        await db.users.update_one({"id": user["id"]}, {"$set": {"subscription_plan": plan_id, "subscription_expires": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()}})
        await db.transactions.update_one({"session_id": session_id}, {"$set": {"status": "complete", "payment_status": "paid"}})
    return {"status": status.status, "payment_status": status.payment_status}

# VENDOR
@api_router.get("/vendor/dashboard")
async def vendor_dashboard(user: dict = Depends(require_vendor)):
    products = await db.products.find({"seller_id": user["id"]}, {"_id": 0}).to_list(1000)
    plan = SUBSCRIPTION_PLANS.get(user.get("subscription_plan", "free"), SUBSCRIPTION_PLANS["free"])
    return {
        "user": {k: v for k, v in user.items() if k != "password"},
        "stats": {"total_products": len(products), "pending_products": len([p for p in products if p.get("status") == "pending"]), "approved_products": len([p for p in products if p.get("status") == "approved"]), "rejected_products": len([p for p in products if p.get("status") == "rejected"]), "total_sales": sum(p.get("sales_count", 0) for p in products), "total_revenue_fcfa": sum(p.get("price_fcfa", 0) * p.get("sales_count", 0) for p in products)},
        "subscription": {"plan": plan, "expires": user.get("subscription_expires"), "products_remaining": plan["max_products"] - len(products) if plan["max_products"] > 0 else -1}
    }

@api_router.get("/vendor/products")
async def vendor_products(user: dict = Depends(require_vendor), status: Optional[str] = None):
    query = {"seller_id": user["id"]}
    if status: query["status"] = status
    return await db.products.find(query, {"_id": 0}).to_list(1000)

@api_router.post("/vendor/products")
async def create_product(data: VendorProduct, user: dict = Depends(require_vendor)):
    plan = SUBSCRIPTION_PLANS.get(user.get("subscription_plan", "free"), SUBSCRIPTION_PLANS["free"])
    count = await db.products.count_documents({"seller_id": user["id"]})
    if plan["max_products"] > 0 and count >= plan["max_products"]:
        raise HTTPException(status_code=403, detail=f"Limite de {plan['max_products']} produits")
    product = {"id": str(uuid.uuid4()), "name": data.name, "slug": generate_slug(data.name), "description": data.description, "price_fcfa": data.price_fcfa, "price_usd": round(data.price_fcfa * FCFA_TO_USD, 2), "promo_price_fcfa": data.promo_price_fcfa, "promo_price_usd": round(data.promo_price_fcfa * FCFA_TO_USD, 2) if data.promo_price_fcfa else None, "stock": data.stock, "condition": data.condition, "location": user.get("location", "Côte d'Ivoire"), "city": user.get("city", "Abidjan"), "category_slug": data.category_slug, "images": data.images, "tags": data.tags, "rating": 0, "sales_count": 0, "reviews_count": 0, "seller_name": user.get("shop_name") or user["name"], "seller_id": user["id"], "is_featured": False, "status": "pending", "created_at": datetime.now(timezone.utc).isoformat()}
    await db.products.insert_one(product)
    return {k: v for k, v in product.items() if k != "_id"}

@api_router.delete("/vendor/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(require_vendor)):
    result = await db.products.delete_one({"id": product_id, "seller_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Non trouvé")
    return {"message": "Supprimé"}

# PUBLIC STATS
@api_router.get("/stats/public")
async def get_public_stats():
    """Get public statistics for the homepage"""
    return {
        "products": await db.products.count_documents({"status": "approved"}),
        "vendors": await db.users.count_documents({"role": "vendor", "is_active": True}),
        "drivers": await db.users.count_documents({"role": "driver", "is_active": True}),
        "dropshippers": await db.users.count_documents({"role": "dropshipper", "is_active": True})
    }

# ADMIN
@api_router.get("/admin/dashboard")
async def admin_dashboard(user: dict = Depends(require_admin)):
    transactions = await db.transactions.find({"payment_status": "paid"}, {"_id": 0}).to_list(1000)
    return {
        "stats": {
            "total_users": await db.users.count_documents({}),
            "total_vendors": await db.users.count_documents({"role": "vendor"}),
            "total_products": await db.products.count_documents({}),
            "pending_products": await db.products.count_documents({"status": "pending"}),
            "approved_products": await db.products.count_documents({"status": "approved"}),
            "free_vendors": await db.users.count_documents({"role": "vendor", "subscription_plan": "free"}),
            "paid_vendors": await db.users.count_documents({"role": "vendor", "subscription_plan": {"$ne": "free"}}),
            "total_revenue_usd": sum(t.get("amount_usd", 0) for t in transactions),
            "total_revenue_fcfa": sum(t.get("amount_fcfa", 0) for t in transactions)
        }
    }

@api_router.get("/admin/vendors")
async def admin_vendors(user: dict = Depends(require_admin), page: int = 1, limit: int = 50):
    skip = (page - 1) * limit
    vendors = await db.users.find({"role": "vendor"}, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
    for v in vendors:
        v["product_count"] = await db.products.count_documents({"seller_id": v["id"]})
    return {"vendors": vendors, "total": await db.users.count_documents({"role": "vendor"})}

@api_router.put("/admin/vendors/{vendor_id}/subscription")
async def update_subscription(vendor_id: str, plan_id: str, user: dict = Depends(require_admin)):
    if plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Plan invalide")
    expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat() if plan_id != "free" else None
    await db.users.update_one({"id": vendor_id}, {"$set": {"subscription_plan": plan_id, "subscription_expires": expires}})
    return {"message": "Mis à jour"}

@api_router.put("/admin/vendors/{vendor_id}/toggle")
async def toggle_vendor(vendor_id: str, user: dict = Depends(require_admin)):
    vendor = await db.users.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Non trouvé")
    new_status = not vendor.get("is_active", True)
    await db.users.update_one({"id": vendor_id}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}

@api_router.get("/admin/products")
async def admin_products(user: dict = Depends(require_admin), page: int = 1, limit: int = 50, status: Optional[str] = None):
    skip = (page - 1) * limit
    query = {}
    if status: query["status"] = status
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for p in products:
        seller = await db.users.find_one({"id": p["seller_id"]}, {"_id": 0, "password": 0})
        p["seller"] = seller
    return {"products": products, "total": await db.products.count_documents(query)}

@api_router.post("/admin/products/{product_id}/approve")
async def approve(product_id: str, user: dict = Depends(require_admin)):
    result = await db.products.update_one({"id": product_id}, {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc).isoformat()}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Non trouvé")
    return {"message": "Approuvé"}

@api_router.post("/admin/products/{product_id}/reject")
async def reject(product_id: str, reason: str = "Non conforme", user: dict = Depends(require_admin)):
    await db.products.update_one({"id": product_id}, {"$set": {"status": "rejected", "rejection_reason": reason}})
    return {"message": "Rejeté"}

@api_router.get("/admin/transactions")
async def admin_transactions(user: dict = Depends(require_admin), page: int = 1, limit: int = 50):
    skip = (page - 1) * limit
    transactions = await db.transactions.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"transactions": transactions, "total": await db.transactions.count_documents({})}

# SETTINGS
@api_router.get("/admin/settings/{setting_type}")
async def get_settings(setting_type: str, user: dict = Depends(require_admin)):
    settings = await db.settings.find_one({"type": setting_type}, {"_id": 0})
    if not settings:
        defaults = {
            "vendor": {"type": "vendor", "max_images_per_product": 5, "min_product_price": 500, "auto_approve_verified": False, "commission_rates": {"free": 10, "artisan": 7, "commercant": 5, "entreprise": 3}, "allow_promotions": True, "max_promo_percent": 50, "require_description": True, "min_description_length": 50},
            "delivery": {"type": "delivery", "base_delivery_fee": 1000, "price_per_km": 200, "max_delivery_radius_km": 50, "require_license_verification": True, "vehicle_types": ["moto", "voiture", "velo"], "min_rating_active": 3.0, "delivery_zones": ["Abidjan", "Dakar", "Lagos"]},
            "platform": {"type": "platform", "site_name": "Cloléo", "site_description": "La marketplace africaine", "currency": "FCFA", "default_country": "Côte d'Ivoire", "supported_countries": COUNTRIES, "maintenance_mode": False, "allow_guest_checkout": True, "contact_email": "contact@cloleo.com", "contact_phone": "+225 07 00 00 00", "social_facebook": "", "social_instagram": "", "social_twitter": ""}
        }
        settings = defaults.get(setting_type, {"type": setting_type})
    return settings

@api_router.put("/admin/settings/{setting_type}")
async def update_settings(setting_type: str, data: SettingsUpdate, user: dict = Depends(require_admin)):
    data.settings["type"] = setting_type
    data.settings["updated_at"] = datetime.now(timezone.utc).isoformat()
    data.settings["updated_by"] = user["id"]
    await db.settings.update_one({"type": setting_type}, {"$set": data.settings}, upsert=True)
    return {"message": "Paramètres mis à jour"}

# PUBLIC
@api_router.get("/categories")
async def get_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    if not cats:
        for c in CATEGORIES_DATA:
            await db.categories.insert_one({"id": str(uuid.uuid4()), **c, "product_count": 0, "created_at": datetime.now(timezone.utc).isoformat()})
        cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    return cats

@api_router.get("/categories/{slug}")
async def get_category(slug: str):
    cat = await db.categories.find_one({"slug": slug}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=404, detail="Non trouvé")
    return cat

@api_router.get("/products")
async def get_products(category: Optional[str] = None, search: Optional[str] = None, condition: Optional[str] = None, location: Optional[str] = None, min_price: Optional[int] = None, max_price: Optional[int] = None, sort_by: str = "created_at", sort_order: str = "desc", page: int = 1, limit: int = 20, featured: Optional[bool] = None):
    query = {"status": "approved"}
    if category: query["category_slug"] = category
    if search: query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"description": {"$regex": search, "$options": "i"}}]
    if condition: query["condition"] = condition
    if location: query["location"] = location
    if min_price: query.setdefault("price_fcfa", {})["$gte"] = min_price
    if max_price: query.setdefault("price_fcfa", {})["$lte"] = max_price
    if featured is not None: query["is_featured"] = featured
    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {"_id": 0}).sort(sort_by, -1 if sort_order == "desc" else 1).skip(skip).limit(limit).to_list(limit)
    return {"products": products, "total": total, "page": page, "total_pages": (total + limit - 1) // limit}

@api_router.get("/products/featured")
async def get_featured_products_public(limit: int = 12):
    """Get featured products for homepage animations - MUST be before /products/{product_id}"""
    # Get ALL manually featured products, sorted by featured_at (most recent first)
    manual_featured = await db.products.find(
        {"is_featured": True, "status": "approved"}, 
        {"_id": 0}
    ).sort([("featured_at", -1), ("created_at", -1)]).limit(limit).to_list(limit)
    
    # If not enough, get products from premium vendors
    remaining = limit - len(manual_featured)
    if remaining > 0:
        premium_vendors = await db.users.find(
            {"role": UserRole.VENDOR, "subscription_plan": {"$in": ["entreprise", "commercant", "artisan"]}, "is_active": True},
            {"_id": 0, "id": 1, "subscription_plan": 1}
        ).to_list(100)
        
        plan_order = {"entreprise": 0, "commercant": 1, "artisan": 2}
        premium_vendors.sort(key=lambda v: plan_order.get(v.get("subscription_plan"), 3))
        vendor_ids = [v["id"] for v in premium_vendors]
        
        if vendor_ids:
            featured_ids = [p["id"] for p in manual_featured]
            auto_featured = await db.products.find(
                {"seller_id": {"$in": vendor_ids}, "status": "approved", "id": {"$nin": featured_ids}},
                {"_id": 0}
            ).limit(remaining).to_list(remaining)
            manual_featured.extend(auto_featured)
    
    # Enrich with seller info
    for product in manual_featured:
        seller = await db.users.find_one({"id": product.get("seller_id")}, {"_id": 0, "password": 0})
        product["seller"] = seller
    
    return manual_featured

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"$or": [{"id": product_id}, {"slug": product_id}], "status": "approved"}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Non trouvé")
    return p

@api_router.get("/products/{product_id}/similar")
async def similar(product_id: str, limit: int = 6):
    p = await db.products.find_one({"$or": [{"id": product_id}, {"slug": product_id}]}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Non trouvé")
    return await db.products.find({"category_slug": p["category_slug"], "id": {"$ne": p["id"]}, "status": "approved"}, {"_id": 0}).limit(limit).to_list(limit)

@api_router.get("/products/{product_id}/also-bought")
async def also_bought(product_id: str, limit: int = 6):
    """Get products that are often bought together (for now, just returns random products from same category)"""
    p = await db.products.find_one({"$or": [{"id": product_id}, {"slug": product_id}]}, {"_id": 0})
    if not p:
        return []
    # Return random products from same price range
    price = p.get("price_fcfa", 10000)
    min_price = int(price * 0.5)
    max_price = int(price * 2)
    products = await db.products.find({
        "id": {"$ne": p["id"]}, 
        "status": "approved",
        "price_fcfa": {"$gte": min_price, "$lte": max_price}
    }, {"_id": 0}).limit(limit).to_list(limit)
    return products

@api_router.get("/search")
async def search(q: str, page: int = 1, limit: int = 20):
    query = {"status": "approved", "$or": [{"name": {"$regex": q, "$options": "i"}}, {"description": {"$regex": q, "$options": "i"}}]}
    skip = (page - 1) * limit
    return {"products": await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit), "total": await db.products.count_documents(query), "query": q}

# CART
@api_router.post("/cart/add")
async def add_cart(item: CartItemCreate):
    if not await db.products.find_one({"id": item.product_id, "status": "approved"}):
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    existing = await db.cart_items.find_one({"product_id": item.product_id, "session_id": item.session_id})
    if existing:
        await db.cart_items.update_one({"_id": existing["_id"]}, {"$inc": {"quantity": item.quantity}})
    else:
        await db.cart_items.insert_one({"id": str(uuid.uuid4()), "product_id": item.product_id, "quantity": item.quantity, "session_id": item.session_id, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"message": "Ajouté"}

@api_router.get("/cart/{session_id}")
async def get_cart(session_id: str):
    items = await db.cart_items.find({"session_id": session_id}, {"_id": 0}).to_list(100)
    result, total = [], 0
    for item in items:
        p = await db.products.find_one({"id": item["product_id"], "status": "approved"}, {"_id": 0})
        if p:
            price = p.get("promo_price_fcfa") or p["price_fcfa"]
            subtotal = price * item["quantity"]
            result.append({**item, "product": p, "subtotal_fcfa": subtotal})
            total += subtotal
    return {"items": result, "total_fcfa": total, "total_usd": round(total * FCFA_TO_USD, 2), "item_count": len(result)}

@api_router.put("/cart/{session_id}/{item_id}")
async def update_cart(session_id: str, item_id: str, data: CartItemUpdate):
    if data.quantity <= 0:
        await db.cart_items.delete_one({"id": item_id, "session_id": session_id})
    else:
        await db.cart_items.update_one({"id": item_id, "session_id": session_id}, {"$set": {"quantity": data.quantity}})
    return {"message": "Mis à jour"}

@api_router.delete("/cart/{session_id}/{item_id}")
async def remove_cart(session_id: str, item_id: str):
    await db.cart_items.delete_one({"id": item_id, "session_id": session_id})
    return {"message": "Supprimé"}

@api_router.delete("/cart/{session_id}")
async def clear_cart(session_id: str):
    await db.cart_items.delete_many({"session_id": session_id})
    return {"message": "Vidé"}

# FAVORITES
@api_router.post("/favorites/{session_id}/{product_id}")
async def add_fav(session_id: str, product_id: str):
    if not await db.favorites.find_one({"session_id": session_id, "product_id": product_id}):
        await db.favorites.insert_one({"id": str(uuid.uuid4()), "session_id": session_id, "product_id": product_id})
    return {"message": "Ajouté"}

@api_router.delete("/favorites/{session_id}/{product_id}")
async def del_fav(session_id: str, product_id: str):
    await db.favorites.delete_one({"session_id": session_id, "product_id": product_id})
    return {"message": "Supprimé"}

@api_router.get("/favorites/{session_id}")
async def get_favs(session_id: str):
    favs = await db.favorites.find({"session_id": session_id}, {"_id": 0}).to_list(100)
    return [p for f in favs if (p := await db.products.find_one({"id": f["product_id"], "status": "approved"}, {"_id": 0}))]

# SEED
@api_router.post("/seed")
async def seed():
    await db.categories.delete_many({})
    await db.products.delete_many({"seller_id": "system"})
    categories = [{"id": str(uuid.uuid4()), **c, "product_count": 0, "created_at": datetime.now(timezone.utc).isoformat()} for c in CATEGORIES_DATA]
    await db.categories.insert_many(categories)
    products = []
    for cat in categories:
        for i in range(35):
            country = random.choice(COUNTRIES)
            price = random.randint(2000, 150000)
            products.append({"id": str(uuid.uuid4()), "name": f"{cat['name']} - Article {i+1}", "slug": generate_slug(f"{cat['name']} {i+1}"), "description": f"Produit de qualité - {cat['name']}", "price_fcfa": price, "price_usd": round(price * FCFA_TO_USD, 2), "promo_price_fcfa": int(price * 0.8) if random.random() < 0.3 else None, "stock": random.randint(1, 100), "condition": random.choice(["neuf", "quasi-neuf", "occasion"]), "location": country, "city": random.choice(CITIES[country]), "category_slug": cat["slug"], "images": [cat["image"]], "tags": [cat["slug"]], "rating": round(random.uniform(3.5, 5), 1), "sales_count": random.randint(0, 500), "reviews_count": random.randint(0, 100), "seller_name": "Boutique Cloléo", "seller_id": "system", "is_featured": random.random() < 0.1, "status": "approved", "created_at": datetime.now(timezone.utc).isoformat()})
    await db.products.insert_many(products)
    for cat in categories:
        await db.categories.update_one({"id": cat["id"]}, {"$set": {"product_count": await db.products.count_documents({"category_slug": cat["slug"], "status": "approved"})}})
    if not await db.users.find_one({"email": "admin@cloleo.com"}):
        await db.users.insert_one({"id": str(uuid.uuid4()), "email": "admin@cloleo.com", "password": hash_password("admin123"), "name": "Admin Cloléo", "role": "admin", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"message": "OK", "categories": len(categories), "products": len(products), "admin": "admin@cloleo.com / admin123"}

# ============== FILE UPLOAD ==============

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload a file and return its URL"""
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    # Save file
    async with aiofiles.open(filepath, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    # Return URL
    return {"url": f"/api/uploads/{filename}", "filename": filename}

@api_router.post("/upload/multiple")
async def upload_multiple_files(files: List[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    """Upload multiple files"""
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    urls = []
    
    for file in files:
        if file.content_type not in allowed_types:
            continue
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"{uuid.uuid4()}.{ext}"
        filepath = UPLOAD_DIR / filename
        
        async with aiofiles.open(filepath, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        urls.append(f"/api/uploads/{filename}")
    
    return {"urls": urls}

# ============== ADMIN PRODUCTS PENDING (MISSING ENDPOINT) ==============

@api_router.get("/admin/products/pending")
async def admin_products_pending(user: dict = Depends(require_admin), page: int = 1, limit: int = 50):
    """Get pending products for admin review"""
    skip = (page - 1) * limit
    query = {"status": "pending"}
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    for p in products:
        seller = await db.users.find_one({"id": p["seller_id"]}, {"_id": 0, "password": 0})
        p["seller"] = seller
    return {"products": products, "total": await db.products.count_documents(query)}

# Fix: admin vendors toggle endpoint path
@api_router.put("/admin/vendors/{vendor_id}/toggle-status")
async def toggle_vendor_status(vendor_id: str, user: dict = Depends(require_admin)):
    vendor = await db.users.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Non trouvé")
    new_status = not vendor.get("is_active", True)
    await db.users.update_one({"id": vendor_id}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}

@api_router.put("/admin/vendors/{vendor_id}/verify")
async def verify_vendor(vendor_id: str, user: dict = Depends(require_admin)):
    """Verify a vendor (approve their account)"""
    vendor = await db.users.find_one({"id": vendor_id, "role": UserRole.VENDOR})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendeur non trouvé")
    await db.users.update_one({"id": vendor_id}, {"$set": {"is_verified": True, "is_active": True}})
    return {"message": "Vendeur vérifié et activé"}

# ============== FEATURED PRODUCTS SYSTEM ==============

@api_router.put("/admin/products/{product_id}/feature")
async def toggle_product_featured(product_id: str, user: dict = Depends(require_admin)):
    """Toggle product featured status"""
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    new_status = not product.get("is_featured", False)
    update_data = {
        "is_featured": new_status,
        "featured_at": datetime.now(timezone.utc).isoformat() if new_status else None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    return {"is_featured": new_status, "message": "En vedette" if new_status else "Retiré des vedettes"}

@api_router.get("/admin/products/featured")
async def admin_get_featured_products(user: dict = Depends(require_admin)):
    """Get all featured products for admin"""
    products = await db.products.find({"is_featured": True}, {"_id": 0}).to_list(100)
    for p in products:
        seller = await db.users.find_one({"id": p.get("seller_id")}, {"_id": 0, "password": 0})
        p["seller"] = seller
    return {"products": products, "total": len(products)}

# ============== DRIVER SYSTEM ==============

@api_router.post("/auth/register/driver")
async def register_driver(data: DriverRegister):
    """Register a new driver"""
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    driver = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "role": UserRole.DRIVER,
        "vehicle_type": data.vehicle_type,
        "license_number": data.license_number,
        "license_image": None,  # Will be updated after upload
        "city": data.city,
        "country": data.country,
        "is_active": False,  # Requires admin approval
        "is_verified": False,
        "status": "offline",  # available, busy, offline
        "current_location": None,
        "rating": 0,
        "total_deliveries": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(driver)
    return {"token": create_token(driver["id"], driver["role"]), "user": {k: v for k, v in driver.items() if k not in ["password", "_id"]}}

@api_router.post("/driver/upload-license")
async def upload_driver_license(file: UploadFile = File(...), user: dict = Depends(require_driver)):
    """Upload driver's license document"""
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Type de fichier non autorisé")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"license_{user['id']}_{uuid.uuid4()}.{ext}"
    filepath = UPLOAD_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    license_url = f"/api/uploads/{filename}"
    await db.users.update_one({"id": user["id"]}, {"$set": {"license_image": license_url}})
    
    return {"url": license_url, "message": "Permis uploadé avec succès"}

@api_router.get("/driver/dashboard")
async def driver_dashboard(user: dict = Depends(require_driver)):
    """Get driver dashboard data"""
    deliveries = await db.deliveries.find({"driver_id": user["id"]}, {"_id": 0}).to_list(100)
    pending_deliveries = [d for d in deliveries if d.get("status") == "pending"]
    completed_deliveries = [d for d in deliveries if d.get("status") == "completed"]
    
    return {
        "user": {k: v for k, v in user.items() if k != "password"},
        "stats": {
            "total_deliveries": len(deliveries),
            "pending_deliveries": len(pending_deliveries),
            "completed_deliveries": len(completed_deliveries),
            "rating": user.get("rating", 0),
            "total_earnings": sum(d.get("driver_fee", 0) for d in completed_deliveries)
        },
        "recent_deliveries": deliveries[:10]
    }

@api_router.put("/driver/status")
async def update_driver_status(data: DriverStatusUpdate, user: dict = Depends(require_driver)):
    """Update driver availability status"""
    if data.status not in ["available", "busy", "offline"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    await db.users.update_one({"id": user["id"]}, {"$set": {"status": data.status}})
    return {"status": data.status}

@api_router.put("/driver/location")
async def update_driver_location(data: DriverLocationUpdate, user: dict = Depends(require_driver)):
    """Update driver's current location"""
    location = {
        "latitude": data.latitude,
        "longitude": data.longitude,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_location": location}})
    return {"location": location}

@api_router.get("/driver/deliveries")
async def get_driver_deliveries(user: dict = Depends(require_driver), status: Optional[str] = None):
    """Get driver's deliveries"""
    query = {"driver_id": user["id"]}
    if status:
        query["status"] = status
    deliveries = await db.deliveries.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return deliveries

# ============== ADMIN DRIVER MANAGEMENT ==============

@api_router.get("/admin/drivers")
async def admin_get_drivers(user: dict = Depends(require_admin), page: int = 1, limit: int = 50, status: Optional[str] = None):
    """Get all drivers for admin"""
    skip = (page - 1) * limit
    query = {"role": UserRole.DRIVER}
    if status:
        query["status"] = status
    drivers = await db.users.find(query, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
    return {"drivers": drivers, "total": await db.users.count_documents(query)}

@api_router.put("/admin/drivers/{driver_id}/verify")
async def admin_verify_driver(driver_id: str, user: dict = Depends(require_admin)):
    """Verify a driver (approve their license)"""
    driver = await db.users.find_one({"id": driver_id, "role": UserRole.DRIVER})
    if not driver:
        raise HTTPException(status_code=404, detail="Livreur non trouvé")
    await db.users.update_one({"id": driver_id}, {"$set": {"is_verified": True, "is_active": True}})
    return {"message": "Livreur vérifié et activé"}

@api_router.put("/admin/drivers/{driver_id}/toggle")
async def admin_toggle_driver(driver_id: str, user: dict = Depends(require_admin)):
    """Toggle driver active status"""
    driver = await db.users.find_one({"id": driver_id, "role": UserRole.DRIVER})
    if not driver:
        raise HTTPException(status_code=404, detail="Livreur non trouvé")
    new_status = not driver.get("is_active", False)
    await db.users.update_one({"id": driver_id}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}

@api_router.delete("/admin/drivers/{driver_id}")
async def admin_delete_driver(driver_id: str, user: dict = Depends(require_admin)):
    """Delete a driver"""
    result = await db.users.delete_one({"id": driver_id, "role": UserRole.DRIVER})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Livreur non trouvé")
    return {"message": "Livreur supprimé"}

# ============== ORDERS SYSTEM ==============

@api_router.post("/orders")
async def create_order(data: CreateOrder, request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new order (can be guest or authenticated)"""
    user = None
    if credentials:
        try:
            payload = decode_token(credentials.credentials)
            user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        except:
            pass
    
    # Validate products and calculate totals
    items_with_details = []
    total_fcfa = 0
    vendor_ids = set()
    
    for item in data.items:
        product = await db.products.find_one({"id": item["product_id"], "status": "approved"}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=400, detail=f"Produit non trouvé: {item['product_id']}")
        
        price = product.get("promo_price_fcfa") or product["price_fcfa"]
        subtotal = price * item["quantity"]
        total_fcfa += subtotal
        vendor_ids.add(product["seller_id"])
        
        items_with_details.append({
            "product_id": product["id"],
            "product_name": product["name"],
            "product_image": product["images"][0] if product.get("images") else None,
            "quantity": item["quantity"],
            "unit_price_fcfa": price,
            "subtotal_fcfa": subtotal,
            "vendor_id": product["seller_id"],
            "vendor_name": product.get("seller_name", "Vendeur")
        })
    
    # Calculate delivery fee
    delivery_settings = await db.settings.find_one({"type": "delivery"}, {"_id": 0})
    base_delivery_fee = delivery_settings.get("base_delivery_fee", 1000) if delivery_settings else 1000
    delivery_fee = base_delivery_fee
    
    order = {
        "id": str(uuid.uuid4()),
        "order_number": f"CLO-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}",
        "customer_id": user["id"] if user else None,
        "customer_name": data.delivery_address.name,
        "customer_email": user["email"] if user else None,
        "customer_phone": data.delivery_address.phone,
        "items": items_with_details,
        "vendor_ids": list(vendor_ids),
        "delivery_address": data.delivery_address.dict(),
        "subtotal_fcfa": total_fcfa,
        "delivery_fee_fcfa": delivery_fee,
        "total_fcfa": total_fcfa + delivery_fee,
        "total_usd": round((total_fcfa + delivery_fee) * FCFA_TO_USD, 2),
        "payment_method": data.payment_method,
        "payment_status": "pending",
        "status": OrderStatus.PENDING,
        "driver_id": None,
        "driver_name": None,
        "driver_location": None,
        "notes": data.notes,
        "status_history": [
            {"status": OrderStatus.PENDING, "timestamp": datetime.now(timezone.utc).isoformat(), "note": "Commande créée"}
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order)
    
    # Broadcast new order to drivers in the delivery zone
    await manager.broadcast_to_room("drivers", {
        "type": "new_order",
        "order": {k: v for k, v in order.items() if k != "_id"}
    })
    
    return {k: v for k, v in order.items() if k != "_id"}

@api_router.get("/orders")
async def get_orders(user: dict = Depends(get_current_user), status: Optional[str] = None, page: int = 1, limit: int = 20):
    """Get orders based on user role"""
    skip = (page - 1) * limit
    query = {}
    
    if user["role"] == UserRole.CUSTOMER:
        query["customer_id"] = user["id"]
    elif user["role"] == UserRole.VENDOR:
        query["vendor_ids"] = user["id"]
    elif user["role"] == UserRole.DRIVER:
        # Drivers see available orders or their assigned orders
        if status == "available":
            query["status"] = OrderStatus.PENDING
        else:
            query["$or"] = [
                {"driver_id": user["id"]},
                {"status": OrderStatus.PENDING}
            ]
    # Admin sees all
    
    if status and status != "available":
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total, "page": page}

# Public order tracking (no auth required)
@api_router.get("/orders/track/{order_id}")
async def track_order(order_id: str):
    """Public endpoint for order tracking"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Add driver info if assigned
    if order.get("driver_id"):
        driver = await db.users.find_one({"id": order["driver_id"]}, {
            "_id": 0, "id": 1, "name": 1, "phone": 1, "vehicle_type": 1
        })
        order["driver"] = driver
        # Add real-time location from manager
        live_location = manager.get_driver_location(order["driver_id"])
        if live_location:
            order["driver_live_location"] = live_location
    
    # Remove sensitive info
    order.pop("customer_email", None)
    
    return order

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    """Get order details"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Check permission
    if user["role"] == UserRole.CUSTOMER and order.get("customer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    if user["role"] == UserRole.VENDOR and user["id"] not in order.get("vendor_ids", []):
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    if user["role"] == UserRole.DRIVER and order.get("driver_id") != user["id"] and order["status"] != OrderStatus.PENDING:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Add driver info if assigned
    if order.get("driver_id"):
        driver = await db.users.find_one({"id": order["driver_id"]}, {"_id": 0, "password": 0})
        order["driver"] = driver
        # Add real-time location from manager
        live_location = manager.get_driver_location(order["driver_id"])
        if live_location:
            order["driver_live_location"] = live_location
    
    return order

@api_router.put("/orders/{order_id}/accept")
async def accept_order(order_id: str, user: dict = Depends(require_driver)):
    """Driver accepts an order"""
    if not user.get("is_verified") or not user.get("is_active"):
        raise HTTPException(status_code=403, detail="Votre compte doit être vérifié pour accepter des commandes")
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    if order["status"] != OrderStatus.PENDING:
        raise HTTPException(status_code=400, detail="Cette commande n'est plus disponible")
    
    update_data = {
        "status": OrderStatus.ASSIGNED,
        "driver_id": user["id"],
        "driver_name": user["name"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add to status history
    status_entry = {
        "status": OrderStatus.ASSIGNED,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": f"Commande acceptée par {user['name']}"
    }
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": update_data, "$push": {"status_history": status_entry}}
    )
    
    # Broadcast update
    await manager.broadcast_to_room(f"order_{order_id}", {
        "type": "order_update",
        "order_id": order_id,
        "status": OrderStatus.ASSIGNED,
        "driver_id": user["id"],
        "driver_name": user["name"],
        "message": f"Livreur {user['name']} a accepté votre commande"
    })
    
    # Notify other drivers that order is taken
    await manager.broadcast_to_room("drivers", {
        "type": "order_taken",
        "order_id": order_id
    })
    
    return {"message": "Commande acceptée", "status": OrderStatus.ASSIGNED}

@api_router.put("/orders/{order_id}/pickup")
async def pickup_order(order_id: str, user: dict = Depends(require_driver)):
    """Driver confirms package pickup"""
    order = await db.orders.find_one({"id": order_id, "driver_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée ou non assignée à vous")
    
    if order["status"] != OrderStatus.ASSIGNED:
        raise HTTPException(status_code=400, detail="Statut invalide pour cette action")
    
    update_data = {
        "status": OrderStatus.PICKED_UP,
        "picked_up_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    status_entry = {
        "status": OrderStatus.PICKED_UP,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": "Colis récupéré par le livreur"
    }
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": update_data, "$push": {"status_history": status_entry}}
    )
    
    # Broadcast update
    await manager.broadcast_to_room(f"order_{order_id}", {
        "type": "order_update",
        "order_id": order_id,
        "status": OrderStatus.PICKED_UP,
        "message": "Le livreur a récupéré votre colis"
    })
    
    return {"message": "Colis récupéré", "status": OrderStatus.PICKED_UP}

@api_router.put("/orders/{order_id}/in-transit")
async def start_delivery(order_id: str, user: dict = Depends(require_driver)):
    """Driver starts delivery (in transit)"""
    order = await db.orders.find_one({"id": order_id, "driver_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    if order["status"] != OrderStatus.PICKED_UP:
        raise HTTPException(status_code=400, detail="Vous devez d'abord récupérer le colis")
    
    update_data = {
        "status": OrderStatus.IN_TRANSIT,
        "in_transit_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    status_entry = {
        "status": OrderStatus.IN_TRANSIT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": "Livreur en route vers la destination"
    }
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": update_data, "$push": {"status_history": status_entry}}
    )
    
    await manager.broadcast_to_room(f"order_{order_id}", {
        "type": "order_update",
        "order_id": order_id,
        "status": OrderStatus.IN_TRANSIT,
        "message": "Le livreur est en route vers vous"
    })
    
    return {"message": "En route", "status": OrderStatus.IN_TRANSIT}

@api_router.put("/orders/{order_id}/deliver")
async def deliver_order(order_id: str, user: dict = Depends(require_driver)):
    """Driver confirms delivery completed"""
    order = await db.orders.find_one({"id": order_id, "driver_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    if order["status"] not in [OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT]:
        raise HTTPException(status_code=400, detail="Statut invalide pour cette action")
    
    update_data = {
        "status": OrderStatus.DELIVERED,
        "delivered_at": datetime.now(timezone.utc).isoformat(),
        "payment_status": "paid" if order["payment_method"] == "cash" else order["payment_status"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    status_entry = {
        "status": OrderStatus.DELIVERED,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": "Livraison effectuée avec succès"
    }
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": update_data, "$push": {"status_history": status_entry}}
    )
    
    # Update driver stats
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"total_deliveries": 1}}
    )
    
    # Process dropshipping earnings if this is a dropshipped order
    if order.get("is_dropshipped"):
        await process_dropshipping_earnings(order_id)
    
    # Broadcast completion
    await manager.broadcast_to_room(f"order_{order_id}", {
        "type": "order_update",
        "order_id": order_id,
        "status": OrderStatus.DELIVERED,
        "message": "Votre commande a été livrée !"
    })
    
    return {"message": "Livraison effectuée", "status": OrderStatus.DELIVERED}

@api_router.put("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, reason: str = "Annulé", user: dict = Depends(get_current_user)):
    """Cancel an order"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Check permission
    can_cancel = (
        user["role"] == UserRole.ADMIN or
        (user["role"] == UserRole.CUSTOMER and order.get("customer_id") == user["id"]) or
        (user["role"] == UserRole.DRIVER and order.get("driver_id") == user["id"])
    )
    
    if not can_cancel:
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas annuler cette commande")
    
    if order["status"] in [OrderStatus.DELIVERED, OrderStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Cette commande ne peut plus être annulée")
    
    update_data = {
        "status": OrderStatus.CANCELLED,
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "cancellation_reason": reason,
        "cancelled_by": user["id"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    status_entry = {
        "status": OrderStatus.CANCELLED,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "note": f"Annulée: {reason}"
    }
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": update_data, "$push": {"status_history": status_entry}}
    )
    
    await manager.broadcast_to_room(f"order_{order_id}", {
        "type": "order_update",
        "order_id": order_id,
        "status": OrderStatus.CANCELLED,
        "message": f"Commande annulée: {reason}"
    })
    
    # If driver was assigned, make order available again for reassignment
    if order.get("driver_id") and user["role"] == UserRole.DRIVER:
        await manager.broadcast_to_room("drivers", {
            "type": "order_available",
            "order_id": order_id,
            "message": "Commande disponible"
        })
    
    return {"message": "Commande annulée", "status": OrderStatus.CANCELLED}

# Driver location update endpoint
@api_router.post("/driver/location/update")
async def update_driver_location_realtime(data: DriverLocationUpdate, user: dict = Depends(require_driver)):
    """Update driver location and broadcast to tracking rooms"""
    location = {
        "latitude": data.latitude,
        "longitude": data.longitude,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update in database
    await db.users.update_one({"id": user["id"]}, {"$set": {"current_location": location}})
    
    # Update in memory for real-time access
    manager.update_driver_location(user["id"], {
        **location,
        "driver_name": user["name"],
        "driver_phone": user.get("phone"),
        "vehicle_type": user.get("vehicle_type")
    })
    
    # Find active orders for this driver and broadcast location
    active_orders = await db.orders.find({
        "driver_id": user["id"],
        "status": {"$in": [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT]}
    }, {"_id": 0, "id": 1, "vendor_ids": 1}).to_list(100)
    
    for order in active_orders:
        await manager.broadcast_to_room(f"order_{order['id']}", {
            "type": "driver_location",
            "driver_id": user["id"],
            "location": location,
            "driver_name": user["name"]
        })
    
    # Broadcast to admin tracking room
    await manager.broadcast_to_room("admin_tracking", {
        "type": "driver_location",
        "driver_id": user["id"],
        "location": location,
        "driver_name": user["name"],
        "vehicle_type": user.get("vehicle_type")
    })
    
    return {"message": "Position mise à jour", "location": location}

# Get all active driver locations (for admin)
@api_router.get("/admin/drivers/locations")
async def get_all_driver_locations(user: dict = Depends(require_admin)):
    """Get all active driver locations"""
    # Get from memory (real-time) and database (last known)
    live_locations = manager.get_all_driver_locations()
    
    # Get active drivers from DB
    drivers = await db.users.find({
        "role": UserRole.DRIVER,
        "is_active": True,
        "status": {"$in": ["available", "busy"]}
    }, {"_id": 0, "password": 0}).to_list(100)
    
    result = []
    for driver in drivers:
        location = live_locations.get(driver["id"]) or driver.get("current_location")
        if location:
            result.append({
                "driver_id": driver["id"],
                "driver_name": driver["name"],
                "phone": driver.get("phone"),
                "vehicle_type": driver.get("vehicle_type"),
                "status": driver.get("status"),
                "location": location
            })
    
    return {"drivers": result}

# Admin orders management
@api_router.get("/admin/orders")
async def admin_get_orders(user: dict = Depends(require_admin), status: Optional[str] = None, page: int = 1, limit: int = 50):
    """Get all orders for admin"""
    skip = (page - 1) * limit
    query = {}
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    # Enrich with driver info
    for order in orders:
        if order.get("driver_id"):
            driver = await db.users.find_one({"id": order["driver_id"]}, {"_id": 0, "password": 0})
            order["driver"] = driver
    
    return {"orders": orders, "total": total, "page": page}

@api_router.get("/admin/orders/stats")
async def admin_order_stats(user: dict = Depends(require_admin)):
    """Get order statistics"""
    total = await db.orders.count_documents({})
    pending = await db.orders.count_documents({"status": OrderStatus.PENDING})
    assigned = await db.orders.count_documents({"status": OrderStatus.ASSIGNED})
    in_transit = await db.orders.count_documents({"status": {"$in": [OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT]}})
    delivered = await db.orders.count_documents({"status": OrderStatus.DELIVERED})
    cancelled = await db.orders.count_documents({"status": OrderStatus.CANCELLED})
    
    # Today's orders
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders = await db.orders.count_documents({"created_at": {"$gte": today.isoformat()}})
    today_delivered = await db.orders.count_documents({
        "status": OrderStatus.DELIVERED,
        "delivered_at": {"$gte": today.isoformat()}
    })
    
    # Revenue
    delivered_orders = await db.orders.find({"status": OrderStatus.DELIVERED}, {"total_fcfa": 1, "_id": 0}).to_list(10000)
    total_revenue = sum(o.get("total_fcfa", 0) for o in delivered_orders)
    
    return {
        "total": total,
        "pending": pending,
        "assigned": assigned,
        "in_transit": in_transit,
        "delivered": delivered,
        "cancelled": cancelled,
        "today_orders": today_orders,
        "today_delivered": today_delivered,
        "total_revenue_fcfa": total_revenue
    }

# ============== CHAT / MESSAGING SYSTEM ==============

@api_router.post("/conversations/start")
async def start_conversation(data: ConversationCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Start a new conversation about a product"""
    user = None
    if credentials:
        try:
            payload = decode_token(credentials.credentials)
            user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        except:
            pass
    
    if not user:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    seller_id = None
    seller_type = None
    product_name = None
    product_image = None
    
    # Determine who to chat with based on product type
    if data.dropshipped_product_id:
        # Dropshipped product - chat with dropshipper
        dp = await db.dropshipped_products.find_one({"id": data.dropshipped_product_id}, {"_id": 0})
        if not dp:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        seller_id = dp["dropshipper_id"]
        seller_type = "dropshipper"
        product_name = dp.get("original_name")
        product_image = dp.get("original_images", [None])[0]
        product_id = data.dropshipped_product_id
        
    elif data.product_id:
        # Original product - chat with vendor
        product = await db.products.find_one({"id": data.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        seller_id = product["seller_id"]
        seller_type = "vendor"
        product_name = product["name"]
        product_image = product.get("images", [None])[0]
        product_id = data.product_id
    else:
        raise HTTPException(status_code=400, detail="product_id ou dropshipped_product_id requis")
    
    # Check if conversation already exists
    existing = await db.conversations.find_one({
        "customer_id": user["id"],
        "seller_id": seller_id,
        "product_id": product_id
    }, {"_id": 0})
    
    if existing:
        return existing
    
    # Get seller info
    seller = await db.users.find_one({"id": seller_id}, {"_id": 0, "password": 0})
    
    conversation = {
        "id": str(uuid.uuid4()),
        "product_id": product_id,
        "product_name": product_name,
        "product_image": product_image,
        "customer_id": user["id"],
        "customer_name": user.get("name"),
        "customer_email": user.get("email"),
        "seller_id": seller_id,
        "seller_name": seller.get("shop_name") or seller.get("name") if seller else "Vendeur",
        "seller_type": seller_type,
        "last_message": None,
        "last_message_at": None,
        "unread_customer": 0,
        "unread_seller": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.conversations.insert_one(conversation)
    # Remove _id that MongoDB adds
    conversation.pop("_id", None)
    return conversation

@api_router.get("/conversations")
async def get_my_conversations(user: dict = Depends(get_current_user)):
    """Get all conversations for current user (customer, vendor or dropshipper)"""
    query = {"$or": [
        {"customer_id": user["id"]},
        {"seller_id": user["id"]}
    ]}
    
    conversations = await db.conversations.find(query, {"_id": 0}).sort("updated_at", -1).to_list(100)
    
    # Mark which side the user is on
    for conv in conversations:
        conv["is_seller"] = conv["seller_id"] == user["id"]
        conv["other_party_name"] = conv["seller_name"] if conv["customer_id"] == user["id"] else conv["customer_name"]
        conv["unread_count"] = conv["unread_seller"] if conv["seller_id"] == user["id"] else conv["unread_customer"]
    
    return conversations

@api_router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    """Get a specific conversation with messages"""
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    # Check access
    if conversation["customer_id"] != user["id"] and conversation["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Get messages
    messages = await db.messages.find(
        {"conversation_id": conversation_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    
    # Mark messages as read
    is_seller = conversation["seller_id"] == user["id"]
    if is_seller:
        await db.conversations.update_one({"id": conversation_id}, {"$set": {"unread_seller": 0}})
        await db.messages.update_many(
            {"conversation_id": conversation_id, "sender_id": {"$ne": user["id"]}, "is_read": False},
            {"$set": {"is_read": True}}
        )
    else:
        await db.conversations.update_one({"id": conversation_id}, {"$set": {"unread_customer": 0}})
        await db.messages.update_many(
            {"conversation_id": conversation_id, "sender_id": {"$ne": user["id"]}, "is_read": False},
            {"$set": {"is_read": True}}
        )
    
    return {"conversation": conversation, "messages": messages}

@api_router.post("/conversations/{conversation_id}/messages")
async def send_message(conversation_id: str, data: MessageCreate, user: dict = Depends(get_current_user)):
    """Send a message in a conversation"""
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    # Check access
    if conversation["customer_id"] != user["id"] and conversation["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    is_seller = conversation["seller_id"] == user["id"]
    
    message = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": user["id"],
        "sender_name": user.get("shop_name") or user.get("name"),
        "sender_type": "seller" if is_seller else "customer",
        "content": data.content,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.messages.insert_one(message)
    
    # Update conversation
    update_data = {
        "last_message": data.content[:100],
        "last_message_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Increment unread count for the other party
    if is_seller:
        await db.conversations.update_one(
            {"id": conversation_id},
            {"$set": update_data, "$inc": {"unread_customer": 1}}
        )
    else:
        await db.conversations.update_one(
            {"id": conversation_id},
            {"$set": update_data, "$inc": {"unread_seller": 1}}
        )
    
    # Broadcast via WebSocket
    await manager.broadcast_to_room(f"chat_{conversation_id}", {
        "type": "new_message",
        "message": {k: v for k, v in message.items() if k != "_id"}
    })
    
    return {k: v for k, v in message.items() if k != "_id"}

@api_router.get("/vendor/conversations")
async def vendor_get_conversations(user: dict = Depends(require_vendor)):
    """Get all conversations for vendor"""
    conversations = await db.conversations.find(
        {"seller_id": user["id"], "seller_type": "vendor"}, {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    for conv in conversations:
        conv["unread_count"] = conv.get("unread_seller", 0)
    
    return conversations

@api_router.get("/dropshipper/conversations")
async def dropshipper_get_conversations(user: dict = Depends(require_dropshipper)):
    """Get all conversations for dropshipper"""
    conversations = await db.conversations.find(
        {"seller_id": user["id"], "seller_type": "dropshipper"}, {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    for conv in conversations:
        conv["unread_count"] = conv.get("unread_seller", 0)
    
    return conversations

# WebSocket for chat
@app.websocket("/ws/chat/{conversation_id}")
async def chat_websocket(websocket: WebSocket, conversation_id: str):
    """WebSocket for real-time chat messages"""
    await manager.connect(websocket, f"chat_{conversation_id}")
    try:
        while True:
            data = await websocket.receive_text()
            # Messages are sent via POST API, WebSocket is for receiving only
    except WebSocketDisconnect:
        await manager.disconnect(websocket, f"chat_{conversation_id}")

# ============== DROPSHIPPING SYSTEM ==============

@api_router.post("/auth/register/dropshipper")
async def register_dropshipper(data: DropshipperRegister):
    """Register a new dropshipper"""
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    dropshipper = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "role": UserRole.DROPSHIPPER,
        "shop_name": data.shop_name,
        "shop_slug": generate_slug(data.shop_name),
        "shop_description": data.shop_description,
        "is_active": True,
        "is_verified": True,
        "total_earnings": 0,
        "total_sales": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(dropshipper)
    return {"token": create_token(dropshipper["id"], dropshipper["role"]), "user": {k: v for k, v in dropshipper.items() if k not in ["password", "_id"]}}

@api_router.get("/dropshipper/dashboard")
async def dropshipper_dashboard(user: dict = Depends(require_dropshipper)):
    """Get dropshipper dashboard data"""
    # Get dropshipped products
    dropshipped_products = await db.dropshipped_products.find(
        {"dropshipper_id": user["id"]}, {"_id": 0}
    ).to_list(1000)
    
    # Get dropshipper orders
    orders = await db.orders.find(
        {"dropshipper_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Calculate stats
    total_orders = await db.orders.count_documents({"dropshipper_id": user["id"]})
    completed_orders = await db.orders.count_documents({
        "dropshipper_id": user["id"],
        "status": OrderStatus.DELIVERED
    })
    
    # Get earnings
    earnings = await db.dropshipper_earnings.find(
        {"dropshipper_id": user["id"]}, {"_id": 0}
    ).to_list(1000)
    total_earnings = sum(e.get("dropshipper_share", 0) for e in earnings)
    
    return {
        "user": {k: v for k, v in user.items() if k != "password"},
        "stats": {
            "total_products": len(dropshipped_products),
            "active_products": len([p for p in dropshipped_products if p.get("is_active", True)]),
            "total_orders": total_orders,
            "completed_orders": completed_orders,
            "total_earnings_fcfa": total_earnings,
            "total_earnings_usd": round(total_earnings * FCFA_TO_USD, 2)
        },
        "recent_orders": orders,
        "products": dropshipped_products[:5]
    }

@api_router.get("/dropshipper/catalog")
async def dropshipper_catalog(
    user: dict = Depends(require_dropshipper),
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """Get all available products for dropshipping"""
    query = {"status": "approved"}
    if category:
        query["category_slug"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Mark which products are already dropshipped by this user
    dropshipped_ids = set()
    dropshipped = await db.dropshipped_products.find(
        {"dropshipper_id": user["id"]}, {"original_product_id": 1}
    ).to_list(1000)
    dropshipped_ids = {d["original_product_id"] for d in dropshipped}
    
    for p in products:
        p["is_dropshipped"] = p["id"] in dropshipped_ids
    
    return {"products": products, "total": total, "page": page, "total_pages": (total + limit - 1) // limit}

@api_router.post("/dropshipper/products")
async def create_dropshipped_product(data: DropshippedProductCreate, user: dict = Depends(require_dropshipper)):
    """Add a product to dropshipper's catalog with custom price/description"""
    # Check original product exists
    original = await db.products.find_one({"id": data.original_product_id, "status": "approved"}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Produit original non trouvé")
    
    # Check not already dropshipped
    existing = await db.dropshipped_products.find_one({
        "dropshipper_id": user["id"],
        "original_product_id": data.original_product_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Produit déjà dans votre catalogue")
    
    # Selling price must be >= original price
    if data.selling_price_fcfa < original["price_fcfa"]:
        raise HTTPException(status_code=400, detail=f"Le prix de vente doit être supérieur ou égal à {original['price_fcfa']} FCFA")
    
    # Calculate margin
    margin = data.selling_price_fcfa - original["price_fcfa"]
    
    dropshipped_product = {
        "id": str(uuid.uuid4()),
        "dropshipper_id": user["id"],
        "dropshipper_name": user.get("shop_name") or user["name"],
        "dropshipper_shop_slug": user.get("shop_slug"),
        "original_product_id": original["id"],
        "original_name": original["name"],
        "original_description": original["description"],
        "original_price_fcfa": original["price_fcfa"],
        "original_images": original.get("images", []),
        "original_category_slug": original.get("category_slug"),
        "original_vendor_id": original.get("seller_id"),
        "original_vendor_name": original.get("seller_name"),
        "custom_description": data.custom_description or original["description"],
        "selling_price_fcfa": data.selling_price_fcfa,
        "selling_price_usd": round(data.selling_price_fcfa * FCFA_TO_USD, 2),
        "margin_fcfa": margin,
        "dropshipper_share_fcfa": margin // 2,  # 50%
        "admin_share_fcfa": margin - (margin // 2),  # 50%
        "is_active": True,
        "sales_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.dropshipped_products.insert_one(dropshipped_product)
    return {k: v for k, v in dropshipped_product.items() if k != "_id"}

@api_router.get("/dropshipper/products")
async def get_dropshipper_products(user: dict = Depends(require_dropshipper), status: Optional[str] = None):
    """Get dropshipper's product catalog"""
    query = {"dropshipper_id": user["id"]}
    if status == "active":
        query["is_active"] = True
    elif status == "inactive":
        query["is_active"] = False
    
    products = await db.dropshipped_products.find(query, {"_id": 0}).to_list(1000)
    return products

@api_router.get("/dropshipper/products/{product_id}")
async def get_dropshipped_product(product_id: str, user: dict = Depends(require_dropshipper)):
    """Get specific dropshipped product"""
    product = await db.dropshipped_products.find_one({
        "id": product_id,
        "dropshipper_id": user["id"]
    }, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return product

@api_router.put("/dropshipper/products/{product_id}")
async def update_dropshipped_product(product_id: str, data: DropshippedProductUpdate, user: dict = Depends(require_dropshipper)):
    """Update dropshipped product (description, price, status)"""
    product = await db.dropshipped_products.find_one({
        "id": product_id,
        "dropshipper_id": user["id"]
    })
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.custom_description is not None:
        update_data["custom_description"] = data.custom_description
    
    if data.selling_price_fcfa is not None:
        if data.selling_price_fcfa < product["original_price_fcfa"]:
            raise HTTPException(status_code=400, detail=f"Le prix doit être >= {product['original_price_fcfa']} FCFA")
        
        margin = data.selling_price_fcfa - product["original_price_fcfa"]
        update_data["selling_price_fcfa"] = data.selling_price_fcfa
        update_data["selling_price_usd"] = round(data.selling_price_fcfa * FCFA_TO_USD, 2)
        update_data["margin_fcfa"] = margin
        update_data["dropshipper_share_fcfa"] = margin // 2
        update_data["admin_share_fcfa"] = margin - (margin // 2)
    
    if data.is_active is not None:
        update_data["is_active"] = data.is_active
    
    await db.dropshipped_products.update_one({"id": product_id}, {"$set": update_data})
    updated = await db.dropshipped_products.find_one({"id": product_id}, {"_id": 0})
    return updated

@api_router.delete("/dropshipper/products/{product_id}")
async def delete_dropshipped_product(product_id: str, user: dict = Depends(require_dropshipper)):
    """Remove product from dropshipper's catalog"""
    result = await db.dropshipped_products.delete_one({
        "id": product_id,
        "dropshipper_id": user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return {"message": "Produit supprimé"}

@api_router.get("/dropshipper/orders")
async def get_dropshipper_orders(
    user: dict = Depends(require_dropshipper),
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """Get dropshipper's orders"""
    query = {"dropshipper_id": user["id"]}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    total = await db.orders.count_documents(query)
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {"orders": orders, "total": total, "page": page}

@api_router.get("/dropshipper/earnings")
async def get_dropshipper_earnings(user: dict = Depends(require_dropshipper), page: int = 1, limit: int = 50):
    """Get dropshipper's earnings history"""
    skip = (page - 1) * limit
    total = await db.dropshipper_earnings.count_documents({"dropshipper_id": user["id"]})
    earnings = await db.dropshipper_earnings.find(
        {"dropshipper_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total_earned = sum(e.get("dropshipper_share", 0) for e in earnings)
    
    return {"earnings": earnings, "total": total, "total_earned_fcfa": total_earned, "page": page}

# Create order for dropshipped product (with automatic margin split)
class DropshippedOrderCreate(BaseModel):
    dropshipped_product_id: str
    quantity: int = 1
    delivery_address: OrderAddress
    payment_method: str = "cash"
    notes: Optional[str] = None

@api_router.post("/shop/order")
async def create_dropshipped_order(data: DropshippedOrderCreate, request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create order for a dropshipped product - handles margin split automatically"""
    user = None
    if credentials:
        try:
            payload = decode_token(credentials.credentials)
            user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        except:
            pass
    
    # Get the dropshipped product
    dropshipped = await db.dropshipped_products.find_one({
        "id": data.dropshipped_product_id,
        "is_active": True
    }, {"_id": 0})
    
    if not dropshipped:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Calculate totals
    unit_price = dropshipped["selling_price_fcfa"]
    subtotal = unit_price * data.quantity
    margin_total = dropshipped["margin_fcfa"] * data.quantity
    dropshipper_share = dropshipped["dropshipper_share_fcfa"] * data.quantity
    admin_share = dropshipped["admin_share_fcfa"] * data.quantity
    vendor_amount = dropshipped["original_price_fcfa"] * data.quantity
    
    # Get delivery fee
    delivery_settings = await db.settings.find_one({"type": "delivery"}, {"_id": 0})
    delivery_fee = delivery_settings.get("base_delivery_fee", 1000) if delivery_settings else 1000
    
    order = {
        "id": str(uuid.uuid4()),
        "order_number": f"CLO-DS-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}",
        "is_dropshipped": True,
        "dropshipper_id": dropshipped["dropshipper_id"],
        "dropshipper_name": dropshipped.get("dropshipper_name"),
        "customer_id": user["id"] if user else None,
        "customer_name": data.delivery_address.name,
        "customer_email": user["email"] if user else None,
        "customer_phone": data.delivery_address.phone,
        "items": [{
            "dropshipped_product_id": dropshipped["id"],
            "original_product_id": dropshipped["original_product_id"],
            "product_name": dropshipped["original_name"],
            "product_image": dropshipped["original_images"][0] if dropshipped.get("original_images") else None,
            "quantity": data.quantity,
            "unit_price_fcfa": unit_price,
            "subtotal_fcfa": subtotal,
            "vendor_id": dropshipped["original_vendor_id"],
            "vendor_name": dropshipped.get("original_vendor_name", "Vendeur"),
            "vendor_amount_fcfa": vendor_amount,
            "margin_fcfa": margin_total,
            "dropshipper_share_fcfa": dropshipper_share,
            "admin_share_fcfa": admin_share
        }],
        "vendor_ids": [dropshipped["original_vendor_id"]],
        "delivery_address": data.delivery_address.dict(),
        "subtotal_fcfa": subtotal,
        "delivery_fee_fcfa": delivery_fee,
        "total_fcfa": subtotal + delivery_fee,
        "total_usd": round((subtotal + delivery_fee) * FCFA_TO_USD, 2),
        "payment_method": data.payment_method,
        "payment_status": "pending",
        "status": OrderStatus.PENDING,
        "driver_id": None,
        "driver_name": None,
        "notes": data.notes,
        "margin_breakdown": {
            "total_margin_fcfa": margin_total,
            "vendor_receives_fcfa": vendor_amount,
            "dropshipper_receives_fcfa": dropshipper_share,
            "admin_receives_fcfa": admin_share
        },
        "status_history": [
            {"status": OrderStatus.PENDING, "timestamp": datetime.now(timezone.utc).isoformat(), "note": "Commande dropshipping créée"}
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order)
    
    # Update sales count on dropshipped product
    await db.dropshipped_products.update_one(
        {"id": data.dropshipped_product_id},
        {"$inc": {"sales_count": data.quantity}}
    )
    
    # Broadcast to drivers
    await manager.broadcast_to_room("drivers", {
        "type": "new_order",
        "order": {k: v for k, v in order.items() if k != "_id"}
    })
    
    return {k: v for k, v in order.items() if k != "_id"}

# Process dropshipping earnings when order is delivered
async def process_dropshipping_earnings(order_id: str):
    """Called when a dropshipped order is delivered to record earnings"""
    order = await db.orders.find_one({"id": order_id, "is_dropshipped": True}, {"_id": 0})
    if not order:
        return
    
    for item in order.get("items", []):
        earning = {
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "order_number": order.get("order_number"),
            "dropshipper_id": order.get("dropshipper_id"),
            "dropshipper_name": order.get("dropshipper_name"),
            "vendor_id": item.get("vendor_id"),
            "product_name": item.get("product_name"),
            "quantity": item.get("quantity"),
            "selling_price_fcfa": item.get("unit_price_fcfa"),
            "total_margin": item.get("margin_fcfa", 0),
            "dropshipper_share": item.get("dropshipper_share_fcfa", 0),
            "admin_share": item.get("admin_share_fcfa", 0),
            "vendor_amount": item.get("vendor_amount_fcfa", 0),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.dropshipper_earnings.insert_one(earning)
    
    # Update dropshipper totals
    await db.users.update_one(
        {"id": order.get("dropshipper_id")},
        {"$inc": {
            "total_earnings": order.get("margin_breakdown", {}).get("dropshipper_receives_fcfa", 0),
            "total_sales": 1
        }}
    )

# Public dropshipper shop
@api_router.get("/shop/{shop_slug}")
async def get_dropshipper_shop(shop_slug: str, page: int = 1, limit: int = 20):
    """Get public dropshipper shop"""
    # Find dropshipper by shop slug
    dropshipper = await db.users.find_one({
        "shop_slug": shop_slug,
        "role": UserRole.DROPSHIPPER,
        "is_active": True
    }, {"_id": 0, "password": 0})
    
    if not dropshipper:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    
    # Get active dropshipped products
    skip = (page - 1) * limit
    query = {"dropshipper_id": dropshipper["id"], "is_active": True}
    total = await db.dropshipped_products.count_documents(query)
    products = await db.dropshipped_products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    return {
        "shop": {
            "name": dropshipper.get("shop_name"),
            "description": dropshipper.get("shop_description"),
            "slug": dropshipper.get("shop_slug")
        },
        "products": products,
        "total": total,
        "page": page,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.get("/shop/{shop_slug}/product/{product_id}")
async def get_shop_product(shop_slug: str, product_id: str):
    """Get single product from dropshipper shop"""
    dropshipper = await db.users.find_one({
        "shop_slug": shop_slug,
        "role": UserRole.DROPSHIPPER,
        "is_active": True
    })
    if not dropshipper:
        raise HTTPException(status_code=404, detail="Boutique non trouvée")
    
    product = await db.dropshipped_products.find_one({
        "id": product_id,
        "dropshipper_id": dropshipper["id"],
        "is_active": True
    }, {"_id": 0})
    
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    return product


# ============== VENDOR SHOP (PUBLIC) ==============

@api_router.get("/vendor-shop/{seller_id}")
async def get_vendor_shop(seller_id: str, page: int = 1, limit: int = 20):
    """Get public vendor shop with all their products"""
    # Find vendor by ID
    vendor = await db.users.find_one({
        "id": seller_id,
        "role": UserRole.VENDOR,
        "is_active": True
    }, {"_id": 0, "password": 0})
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendeur non trouvé")
    
    # Get approved products from this vendor
    skip = (page - 1) * limit
    query = {"seller_id": seller_id, "status": "approved"}
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Compute vendor stats
    total_products = await db.products.count_documents({"seller_id": seller_id, "status": "approved"})
    total_sales = sum(p.get("sales_count", 0) for p in products)
    avg_rating = sum(p.get("rating", 0) for p in products) / max(1, len(products)) if products else 0
    
    return {
        "shop": {
            "id": vendor.get("id"),
            "name": vendor.get("shop_name") or vendor.get("name"),
            "description": vendor.get("shop_description", ""),
            "location": vendor.get("city", "Abidjan"),
            "country": vendor.get("location", "Côte d'Ivoire"),
            "created_at": vendor.get("created_at"),
            "total_products": total_products,
            "total_sales": total_sales,
            "avg_rating": round(avg_rating, 1),
            "is_verified": vendor.get("is_verified", False)
        },
        "products": products,
        "total": total,
        "page": page,
        "total_pages": (total + limit - 1) // limit
    }


# ============== ADMIN DROPSHIPPING MANAGEMENT ==============

@api_router.get("/admin/dropshippers")
async def admin_get_dropshippers(user: dict = Depends(require_admin), page: int = 1, limit: int = 50):
    """Get all dropshippers for admin"""
    skip = (page - 1) * limit
    query = {"role": UserRole.DROPSHIPPER}
    
    dropshippers = await db.users.find(query, {"_id": 0, "password": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Add stats for each dropshipper
    for d in dropshippers:
        d["product_count"] = await db.dropshipped_products.count_documents({"dropshipper_id": d["id"]})
        d["order_count"] = await db.orders.count_documents({"dropshipper_id": d["id"]})
        earnings = await db.dropshipper_earnings.find({"dropshipper_id": d["id"]}, {"dropshipper_share": 1}).to_list(1000)
        d["total_earnings"] = sum(e.get("dropshipper_share", 0) for e in earnings)
    
    total = await db.users.count_documents(query)
    return {"dropshippers": dropshippers, "total": total}

@api_router.put("/admin/dropshippers/{dropshipper_id}/toggle")
async def admin_toggle_dropshipper(dropshipper_id: str, user: dict = Depends(require_admin)):
    """Toggle dropshipper active status"""
    dropshipper = await db.users.find_one({"id": dropshipper_id, "role": UserRole.DROPSHIPPER})
    if not dropshipper:
        raise HTTPException(status_code=404, detail="Dropshipper non trouvé")
    
    new_status = not dropshipper.get("is_active", True)
    await db.users.update_one({"id": dropshipper_id}, {"$set": {"is_active": new_status}})
    return {"is_active": new_status}

@api_router.get("/admin/dropshipping/stats")
async def admin_dropshipping_stats(user: dict = Depends(require_admin)):
    """Get dropshipping statistics for admin"""
    total_dropshippers = await db.users.count_documents({"role": UserRole.DROPSHIPPER})
    active_dropshippers = await db.users.count_documents({"role": UserRole.DROPSHIPPER, "is_active": True})
    total_dropshipped_products = await db.dropshipped_products.count_documents({})
    active_products = await db.dropshipped_products.count_documents({"is_active": True})
    
    # Get all earnings
    all_earnings = await db.dropshipper_earnings.find({}, {"_id": 0}).to_list(10000)
    total_margins = sum(e.get("total_margin", 0) for e in all_earnings)
    admin_earnings = sum(e.get("admin_share", 0) for e in all_earnings)
    dropshipper_payouts = sum(e.get("dropshipper_share", 0) for e in all_earnings)
    
    # Get recent transactions
    recent_earnings = await db.dropshipper_earnings.find({}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    
    return {
        "stats": {
            "total_dropshippers": total_dropshippers,
            "active_dropshippers": active_dropshippers,
            "total_products": total_dropshipped_products,
            "active_products": active_products,
            "total_margins_fcfa": total_margins,
            "admin_earnings_fcfa": admin_earnings,
            "dropshipper_payouts_fcfa": dropshipper_payouts
        },
        "recent_transactions": recent_earnings
    }

@api_router.get("/admin/dropshipping/transactions")
async def admin_dropshipping_transactions(user: dict = Depends(require_admin), page: int = 1, limit: int = 50):
    """Get all dropshipping transactions"""
    skip = (page - 1) * limit
    total = await db.dropshipper_earnings.count_documents({})
    transactions = await db.dropshipper_earnings.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {"transactions": transactions, "total": total, "page": page}
# ============== STATIC FILES (UPLOADS) ==============

app.include_router(api_router)

# Mount static files for uploads AFTER router to avoid conflicts
from fastapi.responses import FileResponse

@app.get("/api/uploads/{filename}")
async def serve_upload(filename: str):
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    return FileResponse(filepath)

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','), allow_methods=["*"], allow_headers=["*"])

# ============== WEBSOCKET ENDPOINTS ==============

@app.websocket("/ws/orders/{room}")
async def websocket_order_tracking(websocket: WebSocket, room: str):
    """WebSocket for real-time order tracking
    Rooms:
    - order_{order_id}: Track specific order (for customer, vendor, admin)
    - drivers: All available orders for drivers
    - admin_tracking: Admin tracking all drivers
    - vendor_{vendor_id}: Vendor's orders
    """
    await manager.connect(websocket, room)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                
                # Handle ping/pong for keep-alive
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                
                # Handle driver location update via WebSocket
                elif message.get("type") == "location_update":
                    driver_id = message.get("driver_id")
                    location = message.get("location")
                    if driver_id and location:
                        manager.update_driver_location(driver_id, location)
                        # Broadcast to admin
                        await manager.broadcast_to_room("admin_tracking", {
                            "type": "driver_location",
                            "driver_id": driver_id,
                            "location": location
                        })
                
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)

@app.websocket("/ws/driver/{driver_id}")
async def websocket_driver(websocket: WebSocket, driver_id: str):
    """WebSocket for driver to receive new orders and updates"""
    room = f"driver_{driver_id}"
    await manager.connect(websocket, room)
    await manager.connect(websocket, "drivers")  # Also join global drivers room
    
    try:
        # Send current available orders
        available_orders = await db.orders.find(
            {"status": OrderStatus.PENDING},
            {"_id": 0}
        ).sort("created_at", -1).limit(20).to_list(20)
        
        await websocket.send_json({
            "type": "available_orders",
            "orders": available_orders
        })
        
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong"})
                
                elif message.get("type") == "location_update":
                    location = message.get("location")
                    if location:
                        manager.update_driver_location(driver_id, {
                            **location,
                            "driver_id": driver_id
                        })
                        
                        # Find active orders and broadcast
                        active_orders = await db.orders.find({
                            "driver_id": driver_id,
                            "status": {"$in": [OrderStatus.ASSIGNED, OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT]}
                        }, {"_id": 0, "id": 1}).to_list(10)
                        
                        for order in active_orders:
                            await manager.broadcast_to_room(f"order_{order['id']}", {
                                "type": "driver_location",
                                "driver_id": driver_id,
                                "location": location
                            })
                        
                        await manager.broadcast_to_room("admin_tracking", {
                            "type": "driver_location",
                            "driver_id": driver_id,
                            "location": location
                        })
                        
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
        manager.disconnect(websocket, "drivers")

@app.on_event("shutdown")
async def shutdown():
    client.close()

