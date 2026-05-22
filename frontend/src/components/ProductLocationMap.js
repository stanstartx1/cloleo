import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { loadGoogleMaps } from '../utils/googleMapsLoader';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const DEFAULT_CENTER = { lat: 5.3599, lng: -4.0083 };

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
        if (!GOOGLE_MAPS_API_KEY) {
          setError('Clé Google Maps absente');
          setLoading(false);
          return;
        }

        await loadGoogleMaps(GOOGLE_MAPS_API_KEY);
        if (cancelled || !mapRef.current) return;

        const map = new window.google.maps.Map(mapRef.current, {
          center: DEFAULT_CENTER,
          zoom: 12,
          mapTypeId: 'roadmap',
          streetViewControl: false,
          fullscreenControl: false
        });
        mapInstance.current = map;

        const lat = Number(product?.latitude);
        const lng = Number(product?.longitude);
        const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

        if (hasCoordinates) {
          const position = { lat, lng };
          markerRef.current = new window.google.maps.Marker({
            map,
            position,
            title: product?.name || 'Produit'
          });
          map.setCenter(position);
          map.setZoom(15);
        } else {
          const query = [product?.city, product?.location].filter(Boolean).join(', ');
          if (query) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: query }, (results, status) => {
              if (cancelled || status !== 'OK' || !results?.length) return;
              const loc = results[0].geometry.location;
              const position = { lat: loc.lat(), lng: loc.lng() };
              markerRef.current = new window.google.maps.Marker({
                map,
                position,
                title: product?.name || 'Produit'
              });
              map.setCenter(position);
              map.setZoom(13);
            });
          }
        }

        setLoading(false);
      } catch (e) {
        setError('Impossible de charger la carte');
        setLoading(false);
      }
    };

    initMap();
    return () => {
      cancelled = true;
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
