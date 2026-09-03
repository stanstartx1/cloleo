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
  moto: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%;"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/><path d="m5.25 4-2.75 3.5-2 4"/><path d="m18.75 4 2.75 3.5 2 4"/><path d="M3 12h18"/><path d="M11 5h2"/></svg>`,
  voiture: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%;"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-2.7-.6-4.5-1.1c-.8-.2-1.5-1-1.5-1.9V3c0-.6-.4-1-1-1H6c-.6 0-1 .4-1 1v2c0 .9-.7 1.7-1.5 1.9C1.3 7.4 1.6 7.7 1.6 7.7l1.4 2.3c.6 1 .7 2.2.2 3.2-.5 1-.5 2.2 0 3.2l.7 1.4c.3.6.9 1 1.6 1h2.5"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>`,
  velo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%;"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/><path d="M12 19V9"/><path d="M5 12h2l1-2 4 4 4-4h2"/></svg>`,
  default: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%;"><path d="M3 3h18v18H3z"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>`
};

// Create custom marker for driver based on vehicle type
export const createDriverMarker = (vehicleType = 'default', size = 'normal', pulse = true) => {
  const icon = VEHICLE_ICONS[vehicleType] || VEHICLE_ICONS.default;
  const color = '#3b82f6'; // Blue for drivers
  
  console.log('🗺️ [MARKER] Creating driver marker:', { vehicleType, icon, size, pulse });
  
  const el = document.createElement('div');
  el.className = 'mapbox-custom-marker';
  el.title = `Livreur (${vehicleType})`;
  
  const sizeMap = {
    normal: { width: '56px', height: '56px' },
    large: { width: '64px', height: '64px' },
    small: { width: '48px', height: '48px' }
  };
  
  const sizeStyles = sizeMap[size] || sizeMap.normal;
  el.style.width = sizeStyles.width;
  el.style.height = sizeStyles.height;
  el.style.borderRadius = '50%';
  el.style.background = color;
  el.style.border = '4px solid #fff';
  el.style.boxShadow = '0 12px 28px rgba(59, 130, 246, 0.5)';
  el.style.cursor = 'pointer';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.position = 'relative';
  el.style.pointerEvents = 'auto';
  el.style.zIndex = '9999'; // Ensure marker is on top
  
  // Add SVG icon
  el.innerHTML = `
    <div style="color: white; width: 65%; height: 65%; display: flex; align-items: center; justify-content: center;">
      ${icon}
    </div>
  `;
  
  // Add pulse animation
  if (pulse) {
    el.style.animation = 'pulse 2s infinite';
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); box-shadow: 0 12px 28px rgba(59, 130, 246, 0.5); }
        50% { transform: scale(1.15); box-shadow: 0 18px 36px rgba(59, 130, 246, 0.7); }
        100% { transform: scale(1); box-shadow: 0 12px 28px rgba(59, 130, 246, 0.5); }
      }
    `;
    document.head.appendChild(style);
  }
  
  return el;
};

// Create custom marker for customer
export const createCustomerMarker = (size = 'normal', pulse = false) => {
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:100%;height:100%;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const color = '#ef4444'; // Red for customer
  
  const el = document.createElement('div');
  el.className = 'mapbox-custom-marker';
  el.title = 'Client';
  
  const sizeMap = {
    normal: { width: '48px', height: '48px' },
    large: { width: '56px', height: '56px' },
    small: { width: '40px', height: '40px' }
  };
  
  const sizeStyles = sizeMap[size] || sizeMap.normal;
  el.style.width = sizeStyles.width;
  el.style.height = sizeStyles.height;
  el.style.borderRadius = '50%';
  el.style.background = color;
  el.style.border = '3px solid #fff';
  el.style.boxShadow = '0 10px 24px rgba(239, 68, 68, 0.4)';
  el.style.cursor = 'pointer';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.position = 'relative';
  el.style.pointerEvents = 'auto';
  el.style.zIndex = '9998';
  
  // Add SVG icon
  el.innerHTML = `
    <div style="color: white; width: 65%; height: 65%; display: flex; align-items: center; justify-content: center;">
      ${icon}
    </div>
  `;
  
  // Add pulse animation if requested
  if (pulse) {
    el.style.animation = 'pulse 2s infinite';
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); box-shadow: 0 10px 24px rgba(239, 68, 68, 0.4); }
        50% { transform: scale(1.1); box-shadow: 0 15px 30px rgba(239, 68, 68, 0.6); }
        100% { transform: scale(1); box-shadow: 0 10px 24px rgba(239, 68, 68, 0.4); }
      }
    `;
    document.head.appendChild(style);
  }
  
  return el;
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
    anchor: 'center' // Ensure marker is centered on the location
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
    if (map.getLayer(`${sourceId}-glow`)) {
      console.log('🗺️ [ROUTE] Removing existing glow layer');
      map.removeLayer(`${sourceId}-glow`);
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
        'line-width': 5,
        'line-opacity': 0.8,
        'line-dasharray': [2, 2],
      },
    });
    
    // Add a second layer for a glow effect
    map.addLayer({
      id: `${sourceId}-glow`,
      type: 'line',
      source: sourceId,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': color,
        'line-width': 10,
        'line-opacity': 0.3,
        'line-blur': 8,
      },
    });
    
    console.log('🗺️ [ROUTE] Route layer added successfully with glow effect');
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
