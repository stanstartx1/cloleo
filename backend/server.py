from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, Request, UploadFile, File, Form
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

# ============== CONSTANTS ==============

class UserRole:
    CUSTOMER = "customer"
    VENDOR = "vendor"
    ADMIN = "admin"
    DRIVER = "driver"

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
    user = {"id": str(uuid.uuid4()), "email": data.email, "password": hash_password(data.password), "name": data.name, "role": data.role, "phone": data.phone, "created_at": datetime.now(timezone.utc).isoformat(), "is_active": True, "subscription_plan": "free" if data.role == UserRole.VENDOR else None, "subscription_expires": None, "shop_name": None, "location": None, "city": None}
    await db.users.insert_one(user)
    return {"token": create_token(user["id"], user["role"]), "user": {k: v for k, v in user.items() if k not in ["password", "_id"]}}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Identifiants incorrects")
    if not user.get("is_active", True):
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

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"$or": [{"id": product_id}, {"slug": product_id}], "status": "approved"}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Non trouvé")
    return p

@api_router.get("/products/{product_id}/similar")
async def similar(product_id: str, limit: int = 6):
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Non trouvé")
    return await db.products.find({"category_slug": p["category_slug"], "id": {"$ne": product_id}, "status": "approved"}, {"_id": 0}).limit(limit).to_list(limit)

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

@app.on_event("shutdown")
async def shutdown():
    client.close()
