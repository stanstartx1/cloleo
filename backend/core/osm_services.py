"""OpenStreetMap Services: Directions, Geocoding, Tiles Management"""
import asyncio
import aiohttp
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
from core.database import db

logger = logging.getLogger(__name__)

# ==================== OSM API CONFIGURATION ====================

OSM_CONFIG = {
    "osrm_base_url": "http://router.project-osrm.org/route/v1/driving",
    "nominatim_base_url": "https://nominatim.openstreetmap.org/search",
    "reverse_geocode_url": "https://nominatim.openstreetmap.org/reverse",
    "tile_server_url": "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    "user_agent": "CloleoDelivery/1.0",  # Required by OSM terms of service
}

# ==================== DIRECTIONS SERVICE (OSRM) ====================

async def get_osrm_directions(
    origin_lat: float, 
    origin_lon: float,
    dest_lat: float, 
    dest_lon: float,
    alternatives: bool = False
) -> Dict[str, Any]:
    """
    Get route directions using OSRM (Open Source Routing Machine)
    Alternative to Mapbox Directions API
    """
    try:
        coords = f"{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
        url = f"{OSM_CONFIG['osrm_base_url']}/{coords}"
        
        params = {
            "overview": "full",
            "geometries": "geojson",
            "alternatives": alternatives,
            "steps": True
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers={
                "User-Agent": OSM_CONFIG["user_agent"]
            }) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("routes"):
                        route = data["routes"][0]
                        return {
                            "geometry": route.get("geometry"),
                            "distance_m": route.get("distance"),
                            "duration_s": route.get("duration"),
                            "steps": route.get("steps", [])
                        }
        
        logger.warning(f"OSRM request failed: {response.status}")
        return {"error": "OSRM request failed"}
        
    except Exception as e:
        logger.error(f"OSRM directions error: {e}")
        return {"error": str(e)}


async def optimize_multi_destinations(
    origin_lat: float,
    origin_lon: float,
    destinations: List[Dict[str, float]]
) -> Dict[str, Any]:
    """
    Optimize route for multiple destinations using OSRM
    Returns optimized order and total route
    """
    if not destinations:
        return {"optimized_order": [], "total_distance_m": 0, "total_duration_s": 0}
    
    try:
        # Build coordinates string for OSRM
        coords = f"{origin_lon},{origin_lat}"
        for dest in destinations:
            coords += f";{dest['longitude']},{dest['latitude']}"
        
        url = f"{OSM_CONFIG['osrm_base_url']}/{coords}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers={
                "User-Agent": OSM_CONFIG["user_agent"]
            }) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("routes"):
                        route = data["routes"][0]
                        return {
                            "geometry": route.get("geometry"),
                            "distance_m": route.get("distance"),
                            "duration_s": route.get("duration"),
                            "waypoints": data.get("waypoints", [])
                        }
        
        # Fallback to simple nearest-neighbor if OSRM fails
        from core.geo_utils import optimize_route_stops
        return optimize_route_stops(destinations, origin_lat, origin_lon)
        
    except Exception as e:
        logger.error(f"Multi-destination optimization error: {e}")
        from core.geo_utils import optimize_route_stops
        return optimize_route_stops(destinations, origin_lat, origin_lon)


# ==================== GEOCODING SERVICE (Nominatim) ====================

