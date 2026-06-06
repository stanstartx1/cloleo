import { MAPBOX_ACCESS_TOKEN } from './mapboxLoader';

export const DEFAULT_MAP_CENTER = { latitude: 5.3599, longitude: -4.0083 };

export const toLngLat = (location, fallback = DEFAULT_MAP_CENTER) => {
  const latitude = Number(location?.latitude ?? location?.lat ?? fallback.latitude);
  const longitude = Number(location?.longitude ?? location?.lng ?? fallback.longitude);

  return [longitude, latitude];
};

export const createMarkerElement = (color = '#2563eb', label = '') => {
  const el = document.createElement('div');
  el.className = 'mapbox-custom-marker';
  el.title = label;
  el.style.width = '34px';
  el.style.height = '34px';
  el.style.borderRadius = '9999px';
  el.style.background = color;
  el.style.border = '3px solid #fff';
  el.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.28)';
  el.style.cursor = 'pointer';
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

  markerRef.current = new mapboxgl.Marker({
    element: createMarkerElement(options.color, options.title),
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
  if (!map || !from || !to) return;

  if (!map.isStyleLoaded()) {
    map.once('load', () => setRouteLine(map, sourceId, from, to, color));
    return;
  }

  const fromLngLat = toLngLat(from);
  const toLngLatValue = toLngLat(to);
  let geometry = {
    type: 'LineString',
    coordinates: [fromLngLat, toLngLatValue],
  };

  try {
    const coords = `${fromLngLat[0]},${fromLngLat[1]};${toLngLatValue[0]},${toLngLatValue[1]}`;
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data?.routes?.[0]?.geometry) {
      geometry = data.routes[0].geometry;
    }
  } catch {
    // Keep the straight fallback line if route lookup fails.
  }

  const feature = {
    type: 'Feature',
    geometry,
    properties: {},
  };

  if (map.getSource(sourceId)) {
    map.getSource(sourceId).setData(feature);
    return;
  }

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
};

export const reverseGeocodeMapbox = async (latitude, longitude) => {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?language=fr&limit=1&access_token=${MAPBOX_ACCESS_TOKEN}`;
  const response = await fetch(url);
  const data = await response.json();
  return data?.features?.[0]?.place_name || '';
};

export const forwardGeocodeMapbox = async (query) => {
  const safeQuery = String(query || '').trim();
  if (!safeQuery) return null;

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
};
