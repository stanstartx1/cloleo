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
    batch_geocode
)

router = APIRouter(prefix="/osm", tags=["OpenStreetMap Services"])


# ==================== MODELS ====================

class GeocodeRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=200)
    country_codes: Optional[List[str]] = Field(None, max_items=5)
    limit: int = Field(5, ge=1, le=10)


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
        raise HTTPException(status_code=500, detail=str(e))


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
            raise HTTPException(status_code=404, detail="Address not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=500, detail=str(e))


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
            raise HTTPException(status_code=500, detail=result["error"])
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=500, detail=str(e))


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
            raise HTTPException(status_code=404, detail="Tile not found")
            
        from fastapi.responses import Response
        return Response(content=tile_data, media_type="image/png")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== CACHE MANAGEMENT ====================

@router.post("/cache/clear-expired")
async def clear_expired_tiles_endpoint():
    """Clear expired tiles from cache"""
    try:
        deleted_count = await clear_expired_tiles()
        return {"deleted": deleted_count, "message": f"Cleared {deleted_count} expired tiles"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cache/stats")
async def get_cache_stats():
    """Get tile cache statistics"""
    try:
        stats = await get_tile_cache_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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