async def forward_geocode_osm(
    query: str,
    country_codes: List[str] = None,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Forward geocoding using Nominatim (OSM)
    Alternative to Mapbox Geocoding API
    """
    try:
        params = {
            "q": query,
            "format": "json",
            "limit": limit,
            "addressdetails": 1,
            "namedetails": 1
        }
        
        if country_codes:
            params["countrycodes"] = ",".join(country_codes)
        
        url = OSM_CONFIG["nominatim_base_url"]
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers={
                "User-Agent": OSM_CONFIG["user_agent"]
            }) as response:
                if response.status == 200:
                    data = await response.json()
                    results = []
                    for feature in data:
                        results.append({
                            "latitude": float(feature.get("lat")),
                            "longitude": float(feature.get("lon")),
                            "display_name": feature.get("display_name"),
                            "address": feature.get("address", {}),
                            "boundingbox": feature.get("boundingbox")
                        })
                    return results
        
        logger.warning(f"Nominatim request failed: {response.status}")
        return []
        
    except Exception as e:
        logger.error(f"Nominatim geocoding error: {e}")
        return []


async def reverse_geocode_osm(
    lat: float,
    lon: float,
    language: str = "fr"
) -> Optional[Dict[str, Any]]:
    """
    Reverse geocoding using Nominatim
    Convert coordinates to address
    """
    try:
        params = {
            "lat": lat,
            "lon": lon,
            "format": "json",
            "accept-language": language,
            "addressdetails": 1
        }
        
        url = OSM_CONFIG["reverse_geocode_url"]
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params, headers={
                "User-Agent": OSM_CONFIG["user_agent"]
            }) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "display_name": data.get("display_name"),
                        "address": data.get("address", {}),
                        "latitude": lat,
                        "longitude": lon
                    }
        
        logger.warning(f"Nominatim reverse geocode failed: {response.status}")
        return None
        
    except Exception as e:
        logger.error(f"Nominatim reverse geocode error: {e}")
        return None


# ==================== TILE CACHING SYSTEM ====================

async def get_cached_tile(z: int, x: int, y: str) -> Optional[bytes]:
    """Get cached tile from MongoDB"""
    tile_key = f"{z}/{x}/{y}"
    cached = await db.map_tiles.find_one({"tile_key": tile_key}, {"_id": 0, "tile_data": 1, "expires_at": 1})
    
    if cached:
        # Check if tile is not expired
        if cached.get("expires_at", 0) > datetime.now(timezone.utc).timestamp():
            return cached.get("tile_data")
        else:
            # Remove expired tile
            await db.map_tiles.delete_one({"tile_key": tile_key})
    
    return None


async def cache_tile(z: int, x: int, y: str, tile_data: bytes, ttl_hours: int = 24):
    """Cache tile in MongoDB with TTL"""
    tile_key = f"{z}/{x}/{y}"
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=ttl_hours)).timestamp()
    
    await db.map_tiles.update_one(
        {"tile_key": tile_key},
        {
            "$set": {
                "tile_data": tile_data,
                "expires_at": expires_at,
                "cached_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )


async def fetch_tile_from_osm(z: int, x: int, y: str) -> Optional[bytes]:
    """Fetch tile from OSM tile server"""
    try:
        url = OSM_CONFIG["tile_server_url"].format(z=z, x=x, y=y)
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers={
                "User-Agent": OSM_CONFIG["user_agent"]
            }) as response:
                if response.status == 200:
                    tile_data = await response.read()
                    # Cache the tile
                    await cache_tile(z, x, y, tile_data)
                    return tile_data
                else:
                    logger.warning(f"Tile fetch failed: {response.status}")
                    return None
                    
    except Exception as e:
        logger.error(f"Tile fetch error: {e}")
        return None


async def get_tile(z: int, x: int, y: str, force_refresh: bool = False) -> Optional[bytes]:
    """Get tile with cache fallback"""
    if not force_refresh:
        cached = await get_cached_tile(z, x, y)
        if cached:
            return cached
    
    return await fetch_tile_from_osm(z, x, y)


# ==================== MAP DATA STORAGE ====================

async def store_location_data(
    location_id: str,
    lat: float,
    lon: float,
    address: str,
    metadata: Dict[str, Any] = None
):
    """Store location data in MongoDB for analytics and caching"""
    await db.locations.update_one(
        {"location_id": location_id},
        {
            "$set": {
                "latitude": lat,
                "longitude": lon,
                "address": address,
                "metadata": metadata or {},
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )


async def get_location_data(location_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve stored location data"""
    return await db.locations.find_one({"location_id": location_id}, {"_id": 0})


# ==================== BATCH GEOCODING ====================

async def batch_geocode(
    addresses: List[str],
    country_codes: List[str] = None
) -> List[Dict[str, Any]]:
    """
    Batch geocode multiple addresses with rate limiting
    Respects Nominatim's 1 request per second limit
    """
    results = []
    
    for i, address in enumerate(addresses):
        try:
            # Respect rate limiting
            if i > 0:
                await asyncio.sleep(1.1)  # 1.1s between requests
            
            geocoded = await forward_geocode_osm(address, country_codes, limit=1)
            if geocoded:
                results.append({
                    "query": address,
                    "result": geocoded[0],
                    "success": True
                })
            else:
                results.append({
                    "query": address,
                    "result": None,
                    "success": False
                })
                
        except Exception as e:
            logger.error(f"Batch geocode error for {address}: {e}")
            results.append({
                "query": address,
                "result": None,
                "success": False,
                "error": str(e)
            })
    
    return results


# ==================== TILE MANAGEMENT ====================

async def clear_expired_tiles():
    """Remove expired tiles from cache"""
    now = datetime.now(timezone.utc).timestamp()
    result = await db.map_tiles.delete_many({"expires_at": {"$lt": now}})
    logger.info(f"Cleared {result.deleted_count} expired tiles")
    return result.deleted_count


async def get_tile_cache_stats() -> Dict[str, Any]:
    """Get cache statistics"""
    total_tiles = await db.map_tiles.count_documents({})
    expired_tiles = await db.map_tiles.count_documents({
        "expires_at": {"$lt": datetime.now(timezone.utc).timestamp()}
    })
    
    return {
        "total_tiles": total_tiles,
        "expired_tiles": expired_tiles,
        "active_tiles": total_tiles - expired_tiles
    }