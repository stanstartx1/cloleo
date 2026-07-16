from datetime import datetime, timezone
from pathlib import Path
import os
import uuid
from typing import Optional
import re

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from pymongo.errors import ServerSelectionTimeoutError

from core.auth import (
    hash_password,
    verify_password,
    get_current_user,
    require_admin,
    require_driver,
    require_dropshipper,
    require_vendor,
)
from core.database import db
from core.websocket import manager
from models.schemas import CreateOrder, DropshippedProductCreate, DropshippedProductUpdate
from routes.auth import router as auth_router
from routes.cart import router as cart_router
from routes.categories import router as categories_router
from routes.chat import router as chat_router, vendor_chat_router, dropshipper_chat_router, set_manager
from routes.favorites import router as favorites_router, session_favorites_router
from routes.products import router as products_router
from routes.reviews import router as reviews_router


load_dotenv()

app = FastAPI(title="Cloleo Marketplace API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = Path(__file__).parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.exception_handler(ServerSelectionTimeoutError)
async def mongo_unavailable_handler(request, exc):
    return JSONResponse(
        status_code=503,
        content={
            "detail": "Base de données indisponible. Vérifiez MongoDB (MONGO_URL)."
        },
    )

api = FastAPI()

# Bind websocket manager for chat route broadcasts
set_manager(manager)

# Existing routers
api.include_router(auth_router)
api.include_router(products_router)
api.include_router(categories_router)
api.include_router(cart_router)
api.include_router(favorites_router)
api.include_router(session_favorites_router)
api.include_router(chat_router)
api.include_router(vendor_chat_router)
api.include_router(dropshipper_chat_router)
api.include_router(reviews_router)


def _utc():
    return datetime.now(timezone.utc).isoformat()


def _slugify(text: str) -> str:
    base = (text or "").strip().lower()
    base = re.sub(r"[^a-z0-9]+", "-", base)
    return base.strip("-") or str(uuid.uuid4())[:8]


@api.get("/")
async def api_root():
    return {"name": "Cloleo API", "status": "ok"}


@api.get("/health")
async def api_health():
    return {"status": "ok"}


@api.get("/auth/me")
async def auth_me(user: dict = Depends(get_current_user)):
    user = dict(user)
    user.pop("_id", None)
    user.pop("password", None)
    return user


@api.post("/seed")
async def seed_categories():
    count = await db.categories.count_documents({})
    if count > 0:
        return {"ok": True, "seeded": False}
    defaults = [
        {"id": str(uuid.uuid4()), "name": "Mode & Textile", "slug": "mode-textile", "icon": "Shirt", "description": "Vêtements et tissus", "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Beauté", "slug": "beaute", "icon": "Sparkles", "description": "Produits de beauté", "is_active": True},
        {"id": str(uuid.uuid4()), "name": "Maison", "slug": "maison", "icon": "Home", "description": "Maison et déco", "is_active": True},
    ]
    await db.categories.insert_many(defaults)
    return {"ok": True, "seeded": True, "count": len(defaults)}


@api.get("/search")
async def search_products(q: str = "", page: int = 1, limit: int = 20):
    query = {"status": "approved"}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]
    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    products = await db.products.find(
        query, 
        {"_id": 0, "id": 1, "name": 1, "slug": 1, "price_fcfa": 1, "promo_price_fcfa": 1, 
         "images": 1, "seller_id": 1, "seller_name": 1, "city": 1, "location": 1,
         "condition": 1, "is_featured": 1, "wholesale_enabled": 1, "wholesale_min_quantity": 1,
         "origin_country_code": 1, "origin_country_name": 1, "made_in_enabled": 1,
         "rating": 1, "reviews_count": 1, "sales_count": 1}
    ).skip(skip).limit(limit).to_list(limit)
    
    # Récupérer les photos de profil des vendeurs
    seller_ids = [p.get("seller_id") for p in products if p.get("seller_id")]
    seller_data_map = {}
    if seller_ids:
        sellers = await db.users.find(
            {"id": {"$in": seller_ids}},
            {"_id": 0, "id": 1, "profile_photo": 1, "name": 1}
        ).to_list(len(seller_ids))
        seller_data_map = {s["id"]: s for s in sellers}
    
    # Ajouter les photos de profil aux produits
    for p in products:
        seller_id = p.get("seller_id")
        if seller_id and seller_id in seller_data_map:
            seller_info = seller_data_map[seller_id]
            p["seller_profile_photo"] = seller_info.get("profile_photo")
            if not p.get("seller_name"):
                p["seller_name"] = seller_info.get("name")
    
    return {"products": products, "total": total, "page": page}


# ═══════════════════════════════════════════════════════════════
# SEARCH SUGGESTIONS - Recherche en temps réel
# ═══════════════════════════════════════════════════════════════

@api.get("/search/suggestions")
async def search_suggestions(q: str = "", limit: int = 8):
    """Retourne des suggestions de noms de produits en temps réel"""
    if not q or len(q) < 2:
        return {"suggestions": []}
    
    # Recherche insensible à la casse dans les produits approuvés
    products = await db.products.find(
        {
            "status": "approved",
            "name": {"$regex": q, "$options": "i"}
        },
        {"_id": 0, "name": 1}
    ).limit(limit).to_list(limit)
    
    suggestions = [p.get("name") for p in products if p.get("name")]
    
    # Si pas assez de résultats, ajouter des catégories correspondantes
    if len(suggestions) < 4:
        categories = await db.categories.find(
            {"name": {"$regex": q, "$options": "i"}, "is_active": True},
            {"_id": 0, "name": 1}
        ).limit(limit - len(suggestions)).to_list(limit)
        for cat in categories:
            if cat.get("name") and cat.get("name") not in suggestions:
                suggestions.append(cat.get("name"))
    
    return {"suggestions": suggestions[:limit]}


@api.get("/search/products")
async def search_products_live(q: str = "", limit: int = 5):
    """Retourne des produits complets pour les suggestions en temps réel"""
    if not q or len(q) < 2:
        return {"products": []}
    
    products = await db.products.find(
        {
            "status": "approved",
            "$or": [
                {"name": {"$regex": q, "$options": "i"}},
                {"tags": {"$regex": q, "$options": "i"}}
            ]
        },
        {
            "_id": 0, 
            "id": 1, 
            "name": 1, 
            "slug": 1, 
            "price_fcfa": 1, 
            "images": 1, 
            "promo_price_fcfa": 1,
            "seller_id": 1,
            "seller_name": 1,
            "city": 1,
            "location": 1,
            "condition": 1,
            "is_featured": 1,
            "wholesale_enabled": 1,
            "wholesale_min_quantity": 1,
            "origin_country_code": 1,
            "origin_country_name": 1,
            "made_in_enabled": 1,
            "rating": 1,
            "reviews_count": 1,
            "sales_count": 1
        }
    ).limit(limit).to_list(limit)
    
    # Récupérer les photos de profil des vendeurs
    seller_ids = [p.get("seller_id") for p in products if p.get("seller_id")]
    seller_data_map = {}
    if seller_ids:
        sellers = await db.users.find(
            {"id": {"$in": seller_ids}},
            {"_id": 0, "id": 1, "profile_photo": 1, "name": 1}
        ).to_list(len(seller_ids))
        seller_data_map = {s["id"]: s for s in sellers}
    
    # Formater les produits pour le frontend
    for p in products:
        p["price"] = p.get("promo_price_fcfa") or p.get("price_fcfa") or 0
        p["image"] = p.get("images", [None])[0] if p.get("images") else None
        seller_id = p.get("seller_id")
        if seller_id and seller_id in seller_data_map:
            seller_info = seller_data_map[seller_id]
            p["seller_profile_photo"] = seller_info.get("profile_photo")
            if not p.get("seller_name"):
                p["seller_name"] = seller_info.get("name")
    
    return {"products": products}


@api.get("/stats/public")
async def public_stats():
    products = await db.products.count_documents({"status": "approved"})
    vendors = await db.users.count_documents({"role": "vendor"})
    drivers = await db.users.count_documents({"role": "driver"})
    return {"products": products, "vendors": vendors, "drivers": drivers}


