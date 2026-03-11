from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Cloléo API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

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
    condition: str  # "neuf", "quasi-neuf", "occasion"
    location: str  # Pays vendeur
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

class CartItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    quantity: int
    session_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CartItemCreate(BaseModel):
    product_id: str
    quantity: int = 1
    session_id: str

class CartItemUpdate(BaseModel):
    quantity: int

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
        "image": "https://images.unsplash.com/photo-1461896836934- voices-de-africa-afri?w=800",
        "subcategories": [
            {"name": "Football", "slug": "football"},
            {"name": "Fitness", "slug": "fitness"},
            {"name": "Jeux & Jouets", "slug": "jeux-jouets"},
            {"name": "Outdoor", "slug": "outdoor"}
        ]
    }
]

# Product name templates by category
PRODUCT_TEMPLATES = {
    "mode-textile": {
        "names": [
            "Tissu Wax Hollandais {pattern} - 6 yards",
            "Robe Ankara {style} pour femme",
            "Chemise homme {style} en wax",
            "Boubou {region} brodé",
            "Ensemble bazin {color}",
            "Jupe crayon en wax {pattern}",
            "Costume africain {style}",
            "Dashiki {color} authentique",
            "Kaftan {region} luxe",
            "Pantalon wax {style}",
            "Top crop en ankara {pattern}",
            "Combinaison {style} africaine",
            "Tissu kente Ghana {color}",
            "Robe longue {style} cérémonie",
            "Chemise col Mao {pattern}"
        ],
        "patterns": ["géométrique", "floral", "traditionnel", "moderne", "tribal", "soleil", "étoiles"],
        "styles": ["élégant", "décontracté", "moderne", "classique", "tendance", "chic"],
        "colors": ["bleu royal", "orange vif", "vert émeraude", "jaune doré", "rouge passion", "violet"],
        "regions": ["sénégalais", "ivoirien", "nigérian", "malien", "camerounais"],
        "tags": ["wax", "ankara", "mode africaine", "tissu", "prêt-à-porter", "traditionnel"]
    },
    "artisanat-decoration": {
        "names": [
            "Masque africain {region} en bois sculpté",
            "Statue {figure} en ébène",
            "Tableau art africain {style}",
            "Panier tressé {region}",
            "Sculpture bronze {figure}",
            "Toile murale {pattern} africaine",
            "Masque Punu du Gabon",
            "Statuette Baoulé authentique",
            "Art mural en métal {pattern}",
            "Vase en terre cuite {region}",
            "Tapis berbère {color}",
            "Lampe calebasse sculptée",
            "Miroir cadre en bois {style}",
            "Horloge murale africaine",
            "Set de 3 paniers déco {color}"
        ],
        "figures": ["guerrier", "femme africaine", "couple", "musicien", "danseur", "roi"],
        "patterns": ["géométrique", "abstrait", "traditionnel", "contemporain"],
        "regions": ["sénégalais", "ivoirien", "béninois", "malien", "congolais"],
        "colors": ["naturel", "coloré", "noir et blanc", "tons terre"],
        "styles": ["moderne", "vintage", "ethnique", "minimaliste"],
        "tags": ["artisanat", "décoration", "fait main", "sculpture", "art africain"]
    },
    "bijoux-accessoires": {
        "names": [
            "Collier perles {material} africaines",
            "Bracelet {style} en bronze",
            "Boucles d'oreilles {shape} dorées",
            "Sac en cuir {style} fait main",
            "Collier statement {color}",
            "Bracelet manchette {material}",
            "Pendentif {symbol} en or",
            "Ceinture tressée {color}",
            "Pochette en raphia {style}",
            "Bague {material} artisanale",
            "Parure complète {color}",
            "Bracelet de cheville perles",
            "Sac cabas en wax {pattern}",
            "Bandeau tête en tissu {pattern}",
            "Porte-monnaie cuir {color}"
        ],
        "materials": ["perles", "bronze", "cuivre", "coquillages", "bois", "os"],
        "shapes": ["rondes", "pendantes", "créoles", "gouttes"],
        "colors": ["multicolore", "doré", "argent", "turquoise", "corail", "noir"],
        "styles": ["bohème", "chic", "ethnique", "moderne"],
        "patterns": ["floral", "géométrique", "tribal"],
        "symbols": ["adinkra", "ankh", "cœur", "étoile"],
        "tags": ["bijoux", "accessoires", "fait main", "perles", "cuir"]
    },
    "beaute-cosmetiques": {
        "names": [
            "Beurre de karité pur {region}",
            "Huile de coco vierge {size}",
            "Savon noir africain {ingredient}",
            "Crème hydratante au {ingredient}",
            "Huile d'argan pure {size}",
            "Masque capillaire {ingredient}",
            "Sérum visage {benefit}",
            "Gommage corps {ingredient}",
            "Lait corporel {ingredient}",
            "Parfum africain {scent}",
            "Shampoing naturel {ingredient}",
            "Huile de baobab {size}",
            "Fond de teint {shade}",
            "Rouge à lèvres {color}",
            "Poudre de henné {origin}"
        ],
        "ingredients": ["karité", "coco", "argan", "baobab", "moringa", "neem"],
        "benefits": ["hydratant", "anti-âge", "éclat", "nourrissant"],
        "sizes": ["100ml", "250ml", "500ml"],
        "scents": ["floral", "boisé", "fruité", "musqué"],
        "shades": ["ébène", "caramel", "chocolat", "miel"],
        "colors": ["rouge passion", "nude", "corail", "berry"],
        "regions": ["Ghana", "Burkina", "Sénégal"],
        "origin": ["Maroc", "Soudan", "Égypte"],
        "tags": ["beauté", "cosmétiques", "naturel", "bio", "soins"]
    },
    "electronique-gadgets": {
        "names": [
            "Smartphone {brand} {model}",
            "Écouteurs sans fil {brand}",
            "Coque téléphone {design}",
            "Chargeur rapide {power}W",
            "Power bank {capacity}mAh",
            "Montre connectée {brand}",
            "Casque bluetooth {brand}",
            "Support téléphone {type}",
            "Câble USB-C {length}m",
            "Haut-parleur portable {brand}",
            "Ring light LED {size}",
            "Selfie stick {feature}",
            "Adaptateur {type}",
            "Protection écran {device}",
            "Clavier bluetooth {color}"
        ],
        "brands": ["Tecno", "Infinix", "Samsung", "Xiaomi", "Oppo", "Huawei"],
        "models": ["Pro Max", "Plus", "Lite", "Ultra", "5G"],
        "designs": ["wax africain", "transparent", "silicone", "cuir"],
        "power": ["20", "30", "65", "100"],
        "capacity": ["10000", "20000", "30000"],
        "types": ["voiture", "bureau", "universel"],
        "lengths": ["1", "2", "3"],
        "sizes": ["10 pouces", "12 pouces", "18 pouces"],
        "features": ["trépied", "télécommande", "stabilisateur"],
        "devices": ["iPhone", "Samsung", "universel"],
        "colors": ["noir", "blanc", "gris"],
        "tags": ["électronique", "smartphone", "accessoires tech", "gadgets"]
    },
    "maison-cuisine": {
        "names": [
            "Mortier et pilon en bois {wood}",
            "Set de casseroles {material}",
            "Coussin décoratif {pattern}",
            "Nappe en tissu wax {size}",
            "Plateau de service {material}",
            "Set de 6 verres {style}",
            "Calebasse décorée {size}",
            "Tabouret {style} africain",
            "Rideau wax {color}",
            "Set de table africain x6",
            "Boîte de rangement {material}",
            "Lampe de table {style}",
            "Cadre photo {material}",
            "Poubelle design {color}",
            "Corbeille à fruits {material}"
        ],
        "woods": ["ébène", "acajou", "iroko", "teck"],
        "materials": ["bois", "inox", "céramique", "osier", "bambou"],
        "patterns": ["wax coloré", "kente", "bogolan", "moderne"],
        "sizes": ["petit", "moyen", "grand", "XL"],
        "styles": ["moderne", "rustique", "ethnique", "minimaliste"],
        "colors": ["multicolore", "naturel", "terre cuite", "blanc"],
        "tags": ["maison", "cuisine", "décoration", "ustensiles", "rangement"]
    },
    "produits-locaux-agroalimentaire": {
        "names": [
            "Café {origin} torréfié {roast}",
            "Cacao en poudre {origin}",
            "Épices {spice} du {region}",
            "Miel naturel {origin}",
            "Beurre de cacahuète {type}",
            "Farine de manioc {weight}kg",
            "Piment {variety} séché",
            "Noix de cajou {prep}",
            "Huile de palme rouge {size}L",
            "Gari premium {weight}kg",
            "Attieke séché {weight}g",
            "Bissap séché {weight}g",
            "Gingembre en poudre {weight}g",
            "Moringa en poudre {weight}g",
            "Fèves de cacao {prep}"
        ],
        "origins": ["Côte d'Ivoire", "Cameroun", "Ghana", "Éthiopie"],
        "roasts": ["léger", "moyen", "fort"],
        "spices": ["poivre de Penja", "gingembre", "piment", "clou de girofle"],
        "regions": ["Cameroun", "Sénégal", "Mali", "Bénin"],
        "types": ["crémeux", "crunchy", "naturel"],
        "weights": ["250", "500", "1"],
        "varieties": ["habanero", "bird eye", "scotch bonnet"],
        "preps": ["grillées", "salées", "nature"],
        "sizes": ["0.5", "1", "5"],
        "tags": ["agroalimentaire", "épices", "café", "produits locaux", "bio"]
    },
    "sport-loisirs": {
        "names": [
            "Ballon de football {brand}",
            "Maillot équipe {team}",
            "Haltères {weight}kg set",
            "Tapis de yoga {color}",
            "Corde à sauter pro",
            "Short sport {brand}",
            "Baskets running {brand}",
            "Sac de sport {size}L",
            "Jeu d'awalé en bois",
            "Jeu de dames africain",
            "Raquette badminton {brand}",
            "Gants de boxe {weight}oz",
            "Vélo fitness {type}",
            "Montre sport {brand}",
            "Kit musculation maison"
        ],
        "brands": ["Nike", "Adidas", "Puma", "Decathlon", "Under Armour"],
        "teams": ["Côte d'Ivoire", "Sénégal", "Nigeria", "Cameroun", "Ghana"],
        "weights": ["2", "5", "10", "15", "20"],
        "colors": ["bleu", "noir", "rose", "vert"],
        "sizes": ["30", "50", "70"],
        "types": ["pliable", "fixe", "elliptique"],
        "tags": ["sport", "fitness", "football", "loisirs", "jeux"]
    }
}

