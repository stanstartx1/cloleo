import MediaImg from '../components/MediaImg';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Package, Truck, MapPin, Phone, CheckCircle, Clock,
  User, Navigation, Home, XCircle, Loader2, MessageCircle,
  Calendar, Star, Trophy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { loadMapbox } from '../utils/mapboxLoader';
import { fitToLocations, setRouteLine, toLngLat, upsertMarker } from '../utils/mapboxMap';
import UserAvatar from '../components/UserAvatar';
import TripartiteChat from '../components/TripartiteChat';
import DeliveryScheduler from '../components/DeliveryScheduler';
import RatingSystem from '../components/RatingSystem';

// Import centralisé
import { API_URL, WS_URL } from '../config/api';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';

const ORDER_STATUSES = {
  pending: { label: 'En attente', color: 'amber', icon: Clock, progress: 10 },
  assigned: { label: 'Livreur assigné', color: 'blue', icon: User, progress: 25 },
  accepted: { label: 'Commande acceptée', color: 'green', icon: CheckCircle, progress: 40 },
  picked_up: { label: 'Colis récupéré', color: 'indigo', icon: Package, progress: 60 },
  in_transit: { label: 'En route', color: 'purple', icon: Truck, progress: 80 },
  delivered: { label: 'Livré', color: 'green', icon: CheckCircle, progress: 100 },
  cancelled: { label: 'Annulé', color: 'red', icon: XCircle, progress: 0 }
};

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const { token } = useAuth();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [lastStatus, setLastStatus] = useState(null);
  
  // New component states
  const [chatOpen, setChatOpen] = useState(false);
  const [schedulerOpen, setSchedulerOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const mapboxRef = useRef(null);
  const driverMarker = useRef(null);
  const customerMarker = useRef(null);
  const wsRef = useRef(null);
  const previousStatusRef = useRef(null);

  // Fetch order details
  const fetchOrder = useCallback(async () => {
    try {
      // Use public tracking endpoint (no auth required)
      const response = await axios.get(`${API}/orders/track/${orderId}`);
      const data = response.data;
      
      // Handle the new response structure
      if (data.order) {
        setOrder(data.order);
      }
      
      if (data.driver_live_location) {
        setDriverLocation(data.driver_live_location);
      }
      
      if (data.driver_info) {
        setDriverInfo(data.driver_info);
      }
      
      if (data.eta_minutes) {
        setEtaMinutes(data.eta_minutes);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Commande non trouvée');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Initialize real-time updates with enhanced polling
  useEffect(() => {
    fetchOrder();
    
    // Use faster polling for real-time updates (2 seconds for more responsiveness)
    const pollingInterval = setInterval(fetchOrder, 2000);
    
    // Also add status change detection for immediate updates
    const statusCheckInterval = setInterval(() => {
      if (order && order.status !== previousStatusRef.current) {
        const oldStatus = previousStatusRef.current;
        previousStatusRef.current = order.status;
        
        // Show notification for important status changes
        if (ORDER_STATUSES[order.status] && oldStatus !== order.status) {
          const statusInfo = ORDER_STATUSES[order.status];
          toast.success(`Statut mis à jour: ${statusInfo.label}`, {
            description: `Votre commande est maintenant ${statusInfo.label.toLowerCase()}`,
            duration: 3000
          });
        }
      }
    }, 1000);
    
    return () => {
      clearInterval(pollingInterval);
      clearInterval(statusCheckInterval);
    };
  }, [orderId, fetchOrder]);

  // Initialize map
  useEffect(() => {
    if (!order || !mapRef.current) return;

    loadMapbox()
      .then((mapboxgl) => {
        mapboxRef.current = mapboxgl;
        initMap(mapboxgl);
      })
      .catch(() => toast.error('Erreur chargement Mapbox'));
  }, [order]);

  // Update map when driver location changes
  useEffect(() => {
    if (!driverLocation || !mapInstance.current || !mapboxRef.current) return;

    upsertMarker(mapboxRef.current, mapInstance.current, driverMarker, driverLocation, {
      color: '#2563eb',
      title: 'Livreur',
    });

    if (order?.delivery_address?.latitude) {
      updateRoute(driverLocation);
    }
  }, [driverLocation, order]);

  const initMap = (mapboxgl) => {
    if (!order?.delivery_address) return;
    
    const customerPos = {
      latitude: order.delivery_address.latitude || 5.3599,
      longitude: order.delivery_address.longitude || -4.0083
    };
    
    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: toLngLat(customerPos),
      zoom: 13,
    });
    mapInstance.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Customer marker
    upsertMarker(mapboxgl, mapInstance.current, customerMarker, customerPos, {
      color: '#ef4444',
      title: 'Votre position',
      size: 'large'
    });
    
    // Driver marker with animation
    const driverPos = driverLocation 
      ? { latitude: driverLocation.latitude, longitude: driverLocation.longitude }
      : null;
    
    if (driverPos) {
      upsertMarker(mapboxgl, mapInstance.current, driverMarker, driverPos, {
        color: '#2563eb',
        title: 'Livreur',
        size: 'large',
        pulse: true
      });

      updateRoute(driverPos);
      fitToLocations(mapboxgl, mapInstance.current, [customerPos, driverPos], 50);
    } else if (driverInfo) {
      // Show notification if driver is assigned but no location yet
      console.log('Driver assigned but location not yet available');
    }
  };

  const updateRoute = (driverPos) => {
    if (!mapInstance.current || !order?.delivery_address) return;

    const destination = {
      latitude: order.delivery_address.latitude,
      longitude: order.delivery_address.longitude
    };
    setRouteLine(mapInstance.current, 'order-tracking-route', driverPos, destination);
  };

  const getStatusProgress = () => {
    const statuses = ['pending', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'];
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Progression de livraison</span>
                    <span className="text-sm font-bold text-primary">{Math.round(getStatusProgress())}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700 ease-out"
                      style={{ width: `${getStatusProgress()}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-3 text-xs text-muted-foreground">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mb-1 ${order.status === 'pending' ? 'bg-amber-500' : 'bg-gray-300'}`} />
                      <span>Commande</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mb-1 ${['assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'].includes(order.status) ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      <span>Assigné</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mb-1 ${['accepted', 'picked_up', 'in_transit', 'delivered'].includes(order.status) ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span>Accepté</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mb-1 ${['picked_up', 'in_transit', 'delivered'].includes(order.status) ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                      <span>Récupéré</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mb-1 ${['in_transit', 'delivered'].includes(order.status) ? 'bg-purple-500' : 'bg-gray-300'}`} />
                      <span>En route</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mb-1 ${order.status === 'delivered' ? 'bg-green-600' : 'bg-gray-300'}`} />
                      <span>Livré</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Driver Info */}
              {driverInfo ? (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{driverInfo.name}</p>
                      <p className="text-sm text-blue-700">
                        {order.status === 'assigned' ? 'Livreur assigné' : 
                         order.status === 'accepted' ? 'Commande acceptée' :
                         order.status === 'picked_up' ? 'Colis récupéré' :
                         order.status === 'in_transit' ? 'En route vers vous' : 'Livreur'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {driverInfo.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-600" />
                        <a href={`tel:${driverInfo.phone}`} className="text-blue-600 hover:underline">
                          {driverInfo.phone}
                        </a>
                      </div>
                    )}
                    {driverInfo.vehicle_type && (
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-600">{driverInfo.vehicle_type}</span>
                      </div>
                    )}
                  </div>
                  {etaMinutes && (
                    <div className="mt-3 pt-3 border-t border-blue-200 flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-700 font-medium">
                        Arrivée estimée: {etaMinutes} minutes
                      </span>
                    </div>
                  )}
                  {!driverLocation && driverInfo && (
                    <div className="mt-3 pt-3 border-t border-blue-200 flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Position GPS en cours de synchronisation...</span>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => setChatOpen(true)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contacter
                    </Button>
                    <Button
                      onClick={() => setSchedulerOpen(true)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Planifier
                    </Button>
                  </div>
                </div>
              ) : order.driver_id ? (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">Livreur assigné</p>
                      <p className="text-sm text-blue-700">Les informations du livreur apparaîtront bientôt</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                  <div className="flex items-center justify-center mb-3">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                      <Clock className="w-8 h-8 text-amber-600 animate-pulse" />
                    </div>
                  </div>
                  <p className="font-bold text-amber-800 text-center">Recherche du livreur en cours...</p>
                  <p className="text-sm text-amber-600 text-center mt-2">
                    Le système trouve automatiquement le livreur le plus proche disponible
                  </p>
                  <div className="mt-4 bg-amber-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-amber-700">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recherche optimale basée sur la localisation</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rating Button - Only show when delivered */}
              {order.status === 'delivered' && (
                <Button
                  onClick={() => setRatingOpen(true)}
                  className="w-full mt-4 bg-gradient-to-r from-yellow-500 to-orange-500"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Évaluer le livreur
                </Button>
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
                    <MediaImg 
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

      {/* Integrated Components */}
      <TripartiteChat
        orderId={order?.id}
        recipientType="driver"
        recipientId={order?.driver_id}
        recipientName={driverInfo?.name || 'Livreur'}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      <DeliveryScheduler
        orderId={order?.id}
        isOpen={schedulerOpen}
        onClose={() => setSchedulerOpen(false)}
        onScheduleSelect={(data) => console.log('Schedule selected:', data)}
      />

      <RatingSystem
        orderId={order?.id}
        recipientType="driver"
        recipientId={order?.driver_id}
        recipientName={driverInfo?.name || 'Livreur'}
        recipientRole="driver"
        isOpen={ratingOpen}
        onClose={() => setRatingOpen(false)}
      />
    </div>
  );
};

export default OrderTrackingPage;
