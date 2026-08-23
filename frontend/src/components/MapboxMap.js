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
  driverVehicleType = null, // Updated prop name
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
  const previousCustomerLocation = useRef(null);
  const previousShowRoute = useRef(false);

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
  }, [mapReady, mapType, driverLocation, customerLocation]);

  useEffect(() => {
    initializeMap();
  }, [initializeMap]);

  useEffect(() => {
    if (!mapInstance.current || !driverLocation?.latitude) return;

    // Skip if location hasn't changed significantly
    if (previousDriverLocation.current) {
      const latDiff = Math.abs(driverLocation.latitude - previousDriverLocation.current.latitude);
      const lngDiff = Math.abs(driverLocation.longitude - previousDriverLocation.current.longitude);
      if (latDiff < 0.0001 && lngDiff < 0.0001) {
        return; // Skip update if change is minimal
      }
    }

    console.log('🗺️ [MAP] Updating driver marker:', driverLocation, 'vehicle:', driverVehicleType);
    
    // Create custom driver marker based on vehicle type
    const driverElement = createDriverMarker(driverVehicleType, 'normal', true);
    
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
  }, [driverLocation, followDriver, driverVehicleType, customerLocation]);

  useEffect(() => {
    if (!mapInstance.current || !customerLocation?.latitude) return;

    // Skip if location hasn't changed significantly
    if (previousCustomerLocation.current) {
      const latDiff = Math.abs(customerLocation.latitude - previousCustomerLocation.current.latitude);
      const lngDiff = Math.abs(customerLocation.longitude - previousCustomerLocation.current.longitude);
      if (latDiff < 0.0001 && lngDiff < 0.0001) {
        return; // Skip update if change is minimal
      }
    }

    console.log('🗺️ [MAP] Updating customer marker:', customerLocation);
    
    // Create custom customer marker with person icon
    const customerElement = createCustomerMarker('normal', false);
    
    upsertMarker(mapboxRef.current, mapInstance.current, customerMarkerRef, customerLocation, {
      element: customerElement,
      color: '#ef4444',
      title: 'Client',
    });

    previousCustomerLocation.current = customerLocation;
  }, [customerLocation]);

  useEffect(() => {
    if (!mapInstance.current || !showRoute || !driverLocation?.latitude || !customerLocation?.latitude) return;

    // Skip if route params haven't changed significantly
    if (previousShowRoute.current && previousDriverLocation.current && previousCustomerLocation.current) {
      const driverLatDiff = Math.abs(driverLocation.latitude - previousDriverLocation.current.latitude);
      const driverLngDiff = Math.abs(driverLocation.longitude - previousDriverLocation.current.longitude);
      const customerLatDiff = Math.abs(customerLocation.latitude - previousCustomerLocation.current.latitude);
      const customerLngDiff = Math.abs(customerLocation.longitude - previousCustomerLocation.current.longitude);
      
      if (driverLatDiff < 0.001 && driverLngDiff < 0.001 && customerLatDiff < 0.001 && customerLngDiff < 0.001) {
        return; // Skip update if changes are minimal
      }
    }

    console.log('🗺️ [MAP] Drawing route from driver to customer:', driverLocation, customerLocation);

    const drawRoute = () => {
      // Check if map is ready before drawing route
      if (!mapInstance.current || !mapInstance.current.getStyle) {
        console.warn('Map not ready for route drawing');
        return;
      }

      try {
        console.log('🗺️ [MAP] Calling setRouteLine');
        setRouteLine(mapInstance.current, 'delivery-route', driverLocation, customerLocation);
        routeSourceRef.current = true;
        console.log('🗺️ [MAP] Route drawn successfully, fitting to locations');
        fitToLocations(mapboxRef.current, mapInstance.current, [driverLocation, customerLocation], {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 16,
        });
      } catch (error) {
        console.error('🗺️ [MAP] Error drawing route:', error);
      }
    };

    // Add a small delay to ensure map is fully ready
    const timeoutId = setTimeout(() => {
      if (mapInstance.current && mapInstance.current.isStyleLoaded()) {
        drawRoute();
      } else if (mapInstance.current) {
        mapInstance.current.once('load', drawRoute);
      }
    }, 100);

    // Update previous values
    previousShowRoute.current = showRoute;
    previousDriverLocation.current = driverLocation;
    previousCustomerLocation.current = customerLocation;

    return () => clearTimeout(timeoutId);
  }, [driverLocation, customerLocation, showRoute]);

  // Clean up route when showRoute becomes false
  useEffect(() => {
    if (!showRoute && routeSourceRef.current && mapInstance.current) {
      try {
        if (mapInstance.current.getLayer('delivery-route')) {
          mapInstance.current.removeLayer('delivery-route');
        }
        if (mapInstance.current.getSource('delivery-route')) {
          mapInstance.current.removeSource('delivery-route');
        }
        routeSourceRef.current = false;
        console.log('🗺️ [MAP] Route removed');
      } catch (error) {
        console.warn('Error removing route:', error);
      }
    }
  }, [showRoute]);

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
