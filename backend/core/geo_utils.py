"""Geolocation utilities: distance, ETA, geofencing."""
import math
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def calculate_eta_minutes(distance_km: float, speed_kmh: float = 30, traffic_factor: float = 1.0) -> int:
    if distance_km <= 0:
        return 0
    adjusted_speed = max(speed_kmh / traffic_factor, 5)
    return max(1, int((distance_km / adjusted_speed) * 60))


def is_in_geofence(lat: float, lon: float, center_lat: float, center_lon: float, radius_m: float) -> bool:
    return haversine_km(lat, lon, center_lat, center_lon) * 1000 <= radius_m


def optimize_route_stops(stops: List[Dict[str, Any]], start_lat: float, start_lon: float) -> Dict[str, Any]:
    """Nearest-neighbor route optimization for multi-delivery."""
    if not stops:
        return {"stops": [], "total_distance_km": 0, "total_eta_minutes": 0}
    remaining = list(stops)
    ordered = []
    cur_lat, cur_lon = start_lat, start_lon
    while remaining:
        nearest_idx = min(
            range(len(remaining)),
            key=lambda i: haversine_km(cur_lat, cur_lon, remaining[i]["latitude"], remaining[i]["longitude"]),
        )
        stop = remaining.pop(nearest_idx)
        stop["distance_from_prev_km"] = round(
            haversine_km(cur_lat, cur_lon, stop["latitude"], stop["longitude"]), 2
        )
        ordered.append(stop)
        cur_lat, cur_lon = stop["latitude"], stop["longitude"]
    total_km = sum(s.get("distance_from_prev_km", 0) for s in ordered)
    total_eta = calculate_eta_minutes(total_km)
    return {"stops": ordered, "total_distance_km": round(total_km, 2), "total_eta_minutes": total_eta}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