@api.post("/upload/multiple")
async def upload_multiple(files: list[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    urls = []
    for f in files:
        ext = Path(f.filename or "").suffix or ".bin"
        filename = f"{uuid.uuid4()}{ext}"
        dest = uploads_dir / filename
        content = await f.read()
        dest.write_bytes(content)
        urls.append(f"/uploads/{filename}")
    return {"urls": urls}


@api.post("/orders")
async def create_order(payload: CreateOrder, user: dict = Depends(get_current_user)):
    subtotal = 0
    order_items = []
    seller_id = None
    dropshipper_id = None
    is_dropshipped_order = False
    dropshipped_product_info = None
    
    for item in payload.items:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit introuvable: {item['product_id']}")
        
        # Vérifier si le produit est dropshippé
        dropshipped = await db.dropshipped_products.find_one(
            {"id": item["product_id"]}, 
            {"_id": 0, "dropshipper_id": 1, "original_product_id": 1, "selling_price_fcfa": 1, 
             "original_price_fcfa": 1, "original_promo_price_fcfa": 1, "dropshipper_share_fcfa": 1,
             "custom_description": 1, "custom_images": 1, "original_name": 1, "original_images": 1}
        )
        
        if dropshipped:
            is_dropshipped_order = True
            dropshipper_id = dropshipped.get("dropshipper_id")
            dropshipped_product_info = dropshipped
            # Pour les produits dropshippés, le vendeur original est celui du produit source
            original_product = await db.products.find_one({"id": dropshipped["original_product_id"]}, {"_id": 0})
            if original_product:
                seller_id = original_product.get("seller_id")
        else:
            seller_id = seller_id or product.get("seller_id")
        
        qty = int(item.get("quantity", 1))
        unit_price = int(product.get("promo_price_fcfa") or product.get("price_fcfa") or 0)
        is_wholesale_price = False
        if (
            product.get("wholesale_enabled")
            and qty >= int(product.get("wholesale_min_quantity") or 0)
            and int(product.get("wholesale_unit_price_fcfa") or 0) > 0
        ):
            unit_price = int(product["wholesale_unit_price_fcfa"])
            is_wholesale_price = True
        item_total = unit_price * qty
        subtotal += item_total
        
        order_items.append({
            "product_id": product["id"],
            "product_name": product.get("name"),
            "product_image": (product.get("images") or [None])[0],
            "quantity": qty,
            "selected_attributes": item.get("selected_attributes") or {},
            "price_fcfa": unit_price,
            "is_wholesale_price": is_wholesale_price,
            "subtotal_fcfa": item_total,
        })

    delivery_fee = 1500
    total = subtotal + delivery_fee
    order_id = str(uuid.uuid4())
    
    # Si c'est une commande dropshippée, créer deux commandes optimisées : une pour le vendeur, une pour le revendeur
    if is_dropshipped_order and dropshipped_product_info:
        original_price = int(dropshipped_product_info.get("original_promo_price_fcfa") or dropshipped_product_info.get("original_price_fcfa") or 0)
        selling_price = int(dropshipped_product_info.get("selling_price_fcfa") or 0)
        original_subtotal = original_price * sum(item["quantity"] for item in order_items)
        dropshipper_subtotal = subtotal
        margin = dropshipper_subtotal - original_subtotal
        dropshipper_share = int(margin * 0.5)
        platform_share = margin - dropshipper_share
        
        print(f"DEBUG: Dropshipped order creation - original_price: {original_price}, selling_price: {selling_price}, margin: {margin}, dropshipper_share: {dropshipper_share}")
        print(f"DEBUG: dropshipped_product_info: {dropshipped_product_info}")
        
        # Commande optimisée pour le vendeur
        seller_order = {
            "id": str(uuid.uuid4()),
            "order_number": f"CLO-{order_id[:8].upper()}-V",
            "customer_id": user["id"],
            "customer_name": payload.delivery_address.name,
            "customer_phone": payload.delivery_address.phone,
            "seller_id": seller_id,
            "dropshipper_id": dropshipper_id,
            "is_dropshipped_order": True,
            "items": [{
                **order_items[0],
                "original_product_id": dropshipped_product_info["original_product_id"],
                "original_name": dropshipped_product_info.get("original_name"),
                "original_image": (dropshipped_product_info.get("original_images") or [None])[0],
                "original_price_fcfa": original_price,
                "selling_price_fcfa": selling_price,
                "quantity": order_items[0]["quantity"],
                "seller_earnings_fcfa": original_subtotal,
            }],
            "delivery_address": payload.delivery_address.model_dump(),
            "payment_method": payload.payment_method,
            "payment_status": "pending",
            "subtotal_fcfa": original_subtotal,
            "delivery_fee_fcfa": delivery_fee,
            "total_fcfa": original_subtotal + delivery_fee,
            "seller_earnings_fcfa": original_subtotal,
            "status": "pending",
            "status_history": [{"status": "pending", "note": "Commande dropshippée", "timestamp": _utc()}],
            "created_at": _utc(),
            "updated_at": _utc(),
        }
        await db.orders.insert_one(seller_order)
        
        # Commande optimisée pour le revendeur
        dropshipper_order = {
            "id": str(uuid.uuid4()),
            "order_number": f"CLO-{order_id[:8].upper()}-R",
            "customer_id": user["id"],
            "customer_name": payload.delivery_address.name,
            "customer_phone": payload.delivery_address.phone,
            "seller_id": seller_id,
            "dropshipper_id": dropshipper_id,
            "is_dropshipped_order": True,
            "items": [{
                "product_id": order_items[0]["product_id"],
                "original_product_id": dropshipped_product_info["original_product_id"],
                "product_name": dropshipped_product_info.get("custom_description") or dropshipped_product_info.get("original_name"),
                "product_image": (dropshipped_product_info.get("custom_images") or dropshipped_product_info.get("original_images") or [None])[0],
                "original_price_fcfa": original_price,
                "selling_price_fcfa": selling_price,
                "quantity": order_items[0]["quantity"],
                "margin_fcfa": margin,
                "dropshipper_earnings_fcfa": dropshipper_share,
                "platform_share_fcfa": platform_share,
                "price_fcfa": selling_price,
                "subtotal_fcfa": dropshipper_subtotal,
            }],
            "delivery_address": payload.delivery_address.model_dump(),
            "payment_method": payload.payment_method,
            "payment_status": "pending",
            "subtotal_fcfa": dropshipper_subtotal,
            "delivery_fee_fcfa": delivery_fee,
            "total_fcfa": dropshipper_subtotal + delivery_fee,
            "dropshipper_earnings_fcfa": dropshipper_share,
            "status": "pending",
            "status_history": [{"status": "pending", "note": "Commande dropshippée", "timestamp": _utc()}],
            "created_at": _utc(),
            "updated_at": _utc(),
        }
        print(f"DEBUG: Dropshipper order to insert: {dropshipper_order}")
        await db.orders.insert_one(dropshipper_order)
        
        # Commande principale pour le client
        main_order = {
            "id": order_id,
            "order_number": f"CLO-{order_id[:8].upper()}",
            "customer_id": user["id"],
            "customer_name": payload.delivery_address.name,
            "customer_phone": payload.delivery_address.phone,
            "seller_id": seller_id,
            "dropshipper_id": dropshipper_id,
            "is_dropshipped_order": True,
            "items": order_items,
            "delivery_address": payload.delivery_address.model_dump(),
            "notes": payload.notes,
            "payment_method": payload.payment_method,
            "payment_status": "pending",
            "subtotal_fcfa": subtotal,
            "delivery_fee_fcfa": delivery_fee,
            "total_fcfa": total,
            "status": "pending",
            "status_history": [{"status": "pending", "note": "Commande créée", "timestamp": _utc()}],
            "created_at": _utc(),
            "updated_at": _utc(),
        }
        await db.orders.insert_one(main_order)
        main_order.pop("_id", None)
        return main_order
    
    # Commande normale (non dropshippée)
    order = {
        "id": order_id,
        "order_number": f"CLO-{order_id[:8].upper()}",
        "customer_id": user["id"],
        "customer_name": payload.delivery_address.name,
        "customer_phone": payload.delivery_address.phone,
        "seller_id": seller_id,
        "dropshipper_id": dropshipper_id,
        "items": order_items,
        "delivery_address": payload.delivery_address.model_dump(),
        "notes": payload.notes,
        "payment_method": payload.payment_method,
        "payment_status": "pending",
        "subtotal_fcfa": subtotal,
        "delivery_fee_fcfa": delivery_fee,
        "total_fcfa": total,
        "status": "pending",
        "status_history": [{"status": "pending", "note": "Commande créée", "timestamp": _utc()}],
        "created_at": _utc(),
        "updated_at": _utc(),
    }
    await db.orders.insert_one(order)
    order.pop("_id", None)
    return order


@api.get("/orders")
async def list_orders(user: dict = Depends(get_current_user)):
    role = user.get("role")
    query = {}
    print(f"DEBUG: list_orders - role: {role}, user_id: {user['id']}")
    
    if role == "vendor":
        # Les vendeurs voient toutes leurs commandes (directes et dropshippées)
        query["seller_id"] = user["id"]
        print(f"DEBUG: Vendor query - seller_id: {user['id']}")
    elif role == "dropshipper":
        # Les revendeurs voient leurs commandes dropshippées
        query["dropshipper_id"] = user["id"]
        print(f"DEBUG: Dropshipper query - dropshipper_id: {user['id']}")
    elif role == "driver":
        query["driver_id"] = user["id"]
    else:
        query["customer_id"] = user["id"]
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(300)
    print(f"DEBUG: Found {len(orders)} orders for user {user['id']} with role {role}")
    return {"orders": orders}


@api.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    return order


@api.get("/orders/track/{order_id}")
async def track_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    if order.get("driver_id"):
        order["driver_live_location"] = manager.get_driver_location(order["driver_id"])
    return order


@api.put("/orders/{order_id}/accept")
async def driver_accept_order(order_id: str, user: dict = Depends(require_driver)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {"status": "assigned", "driver_id": user["id"], "driver_name": user.get("name"), "updated_at": _utc()},
            "$push": {"status_history": {"status": "assigned", "note": "Livreur assigné", "timestamp": _utc()}},
        },
    )
    await manager.broadcast_to_room(f"order_{order_id}", {"type": "order_update", "status": "assigned", "message": "Livreur assigné"})
    return {"ok": True}


@api.put("/orders/{order_id}/pickup")
async def driver_pickup_order(order_id: str, user: dict = Depends(require_driver)):
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {"status": "picked_up", "updated_at": _utc()},
            "$push": {"status_history": {"status": "picked_up", "note": "Colis récupéré", "timestamp": _utc()}},
        },
    )
    await manager.broadcast_to_room(f"order_{order_id}", {"type": "order_update", "status": "picked_up", "message": "Colis récupéré"})
    return {"ok": True}


@api.put("/orders/{order_id}/deliver")
async def driver_deliver_order(order_id: str, user: dict = Depends(require_driver)):
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {"status": "delivered", "updated_at": _utc()},
            "$push": {"status_history": {"status": "delivered", "note": "Commande livrée", "timestamp": _utc()}},
        },
    )
    await manager.broadcast_to_room(f"order_{order_id}", {"type": "order_update", "status": "delivered", "message": "Commande livrée"})
    return {"ok": True}


@api.get("/vendor/dashboard")
async def vendor_dashboard(user: dict = Depends(require_vendor)):
    products = await db.products.count_documents({"seller_id": user["id"]})
    orders = await db.orders.count_documents({"seller_id": user["id"]})
    pending = await db.orders.count_documents({"seller_id": user["id"], "status": "pending"})
    return {
        "subscription": {"plan": user.get("subscription_plan", "free"), "expires_at": user.get("subscription_expires")},
        "stats": {
            "product_count": products,
            "order_count": orders,
            "pending_orders": pending,
            "revenue_fcfa": 0,
        },
    }


@api.get("/vendor/products")
async def vendor_products(status: Optional[str] = None, user: dict = Depends(require_vendor)):
    query = {"seller_id": user["id"]}
    if status:
        query["status"] = status
    return await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/vendor/products")
async def create_vendor_product(payload: dict, user: dict = Depends(require_vendor)):
    if not payload.get("name") or not payload.get("description") or not payload.get("category_slug"):
        raise HTTPException(status_code=400, detail="name, description et category_slug sont requis")
    if int(payload.get("price_fcfa") or 0) <= 0:
        raise HTTPException(status_code=400, detail="Le prix doit etre superieur a 0")
    if int(payload.get("stock") or 0) < 0:
        raise HTTPException(status_code=400, detail="Le stock est invalide")

    wholesale_enabled = bool(payload.get("wholesale_enabled", False))
    wholesale_min_quantity = int(payload.get("wholesale_min_quantity") or 0)
    wholesale_unit_price_fcfa = int(payload.get("wholesale_unit_price_fcfa") or 0)
    if wholesale_enabled and (wholesale_min_quantity < 2 or wholesale_unit_price_fcfa <= 0):
        raise HTTPException(status_code=400, detail="Configurez une quantité minimum (2+) et un prix de gros valide")
    if wholesale_enabled and wholesale_unit_price_fcfa >= int(payload.get("price_fcfa") or 0):
        raise HTTPException(status_code=400, detail="Le prix de gros doit être inférieur au prix unitaire")

    product_id = str(uuid.uuid4())
    name = payload.get("name")
    slug = _slugify(name)
    exists_slug = await db.products.find_one({"slug": slug}, {"_id": 0, "id": 1})
    if exists_slug:
        slug = f"{slug}-{product_id[:6]}"

    custom_attributes = payload.get("custom_attributes") or {}
    if not isinstance(custom_attributes, dict):
        custom_attributes = {}

    product = {
        "id": product_id,
        "slug": slug,
        "seller_id": user["id"],
        "seller_name": user.get("shop_name") or user.get("name"),
        "name": name,
        "description": payload.get("description"),
        "category_slug": payload.get("category_slug"),
        "subcategory_slug": payload.get("subcategory_slug") or None,
        "condition": payload.get("condition", "neuf"),
        "origin_country_code": payload.get("origin_country_code") or "CI",
        "origin_country_name": payload.get("origin_country_name") or "Cote d'Ivoire",
        "made_in_enabled": bool(payload.get("made_in_enabled")),
        "price_fcfa": int(payload.get("price_fcfa") or 0),
        "promo_price_fcfa": int(payload.get("promo_price_fcfa") or 0) or None,
        "wholesale_enabled": wholesale_enabled,
        "wholesale_min_quantity": wholesale_min_quantity if wholesale_enabled else None,
        "wholesale_unit_price_fcfa": wholesale_unit_price_fcfa if wholesale_enabled else None,
        "stock": int(payload.get("stock") or 0),
        "images": payload.get("images") or [],
        "tags": payload.get("tags") or [],
        "custom_attributes": custom_attributes,
        "is_active": True,
        "status": "pending",
        "is_featured": False,
        "created_at": _utc(),
        "updated_at": _utc(),
    }
    # Auto-approve if platform setting is enabled
    platform = await db.settings.find_one({"type": "platform"}, {"_id": 0}) or {}
    if platform.get("auto_approve_products"):
        product["status"] = "approved"

    await db.products.insert_one(product)
    product.pop("_id", None)
    return product


