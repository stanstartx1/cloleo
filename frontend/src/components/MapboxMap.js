import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { loadMapbox } from '../utils/mapboxLoader';
import { DEFAULT_MAP_CENTER, fitToLocations, setRouteLine, toLngLat, upsertMarker } from '../utils/mapboxMap';

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
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const mapboxRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMapbox()
      .then((mapboxgl) => {
        mapboxRef.current = mapboxgl;
        setMapReady(true);
      })
      .catch(() => setError('Erreur de chargement Mapbox'));
  }, []);

  useEffect(() => {
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
      });

      mapInstance.current.addControl(new mapboxRef.current.NavigationControl(), 'top-right');
      mapInstance.current.addControl(new mapboxRef.current.FullscreenControl(), 'top-right');
    } catch (err) {
      console.error('Mapbox init error:', err);
      setError('Erreur initialisation carte');
    }
  }, [mapReady, driverLocation, customerLocation, mapType]);

  useEffect(() => {
    if (!mapInstance.current || !driverLocation?.latitude) return;

    upsertMarker(mapboxRef.current, mapInstance.current, driverMarkerRef, driverLocation, {
      color: '#2563eb',
      title: 'Livreur',
    });

    if (!customerLocation?.latitude) {
      mapInstance.current.easeTo({ center: toLngLat(driverLocation), zoom: 15 });
    }
  }, [driverLocation, customerLocation]);

  useEffect(() => {
    if (!mapInstance.current || !customerLocation?.latitude) return;

    upsertMarker(mapboxRef.current, mapInstance.current, customerMarkerRef, customerLocation, {
      color: '#ef4444',
      title: 'Client',
    });
  }, [customerLocation]);

  useEffect(() => {
    if (!mapInstance.current || !showRoute || !driverLocation?.latitude || !customerLocation?.latitude) return;

    const drawRoute = () => {
      setRouteLine(mapInstance.current, 'delivery-route', driverLocation, customerLocation);
      fitToLocations(mapboxRef.current, mapInstance.current, [driverLocation, customerLocation]);
    };

    if (mapInstance.current.isStyleLoaded()) {
      drawRoute();
    } else {
      mapInstance.current.once('load', drawRoute);
    }
  }, [driverLocation, customerLocation, showRoute]);

  useEffect(() => () => mapInstance.current?.remove(), []);

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
