import MediaImg from '../components/MediaImg';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Package, Truck, MapPin, Phone, CheckCircle, Clock,
  User, Navigation, Home, XCircle, Loader2, MessageCircle,
  Calendar, Star, Trophy, UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import UserAvatar from '../components/UserAvatar';
import TripartiteChat from '../components/TripartiteChat';
import DeliveryScheduler from '../components/DeliveryScheduler';
import RatingSystem from '../components/RatingSystem';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { useUserRealtime } from '../hooks/useUserRealtime';
import MapboxMap from '../components/MapboxMap';

// Import centralisé
import { API_URL, WS_URL } from '../config/api';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';

const ORDER_STATUSES = {
  pending: { label: 'Commande passée', color: 'amber', bgColor: 'bg-amber-100', textColor: 'text-amber-600', icon: CheckCircle, progress: 15 },
  confirmed: { label: 'Confirmée par le vendeur', color: 'blue', bgColor: 'bg-blue-100', textColor: 'text-blue-600', icon: CheckCircle, progress: 30 },
  assigned: { label: 'Livreur assigné', color: 'indigo', bgColor: 'bg-indigo-100', textColor: 'text-indigo-600', icon: User, progress: 45 },
  accepted: { label: 'Livreur accepté', color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-600', icon: UserCheck, progress: 55 },
  picked_up: { label: 'Colis récupéré', color: 'violet', bgColor: 'bg-violet-100', textColor: 'text-violet-600', icon: Package, progress: 70 },
  in_transit: { label: 'En route', color: 'fuchsia', bgColor: 'bg-fuchsia-100', textColor: 'text-fuchsia-600', icon: Truck, progress: 85 },
  delivered: { label: 'Livré', color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-600', icon: CheckCircle, progress: 100 },
  cancelled: { label: 'Annulé', color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600', icon: XCircle, progress: 0 }
};

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const { token, user } = useAuth();
  
  // Use WebSocket-based real-time tracking
  const {
    order: realtimeOrder,
    driverLocation: realtimeDriverLocation,
    connectionStatus,
    error: wsError,
    isConnected
  } = useOrderTracking(orderId, token);
  
  // Use global user real-time for immediate status updates
  const {
    isConnected: globalConnected,
    orderUpdates,
    notifications,
    clearOrderUpdates
  } = useUserRealtime(token, user?.id);
  
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
  
  const previousStatusRef = useRef(null);
  const pinNotifiedRef = useRef(false);

  // Sync real-time data with local state
  useEffect(() => {
    if (realtimeOrder) {
      console.log('📱 [TRACKING SYNC] Syncing realtime order data:', realtimeOrder.status, realtimeOrder);
      setOrder(realtimeOrder);
      setLoading(false);
      
      // Show notification for delivery PIN
      if (realtimeOrder.delivery_pin && !pinNotifiedRef.current) {
        pinNotifiedRef.current = true;
        console.log('🔐 [PIN NOTIFICATION] Delivery PIN available:', realtimeOrder.delivery_pin);
        toast.success('Code de livraison reçu !', {
          description: `Votre code est : ${realtimeOrder.delivery_pin}. Communiquez-le au livreur.`,
          duration: 10000,
          action: {
            label: 'Copier',
            onClick: () => {
              navigator.clipboard.writeText(realtimeOrder.delivery_pin);
              toast.success('Code copié !');
            }
          }
        });
      }
      
      // Show notification for status changes
      if (realtimeOrder.status !== previousStatusRef.current) {
        const oldStatus = previousStatusRef.current;
        previousStatusRef.current = realtimeOrder.status;
        
        console.log('📱 [TRACKING SYNC] Status changed from', oldStatus, 'to', realtimeOrder.status);
        
        if (ORDER_STATUSES[realtimeOrder.status] && oldStatus !== realtimeOrder.status) {
          const statusInfo = ORDER_STATUSES[realtimeOrder.status];
          toast.success(`Statut mis à jour: ${statusInfo.label}`, {
            description: `Votre commande est maintenant ${statusInfo.label.toLowerCase()}`,
            duration: 3000
          });
        }
      }
    }
  }, [realtimeOrder]);

  // Update driver info when order changes
  useEffect(() => {
    if (order?.driver_id && order?.driver_name) {
      setDriverInfo({
        id: order.driver_id,
        name: order.driver_name,
        phone: order.driver_phone
      });
    }
    
    // Update ETA when available
    if (order?.eta_minutes) {
      setEtaMinutes(order.eta_minutes);
    }
  }, [order]);

  // Sync driver location
  useEffect(() => {
    if (realtimeDriverLocation) {
      setDriverLocation(realtimeDriverLocation);
    }
  }, [realtimeDriverLocation]);

  // Listen for chat notifications (PIN messages)
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      notifications.forEach(notification => {
        if (notification.type === 'chat' && notification.message) {
          const message = notification.message;
          if (message.content && message.content.includes('code de livraison')) {
            // Extract PIN from message content
            const pinMatch = message.content.match(/(\d{6})/);
            if (pinMatch) {
              const pin = pinMatch[1];
              console.log('🔐 [PIN NOTIFICATION] PIN received via chat notification:', pin);
              // Open the chat to show the PIN message
              setChatOpen(true);
              toast.success('Code de livraison reçu !', {
                description: `Votre code est : ${pin}. Communiquez-le au livreur.`,
                duration: 10000,
                action: {
                  label: 'Copier',
                  onClick: () => {
                    navigator.clipboard.writeText(pin);
                    toast.success('Code copié !');
                  }
                }
              });
            }
          }
        }
      });
    }
  }, [notifications]);

  // Handle global order updates for immediate status changes
  useEffect(() => {
    if (orderUpdates.length > 0) {
      const latestUpdate = orderUpdates[orderUpdates.length - 1];
      
      // Only process updates for this order
      if (latestUpdate.order_id === orderId) {
        if (latestUpdate.type === 'order_status_update') {
          setOrder(prev => ({
            ...prev,
            status: latestUpdate.status,
            ...(latestUpdate.driver_id && { driver_id: latestUpdate.driver_id }),
            ...(latestUpdate.driver_name && { driver_name: latestUpdate.driver_name }),
            ...(latestUpdate.vendor_name && { vendor_name: latestUpdate.vendor_name }),
            ...(latestUpdate.eta_minutes !== undefined && { eta_minutes: latestUpdate.eta_minutes }),
            ...(latestUpdate.driver_vehicle_type && { driver_vehicle_type: latestUpdate.driver_vehicle_type }),
            updated_at: latestUpdate.timestamp
          }));
          
          // Show notification for status change
          const statusInfo = ORDER_STATUSES[latestUpdate.status];
          if (statusInfo) {
            console.log('📱 [TRACKING DEBUG] Status updated:', latestUpdate.status, statusInfo.label);
            toast.success(`Statut mis à jour: ${statusInfo.label}`, {
              description: `Votre commande est maintenant ${statusInfo.label.toLowerCase()}`,
              duration: 3000
            });
          }
          
          // Check for PIN
          if (latestUpdate.delivery_pin) {
            console.log('🔐 [PIN DEBUG] PIN received in order update:', latestUpdate.delivery_pin);
          }
        } else if (latestUpdate.type === 'order_created' && latestUpdate.order_data) {
          setOrder(latestUpdate.order_data);
        }
        
        // Clear processed updates
        clearOrderUpdates();
      }
    }
  }, [orderUpdates, orderId, clearOrderUpdates]);

  // Fetch initial order data (fallback if WebSocket fails)
  const fetchOrder = useCallback(async () => {
    try {
      console.log('📱 [TRACKING DEBUG] Fetching order data for:', orderId);
      // Use customer-specific endpoint to get delivery PIN
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API}/orders/${orderId}/delivery-pin`, { headers });
      const pinData = response.data;
      console.log('🔐 [PIN DEBUG] PIN data fetched:', pinData);
      
      // Get order data from public endpoint
      const orderResponse = await axios.get(`${API}/orders/track/${orderId}`);
      const data = orderResponse.data;
      console.log('📱 [TRACKING DEBUG] Order data fetched:', data);
      
      if (data.order && !realtimeOrder) {
        // Merge delivery PIN and driver vehicle type into order data
        const orderWithPin = {
          ...data.order,
          delivery_pin: pinData.delivery_pin,
          delivery_pin_created_at: pinData.delivery_pin_created_at,
          delivery_pin_verified: pinData.delivery_pin_verified,
          driver_vehicle_type: data.driver_vehicle_type
        };
        console.log('📱 [TRACKING DEBUG] Merged order data:', orderWithPin);
        setOrder(orderWithPin);
      }
      
      if (data.driver_live_location && !realtimeDriverLocation) {
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
      // Fallback to public endpoint if PIN endpoint fails
      try {
        const fallbackResponse = await axios.get(`${API}/orders/track/${orderId}`);
        const data = fallbackResponse.data;
        
        if (data.order && !realtimeOrder) {
          setOrder(data.order);
        }
        
        if (data.driver_live_location && !realtimeDriverLocation) {
          setDriverLocation(data.driver_live_location);
        }
        
        if (data.driver_info) {
          setDriverInfo(data.driver_info);
        }
        
        if (data.eta_minutes) {
          setEtaMinutes(data.eta_minutes);
        }
      } catch (fallbackError) {
        console.error('Fallback fetch error:', fallbackError);
        if (!realtimeOrder) {
          toast.error('Commande non trouvée');
        }
      }
    } finally {
      if (!realtimeOrder) {
        setLoading(false);
      }
    }
  }, [orderId, token, realtimeOrder, realtimeDriverLocation]);

  // Fetch initial data
  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Calculate customer location for map
  const customerLocation = order?.delivery_address ? {
    latitude: order.delivery_address.latitude || 5.3599,
    longitude: order.delivery_address.longitude || -4.0083
  } : null;

  const getStatusProgress = () => {
    const statuses = ['pending', 'confirmed', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'];
    const currentIndex = statuses.indexOf(order?.status);
    if (currentIndex === -1) return 0;
    return ORDER_STATUSES[order?.status]?.progress || 0;
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
            <div className="flex items-center gap-3">
              {/* Connection status indicator */}
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 
                  connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
                <span className="text-muted-foreground">
                  {isConnected ? 'En direct' : connectionStatus === 'error' ? 'Erreur' : 'Hors ligne'}
                </span>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/">
                  <Home className="w-4 h-4 mr-2" /> Accueil
                </Link>
              </Button>
            </div>
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
            
            <MapboxMap
              driverLocation={driverLocation}
              customerLocation={customerLocation}
              showRoute={!!customerLocation && ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(order?.status)}
              height="400px"
              mapType="streets"
              followDriver={['assigned', 'accepted', 'picked_up', 'in_transit'].includes(order?.status)}
              driverVehicleType={order?.driver_vehicle_type || null}
            />
            
            {/* Legend */}
            <div className="p-4 bg-gray-50 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-lg">👤</div>
                <span>Votre position</span>
              </div>
              {order.driver_id && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">
                    {order.driver_vehicle_type === 'moto' ? '🏍️' : order.driver_vehicle_type === 'velo' ? '🚲' : order.driver_vehicle_type === 'voiture' ? '🚗' : '📦'}
                  </div>
                  <span>Livreur ({order.driver_vehicle_type || 'véhicule'})</span>
                </div>
              )}
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-white rounded-2xl border p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${statusInfo.bgColor}`}>
                  <StatusIcon className={`w-7 h-7 ${statusInfo.textColor}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${statusInfo.textColor}`}>
                    Statut actuel
                  </p>
                  <h3 className="text-xl font-bold">{statusInfo.label}</h3>
                </div>
              </div>

              {/* Delivery PIN Section - Show for customer as soon as order is created */}
              {order.delivery_pin && ['pending', 'confirmed', 'assigned', 'accepted', 'picked_up', 'in_transit'].includes(order.status) && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-300 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-green-800">Code de livraison</p>
                        <p className="text-xs text-green-600">Communiquez ce code au livreur</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg px-6 py-3 border-2 border-green-400 shadow-sm">
                      <p className="text-2xl font-bold text-green-700 tracking-widest">
                        {order.delivery_pin}
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                      <div className={`w-3 h-3 rounded-full mb-1 ${['pending', 'confirmed', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'].includes(order.status) ? 'bg-amber-500' : 'bg-gray-300'} ${order.status === 'pending' ? 'animate-pulse' : ''}`} />
                      <span className={['pending', 'confirmed', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'].includes(order.status) ? 'font-bold text-amber-600' : ''}>Commande</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mb-1 ${['confirmed', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'].includes(order.status) ? 'bg-blue-500' : 'bg-gray-300'} ${order.status === 'confirmed' ? 'animate-pulse' : ''}`} />
                      <span className={['confirmed', 'assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'].includes(order.status) ? 'font-bold text-blue-600' : ''}>Confirmée</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mb-1 ${['assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'].includes(order.status) ? 'bg-indigo-500' : 'bg-gray-300'} ${order.status === 'assigned' ? 'animate-pulse' : ''}`} />
                      <span className={['assigned', 'accepted', 'picked_up', 'in_transit', 'delivered'].includes(order.status) ? 'font-bold text-indigo-600' : ''}>Assigné</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mb-1 ${['accepted', 'picked_up', 'in_transit', 'delivered'].includes(order.status) ? 'bg-purple-500' : 'bg-gray-300'} ${order.status === 'accepted' ? 'animate-pulse' : ''}`} />
                      <span className={['accepted', 'picked_up', 'in_transit', 'delivered'].includes(order.status) ? 'font-bold text-purple-600' : ''}>Accepté</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mb-1 ${['picked_up', 'in_transit', 'delivered'].includes(order.status) ? 'bg-violet-500' : 'bg-gray-300'} ${order.status === 'picked_up' ? 'animate-pulse' : ''}`} />
                      <span className={['picked_up', 'in_transit', 'delivered'].includes(order.status) ? 'font-bold text-violet-600' : ''}>Récupéré</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mb-1 ${['in_transit', 'delivered'].includes(order.status) ? 'bg-fuchsia-500' : 'bg-gray-300'} ${order.status === 'in_transit' ? 'animate-pulse' : ''}`} />
                      <span className={['in_transit', 'delivered'].includes(order.status) ? 'font-bold text-fuchsia-600' : ''}>En route</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mb-1 ${order.status === 'delivered' ? 'bg-green-600' : 'bg-gray-300'} ${order.status === 'delivered' ? 'animate-pulse' : ''}`} />
                      <span className={order.status === 'delivered' ? 'font-bold text-green-600' : ''}>Livré</span>
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
