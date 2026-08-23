from datetime import datetime, timezone

from pathlib import Path

import os
import sys
import logging

# Order cancellation system - dynamic configuration
# Subscription plans system - dynamic configuration
# Chat multimedia system - images, documents, audio

import uuid

import hashlib

import secrets

from typing import Optional

import re

import math

import time



from dotenv import load_dotenv

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles

import uvicorn

from pymongo.errors import ServerSelectionTimeoutError



from core.auth import (

    hash_password,

    verify_password,

    decode_token,

    get_current_user,

    require_admin,

    require_driver,

    require_dropshipper,

    require_vendor,

)

from core.database import db

from core.websocket import manager

from models.schemas import CreateOrder, DropshippedProductCreate, DropshippedProductUpdate, OrderCancel, OrderDeleteRequest

from routes.auth import router as auth_router

from routes.cart import router as cart_router

from routes.categories import router as categories_router

from routes.chat import router as chat_router, vendor_chat_router, dropshipper_chat_router, revendeur_chat_router, driver_chat_router, set_manager

from routes.enterprises import router as enterprises_router

from routes.favorites import router as favorites_router, session_favorites_router

from routes.offers import router as offers_router

from routes.products import router as products_router

from routes.reviews import router as reviews_router

from routes.forum import router as forum_router

from routes.delivery_chat import router as delivery_chat_router, set_manager as set_delivery_chat_manager, send_system_delivery_pin_message

from routes.notifications_api import router as notifications_router

from routes.delivery_api import router as delivery_router, set_manager as set_delivery_manager

from routes.ratings_api import router as ratings_router

from routes.gamification_api import router as gamification_router

from routes.analytics_api import router as analytics_router

from routes.conflicts_api import router as conflicts_router, set_manager as set_conflicts_manager

from routes.security_api import router as security_router
from routes.osm_api import router as osm_router

from core.notification_channels import set_ws_manager, notify_order_parties, notify_user_all_channels

from core.gamification_delivery import add_delivery_points, check_on_time_delivery, update_delivery_streak

# Set up logging
logger = logging.getLogger(__name__)

# Ensure logger outputs to stdout
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)

load_dotenv()

# Helper function to calculate distance between two coordinates using Haversine formula
def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in kilometers between two coordinates using Haversine formula"""
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance

# Helper function for automatic driver assignment
async def auto_assign_driver(order_id: str, order: dict, manager, excluded_driver_id: str = None):
    """Automatically find and assign the closest available driver to an order"""
    logger.info(f"🔍 [AUTO ASSIGN] Starting automatic driver search for order {order_id}")
    if excluded_driver_id:
        logger.info(f"🔍 [AUTO ASSIGN] Excluding driver {excluded_driver_id} from search")
    
    # Get order delivery address for location-based assignment
    delivery_address = order.get("delivery_address", {})
    order_lat = delivery_address.get("latitude")
    order_lon = delivery_address.get("longitude")
    
    logger.info(f"🔍 [AUTO ASSIGN] Order location: lat={order_lat}, lon={order_lon}")
    
    # Build query to find available online drivers
    driver_query = {"role": "driver", "is_active": True, "is_verified": True, "is_online": True}
    if excluded_driver_id:
        driver_query["id"] = {"$ne": excluded_driver_id}
    
    # Find available online drivers with location data
    available_drivers = await db.users.find(
        driver_query,
        {"_id": 0, "id": 1, "name": 1, "phone": 1, "location": 1, "vehicle_type": 1}
    ).to_list(100)
    
    logger.info(f"🔍 [AUTO ASSIGN] Found {len(available_drivers)} available drivers")
    
    if available_drivers:
        # Find the closest driver based on location
        closest_driver = None
        min_distance = float('inf')
        
        for driver in available_drivers:
            driver_location = driver.get("location", {})
            driver_lat = driver_location.get("latitude")
            driver_lon = driver_location.get("longitude")
            
            logger.info(f"🔍 [AUTO ASSIGN] Driver {driver.get('name')} location: lat={driver_lat}, lon={driver_lon}")
            
            if driver_lat and driver_lon and order_lat and order_lon:
                # Calculate distance using Haversine formula
                distance = calculate_distance(driver_lat, driver_lon, order_lat, order_lon)
                logger.info(f"🔍 [AUTO ASSIGN] Distance to driver {driver.get('name')}: {distance:.2f} km")
                
                if distance < min_distance:
                    min_distance = distance
                    closest_driver = driver
            elif not closest_driver:
                # Fallback to first driver if no location data
                logger.warning(f"🔍 [AUTO ASSIGN] Driver {driver.get('name')} has no location, using as fallback")
                closest_driver = driver
        
        if closest_driver:
            logger.info(f"✅ [AUTO ASSIGN] Found closest driver: {closest_driver.get('name')} at {min_distance:.2f} km")
            
            # Update order with driver assignment
            await db.orders.update_one(
                {"id": order_id},
                {
                    "$set": {
                        "status": "assigned",
                        "driver_id": closest_driver["id"],
                        "driver_name": closest_driver.get("name"),
                        "driver_phone": closest_driver.get("phone"),
                        "driver_vehicle_type": closest_driver.get("vehicle_type"),
                        "updated_at": _utc()
                    },
                    "$push": {
                        "status_history": {
                            "status": "assigned",
                            "note": f"Livreur assigné automatiquement: {closest_driver.get('name')} (distance: {min_distance:.2f} km)",
                            "timestamp": _utc()
                        }
                    },
                },
            )
            
            logger.info(f"📱 [AUTO ASSIGN] Broadcasting assignment to driver {closest_driver['id']}")
            
            # Fetch the full order data to send to the driver
            updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
            
            # Broadcast order assignment via WebSocket to all parties
            await manager.broadcast_order_status_update(order_id, "assigned", {
                "driver_id": closest_driver["id"],
                "driver_name": closest_driver.get("name"),
                "driver_vehicle_type": closest_driver.get("vehicle_type"),
                "assigned_at": _utc(),
                "auto_assigned": True,
                "distance_km": round(min_distance, 2),
                "seller_id": order.get("seller_id")
            }, customer_id=order.get("customer_id"))
            
            # Notify the assigned driver specifically with full order data
            await manager.broadcast_to_room(f"driver_{closest_driver['id']}", {
                "type": "new_order",
                "order_id": order_id,
                "driver_id": closest_driver["id"],
                "message": "Nouvelle commande assignée automatiquement",
                "auto_assigned": True,
                "order_data": updated_order
            })
            
            # Also send order_assigned event for list update
            await manager.broadcast_to_room(f"driver_{closest_driver['id']}", {
                "type": "order_assigned",
                "order_id": order_id,
                "order_data": updated_order
            })
            
            await notify_user_all_channels(
                closest_driver["id"],
                "Nouvelle commande assignée",
                "Une commande vous a été attribuée automatiquement. Consultez votre itinéraire.",
                "order_assigned",
                {"order_id": order_id},
            )
            
            # PIN is already sent on order creation, no need to send again
            return True
        else:
            logger.warning(f"⚠️ [AUTO ASSIGN] No driver found for order {order_id}")
            return False
    else:
        logger.warning(f"⚠️ [AUTO ASSIGN] No available drivers found for order {order_id}")
        return False

# Helper function to calculate ETA based on distance and average speed
def calculate_eta(distance_km, average_speed_kmh=30):
    """Calculate estimated time of arrival in minutes"""
    if distance_km <= 0:
        return 0
    time_hours = distance_km / average_speed_kmh
    time_minutes = int(time_hours * 60)
    return time_minutes

# Helper function to broadcast notifications to all parties involved in an order
async def notify_all_parties(order_id, notification_type, message, manager):
    """Broadcast notification to seller, dropshipper (if applicable), and customer"""
    # Get order details
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return
    
    # Broadcast to order room (customer following tracking)
    await manager.broadcast_to_room(f"order_{order_id}", {
        "type": notification_type,
        "order_id": order_id,
        "message": message
    })
    
    # Notify seller
    seller_id = order.get("seller_id")
    if seller_id:
        await manager.broadcast_to_room(f"vendor_{seller_id}", {
            "type": notification_type,
            "order_id": order_id,
            "message": message
        })
    
    # Notify dropshipper if applicable
    dropshipper_id = order.get("dropshipper_id")
    if dropshipper_id:
        await manager.broadcast_to_room(f"dropshipper_{dropshipper_id}", {
            "type": notification_type,
            "order_id": order_id,
            "message": message
        })
    
    # Notify customer
    customer_id = order.get("customer_id")
    if customer_id:
        await manager.send_to_user(customer_id, {
            "type": notification_type,
            "order_id": order_id,
            "message": message
        })
    
    # Broadcast to all drivers for driver-specific notifications
    await manager.broadcast_to_all_drivers({
        "type": notification_type,
        "order_id": order_id,
        "message": message
    })

    # A WebSocket is only a live delivery channel. Persist the event and use
    # configured push/SMS/email channels so no order update is lost offline.
    await notify_order_parties(
        order,
        "Mise à jour de livraison",
        message,
        notification_type="order_update",
    )


app = FastAPI(title="Cloleo Marketplace API")


async def websocket_authenticated_user(websocket: WebSocket) -> Optional[dict]:
    """Authenticate browser WebSockets with their JWT query parameter."""
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008, reason="Authentification requise")
        return None
    try:
        payload = decode_token(token)
        user_id = payload["user_id"]
        if user_id == "local-admin" and payload.get("role") == "admin":
            return {"id": user_id, "role": "admin"}
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "id": 1, "role": 1, "is_active": 1})
        if not user or not user.get("is_active", False):
            raise ValueError("Compte inactif")
        return user
    except Exception:
        await websocket.close(code=1008, reason="Token invalide")
        return None



app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cloleo.com",
        "http://cloleo.com",
        "https://www.cloleo.com",
        "http://www.cloleo.com",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
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

api.include_router(revendeur_chat_router)

api.include_router(driver_chat_router)

api.include_router(reviews_router)

api.include_router(forum_router)

api.include_router(enterprises_router)

api.include_router(offers_router)

api.include_router(delivery_chat_router)

api.include_router(notifications_router)

api.include_router(delivery_router)

api.include_router(ratings_router)

api.include_router(gamification_router)

api.include_router(analytics_router)

api.include_router(conflicts_router)

api.include_router(security_router)

api.include_router(osm_router)



set_delivery_chat_manager(manager)

set_delivery_manager(manager)

set_conflicts_manager(manager)

set_ws_manager(manager)



# Startup event to initialize forum categories
@app.on_event("startup")
async def startup_event():
    """Initialize forum categories on server startup"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Default forum categories
    default_categories = [
        # Vendor categories
        {
            "id": "cat-vendor-general",
            "name": "Discussion Générale Vendeurs",
            "description": "Discussions générales entre vendeurs",
            "icon": "💼",
            "color": "bg-blue-100",
            "sort_order": 1,
            "target_role": "vendor",
            "created_at": now,
            "updated_at": now,
            "created_by": "system"
        },
        {
            "id": "cat-vendor-marketing",
            "name": "Marketing & Promotion",
            "description": "Stratégies marketing et promotion des produits",
            "icon": "📢",
            "color": "bg-green-100",
            "sort_order": 2,
            "target_role": "vendor",
            "created_at": now,
            "updated_at": now,
            "created_by": "system"
        },
        {
            "id": "cat-vendor-tips",
            "name": "Conseils & Astuces",
            "description": "Partage d'expériences et conseils pour vendeurs",
            "icon": "💡",
            "color": "bg-yellow-100",
            "sort_order": 3,
            "target_role": "vendor",
            "created_at": now,
            "updated_at": now,
            "created_by": "system"
        },
        # Enterprise categories
        {
            "id": "cat-enterprise-general",
            "name": "Discussion Générale Entreprises",
            "description": "Discussions générales entre entreprises",
            "icon": "🏢",
            "color": "bg-purple-100",
            "sort_order": 1,
            "target_role": "enterprise",
            "created_at": now,
            "updated_at": now,
            "created_by": "system"
        },
        {
            "id": "cat-enterprise-b2b",
            "name": "Partenariats B2B",
            "description": "Opportunités de partenariats business-to-business",
            "icon": "🤝",
            "color": "bg-indigo-100",
            "sort_order": 2,
            "target_role": "enterprise",
            "created_at": now,
            "updated_at": now,
            "created_by": "system"
        },
        {
            "id": "cat-enterprise-logistics",
            "name": "Logistique & Supply Chain",
            "description": "Discussions sur la logistique et la chaîne d'approvisionnement",
            "icon": "🚚",
            "color": "bg-orange-100",
            "sort_order": 3,
            "target_role": "enterprise",
            "created_at": now,
            "updated_at": now,
            "created_by": "system"
        },
        # General categories (admin)
        {
            "id": "cat-general",
            "name": "Discussion Générale",
            "description": "Discussions générales",
            "icon": "💬",
            "color": "bg-blue-100",
            "sort_order": 1,
            "target_role": "all",
            "created_at": now,
            "updated_at": now,
            "created_by": "system"
        },
        {
            "id": "cat-announcements",
            "name": "Annonces",
            "description": "Annonces officielles de la plateforme",
            "icon": "📢",
            "color": "bg-red-100",
            "sort_order": 2,
            "target_role": "all",
            "created_at": now,
            "updated_at": now,
            "created_by": "system"
        }
    ]
    
    # Insert categories if they don't exist
    for category in default_categories:
        existing = await db.forum_categories.find_one({"id": category["id"]})
        if not existing:
            await db.forum_categories.insert_one(category)
            print(f"✅ Forum category created: {category['name']} ({category['id']})")
        else:
            print(f"ℹ️ Forum category already exists: {category['name']} ({category['id']})")


