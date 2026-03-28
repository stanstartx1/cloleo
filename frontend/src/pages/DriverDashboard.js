import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Truck, Package, DollarSign, MapPin, Clock, CheckCircle, 
  XCircle, AlertCircle, Phone, LogOut, Navigation, 
  Loader2, Star, TrendingUp, Play, Flag, PackageCheck, Bell,
  Menu, Home, Settings, User, Map, List, History, ChevronRight
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
  pending: { label: 'Disponible', color: 'amber', action: 'Accepter', bgColor: 'bg-amber-500/20', textColor: 'text-amber-400' },
  assigned: { label: 'Acceptée', color: 'blue', action: 'Récupérer colis', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  picked_up: { label: 'Colis récupéré', color: 'indigo', action: 'Démarrer livraison', bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400' },
  in_transit: { label: 'En cours', color: 'purple', action: 'Confirmer livraison', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' },
  delivered: { label: 'Livrée', color: 'green', action: null, bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
  cancelled: { label: 'Annulée', color: 'red', action: null, bgColor: 'bg-red-500/20', textColor: 'text-red-400' }
};

// Sidebar Navigation Items
const NAV_ITEMS = [
  { id: 'map', label: 'Carte & Navigation', icon: Map },
  { id: 'orders', label: 'Commandes', icon: Package, badge: true },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'stats', label: 'Mes gains', icon: DollarSign },
  { id: 'profile', label: 'Mon profil', icon: User },
];

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout, isDriver } = useAuth();
  
  const [activeSection, setActiveSection] = useState('map');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('offline');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  
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
      const response = await axios.get(`${API}/orders`, {
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
  }, [token, user?.id]);

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
          setOrders(prev => [data.order, ...prev.filter(o => o.id !== data.order.id)]);
          toast.info('Nouvelle commande disponible !', {
            description: `${data.order.delivery_address?.city} - ${formatPrice(data.order.total_fcfa)} FCFA`
          });
          audioRef.current?.play().catch(() => {});
        }
        
        if (data.type === 'order_taken') {
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
    if (!trackingEnabled) return;
    
    const updateLocation = async (position) => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      setCurrentLocation(location);
      
      // Update driver marker on map
      if (driverMarker.current && mapInstance.current && window.google) {
        const pos = new window.google.maps.LatLng(location.latitude, location.longitude);
        driverMarker.current.setPosition(pos);
        
        // Update route if active order
        if (activeOrder) {
          updateRoute(location);
        }
      }
      
      // Send to server
      try {
        await axios.post(`${API}/driver/location/update`, location, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Error updating location:', error);
      }
      
      // Also send via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'location_update',
          location
        }));
      }
    };
    
    if (navigator.geolocation) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        updateLocation,
        (error) => console.error('Geolocation error:', error),
        { enableHighAccuracy: true }
      );
      
      // Watch position
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

  // Initialize map
  useEffect(() => {
    if (activeSection !== 'map' || !mapRef.current) return;
    
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
  }, [activeSection]);

  const initMap = () => {
    if (!mapRef.current || mapInstance.current) return;
    
    // Default to Abidjan or current location
    const defaultLocation = currentLocation 
      ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
      : { lat: 5.3599, lng: -4.0083 };
    
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: defaultLocation,
      zoom: 14,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] }
      ],
      mapTypeControl: false,
      streetViewControl: false
    });
    
    // Driver marker (blue)
    driverMarker.current = new window.google.maps.Marker({
      map: mapInstance.current,
      position: defaultLocation,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
        scaledSize: new window.google.maps.Size(45, 45)
      },
      title: 'Ma position'
    });
    
    // Customer marker (red) - will be updated when order is selected
    if (activeOrder?.delivery_address) {
      const customerPos = {
        lat: activeOrder.delivery_address.latitude,
        lng: activeOrder.delivery_address.longitude
      };
      
      customerMarker.current = new window.google.maps.Marker({
        map: mapInstance.current,
        position: customerPos,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
          scaledSize: new window.google.maps.Size(45, 45)
        },
        title: 'Client'
      });
      
      // Directions
      directionsRenderer.current = new window.google.maps.DirectionsRenderer({
        map: mapInstance.current,
        suppressMarkers: true,
        polylineOptions: { strokeColor: '#4F46E5', strokeWeight: 5 }
      });
      
      if (currentLocation) {
        updateRoute(currentLocation);
      }
      
      // Fit bounds
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(defaultLocation);
      bounds.extend(customerPos);
      mapInstance.current.fitBounds(bounds, { padding: 60 });
    }
  };

  const updateRoute = (driverLoc) => {
    if (!activeOrder?.delivery_address || !window.google || !directionsRenderer.current) return;
    
    const directionsService = new window.google.maps.DirectionsService();
    
    directionsService.route({
      origin: { lat: driverLoc.latitude, lng: driverLoc.longitude },
      destination: {
        lat: activeOrder.delivery_address.latitude,
        lng: activeOrder.delivery_address.longitude
      },
      travelMode: window.google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if (status === 'OK') {
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
      
      await fetchOrders();
      await fetchDashboard();
      
      // Reset map if delivered
      if (action === 'deliver') {
        setActiveOrder(null);
        if (customerMarker.current) {
          customerMarker.current.setMap(null);
          customerMarker.current = null;
        }
        if (directionsRenderer.current) {
          directionsRenderer.current.setDirections({ routes: [] });
        }
      }
      
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
          mapInstance.current.setZoom(16);
        }
      },
      (error) => {
        toast.error('Impossible de vous localiser');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleLogout = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
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
  const availableOrders = orders.filter(o => o.status === 'pending');
  const myActiveOrders = orders.filter(o => o.driver_id === user?.id && ['assigned', 'picked_up', 'in_transit'].includes(o.status));
  const completedOrders = orders.filter(o => o.driver_id === user?.id && o.status === 'delivered');

  // Render Map Section
  const renderMap = () => (
    <div className="space-y-4">
      {/* Active Order Card */}
      {activeOrder && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-white">Commande en cours</h3>
                <p className="text-xs text-slate-400">#{activeOrder.order_number?.slice(-8)}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${ORDER_STATUSES[activeOrder.status]?.bgColor} ${ORDER_STATUSES[activeOrder.status]?.textColor}`}>
              {ORDER_STATUSES[activeOrder.status]?.label}
            </span>
          </div>
          
          {/* Customer Info */}
          <div className="p-4 bg-slate-700/30">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="font-medium text-white">{activeOrder.delivery_address?.name}</p>
                  <p className="text-sm text-slate-400">{activeOrder.delivery_address?.street}</p>
                  <p className="text-sm text-slate-400">{activeOrder.delivery_address?.city}</p>
                </div>
              </div>
              <a 
                href={`tel:${activeOrder.delivery_address?.phone}`}
                className="p-3 bg-green-500/20 rounded-full text-green-400 hover:bg-green-500/30"
              >
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          {/* Action Button */}
          <div className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Total commande</p>
              <p className="font-bold text-white text-lg">{formatPrice(activeOrder.total_fcfa)} FCFA</p>
            </div>
            
            {ORDER_STATUSES[activeOrder.status]?.action && (
              <Button
                onClick={() => handleOrderAction(
                  activeOrder,
                  activeOrder.status === 'assigned' ? 'pickup' :
                  activeOrder.status === 'picked_up' ? 'in-transit' :
                  'deliver'
                )}
                disabled={updatingStatus}
                size="lg"
                className={`${
                  activeOrder.status === 'in_transit' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-primary hover:bg-primary/90'
                }`}
              >
                {updatingStatus ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : activeOrder.status === 'assigned' ? (
                  <PackageCheck className="w-5 h-5 mr-2" />
                ) : activeOrder.status === 'picked_up' ? (
                  <Play className="w-5 h-5 mr-2" />
                ) : (
                  <Flag className="w-5 h-5 mr-2" />
                )}
                {ORDER_STATUSES[activeOrder.status]?.action}
              </Button>
            )}
          </div>
          
          {/* Open in Google Maps */}
          {activeOrder.delivery_address?.latitude && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrder.delivery_address.latitude},${activeOrder.delivery_address.longitude}&travelmode=driving`}
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
      
      {/* Map */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Map className="w-5 h-5 text-blue-400" />
            Ma position
          </h3>
          <div className="flex items-center gap-2">
            {trackingEnabled && (
              <span className="flex items-center gap-1 text-xs text-green-400 px-2 py-1 bg-green-500/20 rounded-full">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                GPS actif
              </span>
            )}
            <Button size="sm" variant="outline" onClick={getCurrentLocation} className="border-slate-600 text-white">
              <Navigation className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div ref={mapRef} className="w-full h-96" data-testid="driver-map" />
        
        {/* Legend */}
        <div className="p-3 bg-slate-700/50 flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-slate-300">Ma position</span>
          </div>
          {activeOrder && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-slate-300">Destination client</span>
            </div>
          )}
        </div>
      </div>
      
      {/* No active order message */}
      {!activeOrder && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <Package className="w-16 h-16 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">Aucune livraison en cours</p>
          <Button onClick={() => setActiveSection('orders')}>
            Voir les commandes disponibles
          </Button>
        </div>
      )}
    </div>
  );

  // Render Orders Section
  const renderOrders = () => (
    <div className="space-y-6">
      {/* Available Orders */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Commandes disponibles ({availableOrders.length})
          </h3>
        </div>
        
        {availableOrders.length > 0 ? (
          <div className="divide-y divide-slate-700">
            {availableOrders.map(order => (
              <div key={order.id} className="p-4 hover:bg-slate-700/30">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-white">#{order.order_number?.slice(-8)}</p>
                    <p className="text-sm text-slate-400">{order.delivery_address?.city}</p>
                    <p className="text-sm text-slate-400">{order.items?.length} article(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{formatPrice(order.total_fcfa)} FCFA</p>
                    <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs ${ORDER_STATUSES[order.status]?.bgColor} ${ORDER_STATUSES[order.status]?.textColor}`}>
                      Disponible
                    </span>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleOrderAction(order, 'accept')}
                  disabled={updatingStatus || isPendingVerification || !!activeOrder}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {updatingStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Accepter cette commande
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Aucune commande disponible</p>
            <p className="text-sm text-slate-500 mt-1">Les nouvelles commandes apparaîtront ici</p>
          </div>
        )}
      </div>

      {/* My Active Orders */}
      {myActiveOrders.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-400" />
              Mes livraisons en cours ({myActiveOrders.length})
            </h3>
          </div>
          
          <div className="divide-y divide-slate-700">
            {myActiveOrders.map(order => (
              <div key={order.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-white">#{order.order_number?.slice(-8)}</p>
                    <p className="text-sm text-slate-400">{order.customer_name}</p>
                    <p className="text-sm text-slate-400">{order.delivery_address?.street}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${ORDER_STATUSES[order.status]?.bgColor} ${ORDER_STATUSES[order.status]?.textColor}`}>
                    {ORDER_STATUSES[order.status]?.label}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setActiveOrder(order);
                      setActiveSection('map');
                    }}
                    variant="outline"
                    className="flex-1 border-slate-600"
                  >
                    <MapPin className="w-4 h-4 mr-2" /> Voir sur carte
                  </Button>
                  
                  {ORDER_STATUSES[order.status]?.action && (
                    <Button
                      onClick={() => handleOrderAction(
                        order,
                        order.status === 'assigned' ? 'pickup' :
                        order.status === 'picked_up' ? 'in-transit' :
                        'deliver'
                      )}
                      disabled={updatingStatus}
                      className="flex-1"
                    >
                      {ORDER_STATUSES[order.status]?.action}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render History Section
  const renderHistory = () => (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-green-400" />
            Livraisons terminées ({completedOrders.length})
          </h3>
        </div>
        
        {completedOrders.length > 0 ? (
          <div className="divide-y divide-slate-700">
            {completedOrders.map(order => (
              <div key={order.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">#{order.order_number?.slice(-8)}</p>
                  <p className="text-sm text-slate-400">{order.customer_name}</p>
                  <p className="text-xs text-slate-500">
                    {order.delivered_at ? new Date(order.delivered_at).toLocaleString('fr-FR') : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-400">{formatPrice(order.total_fcfa)} FCFA</p>
                  <span className="inline-block mt-1 px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                    Livrée
                  </span>
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
    </div>
  );

  // Render Stats Section
  const renderStats = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <Package className="w-8 h-8 text-blue-400 mb-3" />
          <p className="text-3xl font-bold text-white">{stats?.total_deliveries || 0}</p>
          <p className="text-sm text-slate-400">Total livraisons</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <DollarSign className="w-8 h-8 text-emerald-400 mb-3" />
          <p className="text-3xl font-bold text-white">{formatPrice(stats?.total_earnings || 0)}</p>
          <p className="text-sm text-slate-400">FCFA gagnés</p>
        </div>
      </div>
      
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-bold text-white mb-4">Performance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Note moyenne</span>
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="font-bold text-white">{driverUser?.rating?.toFixed(1) || '5.0'}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Livraisons ce mois</span>
            <span className="font-bold text-white">{stats?.month_deliveries || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Render Profile Section
  const renderProfile = () => (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{driverUser?.name}</h3>
            <p className="text-slate-400">{driverUser?.email}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
            <span className="text-slate-400">Téléphone</span>
            <span className="text-white">{driverUser?.phone || 'Non renseigné'}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
            <span className="text-slate-400">Véhicule</span>
            <span className="text-white capitalize">{driverUser?.vehicle_type || 'Non renseigné'}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
            <span className="text-slate-400">Statut du compte</span>
            <span className={`px-2 py-1 rounded-full text-xs ${
              driverUser?.is_verified ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {driverUser?.is_verified ? 'Vérifié' : 'En attente'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'map':
        return renderMap();
      case 'orders':
        return renderOrders();
      case 'history':
        return renderHistory();
      case 'stats':
        return renderStats();
      case 'profile':
        return renderProfile();
      default:
        return renderMap();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" data-testid="driver-dashboard">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-slate-800/95 backdrop-blur-xl border-r border-slate-700 z-30 transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                currentStatus === 'available' ? 'bg-green-500' :
                currentStatus === 'busy' ? 'bg-amber-500' : 'bg-slate-600'
              }`}>
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white">Livreur</h1>
                <p className="text-xs text-slate-400 truncate">{driverUser?.name}</p>
              </div>
            </div>
          ) : (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${
              currentStatus === 'available' ? 'bg-green-500' :
              currentStatus === 'busy' ? 'bg-amber-500' : 'bg-slate-600'
            }`}>
              <Truck className="w-5 h-5 text-white" />
            </div>
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Status Selector */}
        <div className="p-4 border-b border-slate-700">
          {sidebarOpen ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 mb-2">Votre statut</p>
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
                    className={`w-full p-2 rounded-lg border transition-all flex items-center gap-2 ${
                      isActive 
                        ? status.color === 'green' ? 'border-green-500 bg-green-500/20' :
                          status.color === 'amber' ? 'border-amber-500 bg-amber-500/20' :
                          'border-slate-500 bg-slate-500/20'
                        : 'border-slate-700 hover:border-slate-600'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <Icon className={`w-4 h-4 ${
                      isActive 
                        ? status.color === 'green' ? 'text-green-400' :
                          status.color === 'amber' ? 'text-amber-400' :
                          'text-slate-400'
                        : 'text-slate-500'
                    }`} />
                    <span className={`text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {status.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
              currentStatus === 'available' ? 'bg-green-500' :
              currentStatus === 'busy' ? 'bg-amber-500' : 'bg-slate-600'
            }`}>
              {currentStatus === 'available' ? <CheckCircle className="w-4 h-4 text-white" /> :
               currentStatus === 'busy' ? <Clock className="w-4 h-4 text-white" /> :
               <XCircle className="w-4 h-4 text-white" />}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const badgeCount = item.badge ? availableOrders.length : 0;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                data-testid={`nav-${item.id}`}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-primary text-white' 
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && (
                  <span className="flex-1 text-left">{item.label}</span>
                )}
                {sidebarOpen && badgeCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-xl transition-all"
          >
            <Home className="w-5 h-5" />
            {sidebarOpen && <span>Voir la boutique</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all mt-2"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Header */}
        <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700 sticky top-0 z-20">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white capitalize">
              {NAV_ITEMS.find(i => i.id === activeSection)?.label || 'Dashboard'}
            </h1>
            <div className="flex items-center gap-3">
              {trackingEnabled && (
                <span className="flex items-center gap-1 text-xs text-green-400 px-3 py-1.5 bg-green-500/20 rounded-full">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  GPS actif
                </span>
              )}
              <Button size="sm" variant="outline" onClick={getCurrentLocation} className="border-slate-600 text-white">
                <Navigation className="w-4 h-4 mr-2" /> Ma position
              </Button>
            </div>
          </div>
        </header>

        {/* Pending Verification Alert */}
        {isPendingVerification && (
          <div className="mx-6 mt-4 p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-200">Compte en attente de vérification</h3>
              <p className="text-sm text-amber-300/70 mt-1">
                Votre permis est en cours de vérification. Vous ne pouvez pas accepter de commandes pour l'instant.
              </p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;