@api.put("/vendor/products/{product_id}")
async def update_vendor_product(product_id: str, payload: dict, user: dict = Depends(require_vendor)):
    update = {k: v for k, v in payload.items() if v is not None}
    if "name" in update and update["name"]:
        update["slug"] = _slugify(update["name"])
    if "price_fcfa" in update and int(update["price_fcfa"] or 0) <= 0:
        raise HTTPException(status_code=400, detail="Le prix doit etre superieur a 0")
    if "stock" in update and int(update["stock"] or 0) < 0:
        raise HTTPException(status_code=400, detail="Le stock est invalide")
    if update.get("wholesale_enabled"):
        min_qty = int(update.get("wholesale_min_quantity") or 0)
        wholesale_price = int(update.get("wholesale_unit_price_fcfa") or 0)
        regular_price = int(update.get("price_fcfa") or 0)
        if min_qty < 2 or wholesale_price <= 0 or (regular_price and wholesale_price >= regular_price):
            raise HTTPException(status_code=400, detail="Configuration de gros invalide")
    update["updated_at"] = _utc()
    await db.products.update_one({"id": product_id, "seller_id": user["id"]}, {"$set": update})
    product = await db.products.find_one({"id": product_id, "seller_id": user["id"]}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return product


@api.delete("/vendor/products/{product_id}")
async def delete_vendor_product(product_id: str, user: dict = Depends(require_vendor)):
    result = await db.products.delete_one({"id": product_id, "seller_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit non trouve")
    return {"ok": True}


@api.get("/driver/dashboard")
async def driver_dashboard(user: dict = Depends(require_driver)):
    orders = await db.orders.count_documents({"driver_id": user["id"]})
    active = await db.orders.count_documents({"driver_id": user["id"], "status": {"$in": ["assigned", "picked_up", "in_transit"]}})
    return {"driver": {"id": user["id"], "name": user.get("name")}, "stats": {"total_orders": orders, "active_orders": active}}


@api.post("/driver/location/update")
async def driver_location_update(payload: dict, user: dict = Depends(require_driver)):
    location = {"latitude": payload.get("latitude"), "longitude": payload.get("longitude")}
    manager.update_driver_location(user["id"], location)
    await manager.broadcast_to_room("admin_tracking", {"type": "driver_location", "location": manager.get_driver_location(user["id"])})
    return {"ok": True}


@api.put("/driver/status")
async def driver_status_update(payload: dict, user: dict = Depends(require_driver)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"driver_status": payload.get("status", "available"), "updated_at": _utc()}})
    return {"ok": True}


@api.post("/driver/upload-license")
async def driver_upload_license(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if user.get("role") != "driver":
        raise HTTPException(status_code=403, detail="Acces reserve aux livreurs")
    ext = Path(file.filename or "").suffix or ".bin"
    filename = f"license_{user['id']}_{uuid.uuid4()}{ext}"
    dest = uploads_dir / filename
    content = await file.read()
    dest.write_bytes(content)
    url = f"/uploads/{filename}"
    await db.users.update_one({"id": user["id"]}, {"$set": {"license_image": url, "updated_at": _utc()}})
    return {"url": url}


@api.get("/revendeur/dashboard")
async def revendeur_dashboard(user: dict = Depends(require_dropshipper)):
    products = await db.dropshipped_products.count_documents({"dropshipper_id": user["id"]})
    # Compter uniquement les commandes revendeur (avec suffixe -R)
    orders = await db.orders.count_documents({"dropshipper_id": user["id"], "order_number": {"$regex": "-R$"}})
    return {"stats": {"product_count": products, "order_count": orders, "revenue_fcfa": 0}, "shop": {"slug": user.get("shop_slug"), "name": user.get("shop_name")}}


@api.get("/revendeur/catalog")
async def revendeur_catalog(
    page: int = 1,
    limit: int = 48,
    search: str = "",
    category_slug: str = "",
    all: bool = False,
    user: dict = Depends(require_dropshipper),
    request: Request = None
):
    """
    Retourne le catalogue produits pour le revendeur.
    - all=true : retourne TOUS les produits sans pagination (pour la vue groupée par catégorie)
    - category_slug : filtre par catégorie ou sous-catégorie (peut être envoyé plusieurs fois pour filtrer sur plusieurs catégories)
    - search : recherche textuelle
    """
    query = {"status": "approved", "source": {"$ne": "revendeur"}}
    
    # Récupérer tous les category_slug depuis les query params (supporte les paramètres répétés)
    category_slugs = []
    if request:
        category_slugs = request.query_params.getlist("category_slug")
    if category_slug and category_slug not in category_slugs:
        category_slugs.append(category_slug)
    
    if category_slugs:
        # Chercher dans category_slug ET subcategory_slug pour tous les slugs fournis
        category_filters = []
        for slug in category_slugs:
            category_filters.extend([
                {"category_slug": slug},
                {"subcategory_slug": slug},
            ])
        query["$or"] = category_filters
    if search:
        search_filter = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
        if "$or" in query:
            query["$and"] = [{"$or": query.pop("$or")}, {"$or": search_filter}]
        else:
            query["$or"] = search_filter

    total = await db.products.count_documents(query)

    if all:
        # Mode vue catégorie : tous les produits d'un coup, champs essentiels seulement
        products = await db.products.find(query, {
            "_id": 0, "id": 1, "name": 1, "images": 1, "price_fcfa": 1,
            "promo_price_fcfa": 1, "category_slug": 1, "subcategory_slug": 1,
            "stock": 1, "condition": 1, "seller_id": 1,
        }).sort("name", 1).to_list(5000)
    else:
        skip = (page - 1) * limit
        products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)

    # Marquer les produits déjà ajoutés par ce revendeur
    existing = await db.dropshipped_products.find(
        {"dropshipper_id": user["id"]}, {"_id": 0, "original_product_id": 1}
    ).to_list(5000)
    existing_ids = {e.get("original_product_id") for e in existing}
    for p in products:
        p["is_dropshipped"] = p.get("id") in existing_ids

    # Retourner catégories et sous-catégories avec image pour l'affichage
    categories = await db.categories.find(
        {"is_active": {"$ne": False}},
        {"_id": 0, "id": 1, "slug": 1, "name": 1, "parent_slug": 1, "image": 1, "banner_images": 1},
    ).sort("name", 1).to_list(500)

    return {"products": products, "total": total, "page": page, "categories": categories}