COUNTRIES = ["Côte d'Ivoire", "Sénégal", "Nigeria", "Cameroun", "Ghana"]
CITIES = {
    "Côte d'Ivoire": ["Abidjan", "Yamoussoukro", "Bouaké", "San-Pédro", "Korhogo"],
    "Sénégal": ["Dakar", "Thiès", "Saint-Louis", "Rufisque", "Kaolack"],
    "Nigeria": ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt"],
    "Cameroun": ["Douala", "Yaoundé", "Garoua", "Bamenda", "Maroua"],
    "Ghana": ["Accra", "Kumasi", "Tamale", "Takoradi", "Cape Coast"]
}
CONDITIONS = ["neuf", "quasi-neuf", "occasion"]
SELLER_NAMES = [
    "Boutique Fatou", "Chez Mamadou", "Élégance Africaine", "TrendAfrik", 
    "Beauté Noire", "Artisan Kofi", "Mode Dakar", "Style Abidjan",
    "Afro Chic", "Savane Shop", "Lagos Fashion", "Kente King",
    "Bamako Style", "Douala Market", "Accra Trends"
]

# FCFA to USD conversion rate (approximate)
FCFA_TO_USD = 0.0016

def generate_product_name(category_slug):
    template_data = PRODUCT_TEMPLATES.get(category_slug, PRODUCT_TEMPLATES["mode-textile"])
    name_template = random.choice(template_data["names"])
    
    # Replace placeholders with random values
    for key, values in template_data.items():
        if key not in ["names", "tags"]:
            placeholder = "{" + key.rstrip('s') + "}"
            if placeholder in name_template:
                name_template = name_template.replace(placeholder, random.choice(values))
            # Also try plural form
            placeholder_plural = "{" + key + "}"
            if placeholder_plural in name_template:
                name_template = name_template.replace(placeholder_plural, random.choice(values))
    
    return name_template

