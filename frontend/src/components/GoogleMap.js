import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { loadGoogleMaps } from '../utils/googleMapsLoader';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const GoogleMap = ({ 
  driverLocation, 
  customerLocation, 
  showRoute = false,
  height = "300px",
  className = "",
  mapType = "roadmap" // "roadmap", "satellite", "hybrid", "terrain"
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarkerRef = useRef(null);
  const customerMarkerRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);
  const [currentMapType, setCurrentMapType] = useState(mapType);

  // Load Google Maps script
  useEffect(() => {
    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then(() => setMapReady(true))
      .catch(() => setError('Erreur de chargement Google Maps'));
  }, []);

  // Initialize map when ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstance.current) return;

    try {
      // Default center (Abidjan)
      const defaultCenter = { lat: 5.3599, lng: -4.0083 };
      
      let center = defaultCenter;
      if (driverLocation?.latitude) {
        center = { lat: driverLocation.latitude, lng: driverLocation.longitude };
      } else if (customerLocation?.latitude) {
        center = { lat: customerLocation.latitude, lng: customerLocation.longitude };
      }

      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 14,
        mapTypeId: currentMapType,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: window.google.maps.ControlPosition.TOP_RIGHT,
          mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
        },
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER
        },
        scaleControl: true,
        rotateControl: true,
        gestureHandling: 'greedy' // Enable all gestures for better control
      });

      // Add initial markers
      if (driverLocation?.latitude) {
        addDriverMarker(driverLocation);
      }
      if (customerLocation?.latitude) {
        addCustomerMarker(customerLocation);
      }

    } catch (err) {
      console.error('Map init error:', err);
      setError('Erreur initialisation carte');
    }
  }, [mapReady]);

  // Update driver marker
  useEffect(() => {
    if (!mapInstance.current || !driverLocation?.latitude) return;
    addDriverMarker(driverLocation);
  }, [driverLocation]);

  // Update customer marker
  useEffect(() => {
    if (!mapInstance.current || !customerLocation?.latitude) return;
    addCustomerMarker(customerLocation);
  }, [customerLocation]);

  // Update route
  useEffect(() => {
    if (!mapInstance.current || !showRoute || !driverLocation?.latitude || !customerLocation?.latitude) return;
    
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
    mapInstance.current.fitBounds(bounds, { padding: 60 });
  }, [driverLocation, customerLocation, showRoute]);

  const addDriverMarker = (location) => {
    if (!mapInstance.current || !window.google) return;
    
    const pos = { lat: location.latitude, lng: location.longitude };
    
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
    
    if (!customerLocation?.latitude) {
      mapInstance.current.setCenter(pos);
      mapInstance.current.setZoom(15);
    }
  };

  const addCustomerMarker = (location) => {
    if (!mapInstance.current || !window.google) return;
    
    const pos = { lat: location.latitude, lng: location.longitude };
    
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
  };

  if (error) {
    return (
      <div 
        className={`bg-slate-700 flex flex-col items-center justify-center ${className}`}
        style={{ height }}
      >
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
        data-testid="google-map"
      />
      {!mapReady && (
        <div 
          className="absolute inset-0 bg-slate-700 flex flex-col items-center justify-center"
          style={{ height }}
        >
          <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-2" />
          <p className="text-slate-400 text-sm">Chargement de la carte...</p>
        </div>
      )}
    </div>
  );
};

export default GoogleMap;
