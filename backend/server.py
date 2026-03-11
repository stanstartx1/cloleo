from fastapi import FastAPI, APIRouter, HTTPException, Query, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import random
import hashlib
import jwt
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Stripe
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Create the main app
app = FastAPI(title="Cloléo API", version="2.0.0")

# Create routers
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== SUBSCRIPTION PLANS ==============

SUBSCRIPTION_PLANS = {
    "free": {
        "id": "free",
        "name": "Débutant",
        "name_en": "Starter",
        "emoji": "🌱",
        "price_fcfa": 0,
        "price_usd": 0.00,
        "max_products": 3,
        "commission_percent": 10,
        "features": [
            "3 produits maximum",
            "Commission de 10%",
            "Support par email",
            "Statistiques basiques"
        ],
        "badge": None,
        "priority_support": False,
        "featured_products": 0,
        "analytics": "basic"
    },
    "artisan": {
        "id": "artisan",
        "name": "Artisan",
        "name_en": "Artisan",
        "emoji": "🎨",
        "price_fcfa": 5000,
        "price_usd": 8.00,
        "max_products": 25,
        "commission_percent": 7,
        "features": [
            "25 produits maximum",
            "Commission de 7%",
            "Badge vendeur vérifié",
            "Support prioritaire",
            "Statistiques détaillées"
        ],
        "badge": "verified",
        "priority_support": True,
        "featured_products": 2,
        "analytics": "detailed"
    },
    "commercant": {
        "id": "commercant",
        "name": "Commerçant",
        "name_en": "Merchant",
        "emoji": "🏪",
        "price_fcfa": 15000,
        "price_usd": 24.00,
        "max_products": 100,
        "commission_percent": 5,
        "features": [
            "100 produits maximum",
            "Commission de 5%",
            "Badge Pro",
            "5 produits en vedette",
            "Support VIP",
            "Analytics avancés",
            "Promotions illimitées"
        ],
        "badge": "pro",
        "priority_support": True,
        "featured_products": 5,
        "analytics": "advanced"
    },
    "entreprise": {
        "id": "entreprise",
        "name": "Entreprise",
        "name_en": "Enterprise",
        "emoji": "🏢",
        "price_fcfa": 35000,
        "price_usd": 56.00,
        "max_products": -1,  # Unlimited
        "commission_percent": 3,
        "features": [
            "Produits illimités",
            "Commission de 3% seulement",
            "Badge Premium",
            "10 produits en vedette",
            "Account manager dédié",
            "API accès",
            "Analytics temps réel",
            "Formation personnalisée"
        ],
        "badge": "premium",
        "priority_support": True,
        "featured_products": 10,
        "analytics": "realtime"
    }
}

# ============== MODELS ==============

class UserRole:
    CUSTOMER = "customer"
    VENDOR = "vendor"
    ADMIN = "admin"

class ProductStatus:
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = UserRole.CUSTOMER
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    phone: Optional[str] = None
    created_at: str
    subscription_plan: Optional[str] = None
    subscription_expires: Optional[str] = None
    is_active: bool = True
    shop_name: Optional[str] = None
    shop_description: Optional[str] = None
    location: Optional[str] = None
    city: Optional[str] = None

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

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    description: str
    image: str
    parent_id: Optional[str] = None
    subcategories: Optional[List[dict]] = []
    product_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    description: str
    price_fcfa: int
    price_usd: float
    promo_price_fcfa: Optional[int] = None
    promo_price_usd: Optional[float] = None
    stock: int
    condition: str
    location: str
    city: str
    category_id: str
    category_slug: str
    images: List[str]
    video_url: Optional[str] = None
    tags: List[str]
    rating: float
    sales_count: int
    reviews_count: int
    seller_name: str
    seller_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_featured: bool = False
    status: str = ProductStatus.PENDING
    rejection_reason: Optional[str] = None

class CartItemCreate(BaseModel):
    product_id: str
    quantity: int = 1
    session_id: str

class CartItemUpdate(BaseModel):
    quantity: int

class SubscriptionCheckout(BaseModel):
    plan_id: str
    origin_url: str

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    return user

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except:
        return None