def generate_description(name, category_name):
    intros = [
        f"Découvrez ce magnifique {name.lower()}, un produit authentique de qualité supérieure.",
        f"Nous vous présentons {name}, une pièce unique qui allie tradition et modernité.",
        f"{name} - L'excellence africaine à portée de main.",
        f"Ce {name.lower()} est le fruit d'un savoir-faire artisanal exceptionnel.",
    ]
    
    middles = [
        "Fabriqué avec des matériaux soigneusement sélectionnés, ce produit incarne l'authenticité africaine.",
        "Chaque détail a été pensé pour vous offrir une expérience unique.",
        "Un choix parfait pour ceux qui apprécient la qualité et l'originalité.",
        "Idéal pour sublimer votre quotidien avec une touche d'élégance africaine.",
    ]
    
    endings = [
        "Commandez maintenant et faites-vous livrer partout en Afrique !",
        "Disponible en stock limité, ne manquez pas cette opportunité !",
        "Satisfaction garantie ou remboursé. Livraison rapide assurée.",
        "Rejoignez des milliers de clients satisfaits de Cloléo !",
    ]
    
    return f"{random.choice(intros)} {random.choice(middles)} {random.choice(endings)}"

def generate_slug(name):
    import re
    slug = name.lower()
    # Replace accented characters
    replacements = {'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'â': 'a', 'î': 'i', 'ï': 'i', 
                    'ô': 'o', 'ù': 'u', 'û': 'u', 'ç': 'c', "'": '', '"': ''}
    for old, new in replacements.items():
        slug = slug.replace(old, new)
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug[:50] + '-' + str(uuid.uuid4())[:8]

