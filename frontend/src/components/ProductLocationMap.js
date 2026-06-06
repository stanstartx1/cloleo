import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { loadMapbox } from '../utils/mapboxLoader';
import { DEFAULT_MAP_CENTER, forwardGeocodeMapbox, toLngLat, upsertMarker } from '../utils/mapboxMap';

const ProductLocationMap = ({ product }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      try {
        const mapboxgl = await loadMapbox();
        if (cancelled || !mapRef.current) return;

        const map = new mapboxgl.Map({
          container: mapRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: toLngLat(DEFAULT_MAP_CENTER),
          zoom: 12,
        });
        mapInstance.current = map;
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        const lat = Number(product?.latitude);
        const lng = Number(product?.longitude);
        const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

        if (hasCoordinates) {
          const position = { latitude: lat, longitude: lng };
          upsertMarker(mapboxgl, map, markerRef, position, { color: '#f97316', title: product?.name || 'Produit' });
          map.easeTo({ center: toLngLat(position), zoom: 15 });
        } else {
          const query = [product?.city, product?.location].filter(Boolean).join(', ');
          if (query) {
            const result = await forwardGeocodeMapbox(query);
            if (!cancelled && result) {
              upsertMarker(mapboxgl, map, markerRef, result, { color: '#f97316', title: product?.name || 'Produit' });
              map.easeTo({ center: toLngLat(result), zoom: 13 });
            }
          }
        }

        setLoading(false);
      } catch {
        setError('Impossible de charger la carte');
        setLoading(false);
      }
    };

    initMap();
    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, [product]);

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <MapPin className="w-4 h-4 text-orange-500" />
        <h3 className="font-semibold text-sm">Localisation du produit</h3>
      </div>
      <div className="h-56 relative">
        <div ref={mapRef} className="w-full h-full" />
        {loading && (
          <div className="absolute inset-0 bg-slate-100/70 flex items-center justify-center text-sm text-slate-600">
            Chargement de la carte...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 bg-slate-100/80 flex items-center justify-center text-sm text-red-600 px-4 text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductLocationMap;