# WebSocket endpoint for chat
@app.websocket("/api/ws/chat/{conversation_id}")
async def websocket_chat_endpoint(websocket: WebSocket, conversation_id: str):
    user = await websocket_authenticated_user(websocket)
    if not user:
        return
    conversation = await db.conversations.find_one({"id": conversation_id}, {"_id": 0, "customer_id": 1, "seller_id": 1})
    if not conversation or (user.get("role") != "admin" and user["id"] not in {conversation.get("customer_id"), conversation.get("seller_id")}):
        await websocket.close(code=1008, reason="Accès non autorisé")
        return
    room = f"chat_{conversation_id}"
    await manager.connect(websocket, room, user_id=user["id"])
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            # Echo back or handle incoming messages
            await manager.broadcast_to_room(room, {
                "type": "message",
                "content": data,
                "sender": "client"
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket, room, user_id=user["id"])
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, room, user_id=user["id"])


# WebSocket endpoint for order/delivery chat (tripartite: customer, vendor, driver)
@app.websocket("/api/ws/order-chat/{order_id}")
async def websocket_order_chat_endpoint(websocket: WebSocket, order_id: str):
    """WebSocket for real-time order chat between customer, vendor, and driver"""
    user = await websocket_authenticated_user(websocket)
    if not user:
        return
    
    # Get order participants
    order = await db.orders.find_one({"id": order_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not order:
        await websocket.close(code=1008, reason="Commande non trouvée")
        return
    
    # Check if user is authorized (customer, seller, driver, or admin)
    participants = {
        order.get("customer_id"),
        order.get("seller_id"),
        order.get("driver_id"),
        order.get("dropshipper_id")
    }
    
    if user.get("role") != "admin" and user["id"] not in participants:
        await websocket.close(code=1008, reason="Accès non autorisé")
        return
    
    # Connect to order-specific chat room
    room = f"order_chat_{order_id}"
    await manager.connect(websocket, room, user_id=user["id"])
    
    # Send immediate confirmation with order details
    await websocket.send_json({
        "type": "chat_connected",
        "order_id": order_id,
        "user_id": user["id"],
        "user_role": user.get("role"),
        "customer_id": order.get("customer_id"),
        "seller_id": order.get("seller_id"),
        "driver_id": order.get("driver_id")
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            # Handle typing indicators
            if data.get("type") == "typing":
                await manager.broadcast_to_room(room, {
                    "type": "typing_status",
                    "user_id": user["id"],
                    "user_name": user.get("name"),
                    "is_typing": data.get("is_typing", True),
                    "conversation_id": order_id
                })
            # Handle voice recording indicators
            if data.get("type") == "voice_recording":
                await manager.broadcast_to_room(room, {
                    "type": "voice_recording_status",
                    "user_id": user["id"],
                    "user_name": user.get("name"),
                    "is_recording": data.get("is_recording", True),
                    "conversation_id": order_id
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket, room, user_id=user["id"])
    except Exception as e:
        print(f"Order chat WebSocket error: {e}")
        manager.disconnect(websocket, room, user_id=user["id"])


# Global WebSocket endpoint for user-specific events
@app.websocket("/api/ws/user")
async def websocket_user_endpoint(websocket: WebSocket):
    """Global WebSocket for receiving all user events (messages, notifications, etc.)"""
    user = await websocket_authenticated_user(websocket)
    if not user:
        return
    
    # Connect to a user-specific room
    user_room = f"user_{user['id']}"
    await manager.connect(websocket, user_room, user_id=user["id"])
    
    # Send immediate confirmation
    await websocket.send_json({"type": "connected", "user_id": user["id"]})
    
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_room, user_id=user["id"])
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, user_room, user_id=user["id"])


# WebSocket endpoint for order tracking (real-time order status updates)
@app.websocket("/api/ws/order/{order_id}")
async def websocket_order_tracking(websocket: WebSocket, order_id: str):
    """WebSocket for real-time order status and driver location updates"""
    user = await websocket_authenticated_user(websocket)
    if not user:
        return
    
    # Verify user has access to this order
    order = await db.orders.find_one({"id": order_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not order:
        await websocket.close(code=1008, reason="Commande non trouvée")
        return
    
    # Check if user is authorized (customer, seller, driver, or admin)
    participants = {
        order.get("customer_id"),
        order.get("seller_id"), 
        order.get("driver_id"),
        order.get("dropshipper_id")
    }
    
    if user.get("role") != "admin" and user["id"] not in participants:
        await websocket.close(code=1008, reason="Accès non autorisé")
        return
    
    # Connect to order-specific room
    room = f"order_{order_id}"
    await manager.connect(websocket, room, user_id=user["id"])
    
    # Send immediate confirmation with current order status
    await websocket.send_json({
        "type": "order_connected",
        "order_id": order_id,
        "current_status": order.get("status"),
        "order_data": order
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            # Handle incoming messages from client if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket, room, user_id=user["id"])
    except Exception as e:
        print(f"Order tracking WebSocket error: {e}")
        manager.disconnect(websocket, room, user_id=user["id"])


# WebSocket endpoint for driver order management
@app.websocket("/api/ws/driver-orders/{driver_id}")
async def websocket_driver_orders(websocket: WebSocket, driver_id: str):
    """WebSocket for drivers to receive order assignments and updates"""
    user = await websocket_authenticated_user(websocket)
    if not user:
        return
    
    # Verify user is the driver
    if user["id"] != driver_id or user.get("role") != "driver":
        await websocket.close(code=1008, reason="Accès livreur requis")
        return
    
    # Connect to driver-specific room
    room = f"driver_{driver_id}"
    await manager.connect(websocket, room, user_id=user["id"])
    
    # Send immediate confirmation
    await websocket.send_json({
        "type": "driver_connected",
        "driver_id": driver_id
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            # Handle driver location updates
            if data.get("type") == "location_update":
                location = data.get("location", {})
                manager.update_driver_location(driver_id, location)
                
                # Broadcast to all active orders this driver is handling
                active_orders = await db.orders.find(
                    {"driver_id": driver_id, "status": {"$in": ["assigned", "accepted", "picked_up", "in_transit"]}},
                    {"_id": 0, "id": 1}
                ).to_list(length=100)
                
                for order in active_orders:
                    await manager.broadcast_driver_location_update(
                        order["id"],
                        driver_id,
                        location
                    )
    except WebSocketDisconnect:
        manager.disconnect(websocket, room, user_id=user["id"])
    except Exception as e:
        print(f"Driver orders WebSocket error: {e}")
        manager.disconnect(websocket, room, user_id=user["id"])


# WebSocket endpoint for vendor order management
@app.websocket("/api/ws/vendor-orders/{vendor_id}")
async def websocket_vendor_orders(websocket: WebSocket, vendor_id: str):
    """WebSocket for vendors to receive new order notifications"""
    user = await websocket_authenticated_user(websocket)
    if not user:
        return
    
    # Verify user is the vendor
    if user["id"] != vendor_id or user.get("role") not in ["vendor", "revendeur"]:
        await websocket.close(code=1008, reason="Accès vendeur requis")
        return
    
    # Connect to vendor-specific room
    room = f"vendor_{vendor_id}"
    await manager.connect(websocket, room, user_id=user["id"])
    
    # Send immediate confirmation
    await websocket.send_json({
        "type": "vendor_connected",
        "vendor_id": vendor_id
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, room, user_id=user["id"])
    except Exception as e:
        print(f"Vendor orders WebSocket error: {e}")
        manager.disconnect(websocket, room, user_id=user["id"])





def _utc():

    return datetime.now(timezone.utc).isoformat()





def _slugify(text: str) -> str:

    base = (text or "").strip().lower()

    base = re.sub(r"[^a-z0-9]+", "-", base)

    return base.strip("-") or str(uuid.uuid4())[:8]



async def get_order_cancellation_settings():
    """Récupérer les paramètres d'annulation de commande avec valeurs par défaut"""
    settings = await db.settings.find_one({"type": "order_cancellation"}, {"_id": 0})
    
    default_settings = {
        "vendor_cancellable_statuses": ["pending", "assigned"],
        "customer_cancellable_statuses": ["pending", "assigned"],
        "cancellation_time_limit_hours": 24,
        "require_cancellation_reason": False,
        "auto_refund_on_cancellation": True,
        "cancellation_fee_percentage": 0,
        "allow_vendor_cancellation": True,
        "allow_customer_cancellation": True
    }
    
    if settings:
        default_settings.update(settings)
    
    return default_settings





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



@api.get("/search/users/suggestions")

async def search_users_suggestions(q: str = "", limit: int = 8):

    """Retourne des suggestions de noms d'utilisateurs en temps réel"""

    if not q or len(q) < 2:

        return {"suggestions": []}

    # Recherche insensible à la casse dans les utilisateurs actifs
    query = {"is_active": True, "$or": [
        {"name": {"$regex": q, "$options": "i"}},
        {"shop_name": {"$regex": q, "$options": "i"}},
        {"email": {"$regex": q, "$options": "i"}},
    ]}

    users = await db.users.find(
        query,
        {"_id": 0, "name": 1, "shop_name": 1, "role": 1}
    ).limit(limit).to_list(limit)

    suggestions = []
    for user in users:
        if user.get("shop_name"):
            suggestions.append(f"{user['shop_name']} ({user.get('role', 'user')})")
        else:
            suggestions.append(f"{user.get('name', 'Anonymous')} ({user.get('role', 'user')})")

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





@api.post("/upload")

async def upload_single(file: UploadFile = File(...), user: dict = Depends(get_current_user)):

    ext = Path(file.filename or "").suffix or ".bin"

    filename = f"{uuid.uuid4()}{ext}"

    dest = uploads_dir / filename

    content = await file.read()

    dest.write_bytes(content)

    return {"url": f"/uploads/{filename}"}





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
    # Validation supplémentaire du payload
    if not payload.items or len(payload.items) == 0:
        raise HTTPException(status_code=400, detail="Le panier ne peut pas être vide")
    
    if not payload.delivery_address:
        raise HTTPException(status_code=400, detail="L'adresse de livraison est requise")
    
    required_address_fields = ["street", "city", "phone", "name"]
    missing_fields = [field for field in required_address_fields if not getattr(payload.delivery_address, field, None)]
    if missing_fields:
        raise HTTPException(status_code=400, detail=f"Champs d'adresse manquants: {', '.join(missing_fields)}")

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

            {"_id": 0}

        )

        

        print(f"DEBUG: Dropshipped product lookup for {item['product_id']}: {dropshipped}")

        

        if dropshipped:

            is_dropshipped_order = True

            dropshipper_id = dropshipped.get("dropshipper_id")

            dropshipped_product_info = dropshipped

            # Pour les produits dropshippés, le vendeur original est celui du produit source

            original_product = await db.products.find_one({"id": dropshipped["original_product_id"]}, {"_id": 0})

            if original_product:

                seller_id = original_product.get("seller_id")

                print(f"DEBUG: Original product found: {original_product.get('name')}, price: {original_product.get('price_fcfa')}, promo: {original_product.get('promo_price_fcfa')}")

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
    
    # Generate delivery PIN for order verification
    delivery_pin = f"{secrets.randbelow(1_000_000):06d}"
    delivery_pin_hash = hashlib.sha256(delivery_pin.encode()).hexdigest()

    
    # Si c'est une commande dropshippée, créer deux commandes optimisées : une pour le vendeur, une pour le revendeur

    if is_dropshipped_order and dropshipped_product_info:
        try:
            print(f"DEBUG: Starting dropshipped order creation")
            print(f"DEBUG: All dropshipped_product_info keys: {list(dropshipped_product_info.keys())}")
            print(f"DEBUG: original_promo_price_fcfa: {dropshipped_product_info.get('original_promo_price_fcfa')}")
            print(f"DEBUG: original_price_fcfa: {dropshipped_product_info.get('original_price_fcfa')}")
            print(f"DEBUG: selling_price_fcfa: {dropshipped_product_info.get('selling_price_fcfa')}")
            
            original_price = int(dropshipped_product_info.get("original_promo_price_fcfa") or dropshipped_product_info.get("original_price_fcfa") or 0)
            selling_price = int(dropshipped_product_info.get("selling_price_fcfa") or 0)
            original_subtotal = original_price * sum(item["quantity"] for item in order_items)
            dropshipper_subtotal = subtotal
            margin = dropshipper_subtotal - original_subtotal
            dropshipper_share = int(margin * 0.5)
            platform_share = margin - dropshipper_share
            
            print(f"DEBUG: Dropshipped order creation - original_price: {original_price}, selling_price: {selling_price}, margin: {margin}, dropshipper_share: {dropshipper_share}")

            # Disable vendor_stock check for dropshipped orders to match normal vendor behavior
            # Normal vendor orders don't check vendor_stock, so dropshipped orders should work the same way

            # Commande optimisée pour le vendeur
            seller_order = {
                "id": str(uuid.uuid4()),
                "order_number": f"CLO-{order_id[:8].upper()}",  # Same order number for consistency
                "customer_id": user["id"],
                "customer_name": payload.delivery_address.name,
                "customer_phone": payload.delivery_address.phone,
                "seller_id": seller_id,
                "dropshipper_id": dropshipper_id,
                "is_dropshipped_order": True,
                "is_seller_order": True,  # Mark as seller order
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
                "delivery_pin_hash": delivery_pin_hash,
                "delivery_pin_created_at": _utc(),
                "delivery_proof_required": True,
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
            print(f"DEBUG: Seller order created: {seller_order['order_number']}")

            # Commande optimisée pour le revendeur
            dropshipper_order = {
                "id": str(uuid.uuid4()),
                "order_number": f"CLO-{order_id[:8].upper()}",  # Same order number for consistency
                "customer_id": user["id"],
                "customer_name": payload.delivery_address.name,
                "customer_phone": payload.delivery_address.phone,
                "seller_id": seller_id,
                "dropshipper_id": dropshipper_id,
                "is_dropshipped_order": True,
                "is_dropshipper_order": True,  # Mark as dropshipper order
                "seller_order_id": seller_order["id"],  # Store seller order ID for tracking
                "items": [{
                    **order_items[0],
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

            await db.orders.insert_one(dropshipper_order)
            print(f"DEBUG: Dropshipper order created: {dropshipper_order['order_number']}")

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
                "seller_order_id": seller_order["id"],  # Store seller order ID for tracking
                "dropshipper_order_id": dropshipper_order["id"],  # Store dropshipper order ID for tracking
                "items": order_items,
                "delivery_address": payload.delivery_address.model_dump(),
                "notes": payload.notes,
                "payment_method": payload.payment_method,
                "payment_status": "pending",
                "delivery_pin_hash": delivery_pin_hash,
                "delivery_pin_created_at": _utc(),
                "delivery_proof_required": True,
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
            # The PIN is returned once to the authenticated customer; only its
            # hash is persisted in MongoDB.
            main_order["delivery_pin"] = delivery_pin

            # Broadcast new order to vendor via WebSocket
            await manager.broadcast_new_order_to_vendor(seller_id, main_order["id"], main_order)
            
            # Broadcast order creation to customer via WebSocket
            await manager.broadcast_to_room(f"user_{user['id']}", {
                "type": "order_created",
                "order_id": main_order["id"],
                "order_data": main_order
            })

            # Send delivery PIN immediately to customer via chat from Cloleo
            logger.info(f"🚀 [DROP ORDER CREATION] Sending PIN message for order {order_id}")
            pin_result = await send_system_delivery_pin_message(
                order_id, 
                delivery_pin, 
                main_order.get("order_number")
            )
            logger.info(f"📊 [DROP ORDER CREATION] PIN message result: {pin_result}")

            # Automatic driver assignment after order creation
            logger.info(f"🔍 [DROP ORDER CREATION] Starting automatic driver search for order {order_id}")
            await auto_assign_driver(order_id, main_order, manager)

            return main_order
            
        except Exception as e:
            print(f"ERROR in dropshipped order creation: {e}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Erreur lors de la création de commande dropshippée: {str(e)}")

    

    # Commande normale (non dropshippée)

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

        "delivery_pin_hash": delivery_pin_hash,

        "delivery_pin_created_at": _utc(),

        "delivery_proof_required": True,

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

    order["delivery_pin"] = delivery_pin

    # Broadcast new order to vendor via WebSocket
    await manager.broadcast_new_order_to_vendor(seller_id, order["id"], order)
    
    # Broadcast order creation to customer via WebSocket
    await manager.broadcast_to_room(f"user_{user['id']}", {
        "type": "order_created",
        "order_id": order["id"],
        "order_data": order
    })

    # Send delivery PIN immediately to customer via chat from Cloleo
    logger.info(f"🚀 [ORDER CREATION] Sending PIN message for order {order_id}")
    pin_result = await send_system_delivery_pin_message(
        order_id, 
        delivery_pin, 
        order.get("order_number")
    )
    logger.info(f"📊 [ORDER CREATION] PIN message result: {pin_result}")

    # Automatic driver assignment after order creation
    logger.info(f"🔍 [ORDER CREATION] Starting automatic driver search for order {order_id}")
    await auto_assign_driver(order_id, order, manager)

    return order





@api.get("/orders")
async def list_orders(user: dict = Depends(get_current_user)):
    role = user.get("role")
    query = {"is_deleted": {"$ne": True}}  # Exclure les commandes supprimées par défaut
    print(f"DEBUG: list_orders - role: {role}, user_id: {user['id']}")

    

    if role == "vendor":

        # Les vendeurs voient uniquement leurs commandes directes (non dropshippées)
        # Les commandes dropshippées sont gérées séparément par les revendeurs
        query["seller_id"] = user["id"]
        query["is_dropshipped_order"] = {"$ne": True}  # Exclure les commandes dropshippées

        print(f"DEBUG: Vendor query - seller_id: {user['id']}, excluding dropshipped orders")

    elif role == "enterprise":

        # Les entreprises voient uniquement leurs commandes directes (non dropshippées)
        query["seller_id"] = user["id"]
        query["is_dropshipped_order"] = {"$ne": True}  # Exclure les commandes dropshippées
        print(f"DEBUG: Enterprise query - seller_id: {user['id']}, excluding dropshipped orders")

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





@api.delete("/orders/{order_id}")
async def delete_order(order_id: str, data: OrderDeleteRequest, user: dict = Depends(get_current_user)):
    """Supprimer une commande (temporaire ou permanente)"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable")
    
    # Vérifier les permissions
    if order.get("customer_id") != user["id"] and order.get("seller_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Vous n'avez pas le droit de supprimer cette commande")
    
    # Ne permettre la suppression que pour les commandes terminées
    deletable_statuses = ["cancelled", "rejected", "delivered", "refunded"]
    if order["status"] not in deletable_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Seules les commandes terminées ({', '.join(deletable_statuses)}) peuvent être supprimées"
        )
    
    if data.permanent:
        # Suppression permanente
        await db.orders.delete_one({"id": order_id})
        return {"ok": True, "message": "Commande supprimée définitivement"}
    else:
        # Déplacer vers la corbeille
        await db.orders.update_one(
            {"id": order_id},
            {
                "$set": {
                    "is_deleted": True,
                    "deleted_at": _utc(),
                    "deleted_by": user["id"],
                    "deleted_reason": data.reason,
                    "updated_at": _utc()
                }
            }
        )
        return {"ok": True, "message": "Commande déplacée vers la corbeille"}


@api.get("/orders/trash")
async def get_trashed_orders(user: dict = Depends(get_current_user)):
    """Récupérer les commandes dans la corbeille"""
    query = {
        "is_deleted": True,
        "$or": [
            {"customer_id": user["id"]},
            {"seller_id": user["id"]}
        ]
    }
    
    orders = await db.orders.find(query, {"_id": 0}).sort("deleted_at", -1).to_list(50)
    return {"orders": orders}


@api.post("/orders/{order_id}/restore")
async def restore_order(order_id: str, user: dict = Depends(get_current_user)):
    """Restaurer une commande depuis la corbeille"""
    order = await db.orders.find_one({"id": order_id, "is_deleted": True})
    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable dans la corbeille")
    
    # Vérifier les permissions
    if order.get("customer_id") != user["id"] and order.get("seller_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Vous n'avez pas le droit de restaurer cette commande")
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "is_deleted": False,
                "deleted_at": None,
                "deleted_by": None,
                "deleted_reason": None,
                "updated_at": _utc()
            }
        }
    )
    
    return {"ok": True, "message": "Commande restaurée"}


@api.get("/orders/active")
async def get_active_orders(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0
):
    """Récupérer uniquement les commandes actives (non supprimées) avec pagination"""
    query = {
        "is_deleted": {"$ne": True},
        "$or": [
            {"customer_id": user["id"]},
            {"seller_id": user["id"]}
        ]
    }
    
    if status:
        query["status"] = status
    
    # Optimisation: exclure les commandes terminées anciennes
    query["status"] = {"$nin": ["cancelled", "rejected", "delivered", "refunded"]}
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    total = await db.orders.count_documents(query)
    
    return {
        "orders": orders,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@api.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    return order





@api.get("/orders/track/{order_id}")
async def track_order(order_id: str):
    """Get real-time order tracking information with ETA - public endpoint"""
    order = await db.orders.find_one({"id": order_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Get driver location if order is assigned
    driver_location = None
    driver_info = None
    eta_minutes = None
    
    if order.get("driver_id"):
        driver_id = order.get("driver_id")
        
        # Try to get live location from WebSocket manager first
        driver_location = manager.get_driver_location(driver_id)
        
        # Always get driver info from database regardless of location
        driver_info = await db.users.find_one(
            {"id": driver_id},
            {"_id": 0, "name": 1, "phone": 1, "vehicle_type": 1, "profile_photo": 1}
        )
        
        # If no live location, try to get last known location from user document
        if not driver_location and driver_info:
            user_location = driver_info.get("location")
            if user_location and user_location.get("latitude") and user_location.get("longitude"):
                driver_location = user_location
        
        # Calculate ETA if driver location exists
        if driver_location and order.get("delivery_address"):
            delivery_address = order.get("delivery_address", {})
            order_lat = delivery_address.get("latitude")
            order_lon = delivery_address.get("longitude")
            driver_lat = driver_location.get("latitude")
            driver_lon = driver_location.get("longitude")
            
            if driver_lat and driver_lon and order_lat and order_lon:
                distance = calculate_distance(driver_lat, driver_lon, order_lat, order_lon)
                eta_minutes = calculate_eta(distance)
    
    # This endpoint is intentionally public for tracking links: never expose
    # customer contact details, PIN material or a signed proof from it.
    public_order = {k: v for k, v in order.items() if k not in {
        "customer_phone", "delivery_pin", "delivery_pin_hash", "delivery_pin_verified",
        "delivery_pin_verified_at", "delivery_proof",
    }}
    if public_order.get("delivery_address"):
        public_order["delivery_address"] = {
            k: v for k, v in public_order["delivery_address"].items() if k not in {"name", "phone"}
        }
    if driver_info:
        driver_info.pop("phone", None)

    return {
        "order": public_order,
        "driver_live_location": driver_location,
        "driver_info": driver_info,
        "driver_vehicle_type": driver_info.get("vehicle_type") if driver_info else None,
        "eta_minutes": eta_minutes,
        "active_connections": manager.get_active_connections_count(),
        "connected_drivers": manager.get_connected_drivers()
    }


@api.get("/orders/{order_id}/delivery-pin")
async def get_delivery_pin(order_id: str, user: dict = Depends(get_current_user)):
    """Get delivery PIN for order verification - customer only"""
    order = await db.orders.find_one({"id": order_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Authorization check - only customer can see their own PIN
    if user["id"] != order.get("customer_id") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Return the delivery PIN (only to the customer)
    return {
        "order_id": order_id,
        "delivery_pin": order.get("delivery_pin"),
        "delivery_pin_created_at": order.get("delivery_pin_created_at"),
        "delivery_pin_verified": order.get("delivery_pin_verified", False)
    }


@api.post("/orders/{order_id}/verify-delivery-pin")
async def verify_delivery_pin_endpoint(order_id: str, payload: dict, user: dict = Depends(require_driver)):
    """Verify delivery PIN entered by driver"""
    order = await db.orders.find_one({"id": order_id, "driver_id": user["id"]}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    if order.get("status") != "in_transit":
        raise HTTPException(status_code=400, detail="La livraison doit être en cours pour vérifier le code")
    
    pin = payload.get("pin")
    if not pin:
        raise HTTPException(status_code=400, detail="Code PIN requis")
    
    pin_hash = order.get("delivery_pin_hash")
    # Support for existing orders without hash
    if not pin_hash and order.get("delivery_pin"):
        pin_hash = hashlib.sha256(str(order["delivery_pin"]).encode()).hexdigest()
    
    if not pin_hash:
        return {"ok": True, "verified": True, "message": "Aucun PIN requis"}
    
    candidate = hashlib.sha256(str(pin).encode()).hexdigest()
    if not hmac.compare_digest(candidate, pin_hash):
        raise HTTPException(status_code=400, detail="Code PIN incorrect")
    
    # Mark PIN as verified
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"delivery_pin_verified": True, "delivery_pin_verified_at": _utc()}}
    )
    
    return {"ok": True, "verified": True, "message": "Code PIN vérifié avec succès"}





@api.put("/orders/{order_id}/accept")

async def driver_accept_order(order_id: str, user: dict = Depends(require_driver)):

    order = await db.orders.find_one({"id": order_id}, {"_id": 0})

    if not order:

        raise HTTPException(status_code=404, detail="Commande non trouvée")

    if order.get("driver_id") and order.get("driver_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Cette commande est déjà attribuée à un autre livreur")
    if order.get("status") not in {"pending", "confirmed", "assigned"}:
        raise HTTPException(status_code=400, detail="Cette commande ne peut plus être attribuée")

    settings = await db.settings.find_one({"type": "delivery"}, {"_id": 0}) or {}
    try:
        max_active = max(1, int(settings.get("max_active_orders", 5)))
    except (TypeError, ValueError):
        max_active = 5
    active_count = await db.orders.count_documents({
        "driver_id": user["id"],
        "id": {"$ne": order_id},
        "status": {"$in": ["assigned", "accepted", "picked_up", "in_transit"]},
    })
    if active_count >= max_active:
        raise HTTPException(status_code=409, detail="Capacité maximale de livraisons actives atteinte")

    await db.orders.update_one(

        {"id": order_id},

        {

            "$set": {"status": "accepted", "driver_id": user["id"], "driver_name": user.get("name"), "driver_vehicle_type": user.get("vehicle_type"), "updated_at": _utc()},

            "$push": {"status_history": {"status": "accepted", "note": "Livreur accepté", "timestamp": _utc()}},

        },

    )

    # Fetch updated order
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})

    # Broadcast order status update via WebSocket
    await manager.broadcast_order_status_update(order_id, "accepted", {
        "driver_id": user["id"],
        "driver_name": user.get("name"),
        "driver_vehicle_type": user.get("vehicle_type"),
        "seller_id": order.get("seller_id")
    }, customer_id=order.get("customer_id"))
    
    # Broadcast to driver's room for immediate notification with full order data
    await manager.broadcast_to_room(f"driver_{user['id']}", {
        "type": "order_status_update",
        "order_id": order_id,
        "status": "accepted",
        "driver_id": user["id"],
        "driver_name": user.get("name"),
        "driver_vehicle_type": user.get("vehicle_type"),
        "timestamp": _utc(),
        "order_data": updated_order
    })
    logger.info(f"📱 [WS DRIVER] Order {order_id} accepted by driver {user['id']}")

    # PIN is already sent on order creation, no need to send again
    # Send delivery PIN via chat message from Cloleo
    # if order.get("delivery_pin"):
    #     logger.info(f"🚀 [SERVER DEBUG] Calling send_system_delivery_pin_message for order {order_id}")
    #     pin_result = await send_system_delivery_pin_message(
    #         order_id, 
    #         order["delivery_pin"], 
    #         order.get("order_number")
    #     )
    #     logger.info(f"📊 [SERVER DEBUG] PIN message result: {pin_result}")

    await notify_all_parties(
        order_id,
        "order_update",
        f"Nouvelle commande assignée au livreur {user.get('name', '')}".strip(),
        manager,
    )

    return {"ok": True}



@api.put("/orders/{order_id}/vendor-accept")
async def vendor_accept_order(order_id: str, user: dict = Depends(get_current_user)):
    """Acceptation de commande par le vendeur"""
    role = user.get("role")
    
    if role not in ["vendor", "enterprise", "dropshipper"]:
        raise HTTPException(status_code=403, detail="Seuls les vendeurs peuvent accepter des commandes")
    
    query = {"id": order_id}
    
    if role == "vendor":
        query["seller_id"] = user["id"]
    elif role == "enterprise":
        query["seller_id"] = user["id"]
    elif role == "dropshipper":
        query["dropshipper_id"] = user["id"]

    order = await db.orders.find_one(query, {"_id": 0})

    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable")

    if order["status"] != "pending":
        raise HTTPException(status_code=400, detail="Seules les commandes en attente peuvent être acceptées")

    # Check if this is a dropshipped order
    is_dropshipped = order.get("is_dropshipped_order", False)
    
    # Update all related orders if dropshipped
    if is_dropshipped:
        # Update the main order
        await db.orders.update_one(
            {"id": order_id},
            {
                "$set": {"status": "confirmed", "updated_at": _utc()},
                "$push": {"status_history": {"status": "confirmed", "note": "Commande acceptée par le vendeur", "timestamp": _utc()}},
            },
        )
        
        # Update seller order (for dropshipped orders)
        seller_order_id = order.get("seller_order_id")
        if seller_order_id:
            await db.orders.update_one(
                {"id": seller_order_id},
                {
                    "$set": {"status": "confirmed", "updated_at": _utc()},
                    "$push": {"status_history": {"status": "confirmed", "note": "Commande acceptée par le vendeur", "timestamp": _utc()}},
                },
            )
        
        # Update dropshipper order (for dropshipped orders)
        dropshipper_order_id = order.get("dropshipper_order_id")
        if dropshipper_order_id:
            await db.orders.update_one(
                {"id": dropshipper_order_id},
                {
                    "$set": {"status": "confirmed", "updated_at": _utc()},
                    "$push": {"status_history": {"status": "confirmed", "note": "Commande acceptée par le vendeur", "timestamp": _utc()}},
                },
            )
    else:
        # Normal order update
        await db.orders.update_one(
            {"id": order_id},
            {
                "$set": {"status": "confirmed", "updated_at": _utc()},
                "$push": {"status_history": {"status": "confirmed", "note": "Commande acceptée par le vendeur", "timestamp": _utc()}},
            },
        )
    
    # Broadcast order status update via WebSocket
    await manager.broadcast_order_status_update(order_id, "confirmed", {
        "vendor_name": user.get("name"),
        "seller_id": order.get("seller_id")
    }, customer_id=order.get("customer_id"))
    
    # Notify customer via all channels
    await notify_all_parties(
        order_id,
        "order_update",
        f"Commande acceptée par {user.get('name', 'le vendeur')}".strip(),
        manager,
    )
    
    # Broadcast to customer user room for immediate UI update
    await manager.broadcast_to_room(f"user_{order.get('customer_id')}", {
        "type": "order_status_update",
        "order_id": order_id,
        "status": "confirmed",
        "vendor_name": user.get("name"),
        "driver_vehicle_type": order.get("driver_vehicle_type"),
        "timestamp": _utc()
    })
    
    # PIN is already sent on order creation, no need to send again
    # Send delivery PIN via chat message from Cloleo when vendor accepts
    # (This ensures the customer gets the PIN as soon as the order is confirmed)
    # if order and order.get("delivery_pin"):
    #     logger.info(f"🚀 [SERVER DEBUG] Calling send_system_delivery_pin_message for order {order_id} (vendor accept)")
    #     pin_result = await send_system_delivery_pin_message(
    #         order_id, 
    #         order["delivery_pin"], 
    #         order.get("order_number")
    #     )
    #     logger.info(f"📊 [SERVER DEBUG] PIN message result (vendor accept): {pin_result}")

    # Check for auto-assign driver setting (default to True for automatic assignment)
    delivery_settings = await db.settings.find_one({"type": "delivery"}, {"_id": 0}) or {}
    auto_assign = delivery_settings.get("auto_assign", True)  # Changed default to True
    
    if auto_assign:
        logger.info(f"🔍 [VENDOR ACCEPT] Starting automatic driver search for order {order_id}")
        await auto_assign_driver(order_id, order, manager)

    # Broadcast update to all order-related rooms
    await manager.broadcast_to_room(f"order_{order_id}", {"type": "order_update", "status": "confirmed", "message": "Commande acceptée"})
    
    # Notify dropshipper if this is a dropshipped order
    if is_dropshipped:
        dropshipper_id = order.get("dropshipper_id")
        if dropshipper_id:
            await manager.broadcast_to_room(f"dropshipper_{dropshipper_id}", {
                "type": "order_update",
                "order_id": order_id,
                "status": "confirmed",
                "message": "Commande acceptée par le vendeur"
            })

    return {"ok": True}





@api.put("/orders/{order_id}/driver-accept")
async def driver_accept_order(order_id: str, user: dict = Depends(require_driver)):
    """Driver accepts the order assignment - first validation step"""
    order = await db.orders.find_one({"id": order_id, "driver_id": user["id"]}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée ou non assignée")
    
    if order["status"] != "assigned":
        raise HTTPException(status_code=400, detail="Cette commande n'est pas en attente d'acceptation")
    
    # Update order status to 'accepted'
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "accepted",
                "driver_accepted_at": _utc(),
                "updated_at": _utc()
            },
            "$push": {
                "status_history": {
                    "status": "accepted",
                    "note": f"Livreur {user.get('name')} a accepté la commande",
                    "timestamp": _utc()
                }
            },
        },
    )
    
    # Broadcast order status update via WebSocket
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    logger.info(f"📱 [WS DRIVER] Driver {user['id']} accepting order {order_id}")
    await manager.broadcast_order_status_update(order_id, "accepted", {
        "driver_id": user["id"],
        "driver_name": user.get("name"),
        "driver_vehicle_type": user.get("vehicle_type"),
        "driver_accepted_at": _utc(),
        "seller_id": order.get("seller_id")
    }, customer_id=order.get("customer_id") if order else None)

    # Notify all parties
    await notify_all_parties(order_id, "order_update", f"Livreur {user.get('name')} a accepté la commande", manager)
    
    return {"ok": True, "message": "Commande acceptée avec succès"}


@api.put("/orders/{order_id}/pickup")
async def driver_pickup_order(order_id: str, user: dict = Depends(require_driver)):
    """Driver confirms pickup of the package - second validation step"""
    order = await db.orders.find_one({"id": order_id, "driver_id": user["id"]}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    if order["status"] not in ["accepted", "assigned"]:
        raise HTTPException(status_code=400, detail="Statut de commande invalide pour récupération")
    
    # Update order status to 'picked_up'
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "picked_up",
                "picked_up_at": _utc(),
                "updated_at": _utc()
            },
            "$push": {
                "status_history": {
                    "status": "picked_up",
                    "note": f"Colis récupéré par {user.get('name')}",
                    "timestamp": _utc()
                }
            },
        },
    )
    
    # Broadcast order status update via WebSocket
    logger.info(f"📱 [WS DRIVER] Driver {user['id']} picking up order {order_id}")
    await manager.broadcast_order_status_update(order_id, "picked_up", {
        "driver_name": user.get("name"),
        "driver_vehicle_type": user.get("vehicle_type"),
        "picked_up_at": _utc(),
        "seller_id": order.get("seller_id")
    }, customer_id=order.get("customer_id"))

    # Notify all parties
    await notify_all_parties(order_id, "order_update", f"Colis récupéré par le livreur {user.get('name')}", manager)
    
    return {"ok": True, "message": "Colis récupéré avec succès"}


@api.put("/orders/{order_id}/in-transit")
async def driver_start_delivery(order_id: str, user: dict = Depends(require_driver)):
    """Driver starts delivery route - third validation step"""
    order = await db.orders.find_one({"id": order_id, "driver_id": user["id"]}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    if order["status"] != "picked_up":
        raise HTTPException(status_code=400, detail="Le colis doit être récupéré avant de démarrer la livraison")
    
    # Calculate ETA if location data available
    delivery_address = order.get("delivery_address", {})
    order_lat = delivery_address.get("latitude")
    order_lon = delivery_address.get("longitude")
    
    eta_minutes = None
    if order_lat and order_lon:
        driver_location = user.get("location", {})
        driver_lat = driver_location.get("latitude")
        driver_lon = driver_location.get("longitude")
        
        if driver_lat and driver_lon:
            distance = calculate_distance(driver_lat, driver_lon, order_lat, order_lon)
            eta_minutes = calculate_eta(distance)
    
    # Update order status to 'in_transit'
    update_data = {
        "status": "in_transit",
        "in_transit_at": _utc(),
        "updated_at": _utc()
    }
    
    if eta_minutes:
        update_data["eta_minutes"] = eta_minutes
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": update_data,
            "$push": {
                "status_history": {
                    "status": "in_transit",
                    "note": f"Livraison en cours par {user.get('name')}",
                    "timestamp": _utc(),
                    "eta_minutes": eta_minutes
                }
            },
        },
    )
    
    # Broadcast order status update via WebSocket
    logger.info(f"📱 [WS DRIVER] Driver {user['id']} starting delivery for order {order_id}")
    await manager.broadcast_order_status_update(order_id, "in_transit", {
        "driver_name": user.get("name"),
        "driver_vehicle_type": user.get("vehicle_type"),
        "in_transit_at": _utc(),
        "eta_minutes": eta_minutes,
        "seller_id": order.get("seller_id")
    }, customer_id=order.get("customer_id"))

    # Notify all parties with ETA information
    eta_message = f"Livraison en cours (arrivée estimée: {eta_minutes} min)" if eta_minutes else "Livraison en cours"
    await notify_all_parties(order_id, "order_update", f"{eta_message} - Livreur {user.get('name')}", manager)
    
    return {"ok": True, "message": "Livraison démarrée", "eta_minutes": eta_minutes}





@api.put("/orders/{order_id}/deliver")
async def driver_deliver_order(order_id: str, user: dict = Depends(require_driver)):
    """Driver confirms delivery - final validation step"""
    order = await db.orders.find_one({"id": order_id, "driver_id": user["id"]}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    if order["status"] != "in_transit":
        raise HTTPException(status_code=400, detail="La livraison doit être en cours pour confirmer")
    # Photo requirement removed - delivery can be confirmed without proof
    # if order.get("delivery_proof_required") and not order.get("delivery_proof"):
    #     raise HTTPException(status_code=400, detail="Une photo de preuve est requise avant confirmation")
    if order.get("delivery_pin_hash") and not order.get("delivery_pin_verified"):
        raise HTTPException(status_code=400, detail="Le code PIN client doit être vérifié avant confirmation")
    
    # Update order status to 'delivered'
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "delivered",
                "delivered_at": _utc(),
                "delivery_completed_by": user["id"],
                "updated_at": _utc()
            },
            "$push": {
                "status_history": {
                    "status": "delivered",
                    "note": f"Livraison confirmée par {user.get('name')}",
                    "timestamp": _utc()
                }
            },
        },
    )
    
    # Broadcast order status update via WebSocket
    logger.info(f"📱 [WS DRIVER] Driver {user['id']} delivering order {order_id}")
    await manager.broadcast_order_status_update(order_id, "delivered", {
        "driver_name": user.get("name"),
        "driver_vehicle_type": user.get("vehicle_type"),
        "delivered_at": _utc(),
        "seller_id": order.get("seller_id")
    }, customer_id=order.get("customer_id"))

    # Notify all parties
    await notify_all_parties(order_id, "order_update", f"Commande livrée avec succès par {user.get('name')}", manager)

    await add_delivery_points(user["id"], "delivery_completed", 25)
    await update_delivery_streak(user["id"])
    if await check_on_time_delivery({**order, "delivered_at": _utc()}):
        await add_delivery_points(user["id"], "on_time_delivery", 15)
    seller_id = order.get("seller_id")
    if seller_id:
        await add_delivery_points(seller_id, "fast_preparation", 10)
    
    return {"ok": True, "message": "Livraison confirmée avec succès"}


@api.post("/orders/{order_id}/delivery-proof")
async def submit_delivery_proof(order_id: str, photo: UploadFile = File(...), signature: str = None, notes: str = None, user: dict = Depends(require_driver)):
    """Submit proof of delivery (photo, signature, notes)"""
    order = await db.orders.find_one({"id": order_id, "driver_id": user["id"]}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    if order.get("status") != "in_transit":
        raise HTTPException(status_code=400, detail="La preuve est disponible lorsque la livraison est en cours")
    
    # Ensure delivery_proofs collection exists
    try:
        await db.create_collection("delivery_proofs")
    except:
        pass  # Collection already exists
    
    # Validate the image before writing it to the public uploads directory.
    allowed_types = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
    if photo.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Seules les images JPEG, PNG et WebP sont acceptées")
    content = await photo.read()
    if not content or len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Photo vide ou supérieure à 8 Mo")
    ext = allowed_types[photo.content_type]
    filename = f"delivery_proof_{order_id}_{uuid.uuid4().hex[:12]}{ext}"
    upload_path = Path(__file__).resolve().parent / "uploads" / "delivery_proofs"
    upload_path.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_path / filename
    file_path.write_bytes(content)
    
    photo_url = f"/uploads/delivery_proofs/{filename}"
    
    # Store delivery proof
    delivery_proof = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "driver_id": user["id"],
        "driver_name": user.get("name"),
        "photo_url": photo_url,
        "signature": (signature or "")[:10_000],
        "notes": (notes or "")[:1_000],
        "submitted_at": _utc()
    }

    await db.delivery_proofs.insert_one(delivery_proof)
    
    # Store in order document for simplicity
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "delivery_proof": delivery_proof,
                "updated_at": _utc()
            }
        }
    )
    
    return {"ok": True, "photo_url": photo_url, "message": "Preuve de livraison enregistrée"}


@api.put("/orders/{order_id}/driver-cancel")
async def driver_cancel_order(order_id: str, payload: dict = {}, user: dict = Depends(require_driver)):
    """Driver cancels an order (e.g., due to accident) and system reassigns to another driver"""
    reason = payload.get("reason", "")
    order = await db.orders.find_one({"id": order_id, "driver_id": user["id"]}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    # Only allow cancellation for orders in early stages
    if order["status"] not in ["assigned", "accepted"]:
        raise HTTPException(status_code=400, detail="Seules les commandes assignées ou acceptées peuvent être annulées par le livreur")
    
    # Cancel current driver assignment
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "pending",
                "driver_id": None,
                "driver_name": None,
                "driver_phone": None,
                "cancelled_by_driver": user["id"],
                "cancellation_reason": reason,
                "updated_at": _utc()
            },
            "$push": {
                "status_history": {
                    "status": "driver_cancelled",
                    "note": f"Commande annulée par le livreur {user.get('name')}: {reason}" if reason else f"Commande annulée par le livreur {user.get('name')}",
                    "timestamp": _utc()
                }
            },
        },
    )
    
    # Notify the cancelled driver
    await manager.broadcast_to_room(f"driver_{user['id']}", {
        "type": "order_cancelled",
        "order_id": order_id,
        "message": "Commande annulée avec succès"
    })
    
    # Immediately reassign to another available driver
    delivery_settings = await db.settings.find_one({"type": "delivery"}, {"_id": 0}) or {}
    auto_assign = delivery_settings.get("auto_assign", True)
    
    if auto_assign:
        logger.info(f"🔍 [DRIVER CANCEL] Starting automatic driver reassignment for order {order_id}")
        await auto_assign_driver(order_id, order, manager, excluded_driver_id=user["id"])
    
    # If auto-assign is disabled or no drivers available
    await manager.broadcast_to_room("all_drivers", {
        "type": "order_available",
        "order_id": order_id,
        "message": "Commande disponible pour réassignation"
    })
    
    return {"ok": True, "message": "Commande annulée, disponible pour réassignation"}



@api.put("/orders/{order_id}/reject")

async def reject_order(order_id: str, reason: str = "", user: dict = Depends(get_current_user)):

    role = user.get("role")

    query = {"id": order_id}

    if role == "vendor":
        query["seller_id"] = user["id"]
    elif role == "enterprise":
        query["seller_id"] = user["id"]
    elif role == "dropshipper":
        query["dropshipper_id"] = user["id"]

    order = await db.orders.find_one(query)

    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable")

    if order["status"] not in ["pending"]:
        raise HTTPException(status_code=400, detail="Seules les commandes en attente peuvent être refusées")

    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "cancelled",
                "rejection_reason": reason,
                "updated_at": _utc()
            },
            "$push": {
                "status_history": {
                    "status": "cancelled",
                    "note": f"Commande refusée par {role}: {reason}" if reason else f"Commande refusée par {role}",
                    "timestamp": _utc()
                }
            }
        }
    )

    await manager.broadcast_to_room(f"order_{order_id}", {"type": "order_update", "status": "cancelled", "message": "Commande refusée"})
    
    # Notify dropshipper if vendor cancels a dropshipped order
    if order.get("is_dropshipped_order") and role == "vendor":
        dropshipper_id = order.get("dropshipper_id")
        if dropshipper_id:
            await manager.broadcast_to_room(f"dropshipper_{dropshipper_id}", {
                "type": "dropshipped_order_cancelled",
                "order_id": order_id,
                "message": f"Commande dropshippée annulée par le vendeur: {reason}" if reason else "Commande dropshippée annulée par le vendeur"
            })

    return {"ok": True}



@api.put("/orders/{order_id}/cancel-by-vendor")
async def cancel_order_by_vendor(order_id: str, payload: OrderCancel, user: dict = Depends(get_current_user)):
    """Annulation de commande par le vendeur/entreprise/dropshipper"""
    role = user.get("role")
    reason = payload.reason or ""
    
    # Récupérer les paramètres d'annulation dynamiques
    cancellation_settings = await get_order_cancellation_settings()
    
    if not cancellation_settings.get("allow_vendor_cancellation", True):
        raise HTTPException(status_code=403, detail="L'annulation de commande par les vendeurs est désactivée")
    
    if role not in ["vendor", "enterprise", "dropshipper"]:
        raise HTTPException(status_code=403, detail="Seuls les vendeurs peuvent annuler des commandes")
    
    query = {"id": order_id}
    
    if role == "vendor":
        query["seller_id"] = user["id"]
    elif role == "enterprise":
        query["seller_id"] = user["id"]
    elif role == "dropshipper":
        query["dropshipper_id"] = user["id"]

    order = await db.orders.find_one(query)

    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable")

    # NEW LOGIC: For dropshipped orders, only the original vendor can cancel
    if order.get("is_dropshipped_order"):
        if role == "dropshipper":
            raise HTTPException(
                status_code=403, 
                detail="Pour les commandes dropshippées, seul le vendeur original peut annuler la commande"
            )
        # Vendor can cancel, continue with validation
        # When vendor cancels, also cancel the related dropshipper order
        # Find the related dropshipper order (dropshipper's order for this same purchase)
        dropshipper_order = await db.orders.find_one({
            "id": {"$ne": order_id},
            "is_dropshipped_order": True,
            "dropshipper_id": order.get("dropshipper_id"),
            "customer_id": order.get("customer_id"),
            "status": {"$ne": "cancelled"}  # Only cancel if not already cancelled
        })
        if dropshipper_order:
            await db.orders.update_one(
                {"id": dropshipper_order["id"]},
                {
                    "$set": {
                        "status": "cancelled",
                        "cancelled_by": "vendor",
                        "cancellation_reason": f"Annulé par le vendeur original: {reason}" if reason else "Annulé par le vendeur original",
                        "cancelled_at": _utc(),
                        "updated_at": _utc()
                    },
                    "$push": {
                        "status_history": {
                            "status": "cancelled",
                            "note": f"Commande annulée par le vendeur original: {reason}" if reason else "Commande annulée par le vendeur original",
                            "cancelled_by": "vendor",
                            "timestamp": _utc()
                        }
                    }
                }
            )
        
        # Restore vendor_stock when vendor cancels a dropshipped order
        if order.get("items") and len(order.get("items")) > 0:
            item = order["items"][0]
            original_product_id = item.get("original_product_id")
            quantity = item.get("quantity", 0)
            if original_product_id and quantity > 0:
                original_product = await db.products.find_one({"id": original_product_id}, {"_id": 0})
                if original_product:
                    current_vendor_stock = original_product.get("vendor_stock", 0)
                    new_vendor_stock = current_vendor_stock + quantity
                    await db.products.update_one(
                        {"id": original_product_id},
                        {"$set": {"vendor_stock": new_vendor_stock, "updated_at": _utc()}}
                    )


   

    # Vérifier si la commande peut être annulée selon les paramètres dynamiques
    cancellable_statuses = cancellation_settings.get("vendor_cancellable_statuses", ["pending", "assigned"])
    if order["status"] not in cancellable_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Seules les commandes avec statut {', '.join(cancellable_statuses)} peuvent être annulées"
        )

    # Vérifier le délai d'annulation (désactivé pour permettre l'annulation sans délai)
    time_limit_hours = cancellation_settings.get("cancellation_time_limit_hours", 0)
    if time_limit_hours > 0:
        order_created_at = datetime.fromisoformat(order.get("created_at", _utc()).replace('Z', '+00:00'))
        time_elapsed = (datetime.now(timezone.utc) - order_created_at).total_seconds() / 3600
        if time_elapsed > time_limit_hours:
            raise HTTPException(
                status_code=400, 
                detail=f"Le délai d'annulation de {time_limit_hours} heures est dépassé"
            )

    # Vérifier si une raison est requise
    if cancellation_settings.get("require_cancellation_reason", False) and not reason:
        raise HTTPException(status_code=400, detail="Une raison d'annulation est requise")

    # Récupérer les informations pour la synchronisation
    seller_id = order.get("seller_id")
    driver_id = order.get("driver_id")
    dropshipper_id = order.get("dropshipper_id")
    customer_id = order.get("customer_id")
    vendor_name = user.get("name", "Vendeur")

    # Mettre à jour la commande
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "cancelled",
                "cancelled_by": role,
                "cancellation_reason": reason,
                "cancelled_at": _utc(),
                "updated_at": _utc()
            },
            "$push": {
                "status_history": {
                    "status": "cancelled",
                    "note": f"Commande annulée par {role}: {reason}" if reason else f"Commande annulée par {role}",
                    "cancelled_by": role,
                    "timestamp": _utc()
                }
            }
        }
    )

    # Notification WebSocket principale pour la commande
    await manager.broadcast_to_room(f"order_{order_id}", {
        "type": "order_update", 
        "status": "cancelled", 
        "message": "Commande annulée par le vendeur",
        "cancelled_by": role,
        "reason": reason,
        "vendor_name": vendor_name
    })

    # Notification spécifique pour le client
    if customer_id:
        await manager.broadcast_to_room(f"user_{customer_id}", {
            "type": "order_cancelled",
            "order_id": order_id,
            "message": f"Votre commande #{order_id} a été annulée par le vendeur",
            "vendor_name": vendor_name,
            "reason": reason,
            "timestamp": _utc()
        })

    # Notification spécifique pour le dropshipper si applicable
    if dropshipper_id and dropshipper_id != user["id"]:
        await manager.broadcast_to_room(f"user_{dropshipper_id}", {
            "type": "order_cancelled",
            "order_id": order_id,
            "message": f"Commande dropshippée #{order_id} annulée par le vendeur",
            "vendor_name": vendor_name,
            "reason": reason,
            "timestamp": _utc()
        })

    # Notification spécifique pour le livreur si assigné
    if driver_id:
        await manager.broadcast_to_room(f"user_{driver_id}", {
            "type": "order_cancelled",
            "order_id": order_id,
            "message": f"Livraison annulée - Commande #{order_id}",
            "vendor_name": vendor_name,
            "reason": reason,
            "timestamp": _utc()
        })
        
        # Notification spécifique pour les drivers (room globale)
        await manager.broadcast_to_room("drivers", {
            "type": "order_cancelled",
            "order_id": order_id,
            "message": f"Commande #{order_id} annulée - plus besoin de livraison",
            "timestamp": _utc()
        })

    return {"ok": True, "message": "Commande annulée avec succès"}



@api.put("/orders/{order_id}/cancel-by-customer")
async def cancel_order_by_customer(order_id: str, payload: OrderCancel, user: dict = Depends(get_current_user)):
    """Annulation de commande par l'acheteur"""
    role = user.get("role")
    reason = payload.reason or ""
    
    # Récupérer les paramètres d'annulation dynamiques
    cancellation_settings = await get_order_cancellation_settings()
    
    if not cancellation_settings.get("allow_customer_cancellation", True):
        raise HTTPException(status_code=403, detail="L'annulation de commande par les clients est désactivée")
    
    if role not in ["customer"]:
        raise HTTPException(status_code=403, detail="Seuls les clients peuvent annuler leurs commandes")
    
    query = {"id": order_id, "customer_id": user["id"]}
    order = await db.orders.find_one(query)

    if not order:
        raise HTTPException(status_code=404, detail="Commande introuvable")

    # Vérifier si la commande peut être annulée selon les paramètres dynamiques
    cancellable_statuses = cancellation_settings.get("customer_cancellable_statuses", ["pending", "assigned"])
    if order["status"] not in cancellable_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Seules les commandes avec statut {', '.join(cancellable_statuses)} peuvent être annulées"
        )

    # Vérifier le délai d'annulation (désactivé pour permettre l'annulation sans délai)
    time_limit_hours = cancellation_settings.get("cancellation_time_limit_hours", 0)
    if time_limit_hours > 0:
        order_created_at = datetime.fromisoformat(order.get("created_at", _utc()).replace('Z', '+00:00'))
        time_elapsed = (datetime.now(timezone.utc) - order_created_at).total_seconds() / 3600
        if time_elapsed > time_limit_hours:
            raise HTTPException(
                status_code=400, 
                detail=f"Le délai d'annulation de {time_limit_hours} heures est dépassé"
            )

    # Vérifier si une raison est requise
    if cancellation_settings.get("require_cancellation_reason", False) and not reason:
        raise HTTPException(status_code=400, detail="Une raison d'annulation est requise")

    fee_percentage = cancellation_settings.get("cancellation_fee_percentage", 0)
    cancellation_fee_fcfa = int((order.get("total_fcfa") or 0) * fee_percentage / 100) if fee_percentage > 0 else 0

    # Récupérer les informations pour la synchronisation
    seller_id = order.get("seller_id")
    driver_id = order.get("driver_id")
    dropshipper_id = order.get("dropshipper_id")
    customer_name = user.get("name", "Client")

    # Mettre à jour la commande
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "cancelled",
                "cancelled_by": "customer",
                "cancellation_reason": reason,
                "cancellation_fee_fcfa": cancellation_fee_fcfa,
                "cancelled_at": _utc(),
                "updated_at": _utc()
            },
            "$push": {
                "status_history": {
                    "status": "cancelled",
                    "note": f"Commande annulée par le client: {reason}" if reason else "Commande annulée par le client",
                    "cancelled_by": "customer",
                    "timestamp": _utc()
                }
            }
        }
    )

    # Notification WebSocket principale pour la commande
    await manager.broadcast_to_room(f"order_{order_id}", {
        "type": "order_update", 
        "status": "cancelled", 
        "message": "Commande annulée par le client",
        "cancelled_by": "customer",
        "reason": reason,
        "customer_name": customer_name
    })

    # Notification spécifique pour le vendeur
    if seller_id:
        await manager.broadcast_to_room(f"user_{seller_id}", {
            "type": "order_cancelled",
            "order_id": order_id,
            "message": f"Commande #{order_id} annulée par le client",
            "customer_name": customer_name,
            "reason": reason,
            "timestamp": _utc()
        })

    # Notification spécifique pour le dropshipper si applicable
    if dropshipper_id:
        await manager.broadcast_to_room(f"user_{dropshipper_id}", {
            "type": "order_cancelled",
            "order_id": order_id,
            "message": f"Commande dropshippée #{order_id} annulée par le client",
            "customer_name": customer_name,
            "reason": reason,
            "timestamp": _utc()
        })

    # Notification spécifique pour le livreur si assigné
    if driver_id:
        await manager.broadcast_to_room(f"user_{driver_id}", {
            "type": "order_cancelled",
            "order_id": order_id,
            "message": f"Livraison annulée - Commande #{order_id}",
            "customer_name": customer_name,
            "reason": reason,
            "timestamp": _utc()
        })
        
        # Notification spécifique pour les drivers (room globale)
        await manager.broadcast_to_room("drivers", {
            "type": "order_cancelled",
            "order_id": order_id,
            "message": f"Commande #{order_id} annulée - plus besoin de livraison",
            "timestamp": _utc()
        })

    return {"ok": True, "message": "Commande annulée avec succès"}





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





@api.get("/users/{user_id}")

async def get_user_by_id(user_id: str):

    """Get user by ID (public endpoint for shop pages)"""

    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})

    if not user:

        raise HTTPException(status_code=404, detail="User not found")

    return user



@api.get("/users/search")

async def search_users(q: str = "", role: Optional[str] = None, page: int = 1, limit: int = 20):

    """Search users by name, email, shop_name, or role"""

    if not q or len(q) < 2:

        return {"users": [], "total": 0, "page": page, "limit": limit}

    query = {"is_active": True}

    if q:

        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"shop_name": {"$regex": q, "$options": "i"}},
            {"location": {"$regex": q, "$options": "i"}},
        ]

    if role:

        query["role"] = role

    skip = (page - 1) * limit

    total = await db.users.count_documents(query)

    users = await db.users.find(
        query,
        {"_id": 0, "password": 0}
    ).skip(skip).limit(limit).sort("created_at", -1).to_list(limit)

    return {"users": users, "total": total, "page": page, "limit": limit}





@api.get("/vendor/products")

async def vendor_products(status: Optional[str] = None, user: dict = Depends(get_current_user)):

    query = {"seller_id": user["id"]}

    if status:

        query["status"] = status

    return await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)





@api.get("/products/seller/{seller_id}")

async def get_products_by_seller(seller_id: str, status: Optional[str] = None):

    """Get products by seller ID (public endpoint for shop pages)"""

    query = {"seller_id": seller_id}

    if status:

        query["status"] = status

    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)

    

    # Inject seller role for each product

    seller_ids = list({p.get("seller_id") for p in products if p.get("seller_id")})

    if seller_ids:

        users = await db.users.find(

            {"id": {"$in": seller_ids}},

            {"_id": 0, "id": 1, "role": 1}

        ).to_list(len(seller_ids) + 10)

        role_by_id = {u.get("id"): u.get("role") for u in users}

        for p in products:

            p["seller_role"] = role_by_id.get(p.get("seller_id"))

    

    return products





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

        "seller_name": user.get("shop_name") or user.get("name") or user.get("company_name"),

        "name": name,

        "short_description": payload.get("short_description", ""),

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

        "vendor_stock": int(payload.get("vendor_stock")) if payload.get("vendor_stock") is not None else None,  # Only set if explicitly provided

        "images": payload.get("images") or [],

        "tags": payload.get("tags") or [],

        "custom_attributes": custom_attributes,

        "brand": payload.get("brand", ""),

        "model": payload.get("model", ""),

        "sku": payload.get("sku", ""),

        "ean": payload.get("ean", ""),

        "weight": payload.get("weight", ""),

        "dimensions": payload.get("dimensions", ""),

        "warranty": payload.get("warranty", ""),

        "video_url": payload.get("video_url", ""),

        "specifications": payload.get("specifications", ""),

        "certifications": payload.get("certifications", ""),

        "documentation": payload.get("documentation", ""),

        "faq": payload.get("faq", ""),

        "usage_images": payload.get("usage_images") or [],

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

    if "vendor_stock" in update and int(update["vendor_stock"] or 0) < 0:

        raise HTTPException(status_code=400, detail="Le stock vendeur est invalide")

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

    return {
        "user": {
            "id": user["id"],
            "name": user.get("name"),
            "is_verified": user.get("is_verified", False),
            "is_active": user.get("is_active", False),
            "is_online": user.get("is_online", True),  # Default to online
            "driver_status": user.get("driver_status", "available")
        },
        "stats": {"total_orders": orders, "active_orders": active}
    }


@api.get("/driver/orders")
async def driver_orders(user: dict = Depends(require_driver)):
    """Get all orders assigned to the driver with complete information"""
    orders = await db.orders.find(
        {"driver_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Enrich orders with seller and customer information
    for order in orders:
        # Get seller information with location
        seller_id = order.get("seller_id")
        if seller_id:
            seller = await db.users.find_one(
                {"id": seller_id},
                {"_id": 0, "name": 1, "phone": 1, "shop_name": 1, "email": 1, "location": 1, "address": 1}
            )
            if seller:
                order["seller_info"] = {
                    "name": seller.get("shop_name") or seller.get("name"),
                    "phone": seller.get("phone"),
                    "email": seller.get("email"),
                    "location": seller.get("location"),
                    "address": seller.get("address")
                }
            else:
                # Fallback if seller not found
                order["seller_info"] = {
                    "name": "Vendeur",
                    "phone": None,
                    "email": None,
                    "location": None,
                    "address": None
                }
        
        # Get dropshipper information if applicable
        dropshipper_id = order.get("dropshipper_id")
        if dropshipper_id:
            dropshipper = await db.users.find_one(
                {"id": dropshipper_id},
                {"_id": 0, "name": 1, "phone": 1, "shop_name": 1, "email": 1, "location": 1, "address": 1}
            )
            if dropshipper:
                order["dropshipper_info"] = {
                    "name": dropshipper.get("shop_name") or dropshipper.get("name"),
                    "phone": dropshipper.get("phone"),
                    "email": dropshipper.get("email"),
                    "location": dropshipper.get("location"),
                    "address": dropshipper.get("address")
                }
        
        # Ensure customer information is complete
        if not order.get("customer_info"):
            order["customer_info"] = {
                "name": order.get("customer_name"),
                "phone": order.get("customer_phone"),
                "address": order.get("delivery_address", {})
            }
    
    return {"orders": orders}





@api.post("/driver/location/update")
async def driver_location_update(payload: dict, user: dict = Depends(require_driver)):
    location = {"latitude": payload.get("latitude"), "longitude": payload.get("longitude"), "accuracy": payload.get("accuracy")}
    
    # Update both websocket manager and user document for distance calculations
    manager.update_driver_location(user["id"], location)
    await db.users.update_one(
        {"id": user["id"]}, 
        {"$set": {"location": location, "updated_at": _utc()}}
    )

    # Persist position history
    await db.driver_position_history.insert_one({
        "id": str(uuid.uuid4()),
        "driver_id": user["id"],
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "accuracy": location.get("accuracy"),
        "timestamp": _utc(),
        "source": "live",
    })
    
    await manager.broadcast_to_room("admin_tracking", {"type": "driver_location", "location": manager.get_driver_location(user["id"])})
    
    # Broadcast to all active orders this driver is handling
    active_orders = await db.orders.find(
        {"driver_id": user["id"], "status": {"$in": ["assigned", "accepted", "picked_up", "in_transit"]}},
        {"_id": 0, "id": 1}
    ).to_list(length=100)
    
    for order in active_orders:
        await manager.broadcast_driver_location_update(
            order["id"],
            user["id"],
            location
        )
    
    # Auto-assign pending orders if driver just came online with location
    delivery_settings = await db.settings.find_one({"type": "delivery"}, {"_id": 0}) or {}
    auto_assign = delivery_settings.get("auto_assign", True)
    
    if auto_assign:
        logger.info(f"🔍 [LOCATION UPDATE] Driver {user['id']} updated location, checking for pending orders")
        
        # Find pending orders without drivers
        pending_orders = await db.orders.find({
            "status": "confirmed",
            "driver_id": {"$exists": False},
            "is_deleted": {"$ne": True}
        }).to_list(10)
        
        logger.info(f"🔍 [LOCATION UPDATE] Found {len(pending_orders)} pending orders")
        
        for order in pending_orders:
            logger.info(f"🔍 [LOCATION UPDATE] Attempting to assign order {order['id']} to driver {user['id']}")
            success = await auto_assign_driver(order["id"], order, manager)
            if success:
                logger.info(f"✅ [LOCATION UPDATE] Successfully assigned order {order['id']} to driver {user['id']}")
                break  # Only assign one order at a time

    return {"ok": True, "message": "Location updated successfully"}





@api.put("/driver/status")
async def driver_status_update(payload: dict, user: dict = Depends(require_driver)):
    status = payload.get("status", "available")
    
    # Map status to is_online field
    is_online = status in ["available", "online"]
    
    await db.users.update_one(
        {"id": user["id"]}, 
        {"$set": {"is_online": is_online, "driver_status": status, "updated_at": _utc()}}
    )
    
    return {"ok": True, "is_online": is_online, "status": status}





@api.post("/driver/upload-license-test")

async def driver_upload_license_test(request: Request, user: dict = Depends(get_current_user)):
    """Test endpoint to check authentication"""
    logger.info(f"🧪 [LICENSE TEST] Authentication test for user: {user.get('id')}, role: {user.get('role')}")
    logger.info(f"🧪 [LICENSE TEST] Request headers: {dict(request.headers)}")
    return {"success": True, "user_id": user.get('id'), "role": user.get('role')}


@api.post("/driver/upload-license-registration")
async def driver_upload_license_registration(request: Request, file: UploadFile = File(...)):
    """Upload license during registration - uses token to identify user without requiring active driver status"""
    logger.info(f"📄 [LICENSE REGISTRATION] Driver license upload during registration")
    logger.info(f"📄 [LICENSE REGISTRATION] Request headers: {dict(request.headers)}")
    logger.info(f"📄 [LICENSE REGISTRATION] File info: {file.filename}, content_type: {file.content_type}")

    # Get token from Authorization header
    auth_header = request.headers.get("authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning(f"📄 [LICENSE REGISTRATION] Missing or invalid authorization header")
        raise HTTPException(status_code=401, detail="Token requis")

    token = auth_header.replace("Bearer ", "")
    
    try:
        payload = decode_token(token)
        user_id = payload.get("user_id")
        logger.info(f"📄 [LICENSE REGISTRATION] Token decoded for user: {user_id}")
    except Exception as e:
        logger.error(f"📄 [LICENSE REGISTRATION] Token decode error: {e}")
        raise HTTPException(status_code=401, detail="Token invalide")

    # Get user from database
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        logger.error(f"📄 [LICENSE REGISTRATION] User not found: {user_id}")
        raise HTTPException(status_code=404, detail="Utilisateur non trouve")

    if user.get("role") != "driver":
        logger.warning(f"📄 [LICENSE REGISTRATION] User is not a driver: {user.get('role')}")
        raise HTTPException(status_code=403, detail="Acces reserve aux livreurs")

    ext = Path(file.filename or "").suffix or ".bin"
    logger.info(f"📄 [LICENSE REGISTRATION] File extension: {ext}")

    filename = f"license_{user_id}_{uuid.uuid4()}{ext}"
    dest = uploads_dir / filename

    try:
        content = await file.read()
        logger.info(f"📄 [LICENSE REGISTRATION] File size: {len(content)} bytes")
        
        if len(content) == 0:
            logger.error(f"📄 [LICENSE REGISTRATION] File is empty!")
            raise HTTPException(status_code=422, detail="Le fichier est vide")
        
        dest.write_bytes(content)
        logger.info(f"📄 [LICENSE REGISTRATION] File saved to: {dest}")
        
        url = f"/uploads/{filename}"
        
        await db.users.update_one({"id": user_id}, {"$set": {"license_image": url, "updated_at": _utc()}})
        logger.info(f"📄 [LICENSE REGISTRATION] Database updated for user: {user_id}")
        
        logger.info(f"📄 [LICENSE REGISTRATION] Upload successful: {url}")
        return {"url": url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"📄 [LICENSE REGISTRATION] Error during upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")


@api.post("/driver/upload-license")

async def driver_upload_license(request: Request, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    logger.info(f"📄 [LICENSE UPLOAD] Driver license upload attempt")
    logger.info(f"📄 [LICENSE UPLOAD] Request headers: {dict(request.headers)}")
    logger.info(f"📄 [LICENSE UPLOAD] File info: {file.filename}, content_type: {file.content_type}")
    logger.info(f"📄 [LICENSE UPLOAD] User info: {user.get('id')}, role: {user.get('role')}")

    if user.get("role") != "driver":
        logger.warning(f"📄 [LICENSE UPLOAD] Access denied for non-driver user: {user.get('role')}")
        raise HTTPException(status_code=403, detail="Acces reserve aux livreurs")

    ext = Path(file.filename or "").suffix or ".bin"
    logger.info(f"📄 [LICENSE UPLOAD] File extension: {ext}")

    filename = f"license_{user['id']}_{uuid.uuid4()}{ext}"
    dest = uploads_dir / filename

    try:
        content = await file.read()
        logger.info(f"📄 [LICENSE UPLOAD] File size: {len(content)} bytes")
        
        if len(content) == 0:
            logger.error(f"📄 [LICENSE UPLOAD] File is empty!")
            raise HTTPException(status_code=422, detail="Le fichier est vide")
        
        dest.write_bytes(content)
        logger.info(f"📄 [LICENSE UPLOAD] File saved to: {dest}")
        
        url = f"/uploads/{filename}"
        
        await db.users.update_one({"id": user["id"]}, {"$set": {"license_image": url, "updated_at": _utc()}})
        logger.info(f"📄 [LICENSE UPLOAD] Database updated for user: {user['id']}")
        
        logger.info(f"📄 [LICENSE UPLOAD] Upload successful: {url}")
        return {"url": url}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"📄 [LICENSE UPLOAD] Error during upload: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")





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

        "original_vendor_id": original.get("seller_id"),  # Track original vendor for chat logic

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

    return settings or {"type": "delivery", "max_active_orders": 5, "auto_assign": True}





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



@api.get("/admin/settings/order-cancellation")
async def admin_order_cancellation_settings(user: dict = Depends(require_admin)):
    """Récupérer les paramètres d'annulation de commande"""
    settings = await db.settings.find_one({"type": "order_cancellation"}, {"_id": 0})
    
    # Paramètres par défaut si non configurés
    default_settings = {
        "type": "order_cancellation",
        "vendor_cancellable_statuses": ["pending", "assigned"],
        "customer_cancellable_statuses": ["pending", "assigned"],
        "cancellation_time_limit_hours": 24,
        "require_cancellation_reason": False,
        "auto_refund_on_cancellation": True,
        "cancellation_fee_percentage": 0,
        "allow_vendor_cancellation": True,
        "allow_customer_cancellation": True
    }
    
    if settings:
        # Fusionner avec les paramètres par défaut pour éviter les champs manquants
        default_settings.update(settings)
    
    return default_settings



@api.put("/admin/settings/order-cancellation")
async def admin_save_order_cancellation_settings(payload: dict, user: dict = Depends(require_admin)):
    """Sauvegarder les paramètres d'annulation de commande"""
    settings = payload.get("settings") or {}
    
    # Valider les paramètres
    allowed_statuses = ["pending", "assigned", "picked_up", "in_transit", "delivered", "cancelled"]
    
    vendor_statuses = settings.get("vendor_cancellable_statuses", ["pending", "assigned"])
    customer_statuses = settings.get("customer_cancellable_statuses", ["pending", "assigned"])
    
    # Vérifier que les statuts sont valides
    for status in vendor_statuses:
        if status not in allowed_statuses:
            raise HTTPException(status_code=400, detail=f"Statut invalide: {status}")
    
    for status in customer_statuses:
        if status not in allowed_statuses:
            raise HTTPException(status_code=400, detail=f"Statut invalide: {status}")
    
    # Valider le délai
    time_limit = settings.get("cancellation_time_limit_hours", 24)
    if not isinstance(time_limit, (int, float)) or time_limit < 0:
        raise HTTPException(status_code=400, detail="Le délai d'annulation doit être un nombre positif")
    
    # Valider le pourcentage de frais
    fee_percentage = settings.get("cancellation_fee_percentage", 0)
    if not isinstance(fee_percentage, (int, float)) or fee_percentage < 0 or fee_percentage > 100:
        raise HTTPException(status_code=400, detail="Le pourcentage de frais doit être entre 0 et 100")
    
    doc = {
        "type": "order_cancellation",
        "vendor_cancellable_statuses": vendor_statuses,
        "customer_cancellable_statuses": customer_statuses,
        "cancellation_time_limit_hours": time_limit,
        "require_cancellation_reason": settings.get("require_cancellation_reason", False),
        "auto_refund_on_cancellation": settings.get("auto_refund_on_cancellation", True),
        "cancellation_fee_percentage": fee_percentage,
        "allow_vendor_cancellation": settings.get("allow_vendor_cancellation", True),
        "allow_customer_cancellation": settings.get("allow_customer_cancellation", True),
        "updated_at": _utc()
    }
    
    await db.settings.update_one({"type": "order_cancellation"}, {"$set": doc}, upsert=True)
    
    return {"ok": True, "message": "Paramètres d'annulation de commande mis à jour"}



@api.get("/order-cancellation-settings")
async def public_order_cancellation_settings():
    """Récupérer les paramètres d'annulation de commande (public)"""
    settings = await db.settings.find_one({"type": "order_cancellation"}, {"_id": 0})
    
    # Paramètres par défaut si non configurés
    default_settings = {
        "vendor_cancellable_statuses": ["pending", "assigned"],
        "customer_cancellable_statuses": ["pending", "assigned"],
        "cancellation_time_limit_hours": 24,
        "require_cancellation_reason": False,
        "allow_vendor_cancellation": True,
        "allow_customer_cancellation": True
    }
    
    if settings:
        # Fusionner avec les paramètres par défaut
        default_settings.update(settings)
    
    return default_settings





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





@api.delete("/admin/products/by-name/{product_name}")

async def admin_delete_product_by_name(product_name: str, user: dict = Depends(require_admin)):

    """Delete a product by name (case-insensitive)"""

    product = await db.products.find_one({"name": {"$regex": product_name, "$options": "i"}})

    if not product:

        raise HTTPException(status_code=404, detail="Produit non trouvé")

    await db.products.delete_one({"id": product["id"]})

    return {"ok": True, "message": f"Produit '{product['name']}' supprimé"}





@api.delete("/admin/enterprises/by-name/{company_name}")

async def admin_delete_enterprise_by_name(company_name: str, user: dict = Depends(require_admin)):

    """Delete an enterprise by company name (case-insensitive) and all its products"""

    enterprise = await db.users.find_one({"company_name": {"$regex": company_name, "$options": "i"}, "role": "enterprise"})

    if not enterprise:

        raise HTTPException(status_code=404, detail="Entreprise non trouvée")

    

    enterprise_id = enterprise.get("id")

    

    # Delete all products from this enterprise

    product_count = await db.products.count_documents({"seller_id": enterprise_id})

    await db.products.delete_many({"seller_id": enterprise_id})

    

    # Delete the enterprise

    await db.users.delete_one({"id": enterprise_id})

    

    return {"ok": True, "message": f"Entreprise '{enterprise['company_name']}' et {product_count} produits supprimés"}





@api.post("/admin/cleanup-test-data")

async def cleanup_test_data():

    """Temporary endpoint to clean up test data (EKO-BAT, n, GH, AAA)"""

    results = []

    

    # Delete EKO-BAT enterprise

    enterprise = await db.users.find_one({"company_name": {"$regex": "EKO-BAT", "$options": "i"}, "role": "enterprise"})

    if enterprise:

        enterprise_id = enterprise.get("id")

        product_count = await db.products.count_documents({"seller_id": enterprise_id})

        await db.products.delete_many({"seller_id": enterprise_id})

        await db.users.delete_one({"id": enterprise_id})

        results.append(f"Entreprise EKO-BAT et {product_count} produits supprimés")

    else:

        results.append("Entreprise EKO-BAT non trouvée")

    

    # Delete product "n, GH"

    product = await db.products.find_one({"name": {"$regex": "n, GH", "$options": "i"}})

    if product:

        await db.products.delete_one({"id": product["id"]})

        results.append(f"Produit '{product['name']}' supprimé")

    else:

        results.append("Produit 'n, GH' non trouvé")

    

    # Delete product "AAA"

    product = await db.products.find_one({"name": {"$regex": "AAA", "$options": "i"}})

    if product:

        await db.products.delete_one({"id": product["id"]})

        results.append(f"Produit '{product['name']}' supprimé")

    else:

        results.append("Produit 'AAA' non trouvé")

    

    return {"results": results}





@api.get("/admin/list-test-data")

async def list_test_data():

    """List all enterprises and products to identify test data"""

    enterprises = await db.users.find({"role": "enterprise"}).to_list(length=None)

    products = await db.products.find({}).to_list(length=None)

    

    enterprise_list = []

    for ent in enterprises:

        enterprise_list.append({

            "id": ent.get("id"),

            "company_name": ent.get("company_name"),

            "email": ent.get("email")

        })

    

    product_list = []

    for prod in products:

        product_list.append({

            "id": prod.get("id"),

            "name": prod.get("name"),

            "seller_id": prod.get("seller_id")

        })

    

    return {

        "enterprises": enterprise_list,

        "products": product_list

    }





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

    await db.products.delete_many({"seller_id": revendeur_id})

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
    """Récupérer les plans d'abonnement (dynamiques depuis la base de données)"""
    try:
        # Essayer de récupérer les plans depuis la base de données
        db_plans = await db.subscription_plans.find({"is_active": True}, {"_id": 0}).sort("order", 1).to_list(20)
        
        if db_plans:
            return db_plans
    except Exception as e:
        print(f"Error fetching subscription plans from database: {e}")
    
    # Fallback vers les plans par défaut si erreur ou aucun plan n'existe
    default_plans = [
        {"id": "free", "name": "Free", "emoji": "🚀", "price_fcfa": 0, "price_usd": 0, "commission_percent": 15, "features": ["10 produits", "Support standard"], "order": 1, "is_active": True},
        {"id": "artisan", "name": "Artisan", "emoji": "🛠️", "price_fcfa": 5000, "price_usd": 8, "commission_percent": 12, "features": ["50 produits", "Stats avancees"], "badge": "verified", "order": 2, "is_active": True},
        {"id": "commercant", "name": "Commercant", "emoji": "💼", "price_fcfa": 15000, "price_usd": 25, "commission_percent": 10, "features": ["Produits illimites", "Mise en avant"], "badge": "pro", "order": 3, "is_active": True},
        {"id": "entreprise", "name": "Entreprise", "emoji": "🏢", "price_fcfa": 35000, "price_usd": 58, "commission_percent": 8, "features": ["Multi-boutiques", "Support prioritaire"], "badge": "premium", "order": 4, "is_active": True},
    ]
    
    # Essayer d'initialiser les plans par défaut dans la base de données (sans bloquer si ça échoue)
    try:
        await db.subscription_plans.insert_many(default_plans)
    except Exception as e:
        print(f"Could not initialize subscription plans in database: {e}")
    
    return default_plans



@api.get("/admin/subscription-plans")
async def admin_subscription_plans(user: dict = Depends(require_admin)):
    """Récupérer tous les plans d'abonnement (admin)"""
    plans = await db.subscription_plans.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return {"plans": plans}



@api.post("/admin/subscription-plans")
async def create_subscription_plan(payload: dict, user: dict = Depends(require_admin)):
    """Créer un nouveau plan d'abonnement"""
    plan_data = {
        "id": str(uuid.uuid4()),
        "name": payload.get("name", "Nouveau plan"),
        "emoji": payload.get("emoji", "⭐"),
        "price_fcfa": payload.get("price_fcfa", 0),
        "price_usd": payload.get("price_usd", 0),
        "commission_percent": payload.get("commission_percent", 15),
        "features": payload.get("features", []),
        "badge": payload.get("badge"),
        "order": payload.get("order", 99),
        "is_active": payload.get("is_active", True),
        "created_at": _utc(),
        "updated_at": _utc()
    }
    
    await db.subscription_plans.insert_one(plan_data)
    return {"ok": True, "plan": plan_data}



@api.put("/admin/subscription-plans/{plan_id}")
async def update_subscription_plan(plan_id: str, payload: dict, user: dict = Depends(require_admin)):
    """Mettre à jour un plan d'abonnement"""
    update_data = {k: v for k, v in payload.items() if k != "id"}
    update_data["updated_at"] = _utc()
    
    result = await db.subscription_plans.update_one(
        {"id": plan_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Plan introuvable")
    
    return {"ok": True, "message": "Plan mis à jour"}



@api.delete("/admin/subscription-plans/{plan_id}")
async def delete_subscription_plan(plan_id: str, user: dict = Depends(require_admin)):
    """Supprimer un plan d'abonnement"""
    result = await db.subscription_plans.delete_one({"id": plan_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan introuvable")
    
    return {"ok": True, "message": "Plan supprimé"}





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



@api.delete("/conversations/{conversation_id}")

async def delete_conversation(conversation_id: str, user: dict = Depends(get_current_user)):

    """Delete a conversation and all its messages"""

    conv = await db.conversations.find_one({"id": conversation_id}, {"_id": 0})

    if not conv:

        raise HTTPException(status_code=404, detail="Conversation non trouvée")



    # Check if user is authorized to delete the conversation

    user_id = user.get("id")

    user_role = user.get("role")



    is_authorized = (

        conv.get("customer_id") == user_id or

        conv.get("seller_id") == user_id or

        conv.get("dropshipper_id") == user_id or

        user_role in {"admin", "super_admin"}

    )



    if not is_authorized:

        raise HTTPException(status_code=403, detail="Non autorisé à supprimer cette conversation")



    # Delete all messages in the conversation

    await db.messages.delete_many({"conversation_id": conversation_id})



    # Delete the conversation

    await db.conversations.delete_one({"id": conversation_id})



    return {"message": "Conversation supprimée avec succès"}





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





@api.websocket("/ws/order-chat/{order_id}/{user_id}")
async def ws_order_chat(websocket: WebSocket, order_id: str, user_id: str):
    user = await websocket_authenticated_user(websocket)
    if not user:
        return
    if user["id"] != user_id:
        await websocket.close(code=1008, reason="Identité WebSocket invalide")
        return
    order = await db.orders.find_one({"id": order_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    participants = ({order.get("customer_id"), order.get("seller_id"), order.get("driver_id"), order.get("dropshipper_id")} if order else set())
    if user.get("role") != "admin" and user_id not in participants:
        await websocket.close(code=1008, reason="Accès non autorisé")
        return
    room = f"order_chat_{order_id}"
    await manager.connect(websocket, room, user_id=user_id)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            elif msg_type == "typing":
                await manager.broadcast_to_room(room, {
                    "type": "typing",
                    "user_id": user_id,
                    "order_id": order_id,
                })
            elif msg_type == "new_message":
                await manager.broadcast_to_room(room, data)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room, user_id=user_id)
    except Exception as e:
        print(f"Order chat WS error: {e}")
        manager.disconnect(websocket, room, user_id=user_id)





@api.websocket("/ws/chat/{conversation_id}")
async def ws_chat(websocket: WebSocket, conversation_id: str):
    await websocket.accept()
    room = f"chat_{conversation_id}"
    await manager.connect(websocket, room)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, room)





@api.websocket("/ws/orders/{room_name}")

async def ws_orders(websocket: WebSocket, room_name: str):

    user = await websocket_authenticated_user(websocket)
    if not user:
        return
    if room_name == "admin_tracking" and user.get("role") != "admin":
        await websocket.close(code=1008, reason="Accès administrateur requis")
        return

    await manager.connect(websocket, room_name, user_id=user["id"])

    try:

        while True:

            data = await websocket.receive_json()

            if data.get("type") == "ping":

                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:

        manager.disconnect(websocket, room_name, user_id=user["id"])





@api.websocket("/ws/driver/{driver_id}")

async def ws_driver(websocket: WebSocket, driver_id: str):

    user = await websocket_authenticated_user(websocket)
    if not user:
        return
    if user["id"] != driver_id or user.get("role") != "driver":
        await websocket.close(code=1008, reason="Accès livreur requis")
        return

    room = f"driver_{driver_id}"

    await manager.connect(websocket, room, user_id=driver_id)

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

        manager.disconnect(websocket, room, user_id=driver_id)





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

        delivery_index_specs = [
            (db.delivery_messages, [("order_id", 1), ("created_at", 1)]),
            (db.delivery_conversations, [("order_id", 1)]),
            (db.notifications, [("user_id", 1), ("read", 1)]),
            (db.driver_position_history, [("driver_id", 1), ("timestamp", -1)]),
            (db.delivery_ratings, [("recipient_id", 1)]),
            (db.gamification_profiles, [("user_id", 1)]),
        ]
        for collection, keys in delivery_index_specs:
            try:
                await collection.create_index(keys)
            except Exception:
                pass

        print("✅ Index de recherche créés avec succès")

    except Exception as e:

        print(f"⚠️ Note: Index existants ou erreur: {e}")





if __name__ == "__main__":

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