def get_product_images(category_slug):
    # Category-specific placeholder images
    image_pools = {
        "mode-textile": [
            "https://images.unsplash.com/photo-1768212565426-58b089b6386d?w=600",
            "https://images.unsplash.com/photo-1768212566108-4ce4f329e4d2?w=600",
            "https://images.unsplash.com/photo-1768212565424-efa3a3852b81?w=600",
            "https://images.unsplash.com/photo-1629160477511-e5e730a661ee?w=600",
            "https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=600",
            "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600"
        ],
        "artisanat-decoration": [
            "https://images.unsplash.com/photo-1717913491672-ec2c1921e81f?w=600",
            "https://images.unsplash.com/photo-1562860143-2a8fda719599?w=600",
            "https://images.unsplash.com/photo-1603111692331-873b9a6ad2f4?w=600",
            "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600",
            "https://images.unsplash.com/photo-1578926375605-eaf7559b1458?w=600"
        ],
        "bijoux-accessoires": [
            "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600",
            "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600",
            "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600",
            "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600",
            "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=600"
        ],
        "beaute-cosmetiques": [
            "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600",
            "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600",
            "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600",
            "https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600",
            "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600"
        ],
        "electronique-gadgets": [
            "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600",
            "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600",
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
            "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600",
            "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600"
        ],
        "maison-cuisine": [
            "https://images.unsplash.com/photo-1562860143-2a8fda719599?w=600",
            "https://images.unsplash.com/photo-1717913491672-ec2c1921e81f?w=600",
            "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600",
            "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600",
            "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600"
        ],
        "produits-locaux-agroalimentaire": [
            "https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=600",
            "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600",
            "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
            "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=600",
            "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=600"
        ],
        "sport-loisirs": [
            "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600",
            "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600",
            "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600",
            "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600",
            "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600"
        ]
    }
    
    pool = image_pools.get(category_slug, image_pools["mode-textile"])
    num_images = random.randint(2, 4)
    return random.sample(pool, min(num_images, len(pool)))

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
            
            base_price = random.randint(2000, 150000)  # FCFA
            has_promo = random.random() < 0.3  # 30% chance of promo
            
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
                "category_id": cat_data["slug"],  # Will be updated with real ID
                "category_slug": category_slug,
                "images": get_product_images(category_slug),
                "video_url": None,
                "tags": random.sample(template_data.get("tags", []), min(3, len(template_data.get("tags", [])))),
                "rating": round(random.uniform(3.5, 5.0), 1),
                "sales_count": random.randint(0, 500),
                "reviews_count": random.randint(0, 100),
                "seller_name": random.choice(SELLER_NAMES),
                "seller_id": str(uuid.uuid4()),
                "is_featured": random.random() < 0.1,  # 10% featured
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            products.append(product)
    
    return products

