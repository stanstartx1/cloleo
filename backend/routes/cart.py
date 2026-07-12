# Cart routes - Shopping cart management
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from core.database import db
from models.schemas import CartItemCreate, CartItemUpdate

router = APIRouter(prefix="/cart", tags=["Cart"])

# Currency conversion constant
FCFA_TO_USD = 0.0016


def _unit_price(product: dict, quantity: int) -> int:
    """Apply the wholesale price once the configured quantity is reached."""
    if (
        product.get("wholesale_enabled")
        and quantity >= int(product.get("wholesale_min_quantity") or 0)
        and int(product.get("wholesale_unit_price_fcfa") or 0) > 0
    ):
        return int(product["wholesale_unit_price_fcfa"])
    return int(product.get("promo_price_fcfa") or product["price_fcfa"])


@router.post("/add")
async def add_to_cart(item: CartItemCreate):
    """Add item to cart"""
    if not await db.products.find_one({"id": item.product_id, "status": "approved"}):
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    existing = await db.cart_items.find_one({
        "product_id": item.product_id,
        "session_id": item.session_id,
        "selected_attributes": item.selected_attributes
    })
    
    if existing:
        await db.cart_items.update_one(
            {"_id": existing["_id"]},
            {"$inc": {"quantity": item.quantity}}
        )
    else:
        await db.cart_items.insert_one({
            "id": str(uuid.uuid4()),
            "product_id": item.product_id,
            "quantity": item.quantity,
            "session_id": item.session_id,
            "selected_attributes": item.selected_attributes,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    return {"message": "Ajouté"}


@router.get("/{session_id}")
async def get_cart(session_id: str):
    """Get cart contents for a session"""
    items = await db.cart_items.find({"session_id": session_id}, {"_id": 0}).to_list(100)
    result, total = [], 0
    
    for item in items:
        p = await db.products.find_one({"id": item["product_id"], "status": "approved"}, {"_id": 0})
        if p:
            price = _unit_price(p, int(item["quantity"]))
            subtotal = price * item["quantity"]
            result.append({**item, "product": p, "unit_price_fcfa": price, "subtotal_fcfa": subtotal})
            total += subtotal
    
    return {
        "items": result,
        "total_fcfa": total,
        "total_usd": round(total * FCFA_TO_USD, 2),
        "item_count": len(result)
    }


@router.put("/{session_id}/{item_id}")
async def update_cart_item(session_id: str, item_id: str, data: CartItemUpdate):
    """Update cart item quantity"""
    if data.quantity <= 0:
        await db.cart_items.delete_one({"id": item_id, "session_id": session_id})
    else:
        await db.cart_items.update_one(
            {"id": item_id, "session_id": session_id},
            {"$set": {"quantity": data.quantity}}
        )
    return {"message": "Mis à jour"}


@router.delete("/{session_id}/{item_id}")
async def remove_cart_item(session_id: str, item_id: str):
    """Remove item from cart"""
    await db.cart_items.delete_one({"id": item_id, "session_id": session_id})
    return {"message": "Supprimé"}


@router.delete("/{session_id}")
async def clear_cart(session_id: str):
    """Clear entire cart"""
    await db.cart_items.delete_many({"session_id": session_id})
    return {"message": "Vidé"}