@api.get("/revendeur/products")
async def revendeur_products(user: dict = Depends(require_dropshipper)):
    revendeur_products = await db.dropshipped_products.find(
        {"dropshipper_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)

    public_products = await db.products.find(
        {"seller_id": user["id"], "seller_type": "dropshipper"},
        {"_id": 0, "id": 1, "status": 1, "is_active": 1, "updated_at": 1}
    ).to_list(1000)
    by_id = {p.get("id"): p for p in public_products}

    for p in revendeur_products:
        pub = by_id.get(p.get("id")) or {}
        p["publication_status"] = pub.get("status", "pending")
        p["published_is_active"] = pub.get("is_active", p.get("is_active", True))

    return revendeur_products


@api.post("/revendeur/products")
async def create_revendeur_product(payload: DropshippedProductCreate, user: dict = Depends(require_dropshipper)):
    original = await db.products.find_one({"id": payload.original_product_id}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Produit source non trouvé")
    existing = await db.dropshipped_products.find_one(
        {"dropshipper_id": user["id"], "original_product_id": payload.original_product_id},
        {"_id": 0, "id": 1},
    )
    if existing:
        raise HTTPException(status_code=400, detail="Produit deja ajoute a votre catalogue")

    base_price = int(original.get("promo_price_fcfa") or original.get("price_fcfa") or 0)
    if int(payload.selling_price_fcfa) < base_price:
        raise HTTPException(status_code=400, detail=f"Le prix de vente doit etre >= {base_price} FCFA")

    dp_id = str(uuid.uuid4())
    custom_images = payload.custom_images or []
    images = custom_images or (original.get("images") or [])
    margin = max(0, int(payload.selling_price_fcfa) - base_price)
    doc = {
        "id": dp_id,
        "dropshipper_id": user["id"],
        "original_product_id": original["id"],
        "original_name": original.get("name"),
        "original_images": images,
        "original_price_fcfa": original.get("price_fcfa"),
        "original_promo_price_fcfa": original.get("promo_price_fcfa"),
        "selling_price_fcfa": payload.selling_price_fcfa,
        "custom_description": payload.custom_description,
        "custom_images": custom_images,
        "custom_image_url": images[0] if images else None,
        "dropshipper_share_fcfa": int(margin * 0.5),
        "revendeur_share_fcfa": int(margin * 0.5),
        "is_active": True,
        "created_at": _utc(),
        "updated_at": _utc(),
    }
    await db.dropshipped_products.insert_one(doc)

    # Publish revendeur product in the global public catalog so it appears on homepage/listing.
    public_product = {
        "id": dp_id,
        "slug": _slugify(f"{original.get('name') or 'produit'}-{dp_id[:6]}"),
        "seller_id": user["id"],
        "seller_name": user.get("shop_name") or user.get("name"),
        "seller_type": "dropshipper",
        "name": original.get("name"),
        "description": payload.custom_description or original.get("description"),
        "category_slug": original.get("category_slug"),
        "condition": original.get("condition", "neuf"),
        "price_fcfa": int(payload.selling_price_fcfa),
        "promo_price_fcfa": None,
        "stock": int(original.get("stock") or 999),
        "images": images,
        "tags": original.get("tags") or [],
        "is_active": True,
        "status": "pending",
        "is_featured": False,
        "source": "revendeur",
        "original_product_id": original.get("id"),
        "created_at": _utc(),
        "updated_at": _utc(),
    }
    # Auto-approve revendeur product if platform setting is enabled
    platform_cfg = await db.settings.find_one({"type": "platform"}, {"_id": 0}) or {}
    if platform_cfg.get("auto_approve_products"):
        public_product["status"] = "approved"

    await db.products.insert_one(public_product)
    doc.pop("_id", None)
    return doc


@api.put("/revendeur/products/{product_id}")
async def update_revendeur_product(product_id: str, payload: DropshippedProductUpdate, user: dict = Depends(require_dropshipper)):
    update = payload.model_dump(exclude_unset=True)
    if "selling_price_fcfa" in update and update["selling_price_fcfa"] is not None:
        current = await db.dropshipped_products.find_one({"id": product_id, "dropshipper_id": user["id"]}, {"_id": 0})
        if not current:
            raise HTTPException(status_code=404, detail="Produit revendeur non trouve")
        base_price = int(current.get("original_promo_price_fcfa") or current.get("original_price_fcfa") or 0)
        if int(update["selling_price_fcfa"]) < base_price:
            raise HTTPException(status_code=400, detail=f"Le prix de vente doit etre >= {base_price} FCFA")
        margin = max(0, int(update["selling_price_fcfa"]) - base_price)
        update["dropshipper_share_fcfa"] = int(margin * 0.5)
        update["revendeur_share_fcfa"] = int(margin * 0.5)
    update["updated_at"] = _utc()
    await db.dropshipped_products.update_one({"id": product_id, "dropshipper_id": user["id"]}, {"$set": update})
    doc = await db.dropshipped_products.find_one({"id": product_id, "dropshipper_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Produit revendeur non trouvé")

    # Keep public catalog product in sync with revendeur product edits.
    public_update = {"updated_at": _utc()}
    if "selling_price_fcfa" in update:
        public_update["price_fcfa"] = int(update["selling_price_fcfa"])
    if "custom_description" in update:
        public_update["description"] = update.get("custom_description")
    if "custom_images" in update:
        imgs = update.get("custom_images") or doc.get("original_images") or []
        public_update["images"] = imgs
    if "is_active" in update:
        public_update["is_active"] = bool(update.get("is_active"))
    await db.products.update_one(
        {"id": product_id, "seller_id": user["id"], "seller_type": "dropshipper"},
        {"$set": public_update},
    )
    return doc


@api.delete("/revendeur/products/{product_id}")
async def delete_revendeur_product(product_id: str, user: dict = Depends(require_dropshipper)):
    result = await db.dropshipped_products.delete_one({"id": product_id, "dropshipper_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produit revendeur non trouve")
    await db.products.delete_one({"id": product_id, "seller_id": user["id"], "seller_type": "dropshipper"})
    return {"ok": True}


@api.get("/revendeur/orders")
async def revendeur_orders(user: dict = Depends(require_dropshipper)):
    print(f"DEBUG: revendeur_orders - user_id: {user['id']}")
    # Les revendeurs voient uniquement leurs commandes dropshippées (celles avec le suffixe -R)
    orders = await db.orders.find(
        {"dropshipper_id": user["id"], "order_number": {"$regex": "-R$"}}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(300)
    print(f"DEBUG: Found {len(orders)} orders for revendeur {user['id']}")
    return {"orders": orders}


@api.get("/revendeur/earnings")
async def revendeur_earnings(user: dict = Depends(require_dropshipper)):
    return {"earnings": []}


@api.get("/revendeur/categories")
async def revendeur_categories(user: dict = Depends(require_dropshipper)):
    """Retourne toutes les catégories actives du site pour le revendeur"""
    cats = await db.categories.find(
        {"is_active": {"$ne": False}},
        {"_id": 0}
    ).sort("name", 1).to_list(500)
    return {"categories": cats}


async def _follower_count(seller_id: str) -> int:
    return await db.subscriptions.count_documents(
        {
            "seller_id": seller_id,
            "subscriber_id": {"$exists": True, "$ne": None},
            "status": "active",
        }
    )


@api.get("/shop/{shop_slug}")
async def public_revendeur_shop(shop_slug: str, page: int = 1):
    shop_user = await db.users.find_one({"shop_slug": shop_slug, "role": "dropshipper"}, {"_id": 0, "password": 0})
    if not shop_user:
        raise HTTPException(status_code=404, detail="Boutique introuvable")
    products = await db.dropshipped_products.find({"dropshipper_id": shop_user["id"], "is_active": True}, {"_id": 0}).to_list(200)
    for p in products:
        if not p.get("original_images"):
            p["original_images"] = p.get("custom_images") or []
    subscriber_count = await _follower_count(shop_user["id"])
    return {
        "shop": {
            "revendeur_id": shop_user["id"],
            "slug": shop_slug,
            "name": shop_user.get("shop_name"),
            "description": shop_user.get("shop_description"),
            "profile_photo": shop_user.get("profile_photo"),
            "location": shop_user.get("location") or shop_user.get("city"),
            "country": shop_user.get("country"),
            "created_at": shop_user.get("created_at"),
            "is_verified": bool(shop_user.get("is_verified")),
            "subscriber_count": subscriber_count,
        },
        "products": products,
        "page": page,
    }


@api.get("/vendor-shop/{seller_id}")
async def public_vendor_shop(seller_id: str, page: int = 1, limit: int = 12):
    shop_user = await db.users.find_one({"id": seller_id, "role": "vendor"}, {"_id": 0, "password": 0})
    if not shop_user:
        raise HTTPException(status_code=404, detail="Boutique introuvable")
    skip = max(0, (page - 1) * limit)
    query = {"seller_id": seller_id, "status": "approved"}
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    subscriber_count = await _follower_count(seller_id)
    return {
        "shop": {
            "seller_id": seller_id,
            "name": shop_user.get("shop_name") or shop_user.get("name"),
            "description": shop_user.get("shop_description"),
            "profile_photo": shop_user.get("profile_photo"),
            "location": shop_user.get("location") or shop_user.get("city"),
            "country": shop_user.get("country"),
            "created_at": shop_user.get("created_at"),
            "is_verified": bool(shop_user.get("is_verified")),
            "subscriber_count": subscriber_count,
        },
        "products": products,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": max(1, (total + limit - 1) // limit),
    }


@api.post("/shop/order")
async def create_revendeur_order(payload: dict, user: dict = Depends(get_current_user)):
    order_id = str(uuid.uuid4())
    order = {
        "id": order_id,
        "order_number": f"CLO-{order_id[:8].upper()}",
        "customer_id": user["id"],
        "dropshipper_id": payload.get("revendeur_id"),
        "items": payload.get("items") or [],
        "delivery_address": payload.get("delivery_address") or {},
        "status": "pending",
        "status_history": [{"status": "pending", "note": "Commande créée", "timestamp": _utc()}],
        "created_at": _utc(),
        "updated_at": _utc(),
    }
    await db.orders.insert_one(order)
    return order


@api.get("/admin/orders")
async def admin_orders(limit: int = 100, user: dict = Depends(require_admin)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"orders": orders}


@api.get("/admin/dashboard")
async def admin_dashboard(user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_products = await db.products.count_documents({})
    total_orders = await db.orders.count_documents({})
    total_vendors = await db.users.count_documents({"role": "vendor"})
    total_drivers = await db.users.count_documents({"role": "driver"})
    total_revendeurs = await db.users.count_documents({"role": "dropshipper"})
    return {
        "stats": {
            "total_users": total_users,
            "total_products": total_products,
            "total_orders": total_orders,
            "total_vendors": total_vendors,
            "total_drivers": total_drivers,
            "total_revendeurs": total_revendeurs,
        }
    }


@api.get("/admin/vendors")
async def admin_vendors(user: dict = Depends(require_admin)):
    vendors = await db.users.find({"role": "vendor"}, {"_id": 0, "password": 0}).to_list(500)
    return {"vendors": vendors}


@api.get("/admin/drivers")
async def admin_drivers(user: dict = Depends(require_admin)):
    drivers = await db.users.find({"role": "driver"}, {"_id": 0, "password": 0}).to_list(500)
    return {"drivers": drivers}


@api.get("/admin/products")
async def admin_products(user: dict = Depends(require_admin)):
    products = await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"products": products}


@api.get("/admin/products/pending")
async def admin_products_pending(user: dict = Depends(require_admin)):
    products = await db.products.find({"status": {"$in": ["pending", "draft"]}}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"products": products}


@api.get("/admin/transactions")
async def admin_transactions(user: dict = Depends(require_admin)):
    # Basic placeholder based on orders; enough for dashboard rendering
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    transactions = [
        {
            "id": o.get("id"),
            "order_number": o.get("order_number"),
            "amount_fcfa": o.get("total_fcfa", 0),
            "status": o.get("payment_status", "pending"),
            "created_at": o.get("created_at"),
            "vendor_id": o.get("seller_id"),
            "revendeur_id": o.get("dropshipper_id"),
        }
        for o in orders
    ]
    return {"transactions": transactions}


@api.get("/admin/revendeurs")
async def admin_revendeurs(user: dict = Depends(require_admin)):
    revendeurs = await db.users.find({"role": "dropshipper"}, {"_id": 0, "password": 0}).to_list(500)
    return {"revendeurs": revendeurs}


@api.get("/admin/dropshipping/stats")
async def admin_dropshipping_stats(user: dict = Depends(require_admin)):
    total_revendeurs = await db.users.count_documents({"role": "dropshipper"})
    total_products = await db.dropshipped_products.count_documents({})
    total_orders = await db.orders.count_documents({"dropshipper_id": {"$exists": True}})
    return {
        "stats": {
            "total_revendeurs": total_revendeurs,
            "total_products": total_products,
            "total_orders": total_orders,
        },
        "recent_transactions": [],
    }


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return {"users": users}


@api.get("/admin/orders/stats")
async def admin_order_stats(user: dict = Depends(require_admin)):
    total = await db.orders.count_documents({})
    delivered = await db.orders.count_documents({"status": "delivered"})
    pending = await db.orders.count_documents({"status": "pending"})
    return {"stats": {"total_orders": total, "completed_orders": delivered, "pending_orders": pending}}


@api.get("/admin/drivers/locations")
async def admin_driver_locations(user: dict = Depends(require_admin)):
    locations = list(manager.get_all_driver_locations().values())
    return {"drivers": locations}


@api.get("/admin/settings/vendor")
async def admin_vendor_settings(user: dict = Depends(require_admin)):
    settings = await db.settings.find_one({"type": "vendor"}, {"_id": 0})
    return settings or {"type": "vendor", "auto_approve_vendors": False, "require_documents": True}


@api.get("/admin/settings/delivery")
async def admin_delivery_settings(user: dict = Depends(require_admin)):
    settings = await db.settings.find_one({"type": "delivery"}, {"_id": 0})
    return settings or {"type": "delivery", "max_active_orders": 5, "auto_assign": False}


@api.get("/admin/settings/layout")
async def admin_layout_settings(user: dict = Depends(require_admin)):
    settings = await db.settings.find_one({"type": "layout"}, {"_id": 0})
    return settings or {
        "type": "layout",
        "sidebar_type": "color",
        "sidebar_color_left": "#f97316",
        "sidebar_color_right": "#f97316",
        "sidebar_image_left": "",
        "sidebar_image_right": "",
        "sidebar_width": 160
    }



@api.get("/layout-settings")
async def public_layout_settings():
    """Route publique — settings d'apparence du layout pour la HomePage"""
    doc = await db.settings.find_one({"type": "layout"}, {"_id": 0})
    return doc or {
        "type": "layout",
        "sidebar_type": "color",
        "sidebar_color_left": "#f97316",
        "sidebar_color_right": "#f97316",
        "sidebar_image_left": "",
        "sidebar_image_right": "",
        "sidebar_width": 160
    }




# ═══════════════════════════════════════════════════════════════
# HERO SECTION — diaporama hero (images + liens + titres)
# ═══════════════════════════════════════════════════════════════

@api.get("/hero-settings")
async def public_hero_settings():
    """Route publique — images du diaporama hero (avec liens et titres)"""
    doc = await db.settings.find_one({"type": "hero"}, {"_id": 0})
    if doc and "images" in doc:
        images = doc.get("images", [])
        if images and isinstance(images[0], str):
            # Convertir ancien format (string) en nouveau format (objet)
            images = [{"url": img, "link": "", "title": ""} for img in images]
            doc["images"] = images
    return doc or {"type": "hero", "images": []}


@api.get("/admin/settings/hero")
async def admin_hero_settings(user: dict = Depends(require_admin)):
    """Admin — récupère les images hero (avec liens et titres)"""
    doc = await db.settings.find_one({"type": "hero"}, {"_id": 0})
    if doc and "images" in doc:
        images = doc.get("images", [])
        if images and isinstance(images[0], str):
            # Convertir ancien format (string) en nouveau format (objet)
            images = [{"url": img, "link": "", "title": ""} for img in images]
            doc["images"] = images
    return doc or {"type": "hero", "images": []}


@api.put("/admin/settings/hero")
async def admin_save_hero_settings(payload: dict, user: dict = Depends(require_admin)):
    """Admin — sauvegarde la liste des images hero (avec liens et titres)"""
    images = payload.get("images", [])
    if not isinstance(images, list):
        raise HTTPException(status_code=400, detail="images doit être une liste")
    
    # Nettoyer et valider les images
    cleaned_images = []
    for img in images:
        if isinstance(img, str):
            # Ancien format
            if img and img.strip():
                cleaned_images.append({"url": img.strip(), "link": "", "title": ""})
        elif isinstance(img, dict):
            # Nouveau format
            url = img.get("url", "")
            if url and url.strip():
                cleaned_images.append({
                    "url": url.strip(),
                    "link": img.get("link", "").strip(),
                    "title": img.get("title", "").strip()[:100]  # Limite à 100 caractères
                })
    
    # Limiter à 10 images
    cleaned_images = cleaned_images[:10]
    
    doc = {
        "type": "hero",
        "images": cleaned_images,
        "updated_at": _utc()
    }
    await db.settings.update_one({"type": "hero"}, {"$set": doc}, upsert=True)
    return {"ok": True, "images": cleaned_images}


@api.post("/admin/upload/hero-image")
async def admin_upload_hero_image(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin)
):
    """Admin — upload d'une image hero (GIF, PNG, JPEG, JPG, WEBP)"""
    allowed_extensions = {".gif", ".png", ".jpeg", ".jpg", ".webp"}
    allowed_mimetypes = {"image/gif", "image/png", "image/jpeg", "image/jpg", "image/webp"}

    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté. Formats acceptés : GIF, PNG, JPEG, JPG, WEBP"
        )
    
    if file.content_type and file.content_type not in allowed_mimetypes:
        raise HTTPException(
            status_code=400,
            detail=f"Type MIME non supporté : {file.content_type}"
        )

    filename = f"hero_{uuid.uuid4()}{ext}"
    dest = uploads_dir / filename
    
    content = await file.read()

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop lourd (max 10 Mo)")

    dest.write_bytes(content)
    url = f"/uploads/{filename}"
    
    print(f"✅ Hero image uploaded: {url}")
    return {"url": url, "filename": filename}

# ═══════════════════════════════════════════════════════════════
# LOGO SETTINGS
# ═══════════════════════════════════════════════════════════════

@api.get("/logo-settings")
async def public_logo_settings():
    """Route publique — récupère le logo du site"""
    doc = await db.settings.find_one({"type": "logo"}, {"_id": 0})
    return doc or {"type": "logo", "logo_url": ""}


@api.get("/admin/settings/logo")
async def admin_logo_settings(user: dict = Depends(require_admin)):
    """Admin — récupère la configuration du logo"""
    doc = await db.settings.find_one({"type": "logo"}, {"_id": 0})
    return doc or {"type": "logo", "logo_url": ""}


@api.put("/admin/settings/logo")
async def admin_save_logo_settings(payload: dict, user: dict = Depends(require_admin)):
    """Admin — sauvegarde l'URL du logo"""
    logo_url = payload.get("logo_url", "")
    doc = {"type": "logo", "logo_url": logo_url, "updated_at": _utc()}
    await db.settings.update_one({"type": "logo"}, {"$set": doc}, upsert=True)
    return {"ok": True, "logo_url": logo_url}


@api.post("/admin/upload/logo")
async def admin_upload_logo(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin)
):
    """Admin — upload d'un logo (GIF, PNG, JPEG, JPG, WEBP)"""
    allowed_extensions = {".gif", ".png", ".jpeg", ".jpg", ".webp"}
    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Format non supporté")
    
    filename = f"logo_{uuid.uuid4()}{ext}"
    dest = uploads_dir / filename
    content = await file.read()
    
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop lourd (max 2 Mo)")
    
    dest.write_bytes(content)
    url = f"/uploads/{filename}"
    return {"url": url, "filename": filename}


# ═══════════════════════════════════════════════════════════════
# AUTH PAGE BACKGROUND — fond de la page de connexion
# ═══════════════════════════════════════════════════════════════

@api.get("/auth-page-settings")
async def public_auth_page_settings():
    """Route publique — récupère la configuration du fond de la page de connexion"""
    doc = await db.settings.find_one({"type": "auth_page"}, {"_id": 0})
    return doc or {
        "type": "auth_page",
        "enabled": False,
        "background_type": "color",
        "background_color": "",
        "background_images": [],
        "layout_type": "single"
    }


@api.get("/admin/settings/auth-page")
async def admin_auth_page_settings(user: dict = Depends(require_admin)):
    """Admin — récupère la configuration du fond de la page de connexion"""
    doc = await db.settings.find_one({"type": "auth_page"}, {"_id": 0})
    return doc or {
        "type": "auth_page",
        "enabled": False,
        "background_type": "color",
        "background_color": "",
        "background_images": [],
        "layout_type": "single"
    }


@api.put("/admin/settings/auth-page")
async def admin_save_auth_page_settings(payload: dict, user: dict = Depends(require_admin)):
    """Admin — sauvegarde la configuration du fond de la page de connexion"""
    enabled = bool(payload.get("enabled", False))
    background_type = str(payload.get("background_type", "color")).strip()
    background_color = str(payload.get("background_color", "")).strip()
    background_images = payload.get("background_images", [])
    layout_type = str(payload.get("layout_type", "single")).strip()
    
    # Valider background_type
    if background_type not in ["color", "image"]:
        background_type = "color"
    
    # Valider
    if not isinstance(background_images, list):
        background_images = []
    
    # Limiter à 2 images
    background_images = background_images[:2]
    
    # Valider layout_type
    if layout_type not in ["single", "split"]:
        layout_type = "single" if len(background_images) <= 1 else "split"
    
    doc = {
        "type": "auth_page",
        "enabled": enabled,
        "background_type": background_type,
        "background_color": background_color,
        "background_images": background_images,
        "layout_type": layout_type,
        "updated_at": _utc()
    }
    await db.settings.update_one({"type": "auth_page"}, {"$set": doc}, upsert=True)
    return {"ok": True, "settings": doc}


@api.post("/admin/upload/auth-page-bg")
async def admin_upload_auth_page_bg(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin)
):
    """Admin — upload d'une image de fond pour la page de connexion"""
    allowed_extensions = {".gif", ".png", ".jpeg", ".jpg", ".webp"}
    allowed_mimetypes = {"image/gif", "image/png", "image/jpeg", "image/jpg", "image/webp"}
    
    ext = Path(file.filename or "").suffix.lower()
    if not ext:
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté. Formats acceptés : GIF, PNG, JPEG, JPG, WEBP"
        )
    
    if not (file.content_type or "").lower().startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail=f"Type MIME non supporté : {file.content_type}"
        )
    
    filename = f"authbg_{uuid.uuid4()}{ext}"
    dest = uploads_dir / filename
    content = await file.read()
    
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop lourd (max 10 Mo)")
    
    dest.write_bytes(content)
    url = f"/uploads/{filename}"
    
    print(f"✅ Auth page background uploaded: {url}")
    return {"url": url, "filename": filename}


