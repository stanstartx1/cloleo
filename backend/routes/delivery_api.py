"""Delivery scheduling, zones, geolocation sync, route optimization."""
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid
import random

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth import get_current_user, require_driver, require_admin
from core.database import db
from core.geo_utils import haversine_km, calculate_eta_minutes, optimize_route_stops, is_in_geofence, utc_now
from core.notification_channels import notify_user_all_channels
from core.cache import cache_get, cache_set

router = APIRouter(prefix="/delivery", tags=["Delivery"])

_manager = None


def set_manager(mgr):
    global _manager
    _manager = mgr


class ScheduleRequest(BaseModel):
    order_id: str
    delivery_type: str = "immediate"
    scheduled_date: Optional[str] = None
    scheduled_slot: Optional[str] = None
    relay_point_id: Optional[str] = None


class SyncPositionsRequest(BaseModel):
    positions: List[dict]


def _coordinates(latitude, longitude) -> tuple[float, float]:
    try:
        lat, lon = float(latitude), float(longitude)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Coordonnées GPS invalides")
    if not -90 <= lat <= 90 or not -180 <= lon <= 180:
        raise HTTPException(status_code=400, detail="Coordonnées GPS invalides")
    return lat, lon


DEFAULT_SLOTS = ["09:00-11:00", "11:00-13:00", "14:00-16:00", "16:00-18:00", "18:00-20:00"]