async def require_vendor(user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.VENDOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Accès réservé aux vendeurs")
    return user

async def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return user

# ============== CATEGORIES DATA ==============

CATEGORIES_DATA = [
    {
        "name": "Mode & Textile",
        "slug": "mode-textile",
        "description": "Découvrez notre collection de tissus wax, prêt-à-porter africain et vêtements traditionnels",
        "image": "https://images.unsplash.com/photo-1768212565426-58b089b6386d?w=800",
        "subcategories": [
            {"name": "Wax & Tissus", "slug": "wax-tissus"},
            {"name": "Prêt-à-porter Homme", "slug": "pret-a-porter-homme"},
            {"name": "Prêt-à-porter Femme", "slug": "pret-a-porter-femme"},
            {"name": "Vêtements Traditionnels", "slug": "vetements-traditionnels"}
        ]
    },
    {
        "name": "Artisanat & Décoration",
        "slug": "artisanat-decoration",
        "description": "Art africain authentique, sculptures, masques et objets de décoration faits main",
        "image": "https://images.unsplash.com/photo-1717913491672-ec2c1921e81f?w=800",
        "subcategories": [
            {"name": "Sculptures & Statues", "slug": "sculptures-statues"},
            {"name": "Masques", "slug": "masques"},
            {"name": "Tableaux & Art mural", "slug": "tableaux-art-mural"},
            {"name": "Paniers & Vannerie", "slug": "paniers-vannerie"}
        ]
    },
    {
        "name": "Bijoux & Accessoires",
        "slug": "bijoux-accessoires",
        "description": "Bijoux artisanaux africains, perles, accessoires de mode et maroquinerie",
        "image": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800",
        "subcategories": [
            {"name": "Colliers & Pendentifs", "slug": "colliers-pendentifs"},
            {"name": "Bracelets", "slug": "bracelets"},
            {"name": "Boucles d'oreilles", "slug": "boucles-oreilles"},
            {"name": "Sacs & Maroquinerie", "slug": "sacs-maroquinerie"}
        ]
    },
    {
        "name": "Beauté & Cosmétiques",
        "slug": "beaute-cosmetiques",
        "description": "Produits de beauté naturels, cosmétiques africains et soins capillaires",
        "image": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800",
        "subcategories": [
            {"name": "Soins de la peau", "slug": "soins-peau"},
            {"name": "Soins capillaires", "slug": "soins-capillaires"},
            {"name": "Maquillage", "slug": "maquillage"},
            {"name": "Parfums & Huiles", "slug": "parfums-huiles"}
        ]
    },
    {
        "name": "Électronique & Gadgets",
        "slug": "electronique-gadgets",
        "description": "Smartphones, accessoires high-tech et gadgets électroniques",
        "image": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800",
        "subcategories": [
            {"name": "Smartphones", "slug": "smartphones"},
            {"name": "Accessoires téléphone", "slug": "accessoires-telephone"},
            {"name": "Audio & Casques", "slug": "audio-casques"},
            {"name": "Gadgets connectés", "slug": "gadgets-connectes"}
        ]
    },
    {
        "name": "Maison & Cuisine",
        "slug": "maison-cuisine",
        "description": "Ustensiles de cuisine, décoration intérieure et articles ménagers",
        "image": "https://images.unsplash.com/photo-1562860143-2a8fda719599?w=800",
        "subcategories": [
            {"name": "Ustensiles de cuisine", "slug": "ustensiles-cuisine"},
            {"name": "Vaisselle", "slug": "vaisselle"},
            {"name": "Décoration intérieure", "slug": "decoration-interieure"},
            {"name": "Mobilier", "slug": "mobilier"}
        ]
    },
    {
        "name": "Produits Locaux & Agroalimentaire",
        "slug": "produits-locaux-agroalimentaire",
        "description": "Épices, produits du terroir, café, cacao et spécialités africaines",
        "image": "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=800",
        "subcategories": [
            {"name": "Épices & Condiments", "slug": "epices-condiments"},
            {"name": "Café & Cacao", "slug": "cafe-cacao"},
            {"name": "Fruits secs & Noix", "slug": "fruits-secs-noix"},
            {"name": "Produits du terroir", "slug": "produits-terroir"}
        ]
    },
    {
        "name": "Sport & Loisirs",
        "slug": "sport-loisirs",
        "description": "Équipements sportifs, articles de fitness et loisirs créatifs",
        "image": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800",
        "subcategories": [
            {"name": "Football", "slug": "football"},
            {"name": "Fitness", "slug": "fitness"},
            {"name": "Jeux & Jouets", "slug": "jeux-jouets"},
            {"name": "Outdoor", "slug": "outdoor"}
        ]
    }
]

# Product templates and generators
PRODUCT_TEMPLATES = {
    "mode-textile": {
        "names": [
            "Tissu Wax Hollandais {pattern} - 6 yards",
            "Robe Ankara {style} pour femme",
            "Chemise homme {style} en wax",
            "Boubou {region} brodé",
            "Ensemble bazin {color}",
        ],
        "patterns": ["géométrique", "floral", "traditionnel", "moderne", "tribal"],
        "styles": ["élégant", "décontracté", "moderne", "classique"],
        "colors": ["bleu royal", "orange vif", "vert émeraude", "jaune doré"],
        "regions": ["sénégalais", "ivoirien", "nigérian", "malien"],
        "tags": ["wax", "ankara", "mode africaine", "tissu", "prêt-à-porter"]
    },
    "artisanat-decoration": {
        "names": [
            "Masque africain {region} en bois sculpté",
            "Statue {figure} en ébène",
            "Tableau art africain {style}",
            "Panier tressé {region}",
        ],
        "figures": ["guerrier", "femme africaine", "couple", "musicien"],
        "patterns": ["géométrique", "abstrait", "traditionnel"],
        "regions": ["sénégalais", "ivoirien", "béninois", "malien"],
        "styles": ["moderne", "vintage", "ethnique"],
        "tags": ["artisanat", "décoration", "fait main", "sculpture"]
    },
    "bijoux-accessoires": {
        "names": [
            "Collier perles {material} africaines",
            "Bracelet {style} en bronze",
            "Boucles d'oreilles {shape} dorées",
            "Sac en cuir {style} fait main",
        ],
        "materials": ["perles", "bronze", "cuivre", "coquillages"],
        "shapes": ["rondes", "pendantes", "créoles"],
        "styles": ["bohème", "chic", "ethnique"],
        "tags": ["bijoux", "accessoires", "fait main", "perles"]
    },
    "beaute-cosmetiques": {
        "names": [
            "Beurre de karité pur {region}",
            "Huile de coco vierge {size}",
            "Savon noir africain {ingredient}",
            "Crème hydratante au {ingredient}",
        ],
        "ingredients": ["karité", "coco", "argan", "baobab"],
        "sizes": ["100ml", "250ml", "500ml"],
        "regions": ["Ghana", "Burkina", "Sénégal"],
        "tags": ["beauté", "cosmétiques", "naturel", "bio"]
    },
    "electronique-gadgets": {
        "names": [
            "Smartphone {brand} {model}",
            "Écouteurs sans fil {brand}",
            "Coque téléphone {design}",
            "Power bank {capacity}mAh",
        ],
        "brands": ["Tecno", "Infinix", "Samsung", "Xiaomi"],
        "models": ["Pro Max", "Plus", "Lite"],
        "designs": ["wax africain", "transparent", "silicone"],
        "capacity": ["10000", "20000", "30000"],
        "tags": ["électronique", "smartphone", "accessoires tech"]
    },
    "maison-cuisine": {
        "names": [
            "Mortier et pilon en bois {wood}",
            "Set de casseroles {material}",
            "Coussin décoratif {pattern}",
            "Nappe en tissu wax {size}",
        ],
        "woods": ["ébène", "acajou", "iroko"],
        "materials": ["bois", "inox", "céramique"],
        "patterns": ["wax coloré", "kente", "bogolan"],
        "sizes": ["petit", "moyen", "grand"],
        "tags": ["maison", "cuisine", "décoration", "ustensiles"]
    },
    "produits-locaux-agroalimentaire": {
        "names": [
            "Café {origin} torréfié {roast}",
            "Cacao en poudre {origin}",
            "Épices {spice} du {region}",
            "Miel naturel {origin}",
        ],
        "origins": ["Côte d'Ivoire", "Cameroun", "Ghana"],
        "roasts": ["léger", "moyen", "fort"],
        "spices": ["poivre de Penja", "gingembre", "piment"],
        "regions": ["Cameroun", "Sénégal", "Mali"],
        "tags": ["agroalimentaire", "épices", "café", "produits locaux"]
    },
    "sport-loisirs": {
        "names": [
            "Ballon de football {brand}",
            "Maillot équipe {team}",
            "Haltères {weight}kg set",
            "Tapis de yoga {color}",
        ],
        "brands": ["Nike", "Adidas", "Puma", "Decathlon"],
        "teams": ["Côte d'Ivoire", "Sénégal", "Nigeria", "Cameroun"],
        "weights": ["2", "5", "10", "15"],
        "colors": ["bleu", "noir", "rose", "vert"],
        "tags": ["sport", "fitness", "football", "loisirs"]
    }
}

COUNTRIES = ["Côte d'Ivoire", "Sénégal", "Nigeria", "Cameroun", "Ghana"]
CITIES = {
    "Côte d'Ivoire": ["Abidjan", "Yamoussoukro", "Bouaké"],
    "Sénégal": ["Dakar", "Thiès", "Saint-Louis"],
    "Nigeria": ["Lagos", "Abuja", "Kano"],
    "Cameroun": ["Douala", "Yaoundé", "Garoua"],
    "Ghana": ["Accra", "Kumasi", "Tamale"]
}
CONDITIONS = ["neuf", "quasi-neuf", "occasion"]
SELLER_NAMES = ["Boutique Fatou", "Chez Mamadou", "Élégance Africaine", "TrendAfrik", "Beauté Noire"]

FCFA_TO_USD = 0.0016

def generate_product_name(category_slug):
    template_data = PRODUCT_TEMPLATES.get(category_slug, PRODUCT_TEMPLATES["mode-textile"])
    name_template = random.choice(template_data["names"])
    
    for key, values in template_data.items():
        if key not in ["names", "tags"]:
            placeholder = "{" + key.rstrip('s') + "}"
            if placeholder in name_template:
                name_template = name_template.replace(placeholder, random.choice(values))
            placeholder_plural = "{" + key + "}"
            if placeholder_plural in name_template:
                name_template = name_template.replace(placeholder_plural, random.choice(values))
    
    return name_template

def generate_description(name, category_name):
    intros = [
        f"Découvrez ce magnifique {name.lower()}, un produit authentique de qualité supérieure.",
        f"Nous vous présentons {name}, une pièce unique qui allie tradition et modernité.",
    ]
    return random.choice(intros) + " Livraison rapide partout en Afrique !"

def generate_slug(name):
    import re
    slug = name.lower()
    replacements = {'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'â': 'a', 'î': 'i', 'ô': 'o', 'ù': 'u', 'û': 'u', 'ç': 'c', "'": '', '"': ''}
    for old, new in replacements.items():
        slug = slug.replace(old, new)
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    return slug[:50] + '-' + str(uuid.uuid4())[:8]

def get_product_images(category_slug):
    image_pools = {
        "mode-textile": [
            "https://images.unsplash.com/photo-1768212565426-58b089b6386d?w=600",
            "https://images.unsplash.com/photo-1768212566108-4ce4f329e4d2?w=600",
        ],
        "artisanat-decoration": [
            "https://images.unsplash.com/photo-1717913491672-ec2c1921e81f?w=600",
            "https://images.unsplash.com/photo-1562860143-2a8fda719599?w=600",
        ],
        "bijoux-accessoires": [
            "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600",
            "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600",
        ],
        "beaute-cosmetiques": [
            "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600",
            "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600",
        ],
        "electronique-gadgets": [
            "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600",
            "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600",
        ],
        "maison-cuisine": [
            "https://images.unsplash.com/photo-1562860143-2a8fda719599?w=600",
            "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600",
        ],
        "produits-locaux-agroalimentaire": [
            "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=600",
            "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600",
        ],
        "sport-loisirs": [
            "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600",
            "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600",
        ]
    }
    pool = image_pools.get(category_slug, image_pools["mode-textile"])
    return random.sample(pool, min(2, len(pool)))

def generate_products(num_products=300):
    products = []
    products_per_category = num_products // len(CATEGORIES_DATA)
    
    for cat_data in CATEGORIES_DATA:
        category_slug = cat_data["slug"]
        template_data = PRODUCT_TEMPLATES.get(category_slug, PRODUCT_TEMPLATES["mode-textile"])
        
        for i in range(products_per_category + random.randint(0, 5)):
            name = generate_product_name(category_slug)
            country = random.choice(COUNTRIES)
            city = random.choice(CITIES[country])
            
            base_price = random.randint(2000, 150000)
            has_promo = random.random() < 0.3
            
            product = {
                "id": str(uuid.uuid4()),
                "name": name,
                "slug": generate_slug(name),
                "description": generate_description(name, cat_data["name"]),
                "price_fcfa": base_price,
                "price_usd": round(base_price * FCFA_TO_USD, 2),
                "promo_price_fcfa": int(base_price * random.uniform(0.7, 0.9)) if has_promo else None,
                "promo_price_usd": round(base_price * random.uniform(0.7, 0.9) * FCFA_TO_USD, 2) if has_promo else None,
                "stock": random.randint(1, 100),
                "condition": random.choice(CONDITIONS),
                "location": country,
                "city": city,
                "category_id": cat_data["slug"],
                "category_slug": category_slug,
                "images": get_product_images(category_slug),
                "video_url": None,
                "tags": random.sample(template_data.get("tags", []), min(3, len(template_data.get("tags", [])))),
                "rating": round(random.uniform(3.5, 5.0), 1),
                "sales_count": random.randint(0, 500),
                "reviews_count": random.randint(0, 100),
                "seller_name": random.choice(SELLER_NAMES),
                "seller_id": "system",
                "is_featured": random.random() < 0.1,
                "status": ProductStatus.APPROVED,  # System products are auto-approved
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            products.append(product)
    
    return products

# ============== API ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Bienvenue sur l'API Cloléo", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    # Create user
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "phone": user_data.phone,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_active": True,
        "subscription_plan": "free" if user_data.role == UserRole.VENDOR else None,
        "subscription_expires": None,
        "shop_name": None,
        "shop_description": None,
        "location": None,
        "city": None
    }
    
    await db.users.insert_one(user)
    
    # Generate token
    token = create_token(user["id"], user["role"])
    
    # Return user without _id and password
    return {
        "token": token,
        "user": {k: v for k, v in user.items() if k not in ["password", "_id"]}
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Compte désactivé")
    
    token = create_token(user["id"], user["role"])
    
    return {
        "token": token,
        "user": {k: v for k, v in user.items() if k != "password"}
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password"}

# ============== SUBSCRIPTION ROUTES ==============

@api_router.get("/subscriptions/plans")
async def get_subscription_plans():
    return list(SUBSCRIPTION_PLANS.values())

@api_router.post("/subscriptions/checkout")
async def create_subscription_checkout(data: SubscriptionCheckout, request: Request, user: dict = Depends(require_vendor)):
    plan = SUBSCRIPTION_PLANS.get(data.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Plan invalide")
    
    if plan["price_usd"] == 0:
        # Free plan - activate directly
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "subscription_plan": "free",
                "subscription_expires": None
            }}
        )
        return {"message": "Plan gratuit activé", "redirect": f"{data.origin_url}/vendeur/abonnement?success=true"}
    
    # Create Stripe checkout
    api_key = os.environ.get('STRIPE_API_KEY')
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    success_url = f"{data.origin_url}/vendeur/abonnement?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/vendeur/abonnement?cancelled=true"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(plan["price_usd"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user["id"],
            "plan_id": data.plan_id,
            "type": "subscription"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "plan_id": data.plan_id,
        "amount_usd": plan["price_usd"],
        "amount_fcfa": plan["price_fcfa"],
        "currency": "usd",
        "status": "pending",
        "payment_status": "initiated",
        "type": "subscription",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/subscriptions/status/{session_id}")
async def check_subscription_status(session_id: str, user: dict = Depends(require_vendor)):
    api_key = os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if transaction and transaction.get("payment_status") != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": status.status,
                    "payment_status": status.payment_status
                }}
            )
            
            # If paid, activate subscription
            if status.payment_status == "paid":
                plan_id = status.metadata.get("plan_id", "artisan")
                expires = datetime.now(timezone.utc) + timedelta(days=30)
                
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {
                        "subscription_plan": plan_id,
                        "subscription_expires": expires.isoformat()
                    }}
                )
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "plan_id": status.metadata.get("plan_id")
        }
    except Exception as e:
        logger.error(f"Error checking subscription status: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    api_key = os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            # Update transaction and activate subscription
            transaction = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            if transaction:
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"status": "complete", "payment_status": "paid"}}
                )
                
                plan_id = webhook_response.metadata.get("plan_id", "artisan")
                user_id = webhook_response.metadata.get("user_id")
                
                if user_id:
                    expires = datetime.now(timezone.utc) + timedelta(days=30)
                    await db.users.update_one(
                        {"id": user_id},
                        {"$set": {
                            "subscription_plan": plan_id,
                            "subscription_expires": expires.isoformat()
                        }}
                    )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ============== VENDOR ROUTES ==============

