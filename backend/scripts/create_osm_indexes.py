"""Create MongoDB indexes for OSM services"""
from core.database import db
import asyncio

async def create_osm_indexes():
    """Create indexes for OSM-related collections"""
    
    # Map tiles cache indexes
    await db.map_tiles.create_index([("tile_key", 1)], unique=True)
    await db.map_tiles.create_index([("expires_at", 1)])
    await db.map_tiles.create_index([("cached_at", -1)])
    
    # Locations data indexes
    await db.locations.create_index([("location_id", 1)], unique=True)
    await db.locations.create_index([("latitude", 1), ("longitude", 1)])
    await db.locations.create_index([("address", "text")])
    
    # Geocoding cache indexes
    await db.geocoding_cache.create_index([("cache_key", 1)], unique=True)
    await db.geocoding_cache.create_index([("expires_at", 1)])
    await db.geocoding_cache.create_index([("cached_at", -1)])
    await db.geocoding_cache.create_index([("query", "text")])
    await db.geocoding_cache.create_index([("country", 1)])
    
    # Create collection if not exists
    try:
        await db.map_tiles.insert_one({"_test": True})
        await db.map_tiles.delete_one({"_test": True})
    except:
        pass
    
    try:
        await db.locations.insert_one({"_test": True})
        await db.locations.delete_one({"_test": True})
    except:
        pass
    
    try:
        await db.geocoding_cache.insert_one({"_test": True})
        await db.geocoding_cache.delete_one({"_test": True})
    except:
        pass
    
    print("✅ OSM indexes created successfully")
    print("   - map_tiles: tile_key (unique), expires_at, cached_at")
    print("   - locations: location_id (unique), location, address")
    print("   - geocoding_cache: cache_key (unique), expires_at, cached_at, query, country")

if __name__ == "__main__":
    asyncio.run(create_osm_indexes())