# ═══════════════════════════════════════════════════════════════
# TRENDING BLOCK — bloc "Tendances du moment"
# ═══════════════════════════════════════════════════════════════

@api.get("/trending-block-settings")
async def public_trending_block_settings():
    """Route publique — récupère la configuration du bloc Tendances"""
    doc = await db.settings.find_one({"type": "trending_block"}, {"_id": 0})
    return doc or {
        "type": "trending_block",
        "gradient_from": "#1e293b",
        "gradient_to": "#0f172a",
        "background_image": "",
        "enable_blurs": True,
    }


@api.get("/admin/settings/trending-block")
async def admin_trending_block_settings(user: dict = Depends(require_admin)):
    """Admin — récupère la configuration du bloc Tendances"""
    doc = await db.settings.find_one({"type": "trending_block"}, {"_id": 0})
    return doc or {
        "type": "trending_block",
        "gradient_from": "#1e293b",
        "gradient_to": "#0f172a",
        "background_image": "",
        "enable_blurs": True,
    }


@api.put("/admin/settings/trending-block")
async def admin_save_trending_block_settings(payload: dict, user: dict = Depends(require_admin)):
    """Admin — sauvegarde la configuration du bloc Tendances"""
    gradient_from = str(payload.get("gradient_from", "#1e293b")).strip()
    gradient_to = str(payload.get("gradient_to", "#0f172a")).strip()
    background_image = str(payload.get("background_image", "")).strip()
    enable_blurs = bool(payload.get("enable_blurs", True))
    
    # Valider les couleurs (format hex simple)
    import re
    hex_pattern = r"^#[0-9A-Fa-f]{6}$"
    if not re.match(hex_pattern, gradient_from):
        gradient_from = "#1e293b"
    if not re.match(hex_pattern, gradient_to):
        gradient_to = "#0f172a"
    
    doc = {
        "type": "trending_block",
        "gradient_from": gradient_from,
        "gradient_to": gradient_to,
        "background_image": background_image,
        "enable_blurs": enable_blurs,
        "updated_at": _utc()
    }
    await db.settings.update_one({"type": "trending_block"}, {"$set": doc}, upsert=True)
    return {"ok": True, "settings": doc}


@api.post("/admin/upload/trending-bg")
async def admin_upload_trending_bg(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin)
):
    """Admin — upload d'une image de fond pour le bloc Tendances"""
    allowed_extensions = {".gif", ".png", ".jpeg", ".jpg", ".webp"}
    allowed_mimetypes = {"image/gif", "image/png", "image/jpeg", "image/jpg", "image/webp"}
    
    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté. Formats acceptés : GIF, PNG, JPEG, JPG, WEBP"
        )
    
    if file.content_type and file.content_type not in allowed_mimetypes:
        raise HTTPException(
            status_code=400,
            detail=f"Type MIME non supporté : {file.content_type}"
        )
    
    filename = f"trending_bg_{uuid.uuid4()}{ext}"
    dest = uploads_dir / filename
    content = await file.read()
    
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop lourd (max 10 Mo)")
    
    dest.write_bytes(content)
    url = f"/uploads/{filename}"
    
    print(f"✅ Trending block background image uploaded: {url}")
    return {"url": url, "filename": filename}


# ═══════════════════════════════════════════════════════════════
# RIGHT BLOCK (image/vidéo) — BLOC PUBLICITAIRE ORIGINAL (COLONNE DROITE)
# ═══════════════════════════════════════════════════════════════

@api.get("/right-block-settings")
async def public_right_block_settings():
    """Route publique — bloc publicitaire de droite (image ou vidéo)"""
    doc = await db.settings.find_one({"type": "right_block"}, {"_id": 0})
    return doc or {"type": "right_block", "type_content": "image", "image": "", "video": "", "title": "Espace publicitaire"}


@api.get("/admin/settings/right-block")
async def admin_right_block_settings(user: dict = Depends(require_admin)):
    """Admin — récupère la configuration du bloc droit"""
    doc = await db.settings.find_one({"type": "right_block"}, {"_id": 0})
    return doc or {"type": "right_block", "type_content": "image", "image": "", "video": "", "title": "Espace publicitaire"}


@api.put("/admin/settings/right-block")
async def admin_save_right_block_settings(payload: dict, user: dict = Depends(require_admin)):
    """Admin — sauvegarde la configuration du bloc droit"""
    type_content = payload.get("type_content", "image")
    image = payload.get("image", "")
    video = payload.get("video", "")
    title = payload.get("title", "Espace publicitaire")
    
    if type_content not in ["image", "video"]:
        raise HTTPException(status_code=400, detail="type_content doit être 'image' ou 'video'")
    
    # Convertir URL YouTube standard en embed si nécessaire
    if type_content == "video" and video and not video.startswith("https://www.youtube.com/embed/"):
        if "youtu.be/" in video:
            video_id = video.split("youtu.be/")[-1].split("?")[0]
            video = f"https://www.youtube.com/embed/{video_id}"
        elif "watch?v=" in video:
            video_id = video.split("watch?v=")[-1].split("&")[0]
            video = f"https://www.youtube.com/embed/{video_id}"
    
    doc = {
        "type": "right_block",
        "type_content": type_content,
        "image": image,
        "video": video,
        "title": title,
        "updated_at": _utc()
    }
    await db.settings.update_one({"type": "right_block"}, {"$set": doc}, upsert=True)
    return {"ok": True, "settings": doc}


@api.post("/admin/upload/right-block-image")
async def admin_upload_right_block_image(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin)
):
    """Admin — upload d'une image pour le bloc droit"""
    allowed_extensions = {".png", ".jpeg", ".jpg", ".gif", ".webp"}
    allowed_mimetypes = {"image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"}
    
    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté. Formats acceptés : PNG, JPEG, JPG, GIF, WEBP"
        )
    
    if file.content_type and file.content_type not in allowed_mimetypes:
        raise HTTPException(
            status_code=400,
            detail=f"Type MIME non supporté : {file.content_type}"
        )
    
    filename = f"rightblock_{uuid.uuid4()}{ext}"
    dest = uploads_dir / filename
    content = await file.read()
    
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop lourd (max 5 Mo)")
    
    dest.write_bytes(content)
    url = f"/uploads/{filename}"
    
    print(f"✅ Right block image uploaded: {url}")
    return {"url": url, "filename": filename}


# ═══════════════════════════════════════════════════════════════
# AD STRIPS — 4 ZONES PUBLICITAIRES HORIZONTALES (SOUS LA HERO)
# ═══════════════════════════════════════════════════════════════

DEFAULT_AD_STRIPS = [
    {
        "id": "offers",
        "title": "Espace Publicitaire - Offres du Jour",
        "subtitle": "Mettez ici vos promos, annonces flash et nouveautes sponsorisees.",
        "tone": "orange",
        "enabled": True,
        "media_type": "none",
        "media_url": "",
        "link": "",
    },
    {
        "id": "partners",
        "title": "Espace Publicitaire - Marques Partenaires",
        "subtitle": "Zone dediee aux campagnes partenaires, bannieres saisonnieres et bons plans.",
        "tone": "blue",
        "enabled": True,
        "media_type": "none",
        "media_url": "",
        "link": "",
    },
    {
        "id": "premium",
        "title": "Espace Publicitaire - Selection Premium",
        "subtitle": "Emplacements premium pour operations speciales, evenements et mises en avant.",
        "tone": "green",
        "enabled": True,
        "media_type": "none",
        "media_url": "",
        "link": "",
    },
    {
        "id": "flash",
        "title": "Espace Publicitaire - Ventes Flash",
        "subtitle": "Offres limitees dans le temps, ne manquez pas ces bonnes affaires !",
        "tone": "red",
        "enabled": True,
        "media_type": "none",
        "media_url": "",
        "link": "",
    },
]