@api_router.get("/vendor/dashboard")
async def get_vendor_dashboard(user: dict = Depends(require_vendor)):
    # Get vendor stats
    products = await db.products.find({"seller_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    total_products = len(products)
    pending_products = len([p for p in products if p.get("status") == ProductStatus.PENDING])
    approved_products = len([p for p in products if p.get("status") == ProductStatus.APPROVED])
    rejected_products = len([p for p in products if p.get("status") == ProductStatus.REJECTED])
    
    total_sales = sum(p.get("sales_count", 0) for p in products)
    total_revenue = sum(p.get("price_fcfa", 0) * p.get("sales_count", 0) for p in products)
    
    # Get plan info
    plan = SUBSCRIPTION_PLANS.get(user.get("subscription_plan", "free"), SUBSCRIPTION_PLANS["free"])
    
    return {
        "user": {k: v for k, v in user.items() if k != "password"},
        "stats": {
            "total_products": total_products,
            "pending_products": pending_products,
            "approved_products": approved_products,
            "rejected_products": rejected_products,
            "total_sales": total_sales,
            "total_revenue_fcfa": total_revenue
        },
        "subscription": {
            "plan": plan,
            "expires": user.get("subscription_expires"),
            "products_remaining": plan["max_products"] - total_products if plan["max_products"] > 0 else -1
        }
    }

@api_router.get("/vendor/products")
async def get_vendor_products(user: dict = Depends(require_vendor), status: Optional[str] = None):
    query = {"seller_id": user["id"]}
    if status:
        query["status"] = status
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return products

@api_router.post("/vendor/products")
async def create_vendor_product(product_data: VendorProduct, user: dict = Depends(require_vendor)):
    # Check product limit
    plan = SUBSCRIPTION_PLANS.get(user.get("subscription_plan", "free"), SUBSCRIPTION_PLANS["free"])
    current_products = await db.products.count_documents({"seller_id": user["id"]})
    
    if plan["max_products"] > 0 and current_products >= plan["max_products"]:
        raise HTTPException(
            status_code=403, 
            detail=f"Limite de {plan['max_products']} produits atteinte. Passez à un plan supérieur."
        )
    
    # Create product
    product = {
        "id": str(uuid.uuid4()),
        "name": product_data.name,
        "slug": generate_slug(product_data.name),
        "description": product_data.description,
        "price_fcfa": product_data.price_fcfa,
        "price_usd": round(product_data.price_fcfa * FCFA_TO_USD, 2),
        "promo_price_fcfa": product_data.promo_price_fcfa,
        "promo_price_usd": round(product_data.promo_price_fcfa * FCFA_TO_USD, 2) if product_data.promo_price_fcfa else None,
        "stock": product_data.stock,
        "condition": product_data.condition,
        "location": user.get("location", "Côte d'Ivoire"),
        "city": user.get("city", "Abidjan"),
        "category_id": product_data.category_slug,
        "category_slug": product_data.category_slug,
        "images": product_data.images,
        "video_url": None,
        "tags": product_data.tags,
        "rating": 0,
        "sales_count": 0,
        "reviews_count": 0,
        "seller_name": user.get("shop_name", user["name"]),
        "seller_id": user["id"],
        "is_featured": False,
        "status": ProductStatus.PENDING,  # All products need approval
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.products.insert_one(product)
    # Return product without _id to avoid ObjectId serialization issues
    return {k: v for k, v in product.items() if k != "_id"}

@api_router.put("/vendor/products/{product_id}")
async def update_vendor_product(product_id: str, product_data: VendorProduct, user: dict = Depends(require_vendor)):
    product = await db.products.find_one({"id": product_id, "seller_id": user["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    update_data = {
        "name": product_data.name,
        "slug": generate_slug(product_data.name),
        "description": product_data.description,
        "price_fcfa": product_data.price_fcfa,
        "price_usd": round(product_data.price_fcfa * FCFA_TO_USD, 2),
        "promo_price_fcfa": product_data.promo_price_fcfa,
        "promo_price_usd": round(product_data.promo_price_fcfa * FCFA_TO_USD, 2) if product_data.promo_price_fcfa else None,
        "stock": product_data.stock,
        "condition": product_data.condition,
        "category_slug": product_data.category_slug,
        "images": product_data.images,
        "tags": product_data.tags,
        "status": ProductStatus.PENDING,  # Re-submit for approval
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    return {"message": "Produit mis à jour et soumis pour validation"}

@api_router.delete("/vendor/products/{product_id}")
async def delete_vendor_product(product_id: str, user: dict = Depends(require_vendor)):
    result = await db.products.delete_one({"id": product_id, "seller_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return {"message": "Produit supprimé"}

@api_router.put("/vendor/profile")
async def update_vendor_profile(
    shop_name: Optional[str] = None,
    shop_description: Optional[str] = None,
    location: Optional[str] = None,
    city: Optional[str] = None,
    phone: Optional[str] = None,
    user: dict = Depends(require_vendor)
):
    update_data = {}
    if shop_name: update_data["shop_name"] = shop_name
    if shop_description: update_data["shop_description"] = shop_description
    if location: update_data["location"] = location
    if city: update_data["city"] = city
    if phone: update_data["phone"] = phone
    
    if update_data:
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return updated_user

# ============== ADMIN ROUTES ==============

@api_router.get("/admin/dashboard")
async def get_admin_dashboard(user: dict = Depends(require_admin)):
    # Get stats
    total_users = await db.users.count_documents({})
    total_vendors = await db.users.count_documents({"role": UserRole.VENDOR})
    total_products = await db.products.count_documents({})
    pending_products = await db.products.count_documents({"status": ProductStatus.PENDING})
    
    # Subscription stats
    free_vendors = await db.users.count_documents({"role": UserRole.VENDOR, "subscription_plan": "free"})
    paid_vendors = await db.users.count_documents({"role": UserRole.VENDOR, "subscription_plan": {"$ne": "free"}})
    
    # Revenue from subscriptions
    transactions = await db.payment_transactions.find(
        {"type": "subscription", "payment_status": "paid"},
        {"_id": 0}
    ).to_list(1000)
    total_revenue = sum(t.get("amount_usd", 0) for t in transactions)
    
    # Recent transactions
    recent_transactions = await db.payment_transactions.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "stats": {
            "total_users": total_users,
            "total_vendors": total_vendors,
            "total_products": total_products,
            "pending_products": pending_products,
            "free_vendors": free_vendors,
            "paid_vendors": paid_vendors,
            "total_revenue_usd": total_revenue
        },
        "recent_transactions": recent_transactions
    }

@api_router.get("/admin/vendors")
async def get_all_vendors(user: dict = Depends(require_admin), page: int = 1, limit: int = 20):
    skip = (page - 1) * limit
    
    vendors = await db.users.find(
        {"role": UserRole.VENDOR},
        {"_id": 0, "password": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    total = await db.users.count_documents({"role": UserRole.VENDOR})
    
    # Add product counts
    for vendor in vendors:
        vendor["product_count"] = await db.products.count_documents({"seller_id": vendor["id"]})
    
    return {
        "vendors": vendors,
        "total": total,
        "page": page,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.get("/admin/products/pending")
async def get_pending_products(user: dict = Depends(require_admin), page: int = 1, limit: int = 20):
    skip = (page - 1) * limit
    
    products = await db.products.find(
        {"status": ProductStatus.PENDING},
        {"_id": 0}
    ).skip(skip).limit(limit).to_list(limit)
    
    total = await db.products.count_documents({"status": ProductStatus.PENDING})
    
    # Add seller info
    for product in products:
        seller = await db.users.find_one({"id": product["seller_id"]}, {"_id": 0, "password": 0})
        product["seller"] = seller
    
    return {
        "products": products,
        "total": total,
        "page": page,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.post("/admin/products/{product_id}/approve")
async def approve_product(product_id: str, user: dict = Depends(require_admin)):
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": {"status": ProductStatus.APPROVED, "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Update category product count
    product = await db.products.find_one({"id": product_id})
    if product:
        await db.categories.update_one(
            {"slug": product["category_slug"]},
            {"$inc": {"product_count": 1}}
        )
    
    return {"message": "Produit approuvé"}

@api_router.post("/admin/products/{product_id}/reject")
async def reject_product(product_id: str, reason: str = "Non conforme aux critères", user: dict = Depends(require_admin)):
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": {
            "status": ProductStatus.REJECTED,
            "rejection_reason": reason,
            "rejected_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return {"message": "Produit rejeté"}

@api_router.put("/admin/vendors/{vendor_id}/subscription")
async def update_vendor_subscription(
    vendor_id: str,
    plan_id: str,
    user: dict = Depends(require_admin)
):
    if plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Plan invalide")
    
    expires = datetime.now(timezone.utc) + timedelta(days=30) if plan_id != "free" else None
    
    result = await db.users.update_one(
        {"id": vendor_id, "role": UserRole.VENDOR},
        {"$set": {
            "subscription_plan": plan_id,
            "subscription_expires": expires.isoformat() if expires else None
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Vendeur non trouvé")
    
    return {"message": f"Abonnement mis à jour vers {SUBSCRIPTION_PLANS[plan_id]['name']}"}

@api_router.put("/admin/vendors/{vendor_id}/toggle-status")
async def toggle_vendor_status(vendor_id: str, user: dict = Depends(require_admin)):
    vendor = await db.users.find_one({"id": vendor_id, "role": UserRole.VENDOR})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendeur non trouvé")
    
    new_status = not vendor.get("is_active", True)
    await db.users.update_one({"id": vendor_id}, {"$set": {"is_active": new_status}})
    
    return {"message": f"Vendeur {'activé' if new_status else 'désactivé'}", "is_active": new_status}

# ============== PUBLIC PRODUCT ROUTES (only approved) ==============

@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    if not categories:
        for cat_data in CATEGORIES_DATA:
            category = {
                "id": str(uuid.uuid4()),
                "name": cat_data["name"],
                "slug": cat_data["slug"],
                "description": cat_data["description"],
                "image": cat_data["image"],
                "subcategories": cat_data.get("subcategories", []),
                "product_count": 0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.categories.insert_one(category)
        categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.get("/categories/{slug}")
async def get_category(slug: str):
    category = await db.categories.find_one({"slug": slug}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    return category

@api_router.get("/products")
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    condition: Optional[str] = None,
    location: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    featured: Optional[bool] = None
):
    query = {"status": ProductStatus.APPROVED}  # Only show approved products
    
    if category:
        query["category_slug"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$elemMatch": {"$regex": search, "$options": "i"}}}
        ]
    if condition:
        query["condition"] = condition
    if location:
        query["location"] = location
    if min_price is not None:
        query["price_fcfa"] = {"$gte": min_price}
    if max_price is not None:
        if "price_fcfa" in query:
            query["price_fcfa"]["$lte"] = max_price
        else:
            query["price_fcfa"] = {"$lte": max_price}
    if featured is not None:
        query["is_featured"] = featured
    
    sort_direction = -1 if sort_order == "desc" else 1
    sort_field = sort_by if sort_by in ["price_fcfa", "rating", "sales_count", "created_at"] else "created_at"
    
    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {"_id": 0}).sort(sort_field, sort_direction).skip(skip).limit(limit).to_list(limit)
    
    return {
        "products": products,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id, "status": ProductStatus.APPROVED}, {"_id": 0})
    if not product:
        product = await db.products.find_one({"slug": product_id, "status": ProductStatus.APPROVED}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return product

@api_router.get("/products/{product_id}/similar")
async def get_similar_products(product_id: str, limit: int = 6):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        product = await db.products.find_one({"slug": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    similar = await db.products.find(
        {"category_slug": product["category_slug"], "id": {"$ne": product["id"]}, "status": ProductStatus.APPROVED},
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    return similar

@api_router.get("/products/{product_id}/also-bought")
async def get_also_bought(product_id: str, limit: int = 6):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        product = await db.products.find_one({"slug": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    tags = product.get("tags", [])
    also_bought = await db.products.find(
        {"id": {"$ne": product["id"]}, "tags": {"$elemMatch": {"$in": tags}}, "status": ProductStatus.APPROVED},
        {"_id": 0}
    ).sort("sales_count", -1).limit(limit).to_list(limit)
    
    return also_bought

@api_router.get("/search")
async def search_products(q: str, page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
    query = {
        "status": ProductStatus.APPROVED,
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$elemMatch": {"$regex": q, "$options": "i"}}}
        ]
    }
    
    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    return {"products": products, "total": total, "page": page, "limit": limit, "query": q}

# ============== CART ROUTES ==============

@api_router.post("/cart/add")
async def add_to_cart(item: CartItemCreate):
    product = await db.products.find_one({"id": item.product_id, "status": ProductStatus.APPROVED}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    existing = await db.cart_items.find_one({"product_id": item.product_id, "session_id": item.session_id})
    
    if existing:
        new_quantity = existing["quantity"] + item.quantity
        await db.cart_items.update_one({"_id": existing["_id"]}, {"$set": {"quantity": new_quantity}})
        return {"message": "Quantité mise à jour", "quantity": new_quantity}
    
    cart_item = {
        "id": str(uuid.uuid4()),
        "product_id": item.product_id,
        "quantity": item.quantity,
        "session_id": item.session_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.cart_items.insert_one(cart_item)
    return {"message": "Produit ajouté au panier", "item_id": cart_item["id"]}

@api_router.get("/cart/{session_id}")
async def get_cart(session_id: str):
    cart_items = await db.cart_items.find({"session_id": session_id}, {"_id": 0}).to_list(100)
    
    items_with_products = []
    total_fcfa = 0
    total_usd = 0
    
    for item in cart_items:
        product = await db.products.find_one({"id": item["product_id"], "status": ProductStatus.APPROVED}, {"_id": 0})
        if product:
            price = product.get("promo_price_fcfa") or product["price_fcfa"]
            price_usd = product.get("promo_price_usd") or product["price_usd"]
            subtotal = price * item["quantity"]
            subtotal_usd = price_usd * item["quantity"]
            
            items_with_products.append({
                **item,
                "product": product,
                "subtotal_fcfa": subtotal,
                "subtotal_usd": round(subtotal_usd, 2)
            })
            total_fcfa += subtotal
            total_usd += subtotal_usd
    
    return {
        "items": items_with_products,
        "total_fcfa": total_fcfa,
        "total_usd": round(total_usd, 2),
        "item_count": len(items_with_products)
    }

@api_router.put("/cart/{session_id}/{item_id}")
async def update_cart_item(session_id: str, item_id: str, update: CartItemUpdate):
    if update.quantity <= 0:
        await db.cart_items.delete_one({"id": item_id, "session_id": session_id})
        return {"message": "Article supprimé du panier"}
    
    result = await db.cart_items.update_one(
        {"id": item_id, "session_id": session_id},
        {"$set": {"quantity": update.quantity}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    
    return {"message": "Quantité mise à jour"}

@api_router.delete("/cart/{session_id}/{item_id}")
async def remove_from_cart(session_id: str, item_id: str):
    result = await db.cart_items.delete_one({"id": item_id, "session_id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article non trouvé")
    return {"message": "Article supprimé du panier"}

@api_router.delete("/cart/{session_id}")
async def clear_cart(session_id: str):
    await db.cart_items.delete_many({"session_id": session_id})
    return {"message": "Panier vidé"}

# ============== FAVORITES ROUTES ==============

@api_router.post("/favorites/{session_id}/{product_id}")
async def add_to_favorites(session_id: str, product_id: str):
    existing = await db.favorites.find_one({"session_id": session_id, "product_id": product_id})
    if existing:
        return {"message": "Déjà dans les favoris"}
    
    await db.favorites.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "product_id": product_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"message": "Ajouté aux favoris"}

@api_router.delete("/favorites/{session_id}/{product_id}")
async def remove_from_favorites(session_id: str, product_id: str):
    await db.favorites.delete_one({"session_id": session_id, "product_id": product_id})
    return {"message": "Retiré des favoris"}

@api_router.get("/favorites/{session_id}")
async def get_favorites(session_id: str):
    favorites = await db.favorites.find({"session_id": session_id}, {"_id": 0}).to_list(100)
    products = []
    for fav in favorites:
        product = await db.products.find_one({"id": fav["product_id"], "status": ProductStatus.APPROVED}, {"_id": 0})
        if product:
            products.append(product)
    return products

# ============== SEED DATA ==============

@api_router.post("/seed")
async def seed_database():
    await db.categories.delete_many({})
    await db.products.delete_many({"seller_id": "system"})
    
    categories = []
    for cat_data in CATEGORIES_DATA:
        category = {
            "id": str(uuid.uuid4()),
            "name": cat_data["name"],
            "slug": cat_data["slug"],
            "description": cat_data["description"],
            "image": cat_data["image"],
            "subcategories": cat_data.get("subcategories", []),
            "product_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        categories.append(category)
    
    await db.categories.insert_many(categories)
    
    products = generate_products(300)
    category_map = {cat["slug"]: cat["id"] for cat in categories}
    for product in products:
        product["category_id"] = category_map.get(product["category_slug"], "")
    
    await db.products.insert_many(products)
    
    for cat in categories:
        count = await db.products.count_documents({"category_slug": cat["slug"], "status": ProductStatus.APPROVED})
        await db.categories.update_one({"id": cat["id"]}, {"$set": {"product_count": count}})
    
    # Create default admin if not exists
    admin = await db.users.find_one({"email": "admin@cloleo.com"})
    if not admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@cloleo.com",
            "password": hash_password("admin123"),
            "name": "Admin Cloléo",
            "role": UserRole.ADMIN,
            "phone": "+225 07 00 00 00",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        }
        await db.users.insert_one(admin_user)
    
    return {
        "message": "Base de données initialisée avec succès",
        "categories": len(categories),
        "products": len(products),
        "admin_email": "admin@cloleo.com",
        "admin_password": "admin123"
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
