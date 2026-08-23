import { MAPBOX_ACCESS_TOKEN } from './mapboxLoader';
import { getOSRMDirections, createOSMStyle, shouldUseOSM, forwardGeocodeOSM, reverseGeocodeOSM } from './osmServices';

export const DEFAULT_MAP_CENTER = { latitude: 5.3599, longitude: -4.0083 };

// Configuration for map provider selection
export const MAP_CONFIG = {
  preferOSM: true, // Set to true to prefer OSM over Mapbox APIs
  useOSMForDirections: true, // Use OSRM instead of Mapbox Directions
  useOSMForGeocoding: true, // Use Nominatim instead of Mapbox Geocoding
  fallbackToMapbox: true, // Fallback to Mapbox if OSM fails
};

export const toLngLat = (location, fallback = DEFAULT_MAP_CENTER) => {
  const latitude = Number(location?.latitude ?? location?.lat ?? fallback.latitude);
  const longitude = Number(location?.longitude ?? location?.lng ?? fallback.longitude);

  return [longitude, latitude];
};

export const createMarkerElement = (color = '#2563eb', label = '', size = 'normal', pulse = false, icon = null) => {
  const el = document.createElement('div');
  el.className = 'mapbox-custom-marker';
  el.title = label;
  
  const sizeMap = {
    normal: { width: '40px', height: '40px' },
    large: { width: '48px', height: '48px' },
    small: { width: '32px', height: '32px' }
  };
  
  const sizeStyles = sizeMap[size] || sizeMap.normal;
  el.style.width = sizeStyles.width;
  el.style.height = sizeStyles.height;
  el.style.borderRadius = '9999px';
  el.style.background = color;
  el.style.border = '3px solid #fff';
  el.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.28)';
  el.style.cursor = 'pointer';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.fontSize = '20px';
  el.style.color = '#fff';
  el.style.fontWeight = 'bold';
  
  // Add icon if provided
  if (icon) {
    el.innerHTML = icon;
  }
  
  if (pulse) {
    el.style.animation = 'pulse 2s infinite';
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  return el;
};

// Vehicle icons for different delivery types
export const VEHICLE_ICONS = {
  moto: '🏍️',
  voiture: '🚗',
  velo: '🚲',
  default: '📦'
};

// Create custom marker for driver based on vehicle type
export const createDriverMarker = (vehicleType = 'default', size = 'normal', pulse = true) => {
  const icon = VEHICLE_ICONS[vehicleType] || VEHICLE_ICONS.default;
  const color = '#3b82f6'; // Blue for drivers
  
  console.log('🗺️ [MARKER] Creating driver marker:', { vehicleType, icon, size, pulse });
  
  return createMarkerElement(color, `Livreur (${vehicleType})`, size, pulse, icon);
};

// Create custom marker for customer
export const createCustomerMarker = (size = 'normal', pulse = false) => {
  const icon = '👤'; // Person icon for customer
  const color = '#ef4444'; // Red for customer
  
  return createMarkerElement(color, 'Client', size, pulse, icon);
};

export const upsertMarker = (mapboxgl, map, markerRef, location, options = {}) => {
  if (!map || !location) return null;

  const marker = markerRef.current;
  const lngLat = toLngLat(location);

  if (marker) {
    marker.setLngLat(lngLat);
    return marker;
  }

  // Use custom element if provided, otherwise create default
  const element = options.element || createMarkerElement(options.color, options.title, options.size, options.pulse);

  markerRef.current = new mapboxgl.Marker({
    element: element,
    draggable: Boolean(options.draggable),
  })
    .setLngLat(lngLat)
    .addTo(map);

  if (options.onDragEnd) {
    markerRef.current.on('dragend', () => {
      const next = markerRef.current.getLngLat();
      options.onDragEnd({ latitude: next.lat, longitude: next.lng });
    });
  }

  return markerRef.current;
};

export const fitToLocations = (mapboxgl, map, locations, padding = 60) => {
  const valid = locations.filter((location) => (
    Number.isFinite(Number(location?.latitude ?? location?.lat)) &&
    Number.isFinite(Number(location?.longitude ?? location?.lng))
  ));
  if (!map || valid.length === 0) return;

  const bounds = valid.reduce((acc, location) => acc.extend(toLngLat(location)), new mapboxgl.LngLatBounds(toLngLat(valid[0]), toLngLat(valid[0])));
  map.fitBounds(bounds, { padding, maxZoom: 15, duration: 600 });
};

