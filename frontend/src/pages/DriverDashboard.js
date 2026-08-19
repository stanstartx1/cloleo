import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Truck, Package, DollarSign, MapPin, Clock, CheckCircle, 
  XCircle, AlertCircle, Phone, LogOut, Navigation, 
  Loader2, Star, Play, Flag, PackageCheck, Bell,
  Menu, Home, Map, List, History, ChevronRight, X, MessageCircle,
  Trophy, Target, BarChart3, Layers, TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import MapboxMap from '../components/MapboxMap';
import MessagesSection from '../components/MessagesSection';
import TripartiteChat from '../components/TripartiteChat';
import DeliveryProof from '../components/DeliveryProof';
import MultiDeliveryManager from '../components/MultiDeliveryManager';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import GamificationSystem from '../components/GamificationSystem';
import { geolocationService } from '../services/geolocationService';
import { notificationService } from '../services/notificationService';
import { useDriverOrders } from '../hooks/useDriverOrders';

import { API_BASE, API_URL, WS_URL } from '../config/api';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const ORDER_STATUSES = {
  assigned: { label: 'Assignée', action: 'Accepter commande', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  accepted: { label: 'Acceptée', action: 'Récupérer colis', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
  picked_up: { label: 'Colis récupéré', action: 'Démarrer livraison', bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400' },
  in_transit: { label: 'En cours de livraison', action: 'Confirmer livraison', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' },
  delivered: { label: 'Livrée', action: null, bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400' },
  cancelled: { label: 'Annulée', action: null, bgColor: 'bg-red-500/20', textColor: 'text-red-400' }
};

const NAV_ITEMS = [
  { id: 'map', label: 'Carte & Navigation', icon: Map },
  { id: 'orders', label: 'Commandes', icon: Package, badge: true },
  { id: 'multi', label: 'Multi-livraisons', icon: Layers },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'stats', label: 'Mes gains', icon: DollarSign },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'gamification', label: 'Récompenses', icon: Trophy },
];

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout, isDriver } = useAuth();
  
  const [activeSection, setActiveSection] = useState('map');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]); // Multiple active orders
  const [selectedOrder, setSelectedOrder] = useState(null); // Currently focused order
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('offline');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  
  // New component states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [deliveryProofOpen, setDeliveryProofOpen] = useState(false);
  const [multiDeliveryOpen, setMultiDeliveryOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [gamificationOpen, setGamificationOpen] = useState(false);
  
  const wsRef = React.useRef(null);
  const watchIdRef = React.useRef(null);
  const audioRef = React.useRef(null);

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/driver/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data);
      // Use is_online field from backend
      const isOnline = response.data.user?.is_online ?? true;
      if (isOnline) {
        setCurrentStatus(response.data.user?.driver_status || 'available');
      } else {
        setCurrentStatus('offline');
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  }, [token]);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/driver/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.orders || []);
      
      // Get all active orders for this driver
      const active = (response.data.orders || []).filter(o => 
        o.driver_id === user?.id && 
        ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(o.status)
      );
      setActiveOrders(active);
      
      // Select the first active order if none selected
      if (active.length > 0 && !selectedOrder) {
        setSelectedOrder(active[0]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, [token, user?.id, selectedOrder]);

  useEffect(() => {
    if (!isDriver) {
      navigate('/connexion');
      return;
    }
    
    const init = async () => {
      setLoading(true);
      await fetchDashboard();
      await fetchOrders();
      setLoading(false);
    };
    
    init();
    notificationService.requestPermission().catch(() => {});
  }, [isDriver, navigate, fetchDashboard, fetchOrders]);

  // Advanced GPS tracking with offline sync
  useEffect(() => {
    if (!user?.id || !token) return;

    geolocationService.startTracking('high', async (pos) => {
      try {
        // Update local state for WebSocket broadcast
        setCurrentLocation({
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy
        });

        await axios.post(`${API}/driver/location/update`, {
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
        }, { headers: { Authorization: `Bearer ${token}` } });

        if (selectedOrder?.id) {
          await axios.post(`${API}/delivery/driver/check-geofence`, {
            order_id: selectedOrder.id,
            latitude: pos.latitude,
            longitude: pos.longitude,
            radius_m: 200,
          }, { headers: { Authorization: `Bearer ${token}` } });
        }
      } catch (err) {
        console.error('Location update error:', err);
      }
    });

    return () => geolocationService.stopTracking();
  }, [user?.id, token, selectedOrder?.id]);

  // Real-time order updates using WebSocket
  const {
    newOrderAlert,
    connectionStatus: wsConnectionStatus,
    sendLocationUpdate
  } = useDriverOrders(user?.id, token);

  // Handle new order alerts
  useEffect(() => {
    if (newOrderAlert) {
      toast.info('Nouvelle commande assignée !', {
        description: `Commande #${newOrderAlert.order_number?.slice(0, 8).toUpperCase()}`,
        duration: 5000
      });
      audioRef.current?.play().catch(() => {});
      fetchOrders();
    }
  }, [newOrderAlert, fetchOrders]);

  // Send location updates via WebSocket when available
  useEffect(() => {
    if (wsConnectionStatus === 'connected' && currentLocation) {
      sendLocationUpdate(currentLocation);
    }
  }, [currentLocation, wsConnectionStatus, sendLocationUpdate]);

  // Polling fallback for production stability
  useEffect(() => {
    if (!user?.id) return;

    const pollingInterval = setInterval(() => {
      fetchOrders();
      fetchDashboard();
    }, 5000); // Poll every 5 seconds for faster order detection

    return () => clearInterval(pollingInterval);
  }, [user?.id, fetchOrders, fetchDashboard]);

  // Request GPS permission on mount for drivers
  useEffect(() => {
    if (isDriver && navigator.geolocation) {
      // Request GPS permission immediately on dashboard load
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('GPS permission granted, initial position:', position.coords);
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCurrentLocation(location);
          
          // Update backend with initial location
          axios.post(`${API}/driver/location/update`, location, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(error => console.error('Error updating initial location:', error));
          
          toast.success('GPS activé avec succès', {
            description: 'Votre position est maintenant partagée pour recevoir des commandes'
          });
        },
        (error) => {
          console.error('GPS permission denied:', error);
          toast.error('GPS non activé', {
            description: 'Veuillez activer votre GPS pour recevoir des commandes'
          });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [isDriver, token]);

  // Geolocation
  useEffect(() => {
    if (!trackingEnabled) return;
    
    const updateLocation = async (position) => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      setCurrentLocation(location);
      
      try {
        await axios.post(`${API}/driver/location/update`, location, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Error updating location:', error);
      }
      
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'location_update', location }));
      }
    };
    
    if (navigator.geolocation && trackingEnabled) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(updateLocation, (error) => {
        console.error('Initial geolocation error:', error);
        if (error.code === 3) {
          // Timeout - this is common, try again with lower accuracy
          console.log('Geolocation timeout, retrying with lower accuracy');
          navigator.geolocation.getCurrentPosition(updateLocation, (retryError) => {
            if (retryError) {
              console.error('Retry geolocation error:', retryError);
              toast.warning('GPS indisponible, vérifiez vos paramètres de localisation');
            }
          }, { enableHighAccuracy: false, timeout: 15000 });
        } else if (error.code === 1) {
          // Permission denied
          toast.error('Permission GPS refusée. Activez la localisation pour les livraisons.');
        } else {
          toast.error('Impossible d\'obtenir votre position GPS');
        }
      }, { enableHighAccuracy: true, timeout: 10000 });
      
      // Watch position changes
      watchIdRef.current = navigator.geolocation.watchPosition(updateLocation, (error) => {
        console.error('Geolocation watch error:', error);
        if (error.code === 3) {
          // Timeout during watch - silent retry
          console.log('Geolocation watch timeout, will retry automatically');
        }
      }, { 
        enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 
      });
    }
    
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [trackingEnabled, token]);

  const updateDriverStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await axios.put(`${API}/driver/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentStatus(newStatus);
      
      if (newStatus === 'available') {
        setTrackingEnabled(true);
        toast.success('Vous êtes disponible !', {
          description: 'Les commandes proches de votre position vous seront assignées'
        });
        
        // Request GPS immediately when becoming available
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              };
              setCurrentLocation(location);
              axios.post(`${API}/driver/location/update`, location, {
                headers: { Authorization: `Bearer ${token}` }
              }).catch(console.error);
            },
            (error) => {
              toast.error('GPS requis', {
                description: 'Activez votre GPS pour recevoir des commandes'
              });
            },
            { enableHighAccuracy: true, timeout: 10000 }
          );
        }
      } else if (newStatus === 'busy') {
        setTrackingEnabled(true);
        toast.info('Vous êtes occupé');
      } else if (newStatus === 'offline') {
        setTrackingEnabled(false);
        toast.info('Vous êtes hors ligne');
      }
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleOrderAction = async (order, action) => {
    setUpdatingStatus(true);
    try {
      let endpoint = '';
      let payload = {};
      
      switch (action) {
        case 'driver-accept': endpoint = `/orders/${order.id}/driver-accept`; break;
        case 'pickup': endpoint = `/orders/${order.id}/pickup`; setTrackingEnabled(true); break;
        case 'in-transit': endpoint = `/orders/${order.id}/in-transit`; break;
        case 'deliver': endpoint = `/orders/${order.id}/deliver`; break;
        case 'driver-cancel': 
          endpoint = `/orders/${order.id}/driver-cancel`;
          const reason = prompt("Veuillez indiquer la raison de l'annulation (ex: accident, problème véhicule) :");
          if (!reason) {
            toast.error('Annulation annulée');
            setUpdatingStatus(false);
            return;
          }
          payload = { reason };
          break;
        default: return;
      }
      
      const response = await axios.put(`${API}${endpoint}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      
      if (action === 'driver-cancel') {
        toast.success('Commande annulée et réassignée');
        setSelectedOrder(null);
      } else {
        toast.success(
          action === 'driver-accept' ? 'Commande acceptée !' :
          action === 'pickup' ? 'Colis récupéré !' :
          action === 'in-transit' ? `Livraison démarrée ${response.data?.eta_minutes ? `(ETA: ${response.data.eta_minutes} min)` : ''} !` :
          'Livraison terminée !'
        );
        
        // Manually update the selected order status for immediate UI feedback
        const statusMap = {
          'driver-accept': 'accepted',
          'pickup': 'picked_up', 
          'in-transit': 'in_transit',
          'deliver': 'delivered'
        };
        
        if (statusMap[action]) {
          setSelectedOrder({
            ...order,
            status: statusMap[action]
          });
        }
      }
      
      await fetchOrders();
      await fetchDashboard();
      
      if (action === 'deliver') setSelectedOrder(null);
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        toast.success('Position mise à jour');
      },
      () => toast.error('Impossible de vous localiser'),
      { enableHighAccuracy: true }
    );
  };

  const handleLogout = () => {
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
      </div>
    );
  }

  const stats = dashboard?.stats;
  const driverUser = dashboard?.user;
  const isPendingVerification = !driverUser?.is_verified || !driverUser?.is_active;
  const availableOrders = orders.filter(o => o.driver_id === user?.id && o.status === 'assigned');
  const completedOrders = orders.filter(o => o.driver_id === user?.id && o.status === 'delivered');

  // Use selected order for map navigation, fallback to first active order
  const activeOrderForMap = selectedOrder || activeOrders[0];
  const customerLocation = activeOrderForMap?.delivery_address ? {
    latitude: activeOrderForMap.delivery_address.latitude,
    longitude: activeOrderForMap.delivery_address.longitude
  } : null;

  return (
    <div className="min-h-screen premium-dashboard-bg dashboard-card-skin" data-testid="driver-dashboard">
      {/* Mobile Header */}
      <header className="lg:hidden premium-panel border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            currentStatus === 'available' ? 'bg-green-500' :
            currentStatus === 'busy' ? 'bg-amber-500' : 'bg-slate-600'
          }`}>
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">Livreur</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-white">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden premium-panel border-b border-slate-700 p-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveSection(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${
                  activeSection === item.id ? 'bg-blue-600 text-white' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.badge && availableOrders.length > 0 && (
                  <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {availableOrders.length}
                  </span>
                )}
              </button>
            );
          })}
          <div className="border-t border-slate-700 pt-2 mt-2">
            <Link to="/" className="flex items-center gap-3 px-4 py-3 text-slate-400">
              <Home className="w-5 h-5" /> Voir la boutique
            </Link>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400">
              <LogOut className="w-5 h-5" /> Déconnexion
            </button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 premium-panel border-r border-slate-700 min-h-screen fixed left-0 top-0">
          {/* Logo */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                currentStatus === 'available' ? 'bg-green-500' :
                currentStatus === 'busy' ? 'bg-amber-500' : 'bg-slate-600'
              }`}>
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white">Espace Livreur</h1>
                <p className="text-xs text-slate-400">{driverUser?.name}</p>
              </div>
            </div>
          </div>

          {/* Status Selector */}
          <div className="p-4 border-b border-slate-700">
            <p className="text-xs text-slate-400 mb-2">Votre statut</p>
            <div className="space-y-2">
              {[
                { value: 'available', label: 'Disponible', color: 'green', icon: CheckCircle },
                { value: 'busy', label: 'Occupé', color: 'amber', icon: Clock },
                { value: 'offline', label: 'Hors ligne', color: 'slate', icon: XCircle },
              ].map((status) => {
                const Icon = status.icon;
                const isActive = currentStatus === status.value;
                return (
                  <button
                    key={status.value}
                    onClick={() => !isPendingVerification && !updatingStatus && updateDriverStatus(status.value)}
                    disabled={isPendingVerification || updatingStatus}
                    className={`w-full p-2 rounded-lg border transition-all flex items-center gap-2 ${
                      isActive 
                        ? status.color === 'green' ? 'border-green-500 bg-green-500/20' :
                          status.color === 'amber' ? 'border-amber-500 bg-amber-500/20' :
                          'border-slate-500 bg-slate-500/20'
                        : 'border-slate-700 hover:border-slate-600'
                    } ${isPendingVerification ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Icon className={`w-4 h-4 ${
                      isActive 
                        ? status.color === 'green' ? 'text-green-400' :
                          status.color === 'amber' ? 'text-amber-400' : 'text-slate-400'
                        : 'text-slate-500'
                    }`} />
                    <span className={`text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>{status.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && availableOrders.length > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {availableOrders.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-slate-700">
            <Link to="/" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl">
              <Home className="w-5 h-5" /> Voir la boutique
            </Link>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl mt-2">
              <LogOut className="w-5 h-5" /> Déconnexion
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-4 lg:p-6">
          <div className="mb-4 flex justify-end">
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Déconnexion
            </Button>
          </div>

          {/* Pending Verification Alert */}
          {isPendingVerification && (
            <div className="mb-4 p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <h3 className="font-bold text-amber-200">Compte en attente de vérification</h3>
                <p className="text-sm text-amber-300/70">Vous ne pouvez pas accepter de commandes pour l'instant.</p>
              </div>
            </div>
          )}

          {/* Map Section */}
          {activeSection === 'map' && (
            <div className="space-y-4">
              {/* Active Orders List (Multiple) */}
              {activeOrders.length > 0 && (
                <div className="space-y-4">
                  {/* Order Selector if multiple */}
                  {activeOrders.length > 1 && (
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                      <p className="text-sm text-slate-400 mb-3">
                        Vous avez <span className="text-blue-400 font-bold">{activeOrders.length}</span> commandes en cours
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activeOrders.map((order) => (
                          <button
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`px-3 py-2 rounded-lg text-sm transition-all ${
                              selectedOrder?.id === order.id 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {order.order_number || `#${order.id?.slice(-8)}`} - {ORDER_STATUSES[order.status]?.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Selected Active Order Card */}
                  {activeOrderForMap && (
                    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">Commande en cours</h3>
                            <p className="text-xs text-slate-400">{activeOrderForMap.order_number || `#${activeOrderForMap.id?.slice(-8)}`}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm ${ORDER_STATUSES[activeOrderForMap.status]?.bgColor} ${ORDER_STATUSES[activeOrderForMap.status]?.textColor}`}>
                          {ORDER_STATUSES[activeOrderForMap.status]?.label}
                        </span>
                      </div>
                      
                      {/* Customer Info */}
                      <div className="p-4 bg-slate-700/30">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-red-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-medium text-white">{activeOrderForMap.delivery_address?.name}</p>
                              <p className="text-sm text-slate-400">{activeOrderForMap.delivery_address?.street}</p>
                              <p className="text-sm text-slate-400">{activeOrderForMap.delivery_address?.city}</p>
                              {activeOrderForMap.delivery_address?.phone && (
                                <p className="text-sm text-green-400 mt-1">📞 {activeOrderForMap.delivery_address?.phone}</p>
                              )}
                              {activeOrderForMap.customer_info?.address?.latitude && activeOrderForMap.customer_info?.address?.longitude && (
                                <p className="text-xs text-slate-500 mt-1">📍 GPS: {activeOrderForMap.customer_info.address.latitude.toFixed(4)}, {activeOrderForMap.customer_info.address.longitude.toFixed(4)}</p>
                              )}
                            </div>
                          </div>
                          <a href={`tel:${activeOrderForMap.delivery_address?.phone}`} className="p-3 bg-green-500/20 rounded-full text-green-400">
                            <Phone className="w-5 h-5" />
                          </a>
                        </div>
                      </div>

                      {/* Vendor Info */}
                      {activeOrderForMap.seller_info && (
                        <div className="p-4 border-t border-slate-700 bg-slate-700/20">
                          <p className="text-xs text-slate-400 mb-2">Récupérer chez :</p>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                              <span className="text-purple-400 font-bold text-sm">
                                {activeOrderForMap.seller_info.name?.[0] || 'V'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white text-sm">{activeOrderForMap.seller_info.name}</p>
                              {activeOrderForMap.seller_info.phone && (
                                <p className="text-sm text-slate-400">📞 {activeOrderForMap.seller_info.phone}</p>
                              )}
                              {activeOrderForMap.seller_info.address && (
                                <p className="text-sm text-slate-400">📍 {activeOrderForMap.seller_info.address}</p>
                              )}
                              {activeOrderForMap.seller_info.location && (
                                <p className="text-xs text-slate-500 mt-1">📍 GPS: {activeOrderForMap.seller_info.location.latitude.toFixed(4)}, {activeOrderForMap.seller_info.location.longitude.toFixed(4)}</p>
                              )}
                            </div>
                            {activeOrderForMap.seller_info.phone && (
                              <a href={`tel:${activeOrderForMap.seller_info.phone}`} className="p-2 bg-purple-500/20 rounded-full text-purple-400">
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Dropshipper Info if applicable */}
                      {activeOrderForMap.dropshipper_info && (
                        <div className="p-4 border-t border-slate-700 bg-slate-700/20">
                          <p className="text-xs text-slate-400 mb-2">Revendeur :</p>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                              <span className="text-amber-400 font-bold text-sm">
                                {activeOrderForMap.dropshipper_info.name?.[0] || 'R'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white text-sm">{activeOrderForMap.dropshipper_info.name}</p>
                              {activeOrderForMap.dropshipper_info.phone && (
                                <p className="text-sm text-slate-400">📞 {activeOrderForMap.dropshipper_info.phone}</p>
                              )}
                              {activeOrderForMap.dropshipper_info.address && (
                                <p className="text-sm text-slate-400">📍 {activeOrderForMap.dropshipper_info.address}</p>
                              )}
                            </div>
                            {activeOrderForMap.dropshipper_info.phone && (
                              <a href={`tel:${activeOrderForMap.dropshipper_info.phone}`} className="p-2 bg-amber-500/20 rounded-full text-amber-400">
                                <Phone className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="p-4 flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs text-slate-400">Total</p>
                          <p className="font-bold text-white text-lg">{formatPrice(activeOrderForMap.total_fcfa)} FCFA</p>
                        </div>
                        
                        {activeOrderForMap.status in ['assigned', 'accepted'] && (
                          <Button
                            onClick={() => handleOrderAction(activeOrderForMap, 'driver-cancel')}
                            disabled={updatingStatus}
                            variant="destructive"
                            size="sm"
                          >
                            {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                            Annuler
                          </Button>
                        )}
                        
                        {ORDER_STATUSES[activeOrderForMap.status]?.action && (
                          <Button
                            onClick={() => handleOrderAction(
                              activeOrderForMap,
                              activeOrderForMap.status === 'assigned' ? 'driver-accept' :
                              activeOrderForMap.status === 'accepted' ? 'pickup' :
                              activeOrderForMap.status === 'picked_up' ? 'in-transit' : 'deliver'
                            )}
                            disabled={updatingStatus}
                            size="lg"
                            className={activeOrderForMap.status === 'in_transit' ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> :
                             activeOrderForMap.status === 'assigned' ? <CheckCircle className="w-5 h-5 mr-2" /> :
                             activeOrderForMap.status === 'accepted' ? <PackageCheck className="w-5 h-5 mr-2" /> :
                             activeOrderForMap.status === 'picked_up' ? <Play className="w-5 h-5 mr-2" /> :
                             <Flag className="w-5 h-5 mr-2" />}
                            {ORDER_STATUSES[activeOrderForMap.status]?.action}
                          </Button>
                        )}
                      </div>
                      
                      {activeOrderForMap.delivery_address?.latitude && (
                        <a
                          href={`geo:${activeOrderForMap.delivery_address.latitude},${activeOrderForMap.delivery_address.longitude}?q=${activeOrderForMap.delivery_address.latitude},${activeOrderForMap.delivery_address.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 text-center text-sm text-blue-400 hover:bg-slate-700/50 border-t border-slate-700"
                        >
                          <Navigation className="w-4 h-4 inline mr-2" />
                          Ouvrir l'itinéraire
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Map */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Map className="w-5 h-5 text-blue-400" />
                    {activeOrders.length > 0 ? 'Navigation' : 'Ma position'}
                  </h3>
                  <div className="flex items-center gap-2">
                    {trackingEnabled && (
                      <span className="flex items-center gap-1 text-xs text-green-400 px-2 py-1 bg-green-500/20 rounded-full">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        GPS
                      </span>
                    )}
                    <Button size="sm" variant="outline" onClick={getCurrentLocation} className="border-slate-600 text-white">
                      <Navigation className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <MapboxMap
                  driverLocation={currentLocation}
                  customerLocation={customerLocation}
                  showRoute={activeOrders.length > 0}
                  height="320px"
                  mapType="satellite"
                  followDriver={true}
                />
                
                <div className="p-3 bg-slate-700/50 flex items-center gap-6 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-slate-300">Ma position</span>
                  </div>
                  {customerLocation && (
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span className="text-slate-300">Client</span>
                    </div>
                  )}
                </div>
              </div>
              
              {activeOrders.length === 0 && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
                  <Package className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-4">Aucune livraison en cours</p>
                  <Button onClick={() => setActiveSection('orders')}>
                    Voir les commandes disponibles
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Orders Section */}
          {activeSection === 'orders' && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-400" />
                    Commandes disponibles ({availableOrders.length})
                  </h3>
                </div>
                
                {availableOrders.length > 0 ? (
                  <div className="divide-y divide-slate-700">
                    {availableOrders.map(order => (
                      <div key={order.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-white">{order.order_number || `#${order.id?.slice(-8)}`}</p>
                            <p className="text-sm text-slate-400">{order.delivery_address?.city}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-white">{formatPrice(order.total_fcfa)} FCFA</p>
                          </div>
                        </div>
                        
                        {/* Seller Information */}
                        {order.seller_info && (
                          <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/20">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-purple-400 font-bold text-sm">
                                  {order.seller_info.name?.[0] || 'V'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-purple-400 mb-1">Récupérer chez :</p>
                                <p className="font-medium text-white text-sm truncate">{order.seller_info.name}</p>
                                {order.seller_info.phone && (
                                  <p className="text-sm text-slate-400">📞 {order.seller_info.phone}</p>
                                )}
                                {order.seller_info.address && (
                                  <p className="text-sm text-slate-400 truncate">📍 {order.seller_info.address}</p>
                                )}
                                {order.seller_info.location && (
                                  <p className="text-xs text-slate-500 mt-1">📍 GPS: {order.seller_info.location.latitude.toFixed(4)}, {order.seller_info.location.longitude.toFixed(4)}</p>
                                )}
                              </div>
                              {order.seller_info.phone && (
                                <a href={`tel:${order.seller_info.phone}`} className="p-2 bg-purple-500/20 rounded-full text-purple-400 shrink-0">
                                  <Phone className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Dropshipper Information if applicable */}
                        {order.dropshipper_info && (
                          <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-amber-400 font-bold text-sm">
                                  {order.dropshipper_info.name?.[0] || 'R'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-amber-400 mb-1">Revendeur :</p>
                                <p className="font-medium text-white text-sm truncate">{order.dropshipper_info.name}</p>
                                {order.dropshipper_info.phone && (
                                  <p className="text-sm text-slate-400">📞 {order.dropshipper_info.phone}</p>
                                )}
                                {order.dropshipper_info.address && (
                                  <p className="text-sm text-slate-400 truncate">📍 {order.dropshipper_info.address}</p>
                                )}
                              </div>
                              {order.dropshipper_info.phone && (
                                <a href={`tel:${order.dropshipper_info.phone}`} className="p-2 bg-amber-500/20 rounded-full text-amber-400 shrink-0">
                                  <Phone className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Customer Information */}
                        {order.customer_info && (
                          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-green-400 font-bold text-sm">
                                  {order.customer_info.name?.[0] || 'C'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-green-400 mb-1">Livrer à :</p>
                                <p className="font-medium text-white text-sm truncate">{order.customer_info.name}</p>
                                {order.customer_info.phone && (
                                  <p className="text-sm text-slate-400">📞 {order.customer_info.phone}</p>
                                )}
                                {order.delivery_address && (
                                  <p className="text-sm text-slate-400 truncate">📍 {order.delivery_address.street}, {order.delivery_address.city}</p>
                                )}
                              </div>
                              {order.customer_info.phone && (
                                <a href={`tel:${order.customer_info.phone}`} className="p-2 bg-green-500/20 rounded-full text-green-400 shrink-0">
                                  <Phone className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        <Button
                          onClick={() => handleOrderAction(order, 'driver-accept')}
                          disabled={updatingStatus || isPendingVerification}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                          Accepter la commande
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <Package className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aucune commande disponible</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages Section */}
          {activeSection === 'messages' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                  Messages
                </h3>
              </div>
              <div className="p-4">
                <MessagesSection token={token} userType="driver" />
              </div>
            </div>
          )}

          {/* History Section */}
          {activeSection === 'history' && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-green-400" />
                  Historique ({completedOrders.length})
                </h3>
              </div>
              
              {completedOrders.length > 0 ? (
                <div className="divide-y divide-slate-700">
                  {completedOrders.map(order => (
                    <div key={order.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{order.order_number || `#${order.id?.slice(-8)}`}</p>
                        <p className="text-sm text-slate-400">{order.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-400">{formatPrice(order.total_fcfa)} FCFA</p>
                        <span className="text-xs text-green-400">Livrée</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Aucune livraison terminée</p>
                </div>
              )}
            </div>
          )}

          {/* Stats Section */}
          {activeSection === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <Package className="w-8 h-8 text-blue-400 mb-3" />
                  <p className="text-3xl font-bold text-white">{stats?.total_deliveries || 0}</p>
                  <p className="text-sm text-slate-400">Livraisons</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <DollarSign className="w-8 h-8 text-emerald-400 mb-3" />
                  <p className="text-3xl font-bold text-white">{formatPrice(stats?.total_earnings || 0)}</p>
                  <p className="text-sm text-slate-400">FCFA gagnés</p>
                </div>
              </div>
              
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="font-bold text-white mb-4">Performance</h3>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Note moyenne</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-white">{driverUser?.rating?.toFixed(1) || '5.0'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Multi-Delivery Section */}
          {activeSection === 'multi' && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-400" />
                    Gestion multi-livraisons
                  </h3>
                  <Button
                    onClick={() => setMultiDeliveryOpen(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-500"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Ouvrir le gestionnaire
                  </Button>
                </div>
                <p className="text-slate-400 text-sm">
                  Optimisez vos routes et gérez plusieurs livraisons simultanément
                </p>
              </div>
            </div>
          )}

          {/* Analytics Section */}
          {activeSection === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    Analytics Dashboard
                  </h3>
                  <Button
                    onClick={() => setAnalyticsOpen(true)}
                    className="bg-gradient-to-r from-blue-500 to-purple-500"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Voir les analytics
                  </Button>
                </div>
                <p className="text-slate-400 text-sm">
                  Analyses détaillées de votre performance livreur
                </p>
              </div>
            </div>
          )}

          {/* Gamification Section */}
          {activeSection === 'gamification' && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    Système de récompenses
                  </h3>
                  <Button
                    onClick={() => setGamificationOpen(true)}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Voir mes récompenses
                  </Button>
                </div>
                <p className="text-slate-400 text-sm">
                  Gagnez des points, débloquez des niveaux et obtenez des avantages
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Integrated Components */}
      <TripartiteChat
        orderId={selectedOrder?.id}
        recipientType={chatRecipient?.type}
        recipientId={chatRecipient?.id}
        recipientName={chatRecipient?.name}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      <DeliveryProof
        orderId={selectedOrder?.id}
        isOpen={deliveryProofOpen}
        onClose={() => setDeliveryProofOpen(false)}
        onSubmit={(data) => console.log('Delivery proof submitted:', data)}
      />

      <MultiDeliveryManager
        isOpen={multiDeliveryOpen}
        onClose={() => setMultiDeliveryOpen(false)}
      />

      <AnalyticsDashboard
        isOpen={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        userRole="driver"
      />

      <GamificationSystem
        isOpen={gamificationOpen}
        onClose={() => setGamificationOpen(false)}
        userRole="driver"
      />
    </div>
  );
};

export default DriverDashboard;
