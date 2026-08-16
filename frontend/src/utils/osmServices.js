/**
 * OpenStreetMap Services for Frontend
 * Integrates OSM APIs with Mapbox GL JS for rendering
 */

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// ==================== GEOCODING ====================

export const addressAutocomplete = async (query, countryCodes = ['ci'], limit = 8) => {
  try {
    const response = await fetch(`${API_BASE}/api/osm/autocomplete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        country_codes: countryCodes,
        limit
      })
    });

    if (!response.ok) throw new Error('Autocomplete failed');
    
    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error('OSM autocomplete error:', error);
    return [];
  }
};

export const forwardGeocodeOSM = async (query, countryCodes = [], limit = 5) => {
  try {
    const params = new URLSearchParams({
      query,
      country_codes: countryCodes.join(','),
      limit: limit.toString()
    });

    const response = await fetch(`${API_BASE}/api/osm/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        country_codes: countryCodes,
        limit
      })
    });

    if (!response.ok) throw new Error('Geocoding failed');
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('OSM geocoding error:', error);
    return [];
  }
};

export const reverseGeocodeOSM = async (latitude, longitude, language = 'fr') => {
  try {
    const response = await fetch(`${API_BASE}/api/osm/reverse-geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude,
        longitude,
        language
      })
    });

    if (!response.ok) throw new Error('Reverse geocoding failed');
    
    return await response.json();
  } catch (error) {
    console.error('OSM reverse geocoding error:', error);
    return null;
  }
};

export const batchGeocodeOSM = async (addresses, countryCodes = []) => {
  try {
    const response = await fetch(`${API_BASE}/api/osm/batch-geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addresses,
        country_codes: countryCodes
      })
    });

    if (!response.ok) throw new Error('Batch geocoding failed');
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('OSM batch geocoding error:', error);
    return [];
  }
};

// ==================== DIRECTIONS ====================

export const getOSRMDirections = async (originLat, originLon, destLat, destLon, alternatives = false) => {
  try {
    const response = await fetch(`${API_BASE}/api/osm/directions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin_lat: originLat,
        origin_lon: originLon,
        dest_lat: destLat,
        dest_lon: destLon,
        alternatives
      })
    });

    if (!response.ok) throw new Error('Directions failed');
    
    return await response.json();
  } catch (error) {
    console.error('OSRM directions error:', error);
    return { error: error.message };
  }
};

export const optimizeMultiDestinations = async (originLat, originLon, destinations) => {
  try {
    const response = await fetch(`${API_BASE}/api/osm/optimize-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin_lat: originLat,
        origin_lon: originLon,
        destinations
      })
    });

    if (!response.ok) throw new Error('Route optimization failed');
    
    return await response.json();
  } catch (error) {
    console.error('OSRM optimization error:', error);
    return { error: error.message };
  }
};

// ==================== MAP INTEGRATION ====================

