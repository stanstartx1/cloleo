import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Truck, Package, DollarSign, MapPin, Clock, CheckCircle, 
  XCircle, AlertCircle, Phone, LogOut, Navigation, 
  Loader2, Star, Play, Flag, PackageCheck, Bell,
  Menu, Home, Map, List, History, ChevronRight, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import GoogleMap from '../components/GoogleMap';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const WS_URL = BACKEND_URL
  .replace(/^https:\/\//, 'wss://')
  .replace(/^http:\/\//, 'ws://');
const API = `${BACKEND_URL}/api`;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const ORDER_STATUSES = {
  pending: { label: 'Disponible', action: 'Accepter', bgColor: 'bg-amber-500/20', textColor: 'text-amber-400' },
  assigned: { label: 'Acceptée', action: 'Récupérer colis', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  picked_up: { label: 'Colis récupéré', action: 'Démarrer livraison', bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400' },
  in_transit: { label: 'En cours', action: 'Confirmer livraison', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' },
  delivered: { label: 'Livrée', action: null, bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
  cancelled: { label: 'Annulée', action: null, bgColor: 'bg-red-500/20', textColor: 'text-red-400' }
};

const NAV_ITEMS = [
  { id: 'map', label: 'Carte & Navigation', icon: Map },
  { id: 'orders', label: 'Commandes', icon: Package, badge: true },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'stats', label: 'Mes gains', icon: DollarSign },
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
      setCurrentStatus(response.data.user?.status || 'offline');
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  }, [token]);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.orders || []);
      
      // Get all active orders for this driver
      const active = (response.data.orders || []).filter(o => 
        o.driver_id === user?.id && 
        ['assigned', 'picked_up', 'in_transit'].includes(o.status)
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
  }, [isDriver, navigate, fetchDashboard, fetchOrders]);

  // WebSocket
  useEffect(() => {
    if (!user?.id) return;
    
    const connectWebSocket = () => {
      const ws = new WebSocket(`${WS_URL}/ws/driver/${user.id}`);
      
      ws.onopen = () => {
        toast.success('Connecté au système');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'new_order') {
          setOrders(prev => [data.order, ...prev.filter(o => o.id !== data.order.id)]);
          toast.info('Nouvelle commande !');
          audioRef.current?.play().catch(() => {});
        }
        
        if (data.type === 'order_taken') {
          setOrders(prev => prev.filter(o => o.id !== data.order_id));
        }
        
        if (data.type === 'available_orders') {
          setOrders(data.orders || []);
        }
      };
      
      ws.onclose = () => setTimeout(connectWebSocket, 3000);
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
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(updateLocation, console.error, { enableHighAccuracy: true });
      watchIdRef.current = navigator.geolocation.watchPosition(updateLocation, console.error, { 
        enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 
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
        toast.success('Vous êtes disponible !');
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
      
      switch (action) {
        case 'accept': endpoint = `/orders/${order.id}/accept`; break;
        case 'pickup': endpoint = `/orders/${order.id}/pickup`; setTrackingEnabled(true); break;
        case 'in-transit': endpoint = `/orders/${order.id}/in-transit`; break;
        case 'deliver': endpoint = `/orders/${order.id}/deliver`; break;
        default: return;
      }
      
      await axios.put(`${API}${endpoint}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success(
        action === 'accept' ? 'Commande acceptée !' :
        action === 'pickup' ? 'Colis récupéré !' :
        action === 'in-transit' ? 'Livraison démarrée !' :
        'Livraison terminée !'
      );
      
      await fetchOrders();
      await fetchDashboard();
      
      if (action === 'deliver') setActiveOrder(null);
      
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
  const availableOrders = orders.filter(o => o.status === 'pending');
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
                            #{order.order_number?.slice(-6)} - {ORDER_STATUSES[order.status]?.label}
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
                            <p className="text-xs text-slate-400">#{activeOrderForMap.order_number?.slice(-8)}</p>
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
                            <div>
                              <p className="font-medium text-white">{activeOrderForMap.delivery_address?.name}</p>
                              <p className="text-sm text-slate-400">{activeOrderForMap.delivery_address?.street}</p>
                              <p className="text-sm text-slate-400">{activeOrderForMap.delivery_address?.city}</p>
                              {activeOrderForMap.delivery_address?.phone && (
                                <p className="text-sm text-green-400 mt-1">📞 {activeOrderForMap.delivery_address?.phone}</p>
                              )}
                            </div>
                          </div>
                          <a href={`tel:${activeOrderForMap.delivery_address?.phone}`} className="p-3 bg-green-500/20 rounded-full text-green-400">
                            <Phone className="w-5 h-5" />
                          </a>
                        </div>
                      </div>

                      {/* Vendor Info */}
                      {activeOrderForMap.items?.length > 0 && (
                        <div className="p-4 border-t border-slate-700 bg-slate-700/20">
                          <p className="text-xs text-slate-400 mb-2">Récupérer chez :</p>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                              <span className="text-purple-400 font-bold text-sm">
                                {activeOrderForMap.items[0]?.seller_name?.[0] || 'V'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-white text-sm">{activeOrderForMap.items[0]?.seller_name || 'Vendeur'}</p>
                              <p className="text-xs text-slate-400">{activeOrderForMap.items?.length} article(s)</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-400">Total</p>
                          <p className="font-bold text-white text-lg">{formatPrice(activeOrderForMap.total_fcfa)} FCFA</p>
                        </div>
                        
                        {ORDER_STATUSES[activeOrderForMap.status]?.action && (
                          <Button
                            onClick={() => handleOrderAction(
                              activeOrderForMap,
                              activeOrderForMap.status === 'assigned' ? 'pickup' :
                              activeOrderForMap.status === 'picked_up' ? 'in-transit' : 'deliver'
                            )}
                            disabled={updatingStatus}
                            size="lg"
                            className={activeOrderForMap.status === 'in_transit' ? 'bg-green-600 hover:bg-green-700' : ''}
                          >
                            {updatingStatus ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> :
                             activeOrderForMap.status === 'assigned' ? <PackageCheck className="w-5 h-5 mr-2" /> :
                             activeOrderForMap.status === 'picked_up' ? <Play className="w-5 h-5 mr-2" /> :
                             <Flag className="w-5 h-5 mr-2" />}
                            {ORDER_STATUSES[activeOrderForMap.status]?.action}
                          </Button>
                        )}
                      </div>
                      
                      {activeOrderForMap.delivery_address?.latitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${activeOrderForMap.delivery_address.latitude},${activeOrderForMap.delivery_address.longitude}&travelmode=driving`}
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
                
                <GoogleMap 
                  driverLocation={currentLocation}
                  customerLocation={customerLocation}
                  showRoute={activeOrders.length > 0}
                  height="320px"
                  mapType="satellite"
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
                      <div key={order.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-white">#{order.order_number?.slice(-8)}</p>
                            <p className="text-sm text-slate-400">{order.delivery_address?.city}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-white">{formatPrice(order.total_fcfa)} FCFA</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleOrderAction(order, 'accept')}
                          disabled={updatingStatus || isPendingVerification}
                          className="w-full bg-green-600 hover:bg-green-700"
                        >
                          {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                          Accepter
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
                        <p className="font-medium text-white">#{order.order_number?.slice(-8)}</p>
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
        </main>
      </div>
    </div>
  );
};

export default DriverDashboard;
