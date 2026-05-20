from datetime import datetime, timezone
from pathlib import Path
import os
import uuid
from typing import Optional
import re

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
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
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return {"products": products, "total": total, "page": page}


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
    for item in payload.items:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Produit introuvable: {item['product_id']}")
        qty = int(item.get("quantity", 1))
        unit_price = int(product.get("promo_price_fcfa") or product.get("price_fcfa") or 0)
        item_total = unit_price * qty
        subtotal += item_total
        seller_id = seller_id or product.get("seller_id")
        order_items.append({
            "product_id": product["id"],
            "product_name": product.get("name"),
            "product_image": (product.get("images") or [None])[0],
            "quantity": qty,
            "price_fcfa": unit_price,
            "subtotal_fcfa": item_total,
        })

    delivery_fee = 1500
    total = subtotal + delivery_fee
    order_id = str(uuid.uuid4())
    order = {
        "id": order_id,
        "order_number": f"CLO-{order_id[:8].upper()}",
        "customer_id": user["id"],
        "customer_name": payload.delivery_address.name,
        "customer_phone": payload.delivery_address.phone,
        "seller_id": seller_id,
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
    return order


@api.get("/orders")
async def list_orders(user: dict = Depends(get_current_user)):
    role = user.get("role")
    query = {}
    if role == "vendor":
        query["seller_id"] = user["id"]
    elif role == "dropshipper":
        query["dropshipper_id"] = user["id"]
    elif role == "driver":
        query["driver_id"] = user["id"]
    else:
        query["customer_id"] = user["id"]
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(300)
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

    product_id = str(uuid.uuid4())
    name = payload.get("name")
    slug = _slugify(name)
    exists_slug = await db.products.find_one({"slug": slug}, {"_id": 0, "id": 1})
    if exists_slug:
        slug = f"{slug}-{product_id[:6]}"

    product = {
        "id": product_id,
        "slug": slug,
        "seller_id": user["id"],
        "seller_name": user.get("shop_name") or user.get("name"),
        "name": name,
        "description": payload.get("description"),
        "category_slug": payload.get("category_slug"),
        "condition": payload.get("condition", "neuf"),
        "price_fcfa": int(payload.get("price_fcfa") or 0),
        "promo_price_fcfa": int(payload.get("promo_price_fcfa") or 0) or None,
        "stock": int(payload.get("stock") or 0),
        "images": payload.get("images") or [],
        "tags": payload.get("tags") or [],
        "is_active": True,
        "status": "pending",
        "is_featured": False,
        "created_at": _utc(),
        "updated_at": _utc(),
    }
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
    orders = await db.orders.count_documents({"dropshipper_id": user["id"]})
    return {"stats": {"product_count": products, "order_count": orders, "revenue_fcfa": 0}, "shop": {"slug": user.get("shop_slug"), "name": user.get("shop_name")}}


@api.get("/revendeur/catalog")
async def revendeur_catalog(page: int = 1, limit: int = 12, search: str = "", user: dict = Depends(require_dropshipper)):
    query = {"status": "approved"}
    if search:
        query["$or"] = [{"name": {"$regex": search, "$options": "i"}}, {"description": {"$regex": search, "$options": "i"}}]
    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    existing = await db.dropshipped_products.find({"dropshipper_id": user["id"]}, {"_id": 0, "original_product_id": 1}).to_list(2000)
    existing_ids = {e.get("original_product_id") for e in existing}
    for p in products:
        p["is_dropshipped"] = p.get("id") in existing_ids
    return {"products": products, "total": total, "page": page}


@api.get("/revendeur/products")
async def revendeur_products(user: dict = Depends(require_dropshipper)):
    return await db.dropshipped_products.find({"dropshipper_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


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
    orders = await db.orders.find({"dropshipper_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(300)
    return {"orders": orders}


@api.get("/revendeur/earnings")
async def revendeur_earnings(user: dict = Depends(require_dropshipper)):
    return {"earnings": []}


@api.get("/shop/{shop_slug}")
async def public_revendeur_shop(shop_slug: str, page: int = 1):
    shop_user = await db.users.find_one({"shop_slug": shop_slug, "role": "dropshipper"}, {"_id": 0, "password": 0})
    if not shop_user:
        raise HTTPException(status_code=404, detail="Boutique introuvable")
    products = await db.dropshipped_products.find({"dropshipper_id": shop_user["id"], "is_active": True}, {"_id": 0}).to_list(200)
    for p in products:
        if not p.get("original_images"):
            p["original_images"] = p.get("custom_images") or []
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

        category = {
            "id": str(uuid.uuid4()),
            "name": name,
            "slug": final_slug,
            "icon": payload.get("icon", "Package"),
            "description": payload.get("description", ""),
            "banner_images": banner_images,
            "image": banner_images[0] if banner_images else None,
            "parent_slug": parent_slug,
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
    if user.get("role") != "vendor":
        return {"subscriptions": []}
    subscriptions = await db.subscriptions.find({"seller_id": user["id"]}, {"_id": 0}).to_list(300)
    return {"subscriptions": subscriptions}


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
    if user.get("role") != "admin":
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


# Mount API
app.mount("/api", api)


@app.get("/")
def read_root():
    return {"message": "Cloleo Marketplace API"}


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