def _normalize_ad_strips(strips):
    by_id = {strip["id"]: strip for strip in DEFAULT_AD_STRIPS}
    incoming = strips if isinstance(strips, list) else []
    for item in incoming:
        if not isinstance(item, dict):
            continue
        strip_id = item.get("id")
        if strip_id not in by_id:
            continue
        media_type = item.get("media_type", "none")
        if media_type not in ["none", "image", "video"]:
            media_type = "none"
        tone = item.get("tone")
        if tone not in ["orange", "blue", "green", "red"]:
            tone = by_id[strip_id]["tone"]
        by_id[strip_id] = {
            **by_id[strip_id],
            "title": str(item.get("title") or by_id[strip_id]["title"]).strip()[:120],
            "subtitle": str(item.get("subtitle") or "").strip()[:220],
            "tone": tone,
            "enabled": bool(item.get("enabled", True)),
            "media_type": media_type,
            "media_url": str(item.get("media_url") or "").strip(),
            "link": str(item.get("link") or "").strip(),
        }
    return [by_id["offers"], by_id["partners"], by_id["premium"], by_id["flash"]]


@api.get("/ad-strip-settings")
async def public_ad_strip_settings():
    """Route publique — zones publicitaires horizontales de la Home (4 blocs)."""
    doc = await db.settings.find_one({"type": "ad_strips"}, {"_id": 0})
    return doc or {"type": "ad_strips", "strips": DEFAULT_AD_STRIPS}


@api.get("/admin/settings/ad-strips")
async def admin_ad_strip_settings(user: dict = Depends(require_admin)):
    """Admin — recupere les zones publicitaires horizontales (4 blocs)."""
    doc = await db.settings.find_one({"type": "ad_strips"}, {"_id": 0})
    return doc or {"type": "ad_strips", "strips": DEFAULT_AD_STRIPS}


@api.put("/admin/settings/ad-strips")
async def admin_save_ad_strip_settings(payload: dict, user: dict = Depends(require_admin)):
    """Admin — sauvegarde les zones publicitaires horizontales (4 blocs)."""
    strips = _normalize_ad_strips(payload.get("strips", []))
    doc = {"type": "ad_strips", "strips": strips, "updated_at": _utc()}
    await db.settings.update_one({"type": "ad_strips"}, {"$set": doc}, upsert=True)
    return {"ok": True, "strips": strips}


@api.post("/admin/upload/ad-strip-media")
async def admin_upload_ad_strip_media(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin)
):
    """Admin — upload image/GIF/WEBP ou video pour une zone publicitaire (4 blocs)."""
    allowed_image_ext = {".gif", ".png", ".jpeg", ".jpg", ".webp"}
    allowed_video_ext = {".mp4", ".webm", ".ogg", ".mov"}
    allowed_image_mimes = {"image/gif", "image/png", "image/jpeg", "image/jpg", "image/webp"}
    allowed_video_mimes = {"video/mp4", "video/webm", "video/ogg", "video/quicktime"}

    ext = Path(file.filename or "").suffix.lower()
    is_image = ext in allowed_image_ext
    is_video = ext in allowed_video_ext
    if not is_image and not is_video:
        raise HTTPException(status_code=400, detail="Format non supporte. Images: GIF, WEBP, PNG, JPEG, JPG. Videos: MP4, WEBM, OGG, MOV")

    if file.content_type:
        valid_mime = file.content_type in (allowed_image_mimes if is_image else allowed_video_mimes)
        if not valid_mime:
            raise HTTPException(status_code=400, detail=f"Type MIME non supporte : {file.content_type}")

    content = await file.read()
    max_size = 50 * 1024 * 1024 if is_video else 10 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail=f"Fichier trop lourd (max {'50 Mo' if is_video else '10 Mo'})")

    filename = f"adstrip_{uuid.uuid4()}{ext}"
    dest = uploads_dir / filename
    dest.write_bytes(content)
    return {"url": f"/uploads/{filename}", "filename": filename, "media_type": "video" if is_video else "image"}


# ═══════════════════════════════════════════════════════════════
# RIGHT BLOCK TOP (Bloc publicitaire HAUT de la colonne droite)
# ═══════════════════════════════════════════════════════════════

@api.get("/right-block-settings-top")
async def public_right_block_top_settings():
    """Route publique — bloc publicitaire HAUT de la colonne droite (image ou vidéo)"""
    doc = await db.settings.find_one({"type": "right_block_top"}, {"_id": 0})
    return doc or {
        "type": "right_block_top",
        "type_content": "image",
        "image": "",
        "video": "",
        "title": "Espace publicitaire",
        "link": ""
    }


@api.get("/admin/settings/right-block-top")
async def admin_right_block_top_settings(user: dict = Depends(require_admin)):
    """Admin — récupère la configuration du bloc publicitaire HAUT de la colonne droite"""
    doc = await db.settings.find_one({"type": "right_block_top"}, {"_id": 0})
    return doc or {
        "type": "right_block_top",
        "type_content": "image",
        "image": "",
        "video": "",
        "title": "Espace publicitaire",
        "link": ""
    }


@api.put("/admin/settings/right-block-top")
async def admin_save_right_block_top_settings(payload: dict, user: dict = Depends(require_admin)):
    """Admin — sauvegarde la configuration du bloc publicitaire HAUT de la colonne droite"""
    type_content = payload.get("type_content", "image")
    image = payload.get("image", "")
    video = payload.get("video", "")
    title = payload.get("title", "Espace publicitaire")
    link = payload.get("link", "")
    
    if type_content not in ["image", "video"]:
        raise HTTPException(status_code=400, detail="type_content doit être 'image' ou 'video'")
    
    # Convertir URL YouTube standard en embed si nécessaire
    if type_content == "video" and video and not video.startswith("https://www.youtube.com/embed/"):
        if "youtu.be/" in video:
            video_id = video.split("youtu.be/")[-1].split("?")[0]
            video = f"https://www.youtube.com/embed/{video_id}"
        elif "watch?v=" in video:
            video_id = video.split("watch?v=")[-1].split("&")[0]
            video = f"https://www.youtube.com/embed/{video_id}"
    
    doc = {
        "type": "right_block_top",
        "type_content": type_content,
        "image": image,
        "video": video,
        "title": title,
        "link": link,
        "updated_at": _utc()
    }
    await db.settings.update_one({"type": "right_block_top"}, {"$set": doc}, upsert=True)
    return {"ok": True, "settings": doc}


@api.post("/admin/upload/right-block-top-image")
async def admin_upload_right_block_top_image(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin)
):
    """Admin — upload d'une image pour le bloc publicitaire HAUT de la colonne droite"""
    allowed_extensions = {".png", ".jpeg", ".jpg", ".gif", ".webp"}
    allowed_mimetypes = {"image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"}
    
    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté. Formats acceptés : PNG, JPEG, JPG, GIF, WEBP"
        )
    
    if file.content_type and file.content_type not in allowed_mimetypes:
        raise HTTPException(
            status_code=400,
            detail=f"Type MIME non supporté : {file.content_type}"
        )
    
    filename = f"rightblocktop_{uuid.uuid4()}{ext}"
    dest = uploads_dir / filename
    content = await file.read()
    
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop lourd (max 5 Mo)")
    
    dest.write_bytes(content)
    url = f"/uploads/{filename}"
    
    print(f"✅ Right block TOP image uploaded: {url}")
    return {"url": url, "filename": filename}


# ═══════════════════════════════════════════════════════════════
# RIGHT BLOCK BOTTOM (Bloc publicitaire BAS de la colonne droite)
# ═══════════════════════════════════════════════════════════════

@api.get("/right-block-settings-bottom")
async def public_right_block_bottom_settings():
    """Route publique — bloc publicitaire BAS de la colonne droite (image ou vidéo)"""
    doc = await db.settings.find_one({"type": "right_block_bottom"}, {"_id": 0})
    return doc or {
        "type": "right_block_bottom",
        "type_content": "image",
        "image": "",
        "video": "",
        "title": "Espace publicitaire",
        "link": ""
    }


@api.get("/admin/settings/right-block-bottom")
async def admin_right_block_bottom_settings(user: dict = Depends(require_admin)):
    """Admin — récupère la configuration du bloc publicitaire BAS de la colonne droite"""
    doc = await db.settings.find_one({"type": "right_block_bottom"}, {"_id": 0})
    return doc or {
        "type": "right_block_bottom",
        "type_content": "image",
        "image": "",
        "video": "",
        "title": "Espace publicitaire",
        "link": ""
    }


@api.put("/admin/settings/right-block-bottom")
async def admin_save_right_block_bottom_settings(payload: dict, user: dict = Depends(require_admin)):
    """Admin — sauvegarde la configuration du bloc publicitaire BAS de la colonne droite"""
    type_content = payload.get("type_content", "image")
    image = payload.get("image", "")
    video = payload.get("video", "")
    title = payload.get("title", "Espace publicitaire")
    link = payload.get("link", "")
    
    if type_content not in ["image", "video"]:
        raise HTTPException(status_code=400, detail="type_content doit être 'image' ou 'video'")
    
    # Convertir URL YouTube standard en embed si nécessaire
    if type_content == "video" and video and not video.startswith("https://www.youtube.com/embed/"):
        if "youtu.be/" in video:
            video_id = video.split("youtu.be/")[-1].split("?")[0]
            video = f"https://www.youtube.com/embed/{video_id}"
        elif "watch?v=" in video:
            video_id = video.split("watch?v=")[-1].split("&")[0]
            video = f"https://www.youtube.com/embed/{video_id}"
    
    doc = {
        "type": "right_block_bottom",
        "type_content": type_content,
        "image": image,
        "video": video,
        "title": title,
        "link": link,
        "updated_at": _utc()
    }
    await db.settings.update_one({"type": "right_block_bottom"}, {"$set": doc}, upsert=True)
    return {"ok": True, "settings": doc}


@api.post("/admin/upload/right-block-bottom-image")
async def admin_upload_right_block_bottom_image(
    file: UploadFile = File(...),
    user: dict = Depends(require_admin)
):
    """Admin — upload d'une image pour le bloc publicitaire BAS de la colonne droite"""
    allowed_extensions = {".png", ".jpeg", ".jpg", ".gif", ".webp"}
    allowed_mimetypes = {"image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"}
    
    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté. Formats acceptés : PNG, JPEG, JPG, GIF, WEBP"
        )
    
    if file.content_type and file.content_type not in allowed_mimetypes:
        raise HTTPException(
            status_code=400,
            detail=f"Type MIME non supporté : {file.content_type}"
        )
    
    filename = f"rightblockbottom_{uuid.uuid4()}{ext}"
    dest = uploads_dir / filename
    content = await file.read()
    
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fichier trop lourd (max 5 Mo)")
    
    dest.write_bytes(content)
    url = f"/uploads/{filename}"
    
    print(f"✅ Right block BOTTOM image uploaded: {url}")
    return {"url": url, "filename": filename}

@api.get("/admin/settings/platform")
async def admin_platform_settings(user: dict = Depends(require_admin)):
    settings = await db.settings.find_one({"type": "platform"}, {"_id": 0})
    return settings or {"type": "platform", "maintenance_mode": False, "allow_registration": True}


@api.put("/admin/settings/{setting_type}")
async def admin_save_settings(setting_type: str, payload: dict, user: dict = Depends(require_admin)):
    settings = payload.get("settings") or {}
    doc = {"type": setting_type, **settings, "updated_at": _utc()}
    await db.settings.update_one({"type": setting_type}, {"$set": doc}, upsert=True)
    return {"ok": True}


