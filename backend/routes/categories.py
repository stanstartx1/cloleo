# Categories routes - Public API for browsing categories
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid

from core.database import db

router = APIRouter(prefix="/categories", tags=["Categories"])

# Default categories data
CATEGORIES_DATA = [
    {"name": "Mode & Textile", "slug": "mode-textile", "icon": "Shirt", "description": "Vêtements, chaussures, accessoires"},
    {"name": "Artisanat & Décoration", "slug": "artisanat-decoration", "icon": "Palette", "description": "Art local, décoration, tissages"},
    {"name": "Bijoux & Accessoires", "slug": "bijoux-accessoires", "icon": "Gem", "description": "Bijoux, montres, sacs"},
    {"name": "Beauté & Cosmétiques", "slug": "beaute-cosmetiques", "icon": "Sparkles", "description": "Soins, maquillage, parfums"},
    {"name": "Électronique & Gadgets", "slug": "electronique-gadgets", "icon": "Smartphone", "description": "Téléphones, ordinateurs, gadgets"},
    {"name": "Maison & Cuisine", "slug": "maison-cuisine", "icon": "Home", "description": "Ustensiles, électroménager, déco"},
    {"name": "Produits Locaux", "slug": "produits-locaux", "icon": "Leaf", "description": "Alimentation, épices, produits du terroir"},
    {"name": "Sport & Loisirs", "slug": "sport-loisirs", "icon": "Dumbbell", "description": "Équipements sportifs, jeux, hobbies"}
]


@router.get("")
async def get_categories():
    """Get all categories"""
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    if not cats:
        # Seed default categories
        for c in CATEGORIES_DATA:
            await db.categories.insert_one({
                "id": str(uuid.uuid4()),
                **c,
                "image": None,
                "banner_images": [],
                "is_active": True,
                "product_count": 0,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    return cats


@router.get("/{slug}")
async def get_category(slug: str):
    """Get a single category by slug"""
    cat = await db.categories.find_one({"slug": slug}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=404, detail="Non trouvé")
    return cat


# Export categories data for other modules
__all__ = ['router', 'CATEGORIES_DATA']
