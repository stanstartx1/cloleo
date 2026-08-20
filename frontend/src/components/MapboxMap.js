import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { loadMapbox } from '../utils/mapboxLoader';
import { DEFAULT_MAP_CENTER, fitToLocations, setRouteLine, toLngLat, upsertMarker, createDriverMarker, createCustomerMarker } from '../utils/mapboxMap';

const getMapStyle = (mapType) => {
  if (mapType === 'satellite' || mapType === 'hybrid') return 'mapbox://styles/mapbox/satellite-streets-v12';
  if (mapType === 'terrain') return 'mapbox://styles/mapbox/outdoors-v12';
  return 'mapbox://styles/mapbox/streets-v12';
};

const MapboxMap = ({
  driverLocation,
  customerLocation,
  showRoute = false,
  height = '300px',
  className = '',
  mapType = 'roadmap',
  followDriver = false,
  vehicleType = 'default', // New prop for vehicle type
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const mapboxRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const routeSourceRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);
  const previousDriverLocation = useRef(null);

  useEffect(() => {
    loadMapbox()
      .then((mapboxgl) => {
        mapboxRef.current = mapboxgl;
        setMapReady(true);
      })
      .catch(() => setError('Erreur de chargement Mapbox'));
  }, []);

  const initializeMap = useCallback(() => {
    if (!mapReady || !mapRef.current || mapInstance.current) return;

    try {
      const center = driverLocation?.latitude
        ? toLngLat(driverLocation)
        : customerLocation?.latitude
        ? toLngLat(customerLocation)
        : toLngLat(DEFAULT_MAP_CENTER);

      mapInstance.current = new mapboxRef.current.Map({
        container: mapRef.current,
        style: getMapStyle(mapType),
        center,
        zoom: 14,
        pitch: 0,
        bearing: 0,
      });

      mapInstance.current.addControl(new mapboxRef.current.NavigationControl(), 'top-right');
      mapInstance.current.addControl(new mapboxRef.current.FullscreenControl(), 'top-right');
    } catch (err) {
      console.error('Mapbox init error:', err);
      setError('Erreur initialisation carte');
    }
  }, [mapReady, mapType]);

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  useEffect(() => {
    if (!mapInstance.current || !driverLocation?.latitude) return;

    // Create custom driver marker based on vehicle type
    const driverElement = createDriverMarker(vehicleType, 'normal', true);
    
    upsertMarker(mapboxRef.current, mapInstance.current, driverMarkerRef, driverLocation, {
      element: driverElement,
      color: '#2563eb',
      title: 'Livreur',
    });

    if (followDriver && !customerLocation?.latitude) {
      const hasMoved = previousDriverLocation.current &&
        (Math.abs(driverLocation.latitude - previousDriverLocation.current.latitude) > 0.0001 ||
         Math.abs(driverLocation.longitude - previousDriverLocation.current.longitude) > 0.0001);

      if (hasMoved) {
        mapInstance.current.easeTo({
          center: toLngLat(driverLocation),
          zoom: 15,
          duration: 1000,
          easing: (t) => t * (2 - t),
        });
      }
    }

    previousDriverLocation.current = driverLocation;
  }, [driverLocation, customerLocation, followDriver, vehicleType]);

  useEffect(() => {
    if (!mapInstance.current || !customerLocation?.latitude) return;

    // Create custom customer marker with person icon
    const customerElement = createCustomerMarker('normal', false);
    
    upsertMarker(mapboxRef.current, mapInstance.current, customerMarkerRef, customerLocation, {
      element: customerElement,
      color: '#ef4444',
      title: 'Client',
    });
  }, [customerLocation]);

  useEffect(() => {
    if (!mapInstance.current || !showRoute || !driverLocation?.latitude || !customerLocation?.latitude) return;

    const drawRoute = () => {
      // Safely remove existing layer and source if they exist
      if (routeSourceRef.current) {
        try {
          if (mapInstance.current.getLayer('delivery-route')) {
            mapInstance.current.removeLayer('delivery-route');
          }
          if (mapInstance.current.getSource('delivery-route')) {
            mapInstance.current.removeSource('delivery-route');
          }
        } catch (error) {
          console.warn('Error removing route layer/source:', error);
        }
        routeSourceRef.current = null;
      }

      // Check if map is ready before drawing route
      if (!mapInstance.current || !mapInstance.current.getStyle) {
        console.warn('Map not ready for route drawing');
        return;
      }

      try {
        setRouteLine(mapInstance.current, 'delivery-route', driverLocation, customerLocation);
        routeSourceRef.current = true;
        fitToLocations(mapboxRef.current, mapInstance.current, [driverLocation, customerLocation], {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 16,
        });
      } catch (error) {
        console.error('Error drawing route:', error);
      }
    };

    if (mapInstance.current && mapInstance.current.isStyleLoaded()) {
      drawRoute();
    } else if (mapInstance.current) {
      mapInstance.current.once('load', drawRoute);
    }
  }, [driverLocation, customerLocation, showRoute]);

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  if (error) {
    return (
      <div className={`bg-slate-700 flex flex-col items-center justify-center ${className}`} style={{ height }}>
        <MapPin className="w-12 h-12 text-slate-500 mb-2" />
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <div
        ref={mapRef}
        className={`w-full h-full ${className}`}
        style={{ minHeight: height }}
        data-testid="mapbox-map"
      />
      {!mapReady && (
        <div className="absolute inset-0 bg-slate-700 flex flex-col items-center justify-center" style={{ height }}>
          <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-2" />
          <p className="text-slate-400 text-sm">Chargement de la carte...</p>
        </div>
      )}
    </div>
  );
};

export default MapboxMap;
