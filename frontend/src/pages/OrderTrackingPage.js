import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Package, Truck, MapPin, Phone, CheckCircle, Clock, 
  User, Navigation, Home, XCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { loadGoogleMaps } from '../utils/googleMapsLoader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const toWsUrl = (url) => {
  const safeUrl = typeof url === 'string' ? url : '';
  if (!safeUrl) return 'ws://localhost:8000';
  return safeUrl
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');
};
const WS_URL = toWsUrl(BACKEND_URL);
const API = `${BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';

const ORDER_STATUSES = {
  pending: { label: 'En attente', color: 'amber', icon: Clock },
  assigned: { label: 'Livreur assigné', color: 'blue', icon: User },
  picked_up: { label: 'Colis récupéré', color: 'indigo', icon: Package },
  in_transit: { label: 'En route', color: 'purple', icon: Truck },
  delivered: { label: 'Livré', color: 'green', icon: CheckCircle },
  cancelled: { label: 'Annulé', color: 'red', icon: XCircle }
};

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const { token } = useAuth();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState(null);
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarker = useRef(null);
  const customerMarker = useRef(null);
  const wsRef = useRef(null);
  const directionsRenderer = useRef(null);

  // Fetch order details
  const fetchOrder = useCallback(async () => {
    try {
      // Use public tracking endpoint (no auth required)
      const response = await axios.get(`${API}/orders/track/${orderId}`);
      setOrder(response.data);
      
      if (response.data.driver_live_location) {
        setDriverLocation(response.data.driver_live_location);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Commande non trouvée');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Initialize WebSocket
  useEffect(() => {
    fetchOrder();
    
    // Connect to WebSocket for real-time updates
    const connectWebSocket = () => {
      const ws = new WebSocket(`${WS_URL}/ws/orders/order_${orderId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected for order tracking');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'order_update') {
          setOrder(prev => prev ? { ...prev, status: data.status } : prev);
          toast.info(data.message);
          
          // Play notification sound
          try {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {});
          } catch {}
        }
        
        if (data.type === 'driver_location') {
          setDriverLocation(data.location);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      wsRef.current = ws;
    };
    
    connectWebSocket();
    
    // Ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [orderId, fetchOrder]);

  // Initialize map
  useEffect(() => {
    if (!order || !mapRef.current) return;

    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then(() => initMap())
      .catch(() => toast.error('Erreur chargement Google Maps'));
  }, [order]);

  // Update map when driver location changes
  useEffect(() => {
    if (!driverLocation || !mapInstance.current || !window.google) return;
    
    const driverPos = { 
      lat: driverLocation.latitude, 
      lng: driverLocation.longitude 
    };
    
    if (driverMarker.current) {
      driverMarker.current.setPosition(driverPos);
    }
    
    // Update route
    if (order?.delivery_address?.latitude && directionsRenderer.current) {
      updateRoute(driverPos);
    }
  }, [driverLocation, order]);

  const initMap = () => {
    if (!order?.delivery_address) return;
    
    const customerPos = {
      lat: order.delivery_address.latitude || 5.3599,
      lng: order.delivery_address.longitude || -4.0083
    };
    
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: customerPos,
      zoom: 14,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] }
      ]
    });
    
    // Customer marker (red - destination)
    customerMarker.current = new window.google.maps.Marker({
      map: mapInstance.current,
      position: customerPos,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new window.google.maps.Size(40, 40)
      },
      title: 'Votre position'
    });
    
    // Driver marker (blue - moving)
    const driverPos = driverLocation 
      ? { lat: driverLocation.latitude, lng: driverLocation.longitude }
      : null;
    
    if (driverPos) {
      driverMarker.current = new window.google.maps.Marker({
        map: mapInstance.current,
        position: driverPos,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(40, 40)
        },
        title: 'Livreur'
      });
      
      // Setup directions renderer
      directionsRenderer.current = new window.google.maps.DirectionsRenderer({
        map: mapInstance.current,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#4F46E5',
          strokeWeight: 4
        }
      });
      
      // Draw initial route
      updateRoute(driverPos);
      
      // Fit bounds to show both markers
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(customerPos);
      bounds.extend(driverPos);
      mapInstance.current.fitBounds(bounds, { padding: 50 });
    }
  };

  const updateRoute = (driverPos) => {
    if (!window.google || !order?.delivery_address) return;
    
    const directionsService = new window.google.maps.DirectionsService();
    
    directionsService.route({
      origin: driverPos,
      destination: {
        lat: order.delivery_address.latitude,
        lng: order.delivery_address.longitude
      },
      travelMode: window.google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === 'OK' && directionsRenderer.current) {
        directionsRenderer.current.setDirections(result);
      }
    });
  };

  const getStatusProgress = () => {
    const statuses = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered'];
    const currentIndex = statuses.indexOf(order?.status);
    return ((currentIndex + 1) / statuses.length) * 100;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de votre commande...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Commande non trouvée</h2>
          <Button asChild>
            <Link to="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = ORDER_STATUSES[order.status] || ORDER_STATUSES.pending;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="order-tracking-page">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg">Suivi de commande</h1>
              <p className="text-sm text-muted-foreground font-mono">
                #{order.order_number}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" /> Accueil
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Suivi en direct
              </h2>
            </div>
            <div 
              ref={mapRef} 
              className="w-full h-80 lg:h-96"
              data-testid="tracking-map"
            />
            
            {/* Legend */}
            <div className="p-4 bg-gray-50 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full" />
                <span>Votre position</span>
              </div>
              {order.driver_id && (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full" />
                  <span>Livreur</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-white rounded-2xl border p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center bg-${statusInfo.color}-100`}>
                  <StatusIcon className={`w-7 h-7 text-${statusInfo.color}-600`} />
                </div>
                <div>
                  <p className={`text-sm font-medium text-${statusInfo.color}-600`}>
                    Statut actuel
                  </p>
                  <h3 className="text-xl font-bold">{statusInfo.label}</h3>
                </div>
              </div>

              {/* Progress Bar */}
              {order.status !== 'cancelled' && (
                <div className="mb-6">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${getStatusProgress()}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Commande</span>
                    <span>Récupéré</span>
                    <span>En route</span>
                    <span>Livré</span>
                  </div>
                </div>
              )}

              {/* Driver Info */}
              {order.driver_id && (
                <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Truck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{order.driver_name}</p>
                    <p className="text-sm text-muted-foreground">Votre livreur</p>
                  </div>
                  {order.driver?.phone && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`tel:${order.driver.phone}`}>
                        <Phone className="w-4 h-4 mr-1" /> Appeler
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {!order.driver_id && order.status === 'pending' && (
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-medium text-amber-800">Recherche d'un livreur...</p>
                  <p className="text-sm text-amber-600">Un livreur va bientôt prendre votre commande</p>
                </div>
              )}
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Adresse de livraison
              </h3>
              <div className="space-y-2 text-sm">
                <p className="font-medium">{order.delivery_address?.name}</p>
                <p className="text-muted-foreground">{order.delivery_address?.street}</p>
                <p className="text-muted-foreground">
                  {order.delivery_address?.city}, {order.delivery_address?.country}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" /> {order.delivery_address?.phone}
                </p>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Articles commandés
              </h3>
              <div className="space-y-3">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <img 
                      src={item.product_image || 'https://via.placeholder.com/50'} 
                      alt={item.product_name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">Qté: {item.quantity}</p>
                    </div>
                    <p className="font-medium text-sm">{formatPrice(item.subtotal_fcfa)}</p>
                  </div>
                ))}
              </div>
              
              <div className="border-t mt-4 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatPrice(order.subtotal_fcfa)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Livraison</span>
                  <span>{formatPrice(order.delivery_fee_fcfa)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(order.total_fcfa)}</span>
                </div>
              </div>
            </div>

            {/* Status History */}
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Historique
              </h3>
              <div className="space-y-3">
                {order.status_history?.map((entry, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      index === 0 ? 'bg-primary' : 'bg-gray-300'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">
                        {ORDER_STATUSES[entry.status]?.label || entry.status}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.note}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.timestamp).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingPage;
