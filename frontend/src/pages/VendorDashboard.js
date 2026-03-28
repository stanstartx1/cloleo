import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Package, ShoppingBag, DollarSign, TrendingUp, Clock, CheckCircle, XCircle,
  Plus, Settings, CreditCard, BarChart3, Store, Crown, Sparkles, AlertCircle,
  Menu, Home, Truck, MapPin, Phone, Eye, RefreshCw, Loader2, User, ChevronRight,
  LogOut, Edit, Image, List, FileText, Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
const API = `${BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const ORDER_STATUSES = {
  pending: { label: 'En attente', color: 'amber', bgColor: 'bg-amber-500/20', textColor: 'text-amber-400' },
  assigned: { label: 'Livreur assigné', color: 'blue', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  picked_up: { label: 'Colis récupéré', color: 'indigo', bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400' },
  in_transit: { label: 'En livraison', color: 'purple', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' },
  delivered: { label: 'Livrée', color: 'green', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
  cancelled: { label: 'Annulée', color: 'red', bgColor: 'bg-red-500/20', textColor: 'text-red-400' }
};

// Sidebar Navigation Items
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: Home },
  { id: 'products', label: 'Mes produits', icon: Package },
  { id: 'orders', label: 'Commandes', icon: ShoppingBag, badge: true },
  { id: 'tracking', label: 'Suivi livraisons', icon: Truck },
  { id: 'stats', label: 'Statistiques', icon: BarChart3 },
  { id: 'subscription', label: 'Mon abonnement', icon: Crown },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { user, token, isVendor, refreshUser, logout } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  // Map refs
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarker = useRef(null);
  const customerMarker = useRef(null);
  const directionsRenderer = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!isVendor) {
      navigate('/connexion');
      return;
    }
    fetchDashboard();
    
    // Check for subscription payment
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      checkSubscriptionPayment(sessionId);
    }
    
    if (searchParams.get('success') === 'true') {
      toast.success('Plan gratuit activé !');
    }
    if (searchParams.get('cancelled') === 'true') {
      toast.info('Paiement annulé');
    }
  }, [isVendor, navigate, searchParams]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/vendor/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const response = await axios.get(`${API}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setOrdersLoading(false);
    }
  }, [token]);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/vendor/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, [token]);

  useEffect(() => {
    if (activeSection === 'orders' || activeSection === 'tracking') {
      fetchOrders();
    }
    if (activeSection === 'products') {
      fetchProducts();
    }
  }, [activeSection, fetchOrders, fetchProducts]);

  const checkSubscriptionPayment = async (sessionId) => {
    try {
      const response = await axios.get(`${API}/subscriptions/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.payment_status === 'paid') {
        toast.success('Abonnement activé avec succès !');
        await refreshUser();
        fetchDashboard();
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    }
  };

  // WebSocket for selected order tracking
  useEffect(() => {
    if (!selectedOrder || activeSection !== 'tracking') return;
    
    const connectWebSocket = () => {
      const ws = new WebSocket(`${WS_URL}/ws/orders/order_${selectedOrder.id}`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'driver_location') {
          setDriverLocation(data.location);
          updateDriverMarker(data.location);
        }
        
        if (data.type === 'order_update') {
          fetchOrders();
          toast.info(data.message);
        }
      };
      
      ws.onclose = () => {
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current = ws;
    };
    
    connectWebSocket();
    
    return () => wsRef.current?.close();
  }, [selectedOrder, activeSection, fetchOrders]);

  // Initialize map
  useEffect(() => {
    if (!selectedOrder || activeSection !== 'tracking' || !mapRef.current) return;
    
    const initMap = () => {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = createMap;
        document.head.appendChild(script);
      } else {
        createMap();
      }
    };
    
    initMap();
  }, [selectedOrder, activeSection]);

  const createMap = () => {
    if (!selectedOrder?.delivery_address || !mapRef.current) return;
    
    const customerPos = {
      lat: selectedOrder.delivery_address.latitude || 5.3599,
      lng: selectedOrder.delivery_address.longitude || -4.0083
    };
    
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: customerPos,
      zoom: 14,
      styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
    });
    
    // Customer marker
    customerMarker.current = new window.google.maps.Marker({
      map: mapInstance.current,
      position: customerPos,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new window.google.maps.Size(40, 40)
      },
      title: 'Client'
    });
    
    // Driver marker if available
    if (selectedOrder.driver_live_location || driverLocation) {
      const loc = driverLocation || selectedOrder.driver_live_location;
      updateDriverMarker(loc);
    }
  };

  const updateDriverMarker = (location) => {
    if (!mapInstance.current || !window.google || !location) return;
    
    const pos = { lat: location.latitude, lng: location.longitude };
    
    if (driverMarker.current) {
      driverMarker.current.setPosition(pos);
    } else {
      driverMarker.current = new window.google.maps.Marker({
        map: mapInstance.current,
        position: pos,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(40, 40)
        },
        title: 'Livreur'
      });
    }
    
    // Draw route
    if (selectedOrder?.delivery_address && !directionsRenderer.current) {
      directionsRenderer.current = new window.google.maps.DirectionsRenderer({
        map: mapInstance.current,
        suppressMarkers: true,
        polylineOptions: { strokeColor: '#4F46E5', strokeWeight: 4 }
      });
    }
    
    if (directionsRenderer.current && selectedOrder?.delivery_address) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route({
        origin: pos,
        destination: {
          lat: selectedOrder.delivery_address.latitude,
          lng: selectedOrder.delivery_address.longitude
        },
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === 'OK') {
          directionsRenderer.current.setDirections(result);
        }
      });
    }
    
    // Fit bounds
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(pos);
    if (selectedOrder?.delivery_address) {
      bounds.extend({
        lat: selectedOrder.delivery_address.latitude,
        lng: selectedOrder.delivery_address.longitude
      });
    }
    mapInstance.current.fitBounds(bounds, { padding: 50 });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-40 rounded-2xl mb-4 bg-slate-800" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-slate-800" />)}
          </div>
        </div>
      </div>
    );
  }

  const plan = dashboard?.subscription?.plan;
  const stats = dashboard?.stats;
  const isPendingVerification = !user?.is_verified || !user?.is_active;
  const pendingOrdersCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;

  // Render sections
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Pending Verification Alert */}
      {isPendingVerification && (
        <div className="p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-amber-200">Compte en attente de vérification</h3>
            <p className="text-sm text-amber-300/70 mt-1">
              Votre compte vendeur est en cours de vérification. Vos produits seront visibles après activation.
            </p>
          </div>
        </div>
      )}

      {/* Subscription Banner */}
      {plan && (
        <div className={`p-6 rounded-2xl border ${
          plan.id === 'free' 
            ? 'bg-slate-700/50 border-slate-600' 
            : plan.id === 'artisan'
            ? 'bg-blue-900/30 border-blue-500/50'
            : plan.id === 'commercant'
            ? 'bg-amber-900/30 border-amber-500/50'
            : 'bg-purple-900/30 border-purple-500/50'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{plan.emoji}</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xl text-white">{plan.name}</h3>
                  {plan.badge && (
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      plan.badge === 'verified' ? 'bg-blue-500 text-white' :
                      plan.badge === 'pro' ? 'bg-amber-500 text-white' :
                      'bg-purple-500 text-white'
                    }`}>
                      {plan.badge === 'verified' ? 'Vérifié' : plan.badge === 'pro' ? 'Pro' : 'Premium'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  Commission: {plan.commission_percent}% • 
                  {plan.max_products === -1 ? ' Produits illimités' : ` ${plan.max_products} produits max`}
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setActiveSection('subscription')}
              variant={plan.id === 'free' ? 'default' : 'outline'}
              className={plan.id !== 'free' ? 'border-slate-500 text-white' : ''}
            >
              <Crown className="w-4 h-4 mr-2" />
              {plan.id === 'free' ? 'Passer au plan payant' : 'Gérer'}
            </Button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <Package className="w-7 h-7 text-blue-400 mb-3" />
          <p className="text-3xl font-bold text-white">{stats?.total_products || 0}</p>
          <p className="text-sm text-slate-400">Produits</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <Clock className="w-7 h-7 text-amber-400 mb-3" />
          <p className="text-3xl font-bold text-white">{stats?.pending_products || 0}</p>
          <p className="text-sm text-slate-400">En attente</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <ShoppingBag className="w-7 h-7 text-green-400 mb-3" />
          <p className="text-3xl font-bold text-white">{stats?.total_sales || 0}</p>
          <p className="text-sm text-slate-400">Ventes</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <DollarSign className="w-7 h-7 text-emerald-400 mb-3" />
          <p className="text-2xl font-bold text-white">{formatPrice(stats?.total_revenue_fcfa || 0)}</p>
          <p className="text-sm text-slate-400">Revenus FCFA</p>
        </div>
      </div>

      {/* Quick Sections */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Products Summary */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Statut des produits</h3>
            <Button size="sm" variant="ghost" onClick={() => setActiveSection('products')} className="text-slate-400">
              Voir tout <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-500/20 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-green-400">{stats?.approved_products || 0}</p>
              <p className="text-xs text-green-300">Approuvés</p>
            </div>
            <div className="text-center p-3 bg-amber-500/20 rounded-xl">
              <Clock className="w-6 h-6 text-amber-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-amber-400">{stats?.pending_products || 0}</p>
              <p className="text-xs text-amber-300">En attente</p>
            </div>
            <div className="text-center p-3 bg-red-500/20 rounded-xl">
              <XCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-red-400">{stats?.rejected_products || 0}</p>
              <p className="text-xs text-red-300">Rejetés</p>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-white">Commandes récentes</h3>
            <Button size="sm" variant="ghost" onClick={() => setActiveSection('orders')} className="text-slate-400">
              Voir tout <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          {pendingOrdersCount > 0 ? (
            <div className="space-y-2">
              {orders.slice(0, 3).map(order => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-white text-sm">#{order.order_number?.slice(-8)}</p>
                    <p className="text-xs text-slate-400">{order.customer_name}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${ORDER_STATUSES[order.status]?.bgColor} ${ORDER_STATUSES[order.status]?.textColor}`}>
                    {ORDER_STATUSES[order.status]?.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Aucune commande en cours</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Mes produits</h2>
        <Button asChild>
          <Link to="/vendeur/produits/nouveau">
            <Plus className="w-4 h-4 mr-2" /> Ajouter
          </Link>
        </Button>
      </div>
      
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {products.length > 0 ? (
          <div className="divide-y divide-slate-700">
            {products.map(product => (
              <div key={product.id} className="p-4 flex items-center gap-4 hover:bg-slate-700/50">
                <img 
                  src={product.images?.[0] || 'https://via.placeholder.com/60'} 
                  alt={product.name}
                  className="w-14 h-14 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{product.name}</p>
                  <p className="text-sm text-slate-400">{formatPrice(product.price_fcfa)} FCFA</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  product.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                  product.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {product.status === 'approved' ? 'Approuvé' :
                   product.status === 'pending' ? 'En attente' : 'Rejeté'}
                </span>
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`/vendeur/produits/${product.id}`}>
                    <Edit className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Aucun produit</p>
            <Button className="mt-4" asChild>
              <Link to="/vendeur/produits/nouveau">
                <Plus className="w-4 h-4 mr-2" /> Ajouter mon premier produit
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Commandes</h2>
        <Button size="sm" variant="outline" onClick={fetchOrders} className="border-slate-600 text-slate-300">
          <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
        </Button>
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-2xl font-bold text-white">{orders.length}</p>
          <p className="text-xs text-slate-400">Total</p>
        </div>
        <div className="bg-amber-500/20 rounded-xl p-4 border border-amber-500/30">
          <p className="text-2xl font-bold text-amber-400">{orders.filter(o => o.status === 'pending').length}</p>
          <p className="text-xs text-amber-300">En attente</p>
        </div>
        <div className="bg-purple-500/20 rounded-xl p-4 border border-purple-500/30">
          <p className="text-2xl font-bold text-purple-400">{orders.filter(o => ['assigned', 'picked_up', 'in_transit'].includes(o.status)).length}</p>
          <p className="text-xs text-purple-300">En cours</p>
        </div>
        <div className="bg-green-500/20 rounded-xl p-4 border border-green-500/30">
          <p className="text-2xl font-bold text-green-400">{orders.filter(o => o.status === 'delivered').length}</p>
          <p className="text-xs text-green-300">Livrées</p>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {ordersLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          </div>
        ) : orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="text-left p-4 text-xs font-medium text-slate-400">Commande</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400">Client</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400">Livreur</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400">Total</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400">Statut</th>
                  <th className="text-left p-4 text-xs font-medium text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                    <td className="p-4">
                      <p className="font-mono text-sm text-white">#{order.order_number?.slice(-8)}</p>
                      <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-white">{order.customer_name}</p>
                      <p className="text-xs text-slate-400">{order.delivery_address?.city}</p>
                    </td>
                    <td className="p-4">
                      {order.driver_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <Truck className="w-3 h-3 text-blue-400" />
                          </div>
                          <span className="text-sm text-white">{order.driver_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Non assigné</span>
                      )}
                    </td>
                    <td className="p-4 font-medium text-white">{formatPrice(order.total_fcfa)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${ORDER_STATUSES[order.status]?.bgColor} ${ORDER_STATUSES[order.status]?.textColor}`}>
                        {ORDER_STATUSES[order.status]?.label}
                      </span>
                    </td>
                    <td className="p-4">
                      {['assigned', 'picked_up', 'in_transit'].includes(order.status) && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setSelectedOrder(order);
                            setActiveSection('tracking');
                          }}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <MapPin className="w-4 h-4 mr-1" /> Suivre
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Aucune commande</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderTracking = () => {
    const activeOrders = orders.filter(o => ['assigned', 'picked_up', 'in_transit'].includes(o.status));
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Suivi des livraisons</h2>
          <Button size="sm" variant="outline" onClick={fetchOrders} className="border-slate-600 text-slate-300">
            <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Orders List */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                Livraisons en cours ({activeOrders.length})
              </h3>
            </div>
            
            {activeOrders.length > 0 ? (
              <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
                {activeOrders.map(order => (
                  <div 
                    key={order.id}
                    className={`p-4 cursor-pointer hover:bg-slate-700/50 transition-colors ${
                      selectedOrder?.id === order.id ? 'bg-slate-700/70 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-white">#{order.order_number?.slice(-8)}</p>
                      <span className={`px-2 py-1 rounded-full text-xs ${ORDER_STATUSES[order.status]?.bgColor} ${ORDER_STATUSES[order.status]?.textColor}`}>
                        {ORDER_STATUSES[order.status]?.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400">{order.customer_name}</p>
                    {order.driver_name && (
                      <p className="text-sm text-blue-400 flex items-center gap-1 mt-1">
                        <Truck className="w-3 h-3" /> {order.driver_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Truck className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Aucune livraison en cours</p>
              </div>
            )}
          </div>

          {/* Map & Details */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {selectedOrder ? (
              <>
                <div className="p-4 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white">Commande #{selectedOrder.order_number?.slice(-8)}</h3>
                      <p className="text-sm text-slate-400">{selectedOrder.customer_name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${ORDER_STATUSES[selectedOrder.status]?.bgColor} ${ORDER_STATUSES[selectedOrder.status]?.textColor}`}>
                      {ORDER_STATUSES[selectedOrder.status]?.label}
                    </span>
                  </div>
                </div>
                
                {/* Map */}
                <div ref={mapRef} className="w-full h-72" data-testid="vendor-tracking-map" />
                
                {/* Legend */}
                <div className="p-3 bg-slate-700/50 flex items-center gap-6 text-xs border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <span className="text-slate-300">Client</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-slate-300">Livreur</span>
                  </div>
                </div>
                
                {/* Details */}
                <div className="p-4 space-y-4">
                  {/* Driver */}
                  {selectedOrder.driver_name && (
                    <div className="flex items-center justify-between p-3 bg-blue-500/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/30 rounded-full flex items-center justify-center">
                          <Truck className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{selectedOrder.driver_name}</p>
                          <p className="text-xs text-slate-400">Livreur</p>
                        </div>
                      </div>
                      {selectedOrder.driver?.phone && (
                        <a 
                          href={`tel:${selectedOrder.driver.phone}`}
                          className="p-2 bg-green-500/20 rounded-full text-green-400 hover:bg-green-500/30"
                        >
                          <Phone className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  )}
                  
                  {/* Customer */}
                  <div className="p-3 bg-slate-700/50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-red-400 mt-0.5" />
                      <div>
                        <p className="font-medium text-white">{selectedOrder.delivery_address?.name}</p>
                        <p className="text-sm text-slate-400">{selectedOrder.delivery_address?.street}</p>
                        <p className="text-sm text-slate-400">{selectedOrder.delivery_address?.city}</p>
                        <a 
                          href={`tel:${selectedOrder.delivery_address?.phone}`}
                          className="text-sm text-blue-400 flex items-center gap-1 mt-1"
                        >
                          <Phone className="w-3 h-3" /> {selectedOrder.delivery_address?.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Sélectionnez une commande pour voir le suivi</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSubscription = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Mon abonnement</h2>
      
      {plan && (
        <div className={`p-6 rounded-2xl border ${
          plan.id === 'free' 
            ? 'bg-slate-700/50 border-slate-600' 
            : 'bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-purple-500/50'
        }`}>
          <div className="flex items-center gap-4 mb-6">
            <div className="text-5xl">{plan.emoji}</div>
            <div>
              <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
              <p className="text-slate-400">
                {plan.price_fcfa > 0 ? `${formatPrice(plan.price_fcfa)} FCFA/mois` : 'Gratuit'}
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-400">Commission</p>
              <p className="text-xl font-bold text-white">{plan.commission_percent}%</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-400">Produits max</p>
              <p className="text-xl font-bold text-white">{plan.max_products === -1 ? 'Illimité' : plan.max_products}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4">
              <p className="text-sm text-slate-400">Produits utilisés</p>
              <p className="text-xl font-bold text-white">{stats?.total_products || 0}</p>
            </div>
          </div>
          
          {plan.id === 'free' && (
            <Button asChild className="w-full">
              <Link to="/vendeur/abonnement">
                <Crown className="w-4 h-4 mr-2" /> Passer à un plan supérieur
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const renderStats = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Statistiques</h2>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="font-bold text-white mb-4">Ventes</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-slate-400">Total des ventes</span>
              <span className="font-bold text-white">{stats?.total_sales || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Revenus totaux</span>
              <span className="font-bold text-emerald-400">{formatPrice(stats?.total_revenue_fcfa || 0)} FCFA</span>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="font-bold text-white mb-4">Produits</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-slate-400">Total produits</span>
              <span className="font-bold text-white">{stats?.total_products || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Approuvés</span>
              <span className="font-bold text-green-400">{stats?.approved_products || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">En attente</span>
              <span className="font-bold text-amber-400">{stats?.pending_products || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Paramètres</h2>
      
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="font-bold text-white mb-4">Informations de la boutique</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Nom de la boutique</label>
            <Input value={user?.shop_name || ''} className="bg-slate-700 border-slate-600 text-white" readOnly />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <Input value={user?.email || ''} className="bg-slate-700 border-slate-600 text-white" readOnly />
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'products':
        return renderProducts();
      case 'orders':
        return renderOrders();
      case 'tracking':
        return renderTracking();
      case 'subscription':
        return renderSubscription();
      case 'stats':
        return renderStats();
      case 'settings':
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900" data-testid="vendor-dashboard">
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-slate-800/95 backdrop-blur-xl border-r border-slate-700 z-30 transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <Store className="w-8 h-8 text-primary" />
              <div>
                <h1 className="font-bold text-white">Vendeur</h1>
                <p className="text-xs text-slate-400 truncate">{user?.shop_name || user?.name}</p>
              </div>
            </div>
          ) : (
            <Store className="w-8 h-8 text-primary mx-auto" />
          )}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
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
                {sidebarOpen && item.badge && pendingOrdersCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {pendingOrdersCount}
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
              {NAV_ITEMS.find(i => i.id === activeSection)?.label || 'Tableau de bord'}
            </h1>
            <div className="flex items-center gap-3">
              <Button asChild size="sm">
                <Link to="/vendeur/produits/nouveau">
                  <Plus className="w-4 h-4 mr-2" /> Nouveau produit
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default VendorDashboard;
