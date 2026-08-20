"""OpenStreetMap API Routes"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel, Field

from core.osm_services import (
    get_osrm_directions,
    optimize_multi_destinations,
    forward_geocode_osm,
    reverse_geocode_osm,
    get_tile,
    clear_expired_tiles,
    get_tile_cache_stats,
    batch_geocode,
    nominatim_limiter,
    osrm_limiter,
    tile_limiter
)
from core.database import db

router = APIRouter(prefix="/osm", tags=["OpenStreetMap Services"])


# ==================== MODELS ====================

class GeocodeRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=200)
    country_codes: Optional[List[str]] = Field(None, max_items=5)
    limit: int = Field(5, ge=1, le=10)


class AutocompleteRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=200)
    country_codes: Optional[List[str]] = Field(None, max_items=5)
    limit: int = Field(8, ge=1, le=15)


class ReverseGeocodeRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    language: str = Field("fr", max_length=5)


class DirectionsRequest(BaseModel):
    origin_lat: float = Field(..., ge=-90, le=90)
    origin_lon: float = Field(..., ge=-180, le=180)
    dest_lat: float = Field(..., ge=-90, le=90)
    dest_lon: float = Field(..., ge=-180, le=180)
    alternatives: bool = False


class MultiDestinationRequest(BaseModel):
    origin_lat: float = Field(..., ge=-90, le=90)
    origin_lon: float = Field(..., ge=-180, le=180)
    destinations: List[dict] = Field(..., min_items=1, max_items=20)


class BatchGeocodeRequest(BaseModel):
    addresses: List[str] = Field(..., min_items=1, max_items=50)
    country_codes: Optional[List[str]] = Field(None, max_items=5)


# ==================== GEOCODING ENDPOINTS ====================

@router.post("/geocode")
async def forward_geocode(request: GeocodeRequest):
    """
    Forward geocoding using OpenStreetMap Nominatim
    Convert address to coordinates
    """
    try:
        results = await forward_geocode_osm(
            request.query,
            request.country_codes,
            request.limit
        )
        return {"results": results, "count": len(results)}
    except Exception as e:
        return {
            "error": str(e),
            "results": [],
            "count": 0
        }


@router.post("/autocomplete")
async def address_autocomplete(request: AutocompleteRequest):
    """
    Address autocomplete optimized for form input
    Returns formatted suggestions for address completion
    """
    try:
        # Use existing geocoding with autocomplete-specific parameters
        results = await forward_geocode_osm(
            request.query,
            request.country_codes,
            request.limit
        )
        
        # Format results for autocomplete UI
        formatted_results = []
        for result in results:
            formatted_results.append({
                "display_name": result.get("display_name", ""),
                "formatted_address": _format_address_for_autocomplete(result),
                "latitude": result.get("latitude"),
                "longitude": result.get("longitude"),
                "address_components": result.get("address", {}),
                "type": _get_location_type(result),
                "confidence": _calculate_confidence(result, request.query)
            })
        
        # Sort by confidence and relevance
        formatted_results.sort(key=lambda x: x["confidence"], reverse=True)
        
        return {"suggestions": formatted_results, "count": len(formatted_results)}
    except Exception as e:
        return {
            "error": str(e),
            "suggestions": [],
            "count": 0
        }


def _format_address_for_autocomplete(result: dict) -> str:
    """Format address for autocomplete display"""
    address = result.get("address", {})
    parts = []
    
    # Priority: street number, street name, suburb, city
    if address.get("house_number"):
        parts.append(address["house_number"])
    if address.get("road"):
        parts.append(address["road"])
    if address.get("suburb"):
        parts.append(address["suburb"])
    if address.get("city") or address.get("town"):
        parts.append(address.get("city") or address.get("town"))
    
    return ", ".join(parts) if parts else result.get("display_name", "")


def _get_location_type(result: dict) -> str:
    """Determine location type for icon/filtering"""
    address = result.get("address", {})
    
    if address.get("house_number") and address.get("road"):
        return "address"
    elif address.get("road"):
        return "street"
    elif address.get("suburb") or address.get("neighbourhood"):
        return "neighborhood"
    elif address.get("city") or address.get("town"):
        return "city"
    else:
        return "place"


def _calculate_confidence(result: dict, query: str) -> float:
    """Calculate confidence score for result ranking"""
    address = result.get("address", {})
    display_name = result.get("display_name", "").lower()
    query_lower = query.lower()
    
    score = 0.0
    
    # Exact match bonus
    if query_lower in display_name:
        score += 0.5
        # Higher bonus if it starts with query
        if display_name.startswith(query_lower):
            score += 0.3
    
    # Address components bonus
    if address.get("house_number"):
        score += 0.2  # Specific addresses are better
    if address.get("road"):
        score += 0.1
    if address.get("city"):
        score += 0.05
    
    # Length penalty (shorter, more specific is better)
    score -= min(len(display_name) / 500, 0.1)
    
    return max(0.0, min(1.0, score))


@router.post("/reverse-geocode")
async def reverse_geocode(request: ReverseGeocodeRequest):
    """
    Reverse geocoding using OpenStreetMap Nominatim
    Convert coordinates to address
    """
    try:
        result = await reverse_geocode_osm(
            request.latitude,
            request.longitude,
            request.language
        )
        if not result:
            return {
                "error": "Address not found",
                "display_name": "",
                "address": {}
            }
        return result
    except Exception as e:
        return {
            "error": str(e),
            "display_name": "",
            "address": {}
        }


@router.post("/batch-geocode")
async def batch_geocode_endpoint(request: BatchGeocodeRequest):
    """
    Batch geocode multiple addresses with rate limiting
    """
    try:
        results = await batch_geocode(
            request.addresses,
            request.country_codes
        )
        return {"results": results, "total": len(results)}
    except Exception as e:
        return {
            "error": str(e),
            "results": [],
            "total": 0
        }


# ==================== DIRECTIONS ENDPOINTS ====================

@router.post("/directions")
async def get_directions(request: DirectionsRequest):
    """
    Get route directions using OSRM (Open Source Routing Machine)
    Returns route geometry, distance, and duration
    """
    try:
        result = await get_osrm_directions(
            request.origin_lat,
            request.origin_lon,
            request.dest_lat,
            request.dest_lon,
            request.alternatives
        )
        
        if "error" in result:
            # Return the error gracefully instead of 500
            return {
                "error": result["error"],
                "geometry": result.get("geometry"),
                "distance_m": 0,
                "duration_s": 0,
                "steps": []
            }
            
        return result
    except Exception as e:
        # Return error gracefully instead of 500
        return {
            "error": str(e),
            "geometry": None,
            "distance_m": 0,
            "duration_s": 0,
            "steps": []
        }


@router.post("/optimize-route")
async def optimize_route(request: MultiDestinationRequest):
    """
    Optimize route for multiple destinations
    Returns optimized order and total route geometry
    """
    try:
        result = await optimize_multi_destinations(
            request.origin_lat,
            request.origin_lon,
            request.destinations
        )
        return result
    except Exception as e:
        # Return error gracefully instead of 500
        return {
            "error": str(e),
            "optimized_order": [],
            "total_distance_m": 0,
            "total_duration_s": 0
        }


# ==================== TILE ENDPOINTS ====================

@router.get("/tile/{z}/{x}/{y}")
async def get_map_tile(z: int, x: int, y: str, force_refresh: bool = False):
    """
    Get map tile from OSM with caching
    Returns tile image data
    """
    try:
        tile_data = await get_tile(z, x, y, force_refresh)
        
        if not tile_data:
            from fastapi.responses import Response
            return Response(content=b"", media_type="image/png", status_code=404)
            
        from fastapi.responses import Response
        return Response(content=tile_data, media_type="image/png")
        
    except Exception as e:
        from fastapi.responses import Response
        return Response(content=b"", media_type="image/png", status_code=500)


# ==================== CACHE MANAGEMENT ====================

@router.post("/cache/clear-expired")
async def clear_expired_tiles_endpoint():
    """Clear expired tiles from cache"""
    try:
        deleted_count = await clear_expired_tiles()
        return {"deleted": deleted_count, "message": f"Cleared {deleted_count} expired tiles"}
    except Exception as e:
        return {"error": str(e), "deleted": 0, "message": "Failed to clear expired tiles"}


@router.get("/cache/stats")
async def get_cache_stats():
    """Get tile cache statistics"""
    try:
        stats = await get_tile_cache_stats()
        return stats
    except Exception as e:
        return {"error": str(e), "total_tiles": 0, "cache_size_mb": 0}


# ==================== MONITORING ENDPOINTS ====================

@router.get("/monitoring/rate-limits")
async def get_rate_limit_stats():
    """Get rate limiting statistics for monitoring"""
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    
    def get_active_calls(limiter):
        """Count calls within the current time window"""
        return len([call_time for call_time in limiter.calls 
                    if (now - call_time) < timedelta(seconds=limiter.time_window)])
    
    return {
        "nominatim": {
            "max_calls_per_second": nominatim_limiter.max_calls,
            "active_calls": get_active_calls(nominatim_limiter),
            "total_calls_buffered": len(nominatim_limiter.calls),
            "time_window_seconds": nominatim_limiter.time_window,
            "utilization_percent": round(get_active_calls(nominatim_limiter) / nominatim_limiter.max_calls * 100, 1) if nominatim_limiter.max_calls > 0 else 0
        },
        "osrm": {
            "max_calls_per_second": osrm_limiter.max_calls,
            "active_calls": get_active_calls(osrm_limiter),
            "total_calls_buffered": len(osrm_limiter.calls),
            "time_window_seconds": osrm_limiter.time_window,
            "utilization_percent": round(get_active_calls(osrm_limiter) / osrm_limiter.max_calls * 100, 1) if osrm_limiter.max_calls > 0 else 0
        },
        "tile_server": {
            "max_calls_per_second": tile_limiter.max_calls,
            "active_calls": get_active_calls(tile_limiter),
            "total_calls_buffered": len(tile_limiter.calls),
            "time_window_seconds": tile_limiter.time_window,
            "utilization_percent": round(get_active_calls(tile_limiter) / tile_limiter.max_calls * 100, 1) if tile_limiter.max_calls > 0 else 0
        }
    }


@router.get("/monitoring/cache-stats")
async def get_cache_statistics():
    """Get comprehensive cache statistics for monitoring"""
    from datetime import datetime, timezone
    
    try:
        # Geocoding cache stats
        geocoding_total = await db.geocoding_cache.count_documents({})
        geocoding_expired = await db.geocoding_cache.count_documents({
            "expires_at": {"$lt": datetime.now(timezone.utc).timestamp()}
        })
        geocoding_active = geocoding_total - geocoding_expired
        
        # Tile cache stats
        tile_total = await db.map_tiles.count_documents({})
        tile_expired = await db.map_tiles.count_documents({
            "expires_at": {"$lt": datetime.now(timezone.utc).timestamp()}
        })
        tile_active = tile_total - tile_expired
        
        return {
            "geocoding_cache": {
                "total_entries": geocoding_total,
                "active_entries": geocoding_active,
                "expired_entries": geocoding_expired,
                "hit_rate": "cache_hit_rate_not_implemented"  # Could be enhanced with hit counter
            },
            "tile_cache": {
                "total_entries": tile_total,
                "active_entries": tile_active,
                "expired_entries": tile_expired
            },
            "collections": {
                "geocoding_cache_exists": await db.geocoding_cache.count_documents({}) >= 0,
                "map_tiles_exists": await db.map_tiles.count_documents({}) >= 0
            }
        }
    except Exception as e:
        return {
            "error": str(e),
            "geocoding": {"total": 0, "expired": 0, "utilization_percent": 0},
            "tiles": {"total": 0, "expired": 0, "utilization_percent": 0},
            "collections": {"geocoding_cache_exists": False, "map_tiles_exists": False}
        }


# ==================== HEALTH CHECK ====================

@router.get("/health")
async def health_check():
    """Check OSM services health"""
    health_status = {
        "osrm": "unknown",
        "nominatim": "unknown",
        "tile_server": "unknown"
    }
    
    try:
        # Test OSRM
        result = await get_osrm_directions(5.3599, -4.0083, 5.3699, -4.0183)
        health_status["osrm"] = "healthy" if "error" not in result else "unhealthy"
    except:
        health_status["osrm"] = "unhealthy"
    
    try:
        # Test Nominatim
        result = await forward_geocode_osm("Abidjan", limit=1)
        health_status["nominatim"] = "healthy" if result else "unhealthy"
    except:
        health_status["nominatim"] = "unhealthy"
    
    try:
        # Test tile server
        tile_data = await get_tile(10, 500, "350")
        health_status["tile_server"] = "healthy" if tile_data else "unhealthy"
    except:
        health_status["tile_server"] = "unhealthy"
    
    overall = "healthy" if all(status == "healthy" for status in health_status.values()) else "degraded"
    
    return {
        "status": overall,
        "services": health_status
    }