# ============== API ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Bienvenue sur l'API Cloléo", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Categories
@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    if not categories:
        # Initialize categories if empty
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

# Products
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
    # Build query
    query = {}
    
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
    
    # Sort
    sort_direction = -1 if sort_order == "desc" else 1
    sort_field = sort_by if sort_by in ["price_fcfa", "rating", "sales_count", "created_at"] else "created_at"
    
    # Pagination
    skip = (page - 1) * limit
    
    # Get total count
    total = await db.products.count_documents(query)
    
    # Get products
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
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        # Try by slug
        product = await db.products.find_one({"slug": product_id}, {"_id": 0})
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
    
    # Get similar products from same category
    similar = await db.products.find(
        {"category_slug": product["category_slug"], "id": {"$ne": product["id"]}},
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
    
    # Get products with matching tags
    tags = product.get("tags", [])
    also_bought = await db.products.find(
        {
            "id": {"$ne": product["id"]},
            "tags": {"$elemMatch": {"$in": tags}}
        },
        {"_id": 0}
    ).sort("sales_count", -1).limit(limit).to_list(limit)
    
    return also_bought

# Search
@api_router.get("/search")
async def search_products(
    q: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    query = {
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$elemMatch": {"$regex": q, "$options": "i"}}}
        ]
    }
    
    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    
    return {
        "products": products,
        "total": total,
        "page": page,
        "limit": limit,
        "query": q
    }

# Cart
@api_router.post("/cart/add")
async def add_to_cart(item: CartItemCreate):
    # Check if product exists
    product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    # Check if item already in cart
    existing = await db.cart_items.find_one(
        {"product_id": item.product_id, "session_id": item.session_id}
    )
    
    if existing:
        # Update quantity
        new_quantity = existing["quantity"] + item.quantity
        await db.cart_items.update_one(
            {"_id": existing["_id"]},
            {"$set": {"quantity": new_quantity}}
        )
        return {"message": "Quantité mise à jour", "quantity": new_quantity}
    
    # Add new item
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
    
    # Get product details for each item
    items_with_products = []
    total_fcfa = 0
    total_usd = 0
    
    for item in cart_items:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
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

# Seed Data
@api_router.post("/seed")
async def seed_database():
    """Seed the database with categories and products"""
    # Clear existing data
    await db.categories.delete_many({})
    await db.products.delete_many({})
    
    # Insert categories
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
    
    # Generate and insert products
    products = generate_products(300)
    
    # Update category_id with real category IDs
    category_map = {cat["slug"]: cat["id"] for cat in categories}
    for product in products:
        product["category_id"] = category_map.get(product["category_slug"], "")
    
    await db.products.insert_many(products)
    
    # Update product counts
    for cat in categories:
        count = await db.products.count_documents({"category_slug": cat["slug"]})
        await db.categories.update_one({"id": cat["id"]}, {"$set": {"product_count": count}})
    
    return {
        "message": "Base de données initialisée avec succès",
        "categories": len(categories),
        "products": len(products)
    }

# Favorites (simple implementation)
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
        product = await db.products.find_one({"id": fav["product_id"]}, {"_id": 0})
        if product:
            products.append(product)
    return products

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