@api.post("/admin/products/{product_id}/approve")
async def admin_approve_product(product_id: str, user: dict = Depends(require_admin)):
    await db.products.update_one({"id": product_id}, {"$set": {"status": "approved", "updated_at": _utc()}})
    return {"ok": True}


@api.post("/admin/products/{product_id}/reject")
async def admin_reject_product(product_id: str, reason: str = "", user: dict = Depends(require_admin)):
    await db.products.update_one({"id": product_id}, {"$set": {"status": "rejected", "rejection_reason": reason, "updated_at": _utc()}})
    return {"ok": True}


@api.put("/admin/products/{product_id}/feature")
async def admin_toggle_feature_product(product_id: str, user: dict = Depends(require_admin)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouve")
    is_featured = bool(product.get("is_featured", False))
    await db.products.update_one({"id": product_id}, {"$set": {"is_featured": not is_featured, "updated_at": _utc()}})
    return {"ok": True, "message": "Produit mis en avant" if not is_featured else "Produit retire de la mise en avant"}


@api.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, user: dict = Depends(require_admin)):
    await db.products.delete_one({"id": product_id})
    return {"ok": True}


@api.put("/admin/vendors/{vendor_id}/toggle-status")
async def admin_toggle_vendor(vendor_id: str, user: dict = Depends(require_admin)):
    vendor = await db.users.find_one({"id": vendor_id, "role": "vendor"}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendeur non trouve")
    await db.users.update_one({"id": vendor_id}, {"$set": {"is_active": not bool(vendor.get("is_active", True)), "updated_at": _utc()}})
    return {"ok": True}


@api.put("/admin/vendors/{vendor_id}/verify")
async def admin_verify_vendor(vendor_id: str, user: dict = Depends(require_admin)):
    await db.users.update_one({"id": vendor_id, "role": "vendor"}, {"$set": {"is_verified": True, "is_active": True, "updated_at": _utc()}})
    return {"ok": True}


@api.delete("/admin/vendors/{vendor_id}")
async def admin_delete_vendor(vendor_id: str, user: dict = Depends(require_admin)):
    await db.users.delete_one({"id": vendor_id, "role": "vendor"})
    await db.products.delete_many({"seller_id": vendor_id})
    return {"ok": True, "message": "Vendeur supprime"}


@api.put("/admin/drivers/{driver_id}/verify")
async def admin_verify_driver(driver_id: str, user: dict = Depends(require_admin)):
    await db.users.update_one({"id": driver_id, "role": "driver"}, {"$set": {"is_verified": True, "is_active": True, "updated_at": _utc()}})
    return {"ok": True}


@api.put("/admin/drivers/{driver_id}/toggle")
async def admin_toggle_driver(driver_id: str, user: dict = Depends(require_admin)):
    driver = await db.users.find_one({"id": driver_id, "role": "driver"}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Livreur non trouve")
    await db.users.update_one({"id": driver_id}, {"$set": {"is_active": not bool(driver.get("is_active", True)), "updated_at": _utc()}})
    return {"ok": True}


@api.delete("/admin/drivers/{driver_id}")
async def admin_delete_driver(driver_id: str, user: dict = Depends(require_admin)):
    await db.users.delete_one({"id": driver_id, "role": "driver"})
    return {"ok": True}


@api.put("/admin/revendeurs/{revendeur_id}/toggle")
async def admin_toggle_revendeur(revendeur_id: str, user: dict = Depends(require_admin)):
    revendeur = await db.users.find_one({"id": revendeur_id, "role": "dropshipper"}, {"_id": 0})
    if not revendeur:
        raise HTTPException(status_code=404, detail="Revendeur non trouve")
    await db.users.update_one({"id": revendeur_id}, {"$set": {"is_active": not bool(revendeur.get("is_active", True)), "updated_at": _utc()}})
    return {"ok": True}


@api.put("/admin/revendeurs/{revendeur_id}/verify")
async def admin_verify_revendeur(revendeur_id: str, user: dict = Depends(require_admin)):
    await db.users.update_one(
        {"id": revendeur_id, "role": "dropshipper"},
        {"$set": {"is_verified": True, "is_active": True, "approval_status": "approved", "updated_at": _utc()}},
    )
    return {"ok": True}


@api.delete("/admin/revendeurs/{revendeur_id}")
async def admin_delete_revendeur(revendeur_id: str, user: dict = Depends(require_admin)):
    await db.users.delete_one({"id": revendeur_id, "role": "dropshipper"})
    await db.dropshipped_products.delete_many({"dropshipper_id": revendeur_id})
    return {"ok": True}


@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user: dict = Depends(require_admin)):
    if user_id == "local-admin":
        raise HTTPException(status_code=400, detail="Suppression interdite")
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    role = target.get("role")
    await db.users.delete_one({"id": user_id})
    if role == "vendor":
        await db.products.delete_many({"seller_id": user_id})
    if role == "dropshipper":
        await db.dropshipped_products.delete_many({"dropshipper_id": user_id})
    if role == "driver":
        await db.orders.update_many({"driver_id": user_id}, {"$unset": {"driver_id": ""}, "$set": {"status": "pending", "updated_at": _utc()}})
    return {"ok": True, "message": "Utilisateur supprime"}


@api.put("/admin/users/{user_id}/toggle-active")
async def admin_toggle_user_active(user_id: str, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    if user_id == "local-admin":
        raise HTTPException(status_code=400, detail="Action interdite")
    new_active = not bool(target.get("is_active", True))
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_active, "updated_at": _utc()}})
    return {"ok": True, "message": "Utilisateur active" if new_active else "Utilisateur desactive"}


