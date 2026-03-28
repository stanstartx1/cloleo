import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Truck, Package, DollarSign, MapPin, Clock, CheckCircle, 
  XCircle, AlertCircle, Phone, Mail, LogOut, Navigation, 
  Loader2, Star, TrendingUp, Play, Flag, PackageCheck, Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
const API = `${BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const ORDER_STATUSES = {
  pending: { label: 'Disponible', color: 'amber', action: 'Accepter' },
  assigned: { label: 'Acceptée', color: 'blue', action: 'Récupérer colis' },
  picked_up: { label: 'Colis récupéré', color: 'indigo', action: 'Démarrer livraison' },
  in_transit: { label: 'En cours', color: 'purple', action: 'Confirmer livraison' },
  delivered: { label: 'Livrée', color: 'green', action: null },
  cancelled: { label: 'Annulée', color: 'red', action: null }
};

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout, isDriver } = useAuth();
  
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('offline');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState('available');
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarker = useRef(null);
  const customerMarker = useRef(null);
  const directionsRenderer = useRef(null);
  const wsRef = useRef(null);
  const watchIdRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize audio for notifications
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
  }, []);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/driver/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data);
      setCurrentStatus(response.data.user?.status || 'offline');
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Erreur de chargement');
    }
  }, [token]);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/orders?status=${activeTab === 'available' ? 'available' : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.orders || []);
      
      // Find active order (assigned to this driver and not delivered)
      const active = response.data.orders?.find(o => 
        o.driver_id === user?.id && 
        ['assigned', 'picked_up', 'in_transit'].includes(o.status)
      );
      setActiveOrder(active);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, [token, activeTab, user?.id]);

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
  }, [isDriver, navigate, fetchDashboard, fetchOrders]);

  // WebSocket connection
  useEffect(() => {
    if (!user?.id) return;
    
    const connectWebSocket = () => {
      const ws = new WebSocket(`${WS_URL}/ws/driver/${user.id}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        toast.success('Connecté au système de livraison');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_order') {
          // New order available
          setOrders(prev => [data.order, ...prev.filter(o => o.id !== data.order.id)]);
          toast.info('Nouvelle commande disponible !', {
            description: `${data.order.delivery_address?.city} - ${formatPrice(data.order.total_fcfa)} FCFA`
          });
          // Play notification sound
          audioRef.current?.play().catch(() => {});
        }
        
        if (data.type === 'order_taken') {
          // Another driver took the order
          setOrders(prev => prev.filter(o => o.id !== data.order_id));
        }
        
        if (data.type === 'available_orders') {
          setOrders(data.orders || []);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current = ws;
    };
    
    connectWebSocket();
    
    // Keep-alive ping
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
      wsRef.current?.close();
    };
  }, [user?.id]);

  // Geolocation tracking
  useEffect(() => {
    if (!trackingEnabled || !activeOrder) return;
    
    const updateLocation = async (position) => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      setCurrentLocation(location);
      
      // Send to server
      try {
        await axios.post(`${API}/driver/location/update`, location, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Error updating location:', error);
      }
      
      // Also send via WebSocket for faster updates
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'location_update',
          location
        }));
      }
      
      // Update map
      if (driverMarker.current && mapInstance.current) {
        const pos = new window.google.maps.LatLng(location.latitude, location.longitude);
        driverMarker.current.setPosition(pos);
        updateRoute();
      }
    };
    
    // Start watching position
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        updateLocation,
        (error) => console.error('Geolocation error:', error),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    }
    
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [trackingEnabled, activeOrder, token]);

  // Initialize map when active order changes
  useEffect(() => {
    if (!activeOrder || !mapRef.current) return;
    
    const loadMap = () => {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = initMap;
        document.head.appendChild(script);
      } else {
        initMap();
      }
    };
    
    loadMap();
  }, [activeOrder]);

  const initMap = () => {
    if (!activeOrder?.delivery_address) return;
    
    const customerPos = {
      lat: activeOrder.delivery_address.latitude,
      lng: activeOrder.delivery_address.longitude
    };
    
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: customerPos,
      zoom: 14,
      styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
    });
    
    // Customer marker (destination - red)
    customerMarker.current = new window.google.maps.Marker({
      map: mapInstance.current,
      position: customerPos,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new window.google.maps.Size(40, 40)
      },
      title: 'Client'
    });
    
    // Driver marker (current position - blue)
    if (currentLocation) {
      const driverPos = { lat: currentLocation.latitude, lng: currentLocation.longitude };
      
      driverMarker.current = new window.google.maps.Marker({
        map: mapInstance.current,
        position: driverPos,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(40, 40)
        },
        title: 'Ma position'
      });
      
      // Directions
      directionsRenderer.current = new window.google.maps.DirectionsRenderer({
        map: mapInstance.current,
        suppressMarkers: true,
        polylineOptions: { strokeColor: '#4F46E5', strokeWeight: 4 }
      });
      
      updateRoute();
      
      // Fit bounds
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(customerPos);
      bounds.extend(driverPos);
      mapInstance.current.fitBounds(bounds, { padding: 50 });
    }
  };

  const updateRoute = () => {
    if (!activeOrder?.delivery_address || !currentLocation || !window.google) return;
    
    const directionsService = new window.google.maps.DirectionsService();
    
    directionsService.route({
      origin: { lat: currentLocation.latitude, lng: currentLocation.longitude },
      destination: {
        lat: activeOrder.delivery_address.latitude,
        lng: activeOrder.delivery_address.longitude
      },
      travelMode: window.google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === 'OK' && directionsRenderer.current) {
        directionsRenderer.current.setDirections(result);
      }
    });
  };

  const updateDriverStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await axios.put(`${API}/driver/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentStatus(newStatus);
      
      if (newStatus === 'available') {
        setTrackingEnabled(true);
        toast.success('Vous êtes maintenant disponible !');
      } else if (newStatus === 'offline') {
        setTrackingEnabled(false);
        toast.info('Vous êtes hors ligne');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleOrderAction = async (order, action) => {
    setUpdatingStatus(true);
    try {
      let endpoint = '';
      
      switch (action) {
        case 'accept':
          endpoint = `/orders/${order.id}/accept`;
          break;
        case 'pickup':
          endpoint = `/orders/${order.id}/pickup`;
          setTrackingEnabled(true);
          break;
        case 'in-transit':
          endpoint = `/orders/${order.id}/in-transit`;
          break;
        case 'deliver':
          endpoint = `/orders/${order.id}/deliver`;
          setTrackingEnabled(false);
          break;
        default:
          return;
      }
      
      await axios.put(`${API}${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(
        action === 'accept' ? 'Commande acceptée !' :
        action === 'pickup' ? 'Colis récupéré !' :
        action === 'in-transit' ? 'Livraison démarrée !' :
        'Livraison terminée !'
      );
      
      // Refresh data
      await fetchOrders();
      await fetchDashboard();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleLogout = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    logout();
    navigate('/');
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        setCurrentLocation(location);
        toast.success('Position mise à jour');
        
        if (mapInstance.current && driverMarker.current) {
          const pos = new window.google.maps.LatLng(location.latitude, location.longitude);
          driverMarker.current.setPosition(pos);
          mapInstance.current.setCenter(pos);
        }
      },
      (error) => {
        toast.error('Impossible de vous localiser');
      },
      { enableHighAccuracy: true }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-40 rounded-2xl mb-4 bg-slate-800" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-slate-800" />)}
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats;
  const driverUser = dashboard?.user;
  const isPendingVerification = !driverUser?.is_verified || !driverUser?.is_active;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" data-testid="driver-dashboard">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              currentStatus === 'available' ? 'bg-green-500' :
              currentStatus === 'busy' ? 'bg-amber-500' : 'bg-slate-600'
            }`}>
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">Espace Livreur</h1>
              <p className="text-xs text-slate-400">{driverUser?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={getCurrentLocation}
              className="text-slate-400 hover:text-white"
            >
              <Navigation className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Pending Verification Alert */}
        {isPendingVerification && (
          <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-200">Compte en attente de vérification</h3>
              <p className="text-sm text-amber-300/70 mt-1">
                Votre permis est en cours de vérification. Vous ne pouvez pas accepter de commandes pour l'instant.
              </p>
            </div>
          </div>
        )}

        {/* Status Selector */}
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-400">Votre statut</h3>
            {trackingEnabled && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                GPS actif
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'available', label: 'Disponible', color: 'green', icon: CheckCircle },
              { value: 'busy', label: 'Occupé', color: 'amber', icon: Clock },
              { value: 'offline', label: 'Hors ligne', color: 'slate', icon: XCircle },
            ].map((status) => {
              const Icon = status.icon;
              const isActive = currentStatus === status.value;
              const isDisabled = isPendingVerification || updatingStatus;
              
              return (
                <button
                  key={status.value}
                  onClick={() => !isDisabled && updateDriverStatus(status.value)}
                  disabled={isDisabled}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    isActive 
                      ? status.color === 'green' ? 'border-green-500 bg-green-500/20' :
                        status.color === 'amber' ? 'border-amber-500 bg-amber-500/20' :
                        'border-slate-500 bg-slate-500/20'
                      : 'border-slate-700 hover:border-slate-600'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Icon className={`w-5 h-5 ${
                    isActive 
                      ? status.color === 'green' ? 'text-green-400' :
                        status.color === 'amber' ? 'text-amber-400' :
                        'text-slate-400'
                      : 'text-slate-500'
                  }`} />
                  <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {status.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Order with Map */}
        {activeOrder && (
          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Commande en cours</h3>
                  <p className="text-xs text-slate-400">#{activeOrder.order_number}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium bg-${ORDER_STATUSES[activeOrder.status]?.color}-500/20 text-${ORDER_STATUSES[activeOrder.status]?.color}-400`}>
                {ORDER_STATUSES[activeOrder.status]?.label}
              </span>
            </div>
            
            {/* Map */}
            <div ref={mapRef} className="w-full h-64" data-testid="driver-map" />
            
            {/* Customer Info */}
            <div className="p-4 bg-slate-700/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-white">{activeOrder.delivery_address?.name}</p>
                  <p className="text-sm text-slate-400">{activeOrder.delivery_address?.street}</p>
                  <p className="text-sm text-slate-400">
                    {activeOrder.delivery_address?.city}
                  </p>
                </div>
                <a 
                  href={`tel:${activeOrder.delivery_address?.phone}`}
                  className="p-2 bg-green-500/20 rounded-full text-green-400 hover:bg-green-500/30"
                >
                  <Phone className="w-5 h-5" />
                </a>
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-slate-600">
                <div>
                  <p className="text-xs text-slate-400">Total commande</p>
                  <p className="font-bold text-white">{formatPrice(activeOrder.total_fcfa)} FCFA</p>
                </div>
                
                {/* Action Button */}
                {ORDER_STATUSES[activeOrder.status]?.action && (
                  <Button
                    onClick={() => handleOrderAction(
                      activeOrder,
                      activeOrder.status === 'assigned' ? 'pickup' :
                      activeOrder.status === 'picked_up' ? 'in-transit' :
                      'deliver'
                    )}
                    disabled={updatingStatus}
                    className={`${
                      activeOrder.status === 'in_transit' 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    {updatingStatus ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : activeOrder.status === 'assigned' ? (
                      <PackageCheck className="w-4 h-4 mr-2" />
                    ) : activeOrder.status === 'picked_up' ? (
                      <Play className="w-4 h-4 mr-2" />
                    ) : (
                      <Flag className="w-4 h-4 mr-2" />
                    )}
                    {ORDER_STATUSES[activeOrder.status]?.action}
                  </Button>
                )}
              </div>
            </div>
            
            {/* Open in Google Maps */}
            {activeOrder.delivery_address?.latitude && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.delivery_address.latitude},${activeOrder.delivery_address.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 text-center text-sm text-blue-400 hover:bg-slate-700/50 border-t border-slate-700"
              >
                <Navigation className="w-4 h-4 inline mr-2" />
                Ouvrir dans Google Maps
              </a>
            )}
          </div>
        )}

        {/* Orders Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'available' 
                ? 'bg-primary text-white' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4 inline mr-2" />
            Disponibles
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'my' 
                ? 'bg-primary text-white' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Mes livraisons
          </button>
        </div>

        {/* Orders List */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-bold text-white">
              {activeTab === 'available' ? 'Commandes disponibles' : 'Mes livraisons'}
            </h3>
          </div>
          
          {orders.filter(o => 
            activeTab === 'available' 
              ? o.status === 'pending' 
              : o.driver_id === user?.id
          ).length > 0 ? (
            <div className="divide-y divide-slate-700">
              {orders
                .filter(o => 
                  activeTab === 'available' 
                    ? o.status === 'pending' 
                    : o.driver_id === user?.id
                )
                .map((order) => (
                  <div key={order.id} className="p-4 hover:bg-slate-700/30">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-white">#{order.order_number?.slice(-8)}</p>
                        <p className="text-sm text-slate-400">{order.delivery_address?.city}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${ORDER_STATUSES[order.status]?.color}-500/20 text-${ORDER_STATUSES[order.status]?.color}-400`}>
                        {ORDER_STATUSES[order.status]?.label}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-400">
                        {order.items?.length} article(s) • {formatPrice(order.total_fcfa)} FCFA
                      </div>
                      
                      {order.status === 'pending' && !activeOrder && (
                        <Button
                          size="sm"
                          onClick={() => handleOrderAction(order, 'accept')}
                          disabled={updatingStatus || isPendingVerification}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Accepter
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">
                {activeTab === 'available' 
                  ? 'Aucune commande disponible pour le moment'
                  : 'Aucune livraison'}
              </p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <Package className="w-6 h-6 text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats?.total_deliveries || 0}</p>
            <p className="text-xs text-slate-400">Total livraisons</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <DollarSign className="w-6 h-6 text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-white">{formatPrice(stats?.total_earnings || 0)}</p>
            <p className="text-xs text-slate-400">FCFA gagnés</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link 
            to="/"
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-3 hover:bg-slate-700/50 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-white">Voir la boutique</p>
              <p className="text-xs text-slate-400">Cloléo Marketplace</p>
            </div>
          </Link>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="font-medium text-white">Note: {driverUser?.rating?.toFixed(1) || '5.0'}</p>
              <p className="text-xs text-slate-400">{stats?.total_deliveries || 0} avis</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;