export const setRouteLine = async (map, sourceId, from, to, color = '#4f46e5') => {
  console.log('🗺️ [ROUTE] setRouteLine called:', { sourceId, from, to, color });
  
  if (!map || !from || !to) {
    console.warn('🗺️ [ROUTE] Missing required parameters:', { map: !!map, from: !!from, to: !!to });
    return;
  }

  // Wait for map to be ready
  if (!map.isStyleLoaded()) {
    console.log('🗺️ [ROUTE] Map style not loaded, waiting...');
    if (map.loaded()) {
      // Map is loaded but style might not be ready
      await new Promise(resolve => map.once('styledata', resolve));
    } else {
      console.log('🗺️ [ROUTE] Map not loaded, waiting for load event');
      map.once('load', () => setRouteLine(map, sourceId, from, to, color));
      return;
    }
  }

  const fromLngLat = toLngLat(from);
  const toLngLatValue = toLngLat(to);
  console.log('🗺️ [ROUTE] Coordinates:', { fromLngLat, toLngLatValue });
  
  let geometry = {
    type: 'LineString',
    coordinates: [fromLngLat, toLngLatValue],
  };

  try {
    // Try OSRM first if configured
    if (MAP_CONFIG.useOSMForDirections) {
      console.log('🗺️ [ROUTE] Using OSRM for directions');
      const osrmResult = await getOSRMDirections(
        from.latitude, from.longitude,
        to.latitude, to.longitude
      );
      
      if (osrmResult.geometry && !osrmResult.error) {
        geometry = osrmResult.geometry;
        console.log('🗺️ [ROUTE] Using OSRM route:', { distance: osrmResult.distance_m, duration: osrmResult.duration_s });
      } else if (MAP_CONFIG.fallbackToMapbox && MAPBOX_ACCESS_TOKEN) {
        // Fallback to Mapbox Directions
        console.log('🗺️ [ROUTE] OSRM failed, falling back to Mapbox Directions');
        const coords = `${fromLngLat[0]},${fromLngLat[1]};${toLngLatValue[0]},${toLngLatValue[1]}`;
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data?.routes?.[0]?.geometry) {
          geometry = data.routes[0].geometry;
          console.log('🗺️ [ROUTE] Using Mapbox route');
        }
      }
    } else if (MAPBOX_ACCESS_TOKEN) {
      // Use Mapbox Directions directly
      console.log('🗺️ [ROUTE] Using Mapbox Directions directly');
      const coords = `${fromLngLat[0]},${fromLngLat[1]};${toLngLatValue[0]},${toLngLatValue[1]}`;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data?.routes?.[0]?.geometry) {
        geometry = data.routes[0].geometry;
        console.log('🗺️ [ROUTE] Using Mapbox route');
      }
    }
  } catch (error) {
    console.error('🗺️ [ROUTE] Route calculation error:', error);
    // Keep the straight fallback line if route lookup fails.
  }

  const feature = {
    type: 'Feature',
    geometry,
    properties: {},
  };

  console.log('🗺️ [ROUTE] Final geometry:', geometry);

  // Check if map is properly initialized
  if (!map || !map.getStyle) {
    console.warn('🗺️ [ROUTE] Map not initialized, skipping route draw');
    return;
  }

  try {
    // Always remove existing layer and source first to prevent conflicts
    if (map.getLayer(sourceId)) {
      console.log('🗺️ [ROUTE] Removing existing layer');
      map.removeLayer(sourceId);
    }
    if (map.getSource(sourceId)) {
      console.log('🗺️ [ROUTE] Removing existing source');
      map.removeSource(sourceId);
    }

    console.log('🗺️ [ROUTE] Creating new source and layer');

    map.addSource(sourceId, { type: 'geojson', data: feature });
    map.addLayer({
      id: sourceId,
      type: 'line',
      source: sourceId,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': color,
        'line-width': 4,
        'line-opacity': 0.9,
      },
    });
    console.log('🗺️ [ROUTE] Route layer added successfully');
  } catch (error) {
    console.error('🗺️ [ROUTE] Error adding route to map:', error);
  }
};

export const reverseGeocodeMapbox = async (latitude, longitude) => {
  try {
    // Try OSM first if configured
    if (MAP_CONFIG.useOSMForGeocoding) {
      const osmResult = await reverseGeocodeOSM(latitude, longitude);
      if (osmResult && osmResult.display_name) {
        return osmResult.display_name;
      }
    }
    
    // Fallback to Mapbox if configured
    if (MAP_CONFIG.fallbackToMapbox && MAPBOX_ACCESS_TOKEN) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?language=fr&limit=1&access_token=${MAPBOX_ACCESS_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();
      return data?.features?.[0]?.place_name || '';
    }
    
    return '';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return '';
  }
};

export const forwardGeocodeMapbox = async (query) => {
  const safeQuery = String(query || '').trim();
  if (!safeQuery) return null;

  try {
    // Try OSM first if configured
    if (MAP_CONFIG.useOSMForGeocoding) {
      const osmResults = await forwardGeocodeOSM(safeQuery, ['ci', 'sn', 'ng', 'cm', 'gh'], 1);
      if (osmResults.length > 0) {
        const result = osmResults[0];
        return {
          latitude: result.latitude,
          longitude: result.longitude,
          address: result.display_name,
        };
      }
    }
    
    // Fallback to Mapbox if configured
    if (MAP_CONFIG.fallbackToMapbox && MAPBOX_ACCESS_TOKEN) {
      const encoded = encodeURIComponent(safeQuery);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?language=fr&limit=1&country=ci,sn,ng,cm,gh&access_token=${MAPBOX_ACCESS_TOKEN}`;
      const response = await fetch(url);
      const data = await response.json();
      const feature = data?.features?.[0];
      if (!feature?.center) return null;

      return {
        latitude: feature.center[1],
        longitude: feature.center[0],
        address: feature.place_name,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Forward geocoding error:', error);
    return null;
  }
};