@api.post("/admin/categories")
async def admin_create_category(payload: dict, user: dict = Depends(require_admin)):
    try:
        print("=== DEBUG Création Catégorie ===")
        print("Payload reçu:", payload)

        banner_images = payload.get("banner_images") or []
        if not isinstance(banner_images, list):
            banner_images = []
        banner_images = [img for img in banner_images if isinstance(img, str) and img.strip()][:3]

        name = (payload.get("name") or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Le nom est obligatoire")

        parent_slug = payload.get("parent_slug") or None
        slug_input = payload.get("slug") or _slugify(name)

        final_slug = slug_input
        if parent_slug:
            parent = await db.categories.find_one({"slug": parent_slug})
            if not parent:
                raise HTTPException(status_code=400, detail=f"Catégorie parente '{parent_slug}' introuvable")
            final_slug = f"{parent_slug}-{slug_input}"

        # Slug unique
        existing = await db.categories.find_one({"slug": final_slug})
        if existing:
            final_slug = f"{final_slug}-{str(uuid.uuid4())[:6]}"

        custom_fields = payload.get("custom_fields") or []
        if not isinstance(custom_fields, list):
            custom_fields = []

        category = {
            "id": str(uuid.uuid4()),
            "name": name,
            "slug": final_slug,
            "icon": payload.get("icon", "Package"),
            "description": payload.get("description", ""),
            "banner_images": banner_images,
            "image": banner_images[0] if banner_images else None,
            "parent_slug": parent_slug,
            "custom_fields": custom_fields,
            "is_active": True,
            "created_at": _utc(),
            "updated_at": _utc(),
        }

        result = await db.categories.insert_one(category)
        category.pop("_id", None)

        print("✅ Catégorie créée avec succès:", category["slug"])
        return category

    except Exception as e:
        print("❌ Erreur création catégorie:", str(e))
        raise HTTPException(status_code=400, detail=str(e))


@api.put("/admin/categories/{category_id}")
async def admin_update_category(category_id: str, payload: dict, user: dict = Depends(require_admin)):
    update = {k: v for k, v in payload.items() if v is not None}
    if "custom_fields" in payload:
        cf = payload["custom_fields"]
        update["custom_fields"] = cf if isinstance(cf, list) else []
    if "banner_images" in update:
        if not isinstance(update["banner_images"], list):
            raise HTTPException(status_code=400, detail="banner_images doit etre une liste")
        update["banner_images"] = [img for img in update["banner_images"] if isinstance(img, str) and img.strip()][:3]
        update["image"] = update["banner_images"][0] if update["banner_images"] else update.get("image")
    # Permettre de vider parent_slug (passer à None explicitement)
    if "parent_slug" in payload:
        update["parent_slug"] = payload["parent_slug"] or None
    update["updated_at"] = _utc()
    await db.categories.update_one({"id": category_id}, {"$set": update})
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Categorie non trouvee")
    return category


@api.delete("/admin/categories/{category_id}")
async def admin_delete_category(category_id: str, user: dict = Depends(require_admin)):
    # Supprimer aussi les sous-catégories
    cat = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if cat and not cat.get("parent_slug"):
        await db.categories.delete_many({"parent_slug": cat.get("slug")})
    await db.categories.delete_one({"id": category_id})
    return {"ok": True}


@api.put("/admin/categories/{category_id}/toggle")
async def admin_toggle_category(category_id: str, user: dict = Depends(require_admin)):
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Categorie non trouvee")
    new_status = not bool(category.get("is_active", True))
    await db.categories.update_one({"id": category_id}, {"$set": {"is_active": new_status, "updated_at": _utc()}})
    # Si on désactive une catégorie parente, désactiver aussi ses sous-catégories
    if not new_status and not category.get("parent_slug"):
        await db.categories.update_many(
            {"parent_slug": category.get("slug")},
            {"$set": {"is_active": False, "updated_at": _utc()}}
        )
    return {"ok": True, "message": "Categorie activee" if new_status else "Categorie desactivee"}


@api.get("/subscriptions/plans")
async def subscription_plans():
    return [
        {"id": "free", "name": "Free", "emoji": "Starter", "price_fcfa": 0, "price_usd": 0, "commission_percent": 15, "features": ["10 produits", "Support standard"]},
        {"id": "artisan", "name": "Artisan", "emoji": "Artisan", "price_fcfa": 5000, "price_usd": 8, "commission_percent": 12, "features": ["50 produits", "Stats avancees"], "badge": "verified"},
        {"id": "commercant", "name": "Commercant", "emoji": "Pro", "price_fcfa": 15000, "price_usd": 25, "commission_percent": 10, "features": ["Produits illimites", "Mise en avant"], "badge": "pro"},
        {"id": "entreprise", "name": "Entreprise", "emoji": "Elite", "price_fcfa": 35000, "price_usd": 58, "commission_percent": 8, "features": ["Multi-boutiques", "Support prioritaire"], "badge": "premium"},
    ]


@api.post("/subscriptions/checkout")
async def subscription_checkout(payload: dict, user: dict = Depends(require_vendor)):
    plan_id = payload.get("plan_id", "free")
    origin_url = payload.get("origin_url") or ""
    plans = {p["id"]: p for p in await subscription_plans()}
    if plan_id not in plans:
        raise HTTPException(status_code=400, detail="Plan invalide")
    await db.users.update_one({"id": user["id"]}, {"$set": {"subscription_plan": plan_id, "subscription_expires": None, "updated_at": _utc()}})
    await db.subscriptions.insert_one(
        {
            "id": str(uuid.uuid4()),
            "seller_id": user["id"],
            "plan_id": plan_id,
            "status": "active",
            "created_at": _utc(),
            "updated_at": _utc(),
        }
    )
    redirect = f"{origin_url}/vendeur/abonnement?session_id={uuid.uuid4()}" if origin_url else "/vendeur/abonnement"
    return {"redirect": redirect}


@api.get("/subscriptions/status/{session_id}")
async def subscription_status(session_id: str, user: dict = Depends(get_current_user)):
    return {"session_id": session_id, "payment_status": "paid"}


@api.get("/subscriptions/check/{seller_id}")
async def subscription_check(seller_id: str, user: dict = Depends(get_current_user)):
    sub = await db.subscriptions.find_one({"seller_id": seller_id, "subscriber_id": user["id"], "status": "active"}, {"_id": 0})
    return {"is_subscribed": bool(sub)}


@api.post("/subscriptions/{seller_id}")
async def subscribe_seller(seller_id: str, user: dict = Depends(get_current_user)):
    existing = await db.subscriptions.find_one({"seller_id": seller_id, "subscriber_id": user["id"], "status": "active"}, {"_id": 0})
    if not existing:
        await db.subscriptions.insert_one(
            {
                "id": str(uuid.uuid4()),
                "seller_id": seller_id,
                "subscriber_id": user["id"],
                "status": "active",
                "created_at": _utc(),
                "updated_at": _utc(),
            }
        )
    return {"ok": True}


@api.delete("/subscriptions/{seller_id}")
async def unsubscribe_seller(seller_id: str, user: dict = Depends(get_current_user)):
    await db.subscriptions.update_many(
        {"seller_id": seller_id, "subscriber_id": user["id"], "status": "active"},
        {"$set": {"status": "cancelled", "updated_at": _utc()}},
    )
    return {"ok": True}


@api.get("/subscriptions/my-subscriptions")
async def my_subscriptions(user: dict = Depends(get_current_user)):
    """Boutiques suivies par l'utilisateur (followers), pas les plans vendeur."""
    subs = await db.subscriptions.find(
        {"subscriber_id": user["id"], "status": "active"},
        {"_id": 0},
    ).to_list(300)
    sellers = []
    seen = set()
    for sub in subs:
        seller_id = sub.get("seller_id")
        if not seller_id or seller_id in seen:
            continue
        seen.add(seller_id)
        seller = await db.users.find_one({"id": seller_id}, {"_id": 0, "password": 0})
        if not seller:
            continue
        sellers.append(
            {
                "id": seller["id"],
                "name": seller.get("name"),
                "shop_name": seller.get("shop_name"),
                "shop_slug": seller.get("shop_slug"),
                "role": seller.get("role"),
            }
        )
    return {"subscriptions": sellers}


@api.get("/subscriptions/my-followers")
async def my_followers(user: dict = Depends(get_current_user)):
    if user.get("role") not in ("vendor", "dropshipper"):
        return {"count": 0, "followers": []}
    query = {
        "seller_id": user["id"],
        "subscriber_id": {"$exists": True, "$ne": None},
        "status": "active",
    }
    count = await db.subscriptions.count_documents(query)
    followers = await db.subscriptions.find(query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return {"count": count, "followers": followers}


@api.put("/users/profile")
async def update_profile(payload: dict, user: dict = Depends(get_current_user)):
    allowed = {
        "name",
        "phone",
        "shop_name",
        "shop_description",
        "location",
        "city",
    }
    update = {k: v for k, v in payload.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="Aucune donnee a mettre a jour")
    update["updated_at"] = _utc()
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    saved = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return saved


@api.put("/users/password")
async def update_password(payload: dict, user: dict = Depends(get_current_user)):
    current_password = payload.get("current_password")
    new_password = payload.get("new_password")
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="current_password et new_password requis")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caracteres")
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not db_user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")
    if not verify_password(current_password, db_user.get("password", "")):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password": hash_password(new_password), "updated_at": _utc()}})
    return {"ok": True}


@api.post("/users/profile/photo")
async def upload_profile_photo(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = Path(file.filename or "").suffix or ".bin"
    filename = f"profile_{user['id']}_{uuid.uuid4()}{ext}"
    dest = uploads_dir / filename
    content = await file.read()
    dest.write_bytes(content)
    url = f"/uploads/{filename}"
    await db.users.update_one({"id": user["id"]}, {"$set": {"profile_photo": url, "updated_at": _utc()}})
    return {"url": url}


@api.put("/conversations/{conversation_id}/read")
async def mark_conversation_read(conversation_id: str, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    is_seller = conv.get("seller_id") == user["id"]
    field = "unread_seller" if is_seller else "unread_customer"
    await db.conversations.update_one({"id": conversation_id}, {"$set": {field: 0}})
    return {"ok": True}


@api.post("/messages")
async def send_message_compat(payload: dict, user: dict = Depends(get_current_user)):
    conversation_id = payload.get("conversation_id")
    text = payload.get("text") or payload.get("content")
    if not conversation_id or not text:
        raise HTTPException(status_code=400, detail="conversation_id et text requis")
    conv = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    message = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": user["id"],
        "text": text,
        "content": text,
        "type": "text",
        "is_read": False,
        "created_at": _utc(),
    }
    await db.messages.insert_one(message)
    await db.conversations.update_one(
        {"id": conversation_id},
        {"$set": {"last_message": text, "last_message_at": _utc(), "updated_at": _utc()}},
    )
    await manager.broadcast_to_room(f"chat_{conversation_id}", {"type": "new_message", "message": message})
    return message


@api.post("/offers/create")
async def create_offer(payload: dict, user: dict = Depends(get_current_user)):
    conversation_id = payload.get("conversation_id")
    offered_price_fcfa = int(payload.get("offered_price_fcfa") or 0)
    note = (payload.get("note") or "").strip()
    if not conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id requis")
    if offered_price_fcfa <= 0:
        raise HTTPException(status_code=400, detail="offered_price_fcfa invalide")

    conv = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation non trouvee")
    if conv.get("seller_id") != user.get("id"):
        raise HTTPException(status_code=403, detail="Seul le vendeur/revendeur de la conversation peut envoyer une offre")

    product_snapshot = {
        "id": conv.get("product_id"),
        "name": conv.get("product_name"),
        "image": conv.get("product_image"),
        "seller_id": conv.get("seller_id"),
        "seller_name": conv.get("seller_name"),
    }

    # Resolve original reference price from product source when possible.
    reference_price_fcfa = 0
    if conv.get("seller_type") == "dropshipper":
        dp = await db.dropshipped_products.find_one({"id": conv.get("product_id")}, {"_id": 0})
        if dp:
            reference_price_fcfa = int(dp.get("selling_price_fcfa") or dp.get("original_promo_price_fcfa") or dp.get("original_price_fcfa") or 0)
            product_snapshot["image"] = (dp.get("original_images") or [product_snapshot["image"]])[0]
    else:
        p = await db.products.find_one({"id": conv.get("product_id")}, {"_id": 0})
        if p:
            reference_price_fcfa = int(p.get("promo_price_fcfa") or p.get("price_fcfa") or 0)
            product_snapshot["image"] = (p.get("images") or [product_snapshot["image"]])[0]
    if reference_price_fcfa <= 0:
        reference_price_fcfa = offered_price_fcfa

    offer_id = str(uuid.uuid4())
    offer_token = str(uuid.uuid4())
    offer = {
        "id": offer_id,
        "token": offer_token,
        "conversation_id": conversation_id,
        "seller_id": conv.get("seller_id"),
        "customer_id": conv.get("customer_id"),
        "seller_type": conv.get("seller_type"),
        "product_id": conv.get("product_id"),
        "reference_price_fcfa": reference_price_fcfa,
        "offered_price_fcfa": offered_price_fcfa,
        "note": note,
        "status": "active",
        "created_at": _utc(),
        "updated_at": _utc(),
        "product_snapshot": product_snapshot,
    }
    await db.offers.insert_one(offer)

    offer_path = f"/offre/{offer_token}"
    message_text = f"Offre spéciale: {offered_price_fcfa} FCFA"
    if note:
        message_text = f"{message_text} - {note}"

    msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id,
        "sender_id": user["id"],
        "sender_name": user.get("shop_name") or user.get("name"),
        "sender_type": "seller",
        "type": "offer",
        "text": message_text,
        "content": message_text,
        "offer_token": offer_token,
        "offer_price_fcfa": offered_price_fcfa,
        "reference_price_fcfa": reference_price_fcfa,
        "offer_url": offer_path,
        "product_name": product_snapshot.get("name"),
        "product_image": product_snapshot.get("image"),
        "is_read": False,
        "created_at": _utc(),
    }
    await db.messages.insert_one(msg)
    await db.conversations.update_one(
        {"id": conversation_id},
        {
            "$set": {"last_message": message_text, "last_message_at": _utc(), "updated_at": _utc()},
            "$inc": {"unread_customer": 1},
        },
    )
    await manager.broadcast_to_room(f"chat_{conversation_id}", {"type": "new_message", "message": msg})

    return {"offer": {k: v for k, v in offer.items() if k != "_id"}, "message": msg}


@api.post("/admin/conversations/start")
async def admin_start_conversation(payload: dict, user: dict = Depends(get_current_user)):
    if user.get("role") not in {"admin", "super_admin"}:
        raise HTTPException(status_code=403, detail="Acces reserve a l'administrateur")

    target_user_id = payload.get("target_user_id")
    if not target_user_id:
        raise HTTPException(status_code=400, detail="target_user_id requis")

    target = await db.users.find_one({"id": target_user_id}, {"_id": 0, "password": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Utilisateur cible introuvable")

    role = target.get("role") or "user"
    seller_type = "vendor" if role == "vendor" else "dropshipper" if role == "dropshipper" else "driver" if role == "driver" else role
    shop_name = target.get("shop_name") or target.get("name") or "Utilisateur"
    product_id = f"admin-chat-{target_user_id}"

    existing = await db.conversations.find_one(
        {
            "customer_id": user["id"],
            "seller_id": target_user_id,
            "product_id": product_id
        },
        {"_id": 0},
    )
    if existing:
        return existing

    conversation = {
        "id": str(uuid.uuid4()),
        "product_id": product_id,
        "product_name": f"Support Admin - {shop_name}",
        "product_image": None,
        "customer_id": user["id"],
        "customer_name": user.get("name") or "Admin",
        "customer_email": user.get("email"),
        "seller_id": target_user_id,
        "seller_name": shop_name,
        "seller_type": seller_type,
        "last_message": None,
        "last_message_at": None,
        "unread_customer": 0,
        "unread_seller": 0,
        "created_at": _utc(),
        "updated_at": _utc(),
    }
    await db.conversations.insert_one(conversation)
    return conversation


@api.get("/admin/conversations")
async def admin_get_conversations(user: dict = Depends(get_current_user)):
    if user.get("role") not in {"admin", "super_admin"}:
        raise HTTPException(status_code=403, detail="Acces reserve a l'administrateur")

    conversations = await db.conversations.find({}, {"_id": 0}).sort("updated_at", -1).to_list(500)
    return {"conversations": conversations}


@api.get("/offers/{offer_token}")
async def get_offer(offer_token: str, user: Optional[dict] = Depends(get_current_user)):
    offer = await db.offers.find_one({"token": offer_token, "status": "active"}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre non trouvee")
    # Restrict offer details to participants (seller or customer).
    uid = user.get("id") if user else None
    if uid and uid not in {offer.get("seller_id"), offer.get("customer_id")}:
        raise HTTPException(status_code=403, detail="Acces non autorise")
    return offer


@api.websocket("/ws/chat/{conversation_id}")
async def ws_chat(websocket: WebSocket, conversation_id: str):
    room = f"chat_{conversation_id}"
    await manager.connect(websocket, room)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)


@api.websocket("/ws/orders/{room_name}")
async def ws_orders(websocket: WebSocket, room_name: str):
    await manager.connect(websocket, room_name)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_name)


@api.websocket("/ws/driver/{driver_id}")
async def ws_driver(websocket: WebSocket, driver_id: str):
    room = f"driver_{driver_id}"
    await manager.connect(websocket, room)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "location":
                loc = data.get("location") or {}
                manager.update_driver_location(driver_id, loc)
                await manager.broadcast_to_room("admin_tracking", {"type": "driver_location", "location": manager.get_driver_location(driver_id)})
            elif data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)


# Mount API - désactivé pour éviter les conflits avec les routes définies sur app
app.mount("/api", api)


@app.get("/")
def read_root():
    return {"message": "Cloleo Marketplace API"}


@app.get("/health")
def health():
    return {"status": "ok"}


# Créer les index de recherche au démarrage
@app.on_event("startup")
async def startup_event():
    try:
        await db.products.create_index([("name", "text")])
        await db.products.create_index("name")
        await db.products.create_index("tags")
        print("✅ Index de recherche créés avec succès")
    except Exception as e:
        print(f"⚠️ Note: Index existants ou erreur: {e}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