export const createOSMStyle = (mapType = 'roadmap') => {
  /**
   * Create Mapbox GL JS style using OSM tiles
   * Alternative to Mapbox hosted styles
   */
  const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  
  return {
    version: 8,
    name: 'OSM Standard',
    sources: {
      'osm-tiles': {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [
      {
        id: 'osm-tiles',
        type: 'raster',
        source: 'osm-tiles',
        minzoom: 0,
        maxzoom: 19
      }
    ]
  };
};

export const createOSMStyleWithLabels = () => {
  /**
   * Enhanced OSM style with labels using Mapbox plugins
   */
  return {
    ...createOSMStyle(),
    layers: [
      ...createOSMStyle().layers,
      {
        id: 'osm-labels',
        type: 'symbol',
        source: 'osm-tiles',
        layout: {
          'text-field': '{name}',
          'text-size': 12,
          'text-anchor': 'center'
        },
        paint: {
          'text-color': '#333333',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        }
      }
    ]
  };
};

export const setOSMTiles = (map, style = 'standard') => {
  /**
   * Replace Mapbox tiles with OSM tiles in existing Mapbox map
   */
  try {
    const osmStyle = style === 'labels' ? createOSMStyleWithLabels() : createOSMStyle();
    map.setStyle(osmStyle);
    return true;
  } catch (error) {
    console.error('Failed to set OSM tiles:', error);
    return false;
  }
};

// ==================== HYBRID APPROACH ====================

export const createHybridStyle = (mapboxAccessToken) => {
  /**
   * Hybrid style: Use Mapbox for satellite and OSM for standard
   * Requires Mapbox access token for satellite layers
   */
  if (!mapboxAccessToken) {
    return createOSMStyle();
  }

  return {
    version: 8,
    name: 'Hybrid OSM/Mapbox',
    sources: {
      'osm-tiles': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256
      },
      'mapbox-satellite': {
        type: 'raster',
        url: `mapbox://styles/mapbox/satellite-v9`,
        tileSize: 256
      }
    },
    layers: [
      {
        id: 'osm-tiles',
        type: 'raster',
        source: 'osm-tiles',
        minzoom: 0,
        maxzoom: 19
      },
      {
        id: 'mapbox-satellite',
        type: 'raster',
        source: 'mapbox-satellite',
        minzoom: 0,
        maxzoom: 19,
        layout: { visibility: 'none' }
      }
    ]
  };
};

// ==================== ROUTE RENDERING ====================

export const renderOSRMRoute = async (map, sourceId, from, to, color = '#4f46e5') => {
  /**
   * Render OSRM route on Mapbox map
   * Alternative to Mapbox Directions API
   */
  try {
    const routeData = await getOSRMDirections(
      from.latitude, from.longitude,
      to.latitude, to.longitude
    );

    if (routeData.error) {
      console.error('OSRM route error:', routeData.error);
      return false;
    }

    const geometry = routeData.geometry || {
      type: 'LineString',
      coordinates: [
        [from.longitude, from.latitude],
        [to.longitude, to.latitude]
      ]
    };

    const feature = {
      type: 'Feature',
      geometry,
      properties: {
        distance_m: routeData.distance_m,
        duration_s: routeData.duration_s
      }
    };

    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(feature);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: feature });
      map.addLayer({
        id: sourceId,
        type: 'line',
        source: sourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': color,
          'line-width': 4,
          'line-opacity': 0.9
        }
      });
    }

    return true;
  } catch (error) {
    console.error('Failed to render OSRM route:', error);
    return false;
  }
};

// ==================== CACHE MANAGEMENT ====================

export const getTileCacheStats = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/osm/cache/stats`);
    if (!response.ok) throw new Error('Failed to get cache stats');
    return await response.json();
  } catch (error) {
    console.error('Cache stats error:', error);
    return null;
  }
};

export const clearExpiredTiles = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/osm/cache/clear-expired`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to clear tiles');
    return await response.json();
  } catch (error) {
    console.error('Clear tiles error:', error);
    return null;
  }
};

// ==================== HEALTH CHECK ====================

export const checkOSMHealth = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/osm/health`);
    if (!response.ok) throw new Error('Health check failed');
    return await response.json();
  } catch (error) {
    console.error('OSM health check error:', error);
    return { status: 'unhealthy', services: {} };
  }
};

// ==================== UTILITIES ====================

export const getMapStyleByType = (mapType, useOSM = true, mapboxToken = null) => {
  /**
   * Get appropriate map style based on type and provider preference
   */
  if (!useOSM && mapboxToken) {
    // Use Mapbox styles (existing implementation)
    if (mapType === 'satellite' || mapType === 'hybrid') {
      return 'mapbox://styles/mapbox/satellite-streets-v12';
    }
    if (mapType === 'terrain') {
      return 'mapbox://styles/mapbox/outdoors-v12';
    }
    return 'mapbox://styles/mapbox/streets-v12';
  }

  // Use OSM styles
  if (mapType === 'labels') {
    return createOSMStyleWithLabels();
  }
  return createOSMStyle();
};

export const shouldUseOSM = (mapType = 'roadmap') => {
  /**
   * Determine if OSM should be used for this map type
   * OSM is recommended for standard/satellite to save costs
   */
  const osmPreferredTypes = ['roadmap', 'terrain', 'hybrid'];
  return osmPreferredTypes.includes(mapType);
};

export const switchMapProvider = (map, toOSM = true, mapType = 'roadmap', mapboxToken = null) => {
  /**
   * Switch between Mapbox and OSM tiles dynamically
   */
  try {
    if (toOSM) {
      const osmStyle = getMapStyleByType(mapType, true);
      map.setStyle(osmStyle);
    } else if (mapboxToken) {
      const mapboxStyle = getMapStyleByType(mapType, false, mapboxToken);
      map.setStyle(mapboxStyle);
    }
    return true;
  } catch (error) {
    console.error('Failed to switch map provider:', error);
    return false;
  }
};