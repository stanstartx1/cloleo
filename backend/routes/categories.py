# Categories routes - Public API for browsing categories
from fastapi import APIRouter, HTTPException

from core.database import db

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("")
async def get_categories():
    """Get all categories"""
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
__all__ = ['router']