@router.get("/slots/{order_id}")
async def get_delivery_slots(order_id: str, date: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    if user.get("role") != "admin" and user["id"] != order.get("customer_id"):
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    try:
        requested_date = datetime.fromisoformat(date).date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Date invalide (format ISO attendu)")
    if requested_date < datetime.now(timezone.utc).date():
        raise HTTPException(status_code=400, detail="La date de livraison ne peut pas être passée")
    city = order.get("delivery_address", {}).get("city", "default")
    cache_key = f"slots:{date}:{city.lower()}"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    booked = await db.scheduled_deliveries.find(
        {"scheduled_date": date, "city": city, "status": {"$in": ["confirmed", "assigned"]}},
        {"_id": 0, "scheduled_slot": 1},
    ).to_list(200)
    drivers_online = await db.users.count_documents({"role": "driver", "is_online": True, "is_active": True})

    slots = []
    for slot in DEFAULT_SLOTS:
        capacity = max(1, drivers_online * 2)
        used = sum(1 for b in booked if b.get("scheduled_slot") == slot)
        slots.append({
            "slot": slot,
            "available": used < capacity,
            "remaining": max(0, capacity - used),
        })

    result = {"date": date, "slots": slots, "drivers_available": drivers_online}
    await cache_set(cache_key, result, 120)
    return result


@router.post("/schedule")
async def schedule_delivery(data: ScheduleRequest, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": data.order_id, "customer_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    # ``standard`` was the original web-client value; retain it as an alias.
    delivery_type = "immediate" if data.delivery_type == "standard" else data.delivery_type
    if delivery_type not in {"immediate", "scheduled", "pickup", "locker"}:
        raise HTTPException(status_code=400, detail="Type de livraison invalide")
    if delivery_type == "scheduled":
        if not data.scheduled_date or data.scheduled_slot not in DEFAULT_SLOTS:
            raise HTTPException(status_code=400, detail="Date et créneau de livraison valides requis")
        try:
            if datetime.fromisoformat(data.scheduled_date).date() < datetime.now(timezone.utc).date():
                raise HTTPException(status_code=400, detail="La date de livraison ne peut pas être passée")
        except ValueError:
            raise HTTPException(status_code=400, detail="Date invalide (format ISO attendu)")
    if delivery_type in {"pickup", "locker"} and not data.relay_point_id:
        raise HTTPException(status_code=400, detail="Point relais requis")

    schedule_doc = {
        "id": str(uuid.uuid4()),
        "order_id": data.order_id,
        "customer_id": user["id"],
        "delivery_type": delivery_type,
        "scheduled_date": data.scheduled_date,
        "scheduled_slot": data.scheduled_slot,
        "relay_point_id": data.relay_point_id,
        "status": "confirmed",
        "city": order.get("delivery_address", {}).get("city", "default"),
        "created_at": utc_now(),
    }
    await db.scheduled_deliveries.insert_one(schedule_doc)

    update = {
        "delivery_type": delivery_type,
        "scheduled_date": data.scheduled_date,
        "scheduled_slot": data.scheduled_slot,
        "updated_at": utc_now(),
    }
    if data.relay_point_id:
        relay = await db.relay_points.find_one({"id": data.relay_point_id}, {"_id": 0})
        if relay:
            update["relay_point"] = relay
            update["delivery_address"] = {**order.get("delivery_address", {}), **relay.get("address", {})}
        else:
            raise HTTPException(status_code=404, detail="Point relais non trouvé")

    await db.orders.update_one({"id": data.order_id}, {"$set": update})

    confirmation = "Livraison planifiée"
    if delivery_type == "scheduled" and data.scheduled_slot:
        confirmation = f"Livraison prévue le {data.scheduled_date} entre {data.scheduled_slot}"
    elif delivery_type in {"pickup", "locker"}:
        confirmation = "Retrait en point relais confirmé"

    return {"ok": True, "confirmation_message": confirmation, "schedule": schedule_doc}


@router.get("/relay-points")
async def list_relay_points(city: Optional[str] = None):
    query = {"is_active": True}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    points = await db.relay_points.find(query, {"_id": 0}).to_list(100)
    if not points:
        points = [
            {"id": "relay-default-1", "name": "Point Relais Centre", "city": city or "Abidjan",
             "address": {"street": "Plateau", "city": city or "Abidjan", "latitude": 5.32, "longitude": -4.02},
             "hours": "8h-20h", "type": "relay"},
            {"id": "relay-default-2", "name": "Consigne Cocody", "city": city or "Abidjan",
             "address": {"street": "Cocody", "city": city or "Abidjan", "latitude": 5.35, "longitude": -3.98},
             "hours": "24h/24", "type": "locker"},
        ]
    return {"relay_points": points}


@router.post("/zones")
async def create_delivery_zone(payload: dict, user: dict = Depends(require_admin)):
    lat, lon = _coordinates(payload.get("center_lat"), payload.get("center_lon"))
    try:
        radius_km = float(payload.get("radius_km", 10))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Rayon de zone invalide")
    if not 0 < radius_km <= 500:
        raise HTTPException(status_code=400, detail="Le rayon doit être compris entre 0 et 500 km")
    zone = {
        "id": str(uuid.uuid4()),
        "name": payload.get("name"),
        "center_lat": lat,
        "center_lon": lon,
        "radius_km": radius_km,
        "city": payload.get("city"),
        "is_active": True,
        "created_at": utc_now(),
    }
    await db.delivery_zones.insert_one(zone)
    return {"ok": True, "zone": zone}


@router.get("/zones")
async def list_delivery_zones(lat: Optional[float] = None, lon: Optional[float] = None):
    zones = await db.delivery_zones.find({"is_active": True}, {"_id": 0}).to_list(50)
    if lat is not None and lon is not None:
        lat, lon = _coordinates(lat, lon)
        for z in zones:
            z["distance_km"] = round(haversine_km(lat, lon, z["center_lat"], z["center_lon"]), 2)
            z["in_zone"] = z["distance_km"] <= z.get("radius_km", 10)
    return {"zones": zones}


@router.post("/driver/sync-positions")
async def sync_offline_positions(data: SyncPositionsRequest, user: dict = Depends(require_driver)):
    saved = 0
    for pos in data.positions:
        lat, lon = _coordinates(pos.get("latitude"), pos.get("longitude"))
        doc = {
            "id": str(uuid.uuid4()),
            "driver_id": user["id"],
            "latitude": lat,
            "longitude": lon,
            "accuracy": pos.get("accuracy"),
            "timestamp": pos.get("timestamp") or utc_now(),
            "source": "offline_sync",
        }
        await db.driver_position_history.insert_one(doc)
        saved += 1
    if data.positions:
        last = data.positions[-1]
        lat, lon = _coordinates(last.get("latitude"), last.get("longitude"))
        loc = {"latitude": lat, "longitude": lon, "accuracy": last.get("accuracy")}
        await db.users.update_one({"id": user["id"]}, {"$set": {"location": loc, "updated_at": utc_now()}})
        if _manager:
            _manager.update_driver_location(user["id"], loc)
    return {"ok": True, "synced": saved}


@router.get("/driver/position-history")
async def get_position_history(user: dict = Depends(require_driver), limit: int = 100):
    limit = max(1, min(limit, 500))
    history = await db.driver_position_history.find(
        {"driver_id": user["id"]}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"history": history}


@router.post("/driver/check-geofence")
async def check_geofence(payload: dict, user: dict = Depends(require_driver)):
    lat = payload.get("latitude")
    lon = payload.get("longitude")
    order_id = payload.get("order_id")
    if lat is None or lon is None or not order_id:
        raise HTTPException(status_code=400, detail="latitude, longitude, order_id requis")
    lat, lon = _coordinates(lat, lon)

    order = await db.orders.find_one({"id": order_id, "driver_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")

    dest = order.get("delivery_address", {})
    dest_lat, dest_lon = dest.get("latitude"), dest.get("longitude")
    if dest_lat is None or dest_lon is None:
        return {"in_geofence": False, "distance_m": None}
    dest_lat, dest_lon = _coordinates(dest_lat, dest_lon)

    distance_m = haversine_km(lat, lon, dest_lat, dest_lon) * 1000
    try:
        radius = min(2_000, max(25, float(payload.get("radius_m", 200))))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Rayon de géofencing invalide")
    arrived = distance_m <= radius

    if arrived and not order.get("arrival_notified"):
        customer_id = order.get("customer_id")
        eta = max(1, int(distance_m / 250))
        if customer_id:
            await notify_user_all_channels(
                customer_id,
                "Votre livreur arrive bientôt",
                f"Votre livreur arrive dans environ {eta} min",
                "driver_arriving",
                {"order_id": order_id, "eta_minutes": eta},
            )
        await db.orders.update_one({"id": order_id}, {"$set": {"arrival_notified": True, "updated_at": utc_now()}})

    return {"in_geofence": arrived, "distance_m": round(distance_m), "radius_m": radius}


@router.get("/driver/multi-orders")
async def get_multi_delivery_orders(user: dict = Depends(require_driver)):
    orders = await db.orders.find({"driver_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    active = [o for o in orders if o.get("status") in ("assigned", "accepted", "picked_up", "in_transit")]
    pending = [o for o in orders if o.get("status") == "assigned"]
    completed = [o for o in orders if o.get("status") == "delivered"]
    route = await db.driver_routes.find_one({"driver_id": user["id"]}, {"_id": 0, "route": 1})
    return {"active": active, "pending": pending, "completed": completed, "route": route.get("route") if route else None}


@router.post("/driver/optimize-route")
async def optimize_driver_route(user: dict = Depends(require_driver)):
    orders = await db.orders.find(
        {"driver_id": user["id"], "status": {"$in": ["assigned", "accepted", "picked_up", "in_transit"]}},
        {"_id": 0},
    ).to_list(20)

    driver = await db.users.find_one({"id": user["id"]}, {"_id": 0, "location": 1})
    loc = driver.get("location") or {}
    start_lat = loc.get("latitude", 5.36)
    start_lon = loc.get("longitude", -4.01)
    start_lat, start_lon = _coordinates(start_lat, start_lon)

    stops = []
    for o in orders:
        addr = o.get("delivery_address") or {}
        if addr.get("latitude") is not None and addr.get("longitude") is not None:
            lat, lon = _coordinates(addr["latitude"], addr["longitude"])
            stops.append({
                "order_id": o["id"],
                "order_number": o.get("order_number"),
                "latitude": lat,
                "longitude": lon,
                "priority": 1 if o.get("status") == "in_transit" else 2,
                "status": o.get("status"),
            })

    stops.sort(key=lambda s: s["priority"])
    result = optimize_route_stops(stops, start_lat, start_lon)
    await db.driver_routes.update_one(
        {"driver_id": user["id"]},
        {"$set": {"route": result, "updated_at": utc_now()}},
        upsert=True,
    )
    return result


@router.get("/driver/route")
async def get_driver_route(user: dict = Depends(require_driver)):
    route = await db.driver_routes.find_one({"driver_id": user["id"]}, {"_id": 0})
    return route or {"stops": [], "total_distance_km": 0, "total_eta_minutes": 0}


@router.post("/driver/eta")
async def calculate_dynamic_eta(payload: dict, user: dict = Depends(require_driver)):
    lat = payload.get("latitude")
    lon = payload.get("longitude")
    dest_lat = payload.get("dest_latitude")
    dest_lon = payload.get("dest_longitude")
    traffic_factor = payload.get("traffic_factor", 1.0)
    if any(v is None for v in (lat, lon, dest_lat, dest_lon)):
        raise HTTPException(status_code=400, detail="Coordonnées incomplètes")
    lat, lon = _coordinates(lat, lon)
    dest_lat, dest_lon = _coordinates(dest_lat, dest_lon)
    try:
        traffic_factor = min(3.0, max(0.5, float(traffic_factor)))
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Facteur de trafic invalide")
    distance = haversine_km(lat, lon, dest_lat, dest_lon)
    eta = calculate_eta_minutes(distance, traffic_factor=traffic_factor)
    return {"distance_km": round(distance, 2), "eta_minutes": eta, "traffic_factor": traffic_factor}
