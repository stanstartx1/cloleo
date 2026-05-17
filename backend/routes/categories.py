# Categories routes - Public API for browsing categories
from fastapi import APIRouter, HTTPException
from core.database import db

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("")
async def get_categories():
    """Get all categories and subcategories"""
    cats = await db.categories.find({}, {"_id": 0}).to_list(200)
    return cats

@router.get("/with-subcategories")
async def get_categories_with_subcategories():
    """Get categories grouped with their subcategories"""
    all_cats = await db.categories.find({}, {"_id": 0}).to_list(200)
    parents = [c for c in all_cats if not c.get("parent_slug")]
    children = [c for c in all_cats if c.get("parent_slug")]
    for parent in parents:
        parent["subcategories"] = [c for c in children if c.get("parent_slug") == parent.get("slug")]
    return parents

@router.get("/{slug}")
async def get_category(slug: str):
    """Get a single category by slug with its subcategories"""
    cat = await db.categories.find_one({"slug": slug}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=404, detail="Non trouvé")
    subcategories = await db.categories.find({"parent_slug": slug}, {"_id": 0}).to_list(50)
    cat["subcategories"] = subcategories
    return cat

__all__ = ['router']
