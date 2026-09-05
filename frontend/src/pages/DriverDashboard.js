import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Truck, Package, DollarSign, MapPin, Clock, CheckCircle, 
  XCircle, AlertCircle, Phone, LogOut, Navigation, 
  Loader2, Star, Play, Flag, PackageCheck, Bell,
  Menu, Home, Map, List, History, ChevronRight, X, MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import MapboxMap from '../components/MapboxMap';
import TripartiteChat from '../components/TripartiteChat';
import DeliveryProof from '../components/DeliveryProof';
import { geolocationService } from '../services/geolocationService';
import { notificationService } from '../services/notificationService';
import { useDriverOrders } from '../hooks/useDriverOrders';

import { API_BASE, API_URL, WS_URL } from '../config/api';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const ORDER_STATUSES = {
  pending: { label: 'En attente', action: null, bgColor: 'bg-amber-500/20', textColor: 'text-amber-400' },
  confirmed: { label: 'Confirmée', action: 'Accepter commande', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  assigned: { label: 'Assignée', action: 'Accepter commande', bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400' },
  accepted: { label: 'Acceptée', action: 'Récupérer colis', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
  picked_up: { label: 'Colis récupéré', action: 'Démarrer livraison', bgColor: 'bg-violet-500/20', textColor: 'text-violet-400' },
  in_transit: { label: 'En cours de livraison', action: 'Confirmer livraison', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' },
  delivered: { label: 'Livrée', action: null, bgColor: 'bg-emerald-500/20', textColor: 'text-emerald-400' },
  cancelled: { label: 'Annulée', action: null, bgColor: 'bg-red-500/20', textColor: 'text-red-400' }
};

const NAV_ITEMS = [
  { id: 'map', label: 'Navigation', icon: Map },
  { id: 'orders', label: 'Commandes', icon: Package, badge: true },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'stats', label: 'Gains', icon: DollarSign },
];

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout, isDriver } = useAuth();
  
  const [activeSection, setActiveSection] = useState('map');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]); // Multiple active orders
  const [availableOrders, setAvailableOrders] = useState([]); // Orders available for acceptance
  const [selectedOrder, setSelectedOrder] = useState(null); // Currently focused order
  const [trackingOrder, setTrackingOrder] = useState(null); // Order currently being tracked on map
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [updatingOrderIds, setUpdatingOrderIds] = useState(new Set()); // Track updating orders per-order
  const [currentStatus, setCurrentStatus] = useState('offline');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [driverVehicleType, setDriverVehicleType] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-render trigger
  
  // New component states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState(null);
  const [deliveryProofOpen, setDeliveryProofOpen] = useState(false);
  
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
      // Extract driver vehicle type
      setDriverVehicleType(response.data.user?.vehicle_type || null);
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

  const fetchAvailableOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/driver/available-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📱 [DRIVER] Available orders fetched:', response.data.orders?.length);
      return response.data.orders || [];
    } catch (error) {
      console.error('Error fetching available orders:', error);
      return [];
    }
  }, [token]);

  useEffect(() => {
    if (!isDriver) {
      navigate('/connexion');
      return;
    }

    const init = async () => {
      setLoading(true);
      await fetchDashboard();
      await fetchOrders();

      // Fetch available orders
      const available = await fetchAvailableOrders();
      setAvailableOrders(available);

      // Set driver as online when dashboard loads
      try {
        await axios.put(`${API}/driver/status`, { status: 'available' }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('📱 [DRIVER] Driver set to online/available');
      } catch (error) {
        console.error('Error setting driver online:', error);
      }

      setLoading(false);
    };

    init();
    // Don't request notification permission automatically - it requires user gesture
  }, [isDriver, navigate, fetchDashboard, fetchOrders, fetchAvailableOrders, token]);

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
    orders: wsOrders,
    newOrderAlert,
    connectionStatus: wsConnectionStatus,
    sendLocationUpdate
  } = useDriverOrders(user?.id, token);

  // Accept available order
  const acceptOrder = async (orderId) => {
    try {
      setUpdatingStatus(true);
      const response = await axios.put(`${API}/orders/${orderId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('📱 [DRIVER] Order accepted:', orderId);
      await fetchOrders(); // Refresh orders
      const available = await fetchAvailableOrders();
      setAvailableOrders(available);
    } catch (error) {
      console.error('Error accepting order:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Sync WebSocket orders with local state
  useEffect(() => {
    if (wsOrders.length > 0) {
      console.log('📱 [DRIVER] Syncing WebSocket orders:', wsOrders.length);
      setOrders(wsOrders);
      const active = wsOrders.filter(o =>
        ['assigned', 'accepted', 'picked_up', 'in_transit'].includes(o.status)
      );
      setActiveOrders(active);
      console.log('📱 [DRIVER] Active orders:', active.length);

      // Auto-select first active order if none selected
      if (active.length > 0 && !selectedOrder) {
        console.log('📱 [DRIVER] Auto-selecting first active order:', active[0].id);
        setSelectedOrder(active[0]);
      }
    } else {
      // Also handle the case where orders are confirmed (available for acceptance)
      const available = wsOrders.filter(o =>
        ['confirmed'].includes(o.status)
      );
      if (available.length > 0) {
        console.log('📱 [DRIVER] Available orders for manual acceptance:', available.length);
        setOrders(available);
      }
    }
  }, [wsOrders, selectedOrder]);

  // Real-time order updates using WebSocket - NO POLLING NEEDED
  useEffect(() => {
    if (newOrderAlert) {
      console.log('📱 [DRIVER] New order alert received:', newOrderAlert);
      audioRef.current?.play().catch(() => {});
      // WebSocket handles the order update, no need to fetch
      // fetchOrders();
    }
  }, [newOrderAlert]);

  // Send location updates via WebSocket when available
  useEffect(() => {
    if (wsConnectionStatus === 'connected' && currentLocation) {
      sendLocationUpdate(currentLocation);
    }
  }, [currentLocation, wsConnectionStatus, sendLocationUpdate]);

  // NO POLLING - WebSocket handles all real-time updates
  // Removed polling interval to rely entirely on WebSocket

  // REMOVED: Automatic GPS request on mount
  // GPS will only be requested when driver explicitly navigates to delivery mode
  // This prevents permission popup on login

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
              // Don't show toast for common timeout issues
              console.log('GPS temporarily unavailable, will retry automatically');
            }
          }, { enableHighAccuracy: false, timeout: 15000 });
        } else if (error.code === 1) {
          // Permission denied
          console.log('GPS permission denied');
        } else if (error.code === 2) {
          // Position unavailable
          console.log('GPS position unavailable, will retry automatically');
        } else {
          console.log('GPS temporarily unavailable, will retry automatically');
        }
      }, { enableHighAccuracy: true, timeout: 10000 });
      
      // Watch position changes
      watchIdRef.current = navigator.geolocation.watchPosition(updateLocation, (error) => {
        console.error('Geolocation watch error:', error);
        if (error.code === 3) {
          // Timeout during watch - silent retry
          console.log('Geolocation watch timeout, will retry automatically');
        } else if (error.code === 1) {
          // Permission denied during watch
          console.log('GPS permission denied during watch');
        } else {
          console.log('GPS watch error, will retry automatically');
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
        // REMOVED: Automatic GPS request when becoming available
        // GPS will be requested when driver explicitly accepts an order
      } else if (newStatus === 'busy') {
        setTrackingEnabled(true);
      } else if (newStatus === 'offline') {
        setTrackingEnabled(false);
      }
    } catch (error) {
      console.error('Status update error:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleOrderAction = async (order, action) => {
    console.log('📱 [DRIVER ACTION] Handling action:', action, 'for order:', order.id);
    
    // Set per-order updating status
    setUpdatingOrderIds(prev => new Set([...prev, order.id]));
    
    const statusMap = {
      'driver-accept': 'accepted',
      'pickup': 'picked_up', 
      'in-transit': 'in_transit',
      'deliver': 'delivered'
    };
    
    try {
      let endpoint = '';
      let payload = {};
      
      // Optimistic update - update UI immediately
      if (statusMap[action]) {
        const newStatus = statusMap[action];
        console.log('📱 [DRIVER ACTION] Optimistic update to status:', newStatus);
        
        // Update selected order
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
        
        // Update orders list
        setOrders(prev => prev.map(o => 
          o.id === order.id ? { ...o, status: newStatus } : o
        ));
        
        // Update active orders
        setActiveOrders(prev => prev.map(o => 
          o.id === order.id ? { ...o, status: newStatus } : o
        ));
        
        // Force re-render by incrementing the counter
        setForceUpdate(prev => {
          const newValue = prev + 1;
          console.log('📱 [DRIVER ACTION] Force re-render trigger:', newValue);
          return newValue;
        });
      }
      
      switch (action) {
        case 'driver-accept': 
          endpoint = `/orders/${order.id}/driver-start`; 
          setTrackingEnabled(true);
          
          // Request GPS with explicit permission request - synchronous with device
          if (navigator.geolocation) {
            // Use watchPosition for continuous updates
            const watchId = navigator.geolocation.watchPosition(
              async (position) => {
                const location = {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy
                };
                setCurrentLocation(location);
                
                // Update backend with location
                try {
                  await axios.post(`${API}/driver/location/update`, location, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  console.log('📍 GPS position synced:', location);
                } catch (error) {
                  console.error('GPS sync error:', error);
                }
              },
              (error) => {
                console.error('GPS error:', error);
                // Stop watching if permission denied
                if (error.code === 1) {
                  navigator.geolocation.clearWatch(watchId);
                }
              },
              { 
                enableHighAccuracy: true, 
                timeout: 10000, 
                maximumAge: 0
              }
            );
            
            // Store watch ID for cleanup
            window.currentGpsWatchId = watchId;
          }
          break;
        case 'pickup': 
          endpoint = `/orders/${order.id}/pickup`; 
          setTrackingEnabled(true);
          
          // Request GPS when picking up
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
              console.error,
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }
          break;
        case 'in-transit': 
          endpoint = `/orders/${order.id}/in-transit`; 
          setTrackingEnabled(true);
          
          // Request GPS when starting transit
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
              console.error,
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }
          break;
        case 'deliver': 
          // Require PIN verification before delivery
          const pin = prompt("Entrez le code de livraison du client (code à 6 chiffres) :");
          if (!pin) {
            console.log('PIN verification cancelled');
            setUpdatingOrderIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(order.id);
              return newSet;
            });
            // Revert optimistic update
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: order.status } : o));
            setActiveOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: order.status } : o));
            setSelectedOrder(order);
            return;
          }
          
          // Verify PIN first
          try {
            const verifyResponse = await axios.post(
              `${API}/orders/${order.id}/verify-delivery-pin`,
              { pin },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (!verifyResponse.data.verified) {
              console.log('PIN verification failed');
              setUpdatingOrderIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(order.id);
                return newSet;
              });
              // Revert optimistic update
              setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: order.status } : o));
              setActiveOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: order.status } : o));
              setSelectedOrder(order);
              return;
            }
          } catch (error) {
            console.error('PIN verification error:', error);
            setUpdatingOrderIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(order.id);
              return newSet;
            });
            // Revert optimistic update
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: order.status } : o));
            setActiveOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: order.status } : o));
            setSelectedOrder(order);
            return;
          }
          
          endpoint = `/orders/${order.id}/deliver`; 
          break;
        case 'driver-cancel': 
          endpoint = `/orders/${order.id}/driver-cancel`;
          const reason = prompt("Veuillez indiquer la raison de l'annulation (ex: accident, problème véhicule) :");
          if (!reason) {
            console.log('Cancellation cancelled');
            setUpdatingOrderIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(order.id);
              return newSet;
            });
            // Revert optimistic update
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: order.status } : o));
            setActiveOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: order.status } : o));
            setSelectedOrder(order);
            return;
          }
          payload = { reason };
          break;
        default: return;
      }
      
      const response = await axios.put(`${API}${endpoint}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      console.log('📱 [DRIVER ACTION] API response:', response.data);
      console.log('📱 [DRIVER ACTION] Order status updated to:', response.data.status || statusMap[action]);

      // Verify status sync with backend
      if (response.data && response.data.status) {
        console.log('📱 [DRIVER ACTION] Backend confirmed status:', response.data.status);
        
        // Update local state to match backend response
        const backendStatus = response.data.status;
        setSelectedOrder(prev => prev ? { ...prev, status: backendStatus } : null);
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: backendStatus } : o));
        setActiveOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: backendStatus } : o));
      }
      
      if (action === 'driver-cancel') {
        setSelectedOrder(null);
        // Remove from orders list
        setOrders(prev => prev.filter(o => o.id !== order.id));
        setActiveOrders(prev => prev.filter(o => o.id !== order.id));
      } else if (action === 'deliver') {
        setSelectedOrder(null);
        // Remove from active orders when delivered
        setActiveOrders(prev => prev.filter(o => o.id !== order.id));
      }
      
      // No need to fetchOrders() - WebSocket will handle updates
      // await fetchOrders();
      // await fetchDashboard();
      
    } catch (error) {
      console.error('📱 [DRIVER ACTION] Error:', error);
      
      // Revert optimistic update on error
      if (statusMap[action]) {
        setOrders(prev => prev.map(o => 
          o.id === order.id ? { ...o, status: order.status } : o
        ));
        setActiveOrders(prev => prev.map(o => 
          o.id === order.id ? { ...o, status: order.status } : o
        ));
        setSelectedOrder(order);
      }
    } finally {
      setUpdatingOrderIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(order.id);
        return newSet;
      });
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      () => console.log('Failed to get location'),
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
  const completedOrders = orders.filter(o => o.driver_id === user?.id && o.status === 'delivered');

  // Use selected order for map navigation, fallback to first active order
  const activeOrderForMap = selectedOrder || activeOrders[0];
  const customerLocation = activeOrderForMap?.delivery_address ? {
    latitude: activeOrderForMap.delivery_address.latitude,
    longitude: activeOrderForMap.delivery_address.longitude
  } : null;

  console.log('🗺️ [DRIVER MAP] Map state:', {
    currentLocation,
    customerLocation,
    activeOrdersCount: activeOrders.length,
    activeOrderForMap: activeOrderForMap?.id,
    activeOrderForMapStatus: activeOrderForMap?.status,
    showRoute: activeOrders.length > 0,
    driverVehicleType
  });

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
        <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 min-h-screen fixed left-0 top-0">
          {/* Logo */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                currentStatus === 'available' ? 'bg-gradient-to-br from-green-500 to-emerald-600' :
                currentStatus === 'busy' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-slate-700'
              } shadow-lg`}>
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg">Espace Livreur</h1>
                <p className="text-xs text-slate-400">{driverUser?.name}</p>
              </div>
            </div>
          </div>

          {/* Status Selector */}
          <div className="p-4 border-b border-slate-700">
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Statut</p>
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
                    className={`w-full p-3 rounded-xl border transition-all flex items-center gap-3 ${
                      isActive 
                        ? status.color === 'green' ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/20' :
                          status.color === 'amber' ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/20' :
                          'border-slate-500 bg-slate-500/10'
                        : 'border-slate-700 hover:border-slate-600 hover:bg-slate-700/50'
                    } ${isPendingVerification ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Icon className={`w-5 h-5 ${
                      isActive 
                        ? status.color === 'green' ? 'text-green-400' :
                          status.color === 'amber' ? 'text-amber-400' : 'text-slate-400'
                        : 'text-slate-500'
                    }`} />
                    <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>{status.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left font-medium">{item.label}</span>
                  {item.badge && availableOrders.length > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                      {availableOrders.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-slate-700 space-y-2">
            <Link to="/" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all">
              <Home className="w-5 h-5" /> <span className="font-medium">Voir la boutique</span>
            </Link>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
              <LogOut className="w-5 h-5" /> <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
          <div className="p-4 lg:p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">
                {activeSection === 'map' ? 'Navigation' :
                 activeSection === 'orders' ? 'Commandes disponibles' :
                 activeSection === 'messages' ? 'Messages' :
                 activeSection === 'history' ? 'Historique des livraisons' :
                 activeSection === 'stats' ? 'Vos gains' : 'Tableau de bord'}
              </h1>
              <p className="text-slate-600">
                {activeSection === 'map' ? 'Suivez votre position et gérez vos livraisons' :
                 activeSection === 'orders' ? 'Acceptez et gérez les nouvelles commandes' :
                 activeSection === 'messages' ? 'Communiquez avec vos clients' :
                 activeSection === 'history' ? 'Consultez vos livraisons passées' :
                 activeSection === 'stats' ? 'Vos statistiques de revenus' : 'Bienvenue'}
              </p>
            </div>

          {/* Pending Verification Alert */}
          {isPendingVerification && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <h3 className="font-bold text-amber-800">Compte en attente de vérification</h3>
                <p className="text-sm text-amber-700">Vous ne pouvez pas accepter de commandes pour l'instant.</p>
              </div>
            </div>
          )}

          {/* Map Section */}
          {activeSection === 'map' && (
            <div className="space-y-6">
              {/* Active Orders List (Multiple) */}
              {activeOrders.length > 0 && (
                <div className="space-y-4">
                  {/* Order Selector if multiple */}
                  {activeOrders.length > 1 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                      <p className="text-sm text-slate-600 mb-3">
                        Vous avez <span className="text-blue-600 font-bold">{activeOrders.length}</span> commandes en cours
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activeOrders.map((order) => (
                          <button
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              selectedOrder?.id === order.id 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                            <Package className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">Commande en cours</h3>
                            <p className="text-sm text-slate-600">{activeOrderForMap.order_number || `#${activeOrderForMap.id?.slice(-8)}`}</p>
                          </div>
                        </div>
                        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${ORDER_STATUSES[activeOrderForMap.status]?.bgColor} ${ORDER_STATUSES[activeOrderForMap.status]?.textColor}`}>
                          {ORDER_STATUSES[activeOrderForMap.status]?.label}
                        </span>
                      </div>
                      
                      {/* Customer Info */}
                      <div className="p-5 bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                              <MapPin className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">{activeOrderForMap.delivery_address?.name}</p>
                              <p className="text-sm text-slate-600">{activeOrderForMap.delivery_address?.street}</p>
                              <p className="text-sm text-slate-600">{activeOrderForMap.delivery_address?.city}</p>
                              {activeOrderForMap.delivery_address?.phone && (
                                <p className="text-sm text-green-600 mt-2 font-medium">� {activeOrderForMap.delivery_address?.phone}</p>
                              )}
                            </div>
                          </div>
                          <a href={`tel:${activeOrderForMap.delivery_address?.phone}`} className="p-3 bg-green-100 rounded-xl text-green-600 hover:bg-green-200 transition-colors">
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
                              {activeOrderForMap.seller_info.location && activeOrderForMap.seller_info.location.latitude && activeOrderForMap.seller_info.location.longitude ? (
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-slate-500">📍 GPS: {activeOrderForMap.seller_info.location.latitude.toFixed(4)}, {activeOrderForMap.seller_info.location.longitude.toFixed(4)}</p>
                                  <a
                                    href={`geo:${activeOrderForMap.seller_info.location.latitude},${activeOrderForMap.seller_info.location.longitude}?q=${activeOrderForMap.seller_info.location.latitude},${activeOrderForMap.seller_info.location.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-purple-400 hover:text-purple-300"
                                  >
                                    <Navigation className="w-3 h-3 inline" />
                                  </a>
                                </div>
                              ) : (
                                <p className="text-xs text-amber-500 mt-1">⚠️ Localisation non disponible</p>
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
                        
                        {ORDER_STATUSES[activeOrderForMap.status]?.action && (
                          <Button
                            onClick={() => handleOrderAction(
                              activeOrderForMap,
                              activeOrderForMap.status === 'assigned' ? 'driver-accept' :
                              activeOrderForMap.status === 'accepted' ? 'pickup' :
                              activeOrderForMap.status === 'picked_up' ? 'in-transit' : 'deliver'
                            )}
                            disabled={updatingOrderIds.has(activeOrderForMap.id)}
                            size="lg"
                            className={activeOrderForMap.status === 'in_transit' ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            {updatingOrderIds.has(activeOrderForMap.id) ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> :
                             activeOrderForMap.status === 'assigned' ? <CheckCircle className="w-5 h-5 mr-2" /> :
                             activeOrderForMap.status === 'accepted' ? <PackageCheck className="w-5 h-5 mr-2" /> :
                             activeOrderForMap.status === 'picked_up' ? <Play className="w-5 h-5 mr-2" /> :
                             <Flag className="w-5 h-5 mr-2" />}
                            {ORDER_STATUSES[activeOrderForMap.status]?.action}
                          </Button>
                        )}
                        
                        {/* Only show cancel button for assigned/accepted status */}
                        {activeOrderForMap.status === 'assigned' && (
                          <Button
                            onClick={() => handleOrderAction(activeOrderForMap, 'driver-cancel')}
                            disabled={updatingOrderIds.has(activeOrderForMap.id)}
                            variant="destructive"
                            size="sm"
                            className="mt-2"
                          >
                            {updatingOrderIds.has(activeOrderForMap.id) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                            Annuler la commande
                          </Button>
                        )}
                      </div>
                      
                      {activeOrderForMap.delivery_address?.latitude && activeOrderForMap.delivery_address?.longitude && (
                        <Button
                          onClick={() => setTrackingOrder(activeOrderForMap)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          Suivre l'itinéraire
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeOrders.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune livraison en cours</h3>
              <p className="text-slate-600 mb-4">Vous n'avez pas de commandes actives pour le moment</p>
              <Button onClick={() => setActiveSection('orders')} className="bg-blue-600 hover:bg-blue-700">
                Voir les commandes disponibles
              </Button>
            </div>
          )}
            </div>
          )}

          {/* Orders Section */}
          {activeSection === 'orders' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-600" />
                    Commandes disponibles ({availableOrders.length})
                  </h3>
                </div>
                
                {availableOrders.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {availableOrders.map(order => (
                      <div key={order.id} className="p-5 space-y-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-slate-900">{order.order_number || `#${order.id?.slice(-8)}`}</p>
                            <p className="text-sm text-slate-600">{order.delivery_address?.city}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">{formatPrice(order.total_fcfa)} FCFA</p>
                          </div>
                        </div>
                        
                        {/* Seller Information */}
                        {order.seller_info && (
                          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                                <span className="text-purple-600 font-bold text-sm">
                                  {order.seller_info.name?.[0] || 'V'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-purple-600 mb-1 font-medium">Récupérer chez :</p>
                                <p className="font-semibold text-slate-900 text-sm truncate">{order.seller_info.name}</p>
                                {order.seller_info.phone && (
                                  <p className="text-sm text-slate-600">📞 {order.seller_info.phone}</p>
                                )}
                                {order.seller_info.address && (
                                  <p className="text-sm text-slate-600 truncate">📍 {order.seller_info.address}</p>
                                )}
                                {order.seller_info.location && order.seller_info.location.latitude && order.seller_info.location.longitude ? (
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-slate-500">📍 GPS: {order.seller_info.location.latitude.toFixed(4)}, {order.seller_info.location.longitude.toFixed(4)}</p>
                                    <a
                                      href={`geo:${order.seller_info.location.latitude},${order.seller_info.location.longitude}?q=${order.seller_info.location.latitude},${order.seller_info.location.longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-purple-600 hover:text-purple-700"
                                    >
                                      <Navigation className="w-3 h-3 inline" />
                                    </a>
                                  </div>
                                ) : (
                                  <p className="text-xs text-amber-600 mt-1">⚠️ Localisation non disponible</p>
                                )}
                              </div>
                              {order.seller_info.phone && (
                                <a href={`tel:${order.seller_info.phone}`} className="p-2 bg-purple-100 rounded-xl text-purple-600 hover:bg-purple-200 transition-colors shrink-0">
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
                          onClick={() => acceptOrder(order.id)}
                          disabled={updatingStatus}
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
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune commande disponible</h3>
                    <p className="text-slate-600">Revenez plus tard pour voir les nouvelles commandes</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tracking Map Modal */}
          {trackingOrder && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      <Navigation className="w-5 h-5 text-blue-600" />
                      Suivre l'itinéraire
                    </h3>
                    <p className="text-sm text-slate-600">Commande #{trackingOrder.order_number || trackingOrder.id?.slice(-8)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTrackingOrder(null)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="p-4">
                  <MapboxMap
                    driverLocation={currentLocation}
                    customerLocation={trackingOrder.delivery_address ? {
                      latitude: trackingOrder.delivery_address.latitude,
                      longitude: trackingOrder.delivery_address.longitude
                    } : null}
                    showRoute={!!currentLocation && !!trackingOrder.delivery_address?.latitude}
                    height="500px"
                    mapType="streets"
                    followDriver={true}
                    driverVehicleType={driverVehicleType}
                  />
                </div>

                <div className="p-4 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-lg">
                        {driverVehicleType === 'moto' ? '🏍️' : driverVehicleType === 'velo' ? '🚲' : driverVehicleType === 'voiture' ? '🚗' : '📦'}
                      </div>
                      <span className="text-slate-700 font-medium">Ma position</span>
                    </div>
                    {trackingOrder.delivery_address?.latitude && (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-lg">👤</div>
                        <span className="text-slate-700 font-medium">Client</span>
                      </div>
                    )}
                  </div>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${trackingOrder.delivery_address?.latitude},${trackingOrder.delivery_address?.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Ouvrir dans Google Maps
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Messages Section */}
          {activeSection === 'messages' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-pink-50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-600" />
                  Messages de commande
                </h3>
              </div>
              <div className="p-5">
                {activeOrders.length > 0 ? (
                  <div className="space-y-4">
                    {activeOrders.map(order => (
                      <div key={order.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold text-slate-900">{order.order_number || `#${order.id?.slice(-8)}`}</p>
                            <p className="text-sm text-slate-600">{order.customer_name || order.delivery_address?.name}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setChatRecipient({
                                type: 'customer',
                                id: order.customer_id,
                                name: order.customer_name || order.delivery_address?.name
                              });
                              setChatOpen(true);
                            }}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Discuter
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune commande active</h3>
                    <p className="text-slate-600">Vous devez avoir une commande active pour discuter avec les clients</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Section */}
          {activeSection === 'history' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-green-600" />
                  Historique ({completedOrders.length})
                </h3>
              </div>
              
              {completedOrders.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {completedOrders.map(order => (
                    <div key={order.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="font-semibold text-slate-900">{order.order_number || `#${order.id?.slice(-8)}`}</p>
                        <p className="text-sm text-slate-600">{order.customer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatPrice(order.total_fcfa)} FCFA</p>
                        <span className="text-xs text-green-600 font-medium">Livrée</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune livraison terminée</h3>
                  <p className="text-slate-600">Vos livraisons complétées apparaîtront ici</p>
                </div>
              )}
            </div>
          )}

          {/* Stats Section */}
          {activeSection === 'stats' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Package className="w-7 h-7 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-slate-900">{stats?.total_deliveries || 0}</p>
                      <p className="text-sm text-slate-600 font-medium">Livraisons totales</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-7 h-7 text-green-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-slate-900">{formatPrice(stats?.total_earnings || 0)}</p>
                      <p className="text-sm text-slate-600 font-medium">FCFA gagnés</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-4">Performance</h3>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Note moyenne</span>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-slate-900 text-lg">{driverUser?.rating?.toFixed(1) || '5.0'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Integrated Components */}
      <TripartiteChat
        orderId={selectedOrder?.id}
        recipientType={chatRecipient?.type || 'customer'}
        recipientId={chatRecipient?.id || selectedOrder?.customer_id}
        recipientName={chatRecipient?.name || selectedOrder?.customer_name || selectedOrder?.delivery_address?.name}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      <DeliveryProof
        orderId={selectedOrder?.id}
        isOpen={deliveryProofOpen}
        onClose={() => setDeliveryProofOpen(false)}
        onSubmit={(data) => console.log('Delivery proof submitted:', data)}
      />
    </div>
  );
};

export default DriverDashboard;
