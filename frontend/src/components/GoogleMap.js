import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

// Google Maps Loader singleton
let googleMapsPromise = null;

const loadGoogleMaps = () => {
  if (googleMapsPromise) return googleMapsPromise;
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  
  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = reject;
    document.head.appendChild(script);
  });
  
  return googleMapsPromise;
};

const GoogleMap = ({ 
  driverLocation, 
  customerLocation, 
  showRoute = false,
  height = "h-64",
  onMapReady = () => {}
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize map
  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      try {
        await loadGoogleMaps();
        
        if (!mounted || !mapRef.current) return;
        
        // Default center (Abidjan)
        const defaultCenter = { lat: 5.3599, lng: -4.0083 };
        const center = driverLocation 
          ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
          : customerLocation 
          ? { lat: customerLocation.latitude, lng: customerLocation.longitude }
          : defaultCenter;
        
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 14,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] }
          ],
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true
        });
        
        setLoading(false);
        onMapReady(mapInstance.current);
        
      } catch (err) {
        console.error('Google Maps error:', err);
        setError('Erreur de chargement de la carte');
        setLoading(false);
      }
    };
    
    initMap();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Update driver marker
  useEffect(() => {
    if (!mapInstance.current || !window.google || !driverLocation) return;
    
    const pos = { lat: driverLocation.latitude, lng: driverLocation.longitude };
    
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition(pos);
    } else {
      driverMarkerRef.current = new window.google.maps.Marker({
        map: mapInstance.current,
        position: pos,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(40, 40)
        },
        title: 'Livreur'
      });
    }
    
    // Center on driver if no customer
    if (!customerLocation) {
      mapInstance.current.setCenter(pos);
    }
  }, [driverLocation, customerLocation]);

  // Update customer marker
  useEffect(() => {
    if (!mapInstance.current || !window.google || !customerLocation) return;
    
    const pos = { lat: customerLocation.latitude, lng: customerLocation.longitude };
    
    if (customerMarkerRef.current) {
      customerMarkerRef.current.setPosition(pos);
    } else {
      customerMarkerRef.current = new window.google.maps.Marker({
        map: mapInstance.current,
        position: pos,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window.google.maps.Size(40, 40)
        },
        title: 'Client'
      });
    }
  }, [customerLocation]);

  // Update route
  useEffect(() => {
    if (!mapInstance.current || !window.google || !showRoute) return;
    if (!driverLocation || !customerLocation) return;
    
    // Initialize directions renderer
    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapInstance.current,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#4F46E5',
          strokeWeight: 4
        }
      });
    }
    
    const directionsService = new window.google.maps.DirectionsService();
    
    directionsService.route({
      origin: { lat: driverLocation.latitude, lng: driverLocation.longitude },
      destination: { lat: customerLocation.latitude, lng: customerLocation.longitude },
      travelMode: window.google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === 'OK' && directionsRendererRef.current) {
        directionsRendererRef.current.setDirections(result);
      }
    });
    
    // Fit bounds
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: driverLocation.latitude, lng: driverLocation.longitude });
    bounds.extend({ lat: customerLocation.latitude, lng: customerLocation.longitude });
    mapInstance.current.fitBounds(bounds, { padding: 50 });
    
  }, [driverLocation, customerLocation, showRoute]);

  if (error) {
    return (
      <div className={`${height} bg-slate-700 flex items-center justify-center rounded-xl`}>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div 
        ref={mapRef} 
        className={`w-full ${height} rounded-xl overflow-hidden`}
        data-testid="google-map"
      />
      {loading && (
        <div className={`absolute inset-0 ${height} bg-slate-700 flex items-center justify-center rounded-xl`}>
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
