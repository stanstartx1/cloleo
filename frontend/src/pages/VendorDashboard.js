import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Package, ShoppingBag, DollarSign, TrendingUp, Clock, CheckCircle, XCircle,
  Plus, Settings, CreditCard, BarChart3, Store, Crown, Sparkles, AlertCircle,
  Menu, Home, Truck, MapPin, Phone, RefreshCw, Loader2, ChevronRight,
  LogOut, Edit, X, MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import GoogleMap from '../components/GoogleMap';
import MessagesSection from '../components/MessagesSection';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
const API = `${BACKEND_URL}/api`;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const ORDER_STATUSES = {
  pending: { label: 'En attente', bgColor: 'bg-amber-500/20', textColor: 'text-amber-400' },
  assigned: { label: 'Livreur assigné', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  picked_up: { label: 'Colis récupéré', bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400' },
  in_transit: { label: 'En livraison', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' },
  delivered: { label: 'Livrée', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
  cancelled: { label: 'Annulée', bgColor: 'bg-red-500/20', textColor: 'text-red-400' }
};

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: Home },
  { id: 'products', label: 'Mes produits', icon: Package },
  { id: 'orders', label: 'Commandes', icon: ShoppingBag, badge: true },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'tracking', label: 'Suivi livraisons', icon: Truck },
  { id: 'stats', label: 'Statistiques', icon: BarChart3 },
  { id: 'subscription', label: 'Abonnement', icon: Crown },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { user, token, isVendor, refreshUser, logout } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [activeSection, setActiveSection] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const wsRef = React.useRef(null);

  useEffect(() => {
    if (!isVendor) {
      navigate('/connexion');
      return;
    }
    fetchDashboard();
    
    const sessionId = searchParams.get('session_id');
    if (sessionId) checkSubscriptionPayment(sessionId);
    if (searchParams.get('success') === 'true') toast.success('Plan gratuit activé !');
    if (searchParams.get('cancelled') === 'true') toast.info('Paiement annulé');
  }, [isVendor, navigate, searchParams]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/vendor/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/orders`, { headers: { Authorization: `Bearer ${token}` } });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [token]);

  const fetchProducts = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/vendor/products`, { headers: { Authorization: `Bearer ${token}` } });
      // API returns array directly or object with products key
      const productsData = Array.isArray(response.data) ? response.data : (response.data.products || []);
      setProducts(productsData);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [token]);

  useEffect(() => {
    if (activeSection === 'orders' || activeSection === 'tracking') fetchOrders();
    if (activeSection === 'products') fetchProducts();
  }, [activeSection, fetchOrders, fetchProducts]);

  const checkSubscriptionPayment = async (sessionId) => {
    try {
      const response = await axios.get(`${API}/subscriptions/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.payment_status === 'paid') {
        toast.success('Abonnement activé !');
        await refreshUser();
        fetchDashboard();
      }
    } catch (error) {}
  };

  // WebSocket for tracking
  useEffect(() => {
    if (!selectedOrder || activeSection !== 'tracking') return;
    
    const ws = new WebSocket(`${WS_URL}/ws/orders/order_${selectedOrder.id}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'driver_location') setDriverLocation(data.location);
      if (data.type === 'order_update') {
        fetchOrders();
        toast.info(data.message);
      }
    };
    
    ws.onclose = () => setTimeout(() => {}, 3000);
    wsRef.current = ws;
    
    return () => ws.close();
  }, [selectedOrder, activeSection, fetchOrders]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-400" />
      </div>
    );
  }

  const plan = dashboard?.subscription?.plan;
  const stats = dashboard?.stats;
  const isPendingVerification = !user?.is_verified || !user?.is_active;
  const pendingOrdersCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const activeOrders = orders.filter(o => ['assigned', 'picked_up', 'in_transit'].includes(o.status));

  const customerLocation = selectedOrder?.delivery_address ? {
    latitude: selectedOrder.delivery_address.latitude,
    longitude: selectedOrder.delivery_address.longitude
  } : null;

  const selectedDriverLocation = driverLocation || (selectedOrder?.driver_live_location ? {
    latitude: selectedOrder.driver_live_location.latitude,
    longitude: selectedOrder.driver_live_location.longitude
  } : null);

  return (
    <div className="min-h-screen bg-slate-900" data-testid="vendor-dashboard">
      {/* Mobile Header */}
      <header className="lg:hidden bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Store className="w-8 h-8 text-indigo-400" />
          <span className="font-bold text-white">Vendeur</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-white">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-800 border-b border-slate-700 p-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveSection(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${
                  activeSection === item.id ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.badge && pendingOrdersCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{pendingOrdersCount}</span>
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
        <aside className="hidden lg:flex flex-col w-64 bg-slate-800 border-r border-slate-700 min-h-screen fixed left-0 top-0">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <Store className="w-10 h-10 text-indigo-400" />
              <div>
                <h1 className="font-bold text-white">Espace Vendeur</h1>
                <p className="text-xs text-slate-400 truncate">{user?.shop_name || user?.name}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && pendingOrdersCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{pendingOrdersCount}</span>
                  )}
                </button>
              );
            })}
          </nav>

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
          {isPendingVerification && (
            <div className="mb-4 p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <h3 className="font-bold text-amber-200">Compte en attente de vérification</h3>
                <p className="text-sm text-amber-300/70">Vos produits seront visibles après activation.</p>
              </div>
            </div>
          )}

          {/* Dashboard Section */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {plan && (
                <div className={`p-6 rounded-2xl border ${
                  plan.id === 'free' ? 'bg-slate-700/50 border-slate-600' : 'bg-indigo-900/30 border-indigo-500/50'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{plan.emoji}</div>
                      <div>
                        <h3 className="font-bold text-xl text-white">{plan.name}</h3>
                        <p className="text-sm text-slate-400">Commission: {plan.commission_percent}%</p>
                      </div>
                    </div>
                    <Button onClick={() => setActiveSection('subscription')} variant={plan.id === 'free' ? 'default' : 'outline'}>
                      <Crown className="w-4 h-4 mr-2" /> {plan.id === 'free' ? 'Passer au plan payant' : 'Gérer'}
                    </Button>
                  </div>
                </div>
              )}

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
            </div>
          )}

          {/* Products Section */}
          {activeSection === 'products' && (
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
                      <div key={product.id} className="p-4 flex items-center gap-4">
                        <img src={product.images?.[0] || 'https://via.placeholder.com/60'} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{product.name}</p>
                          <p className="text-sm text-slate-400">{formatPrice(product.price_fcfa)} FCFA</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          product.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                          product.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {product.status === 'approved' ? 'Approuvé' : product.status === 'pending' ? 'En attente' : 'Rejeté'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <Package className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Aucun produit</p>
                    <Button className="mt-4" asChild>
                      <Link to="/vendeur/produits/nouveau"><Plus className="w-4 h-4 mr-2" /> Ajouter</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Orders Section */}
          {activeSection === 'orders' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Commandes</h2>
                <Button size="sm" variant="outline" onClick={fetchOrders} className="border-slate-600 text-slate-300">
                  <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
                </Button>
              </div>

              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                {orders.length > 0 ? (
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
                          <tr key={order.id} className="border-t border-slate-700">
                            <td className="p-4">
                              <p className="font-mono text-sm text-white">#{order.order_number?.slice(-8)}</p>
                            </td>
                            <td className="p-4">
                              <p className="text-sm text-white">{order.customer_name}</p>
                              <p className="text-xs text-slate-400">{order.delivery_address?.city}</p>
                            </td>
                            <td className="p-4">
                              {order.driver_name ? (
                                <span className="text-sm text-white">{order.driver_name}</span>
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
                                  className="text-blue-400"
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
          )}

          {/* Messages Section */}
          {activeSection === 'messages' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-purple-400" />
                Messages clients
              </h2>
              <MessagesSection token={token} userType="vendor" />
            </div>
          )}

          {/* Tracking Section */}
          {activeSection === 'tracking' && (
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
                      En cours ({activeOrders.length})
                    </h3>
                  </div>
                  
                  {activeOrders.length > 0 ? (
                    <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
                      {activeOrders.map(order => (
                        <div 
                          key={order.id}
                          className={`p-4 cursor-pointer hover:bg-slate-700/50 ${selectedOrder?.id === order.id ? 'bg-slate-700/70 border-l-4 border-l-blue-500' : ''}`}
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
                      
                      <GoogleMap 
                        driverLocation={selectedDriverLocation}
                        customerLocation={customerLocation}
                        showRoute={!!selectedDriverLocation && !!customerLocation}
                        height="260px"
                      />
                      
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
                      
                      <div className="p-4 space-y-4">
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
                              <a href={`tel:${selectedOrder.driver.phone}`} className="p-2 bg-green-500/20 rounded-full text-green-400">
                                <Phone className="w-5 h-5" />
                              </a>
                            )}
                          </div>
                        )}
                        
                        <div className="p-3 bg-slate-700/50 rounded-xl">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-red-400 mt-0.5" />
                            <div>
                              <p className="font-medium text-white">{selectedOrder.delivery_address?.name}</p>
                              <p className="text-sm text-slate-400">{selectedOrder.delivery_address?.street}</p>
                              <p className="text-sm text-slate-400">{selectedOrder.delivery_address?.city}</p>
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
          )}

          {/* Stats Section */}
          {activeSection === 'stats' && (
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
                      <span className="text-slate-400">Revenus</span>
                      <span className="font-bold text-emerald-400">{formatPrice(stats?.total_revenue_fcfa || 0)} FCFA</span>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                  <h3 className="font-bold text-white mb-4">Produits</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total</span>
                      <span className="font-bold text-white">{stats?.total_products || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Approuvés</span>
                      <span className="font-bold text-green-400">{stats?.approved_products || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Section */}
          {activeSection === 'subscription' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Mon abonnement</h2>
              {plan && (
                <div className={`p-6 rounded-2xl border ${
                  plan.id === 'free' ? 'bg-slate-700/50 border-slate-600' : 'bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-purple-500/50'
                }`}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-5xl">{plan.emoji}</div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                      <p className="text-slate-400">{plan.price_fcfa > 0 ? `${formatPrice(plan.price_fcfa)} FCFA/mois` : 'Gratuit'}</p>
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
                      <p className="text-sm text-slate-400">Utilisés</p>
                      <p className="text-xl font-bold text-white">{stats?.total_products || 0}</p>
                    </div>
                  </div>
                  
                  {plan.id === 'free' && (
                    <Button asChild className="w-full">
                      <Link to="/vendeur/abonnement"><Crown className="w-4 h-4 mr-2" /> Passer à un plan supérieur</Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white">Paramètres</h2>
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="font-bold text-white mb-4">Informations de la boutique</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Nom</label>
                    <Input value={user?.shop_name || ''} className="bg-slate-700 border-slate-600 text-white" readOnly />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Email</label>
                    <Input value={user?.email || ''} className="bg-slate-700 border-slate-600 text-white" readOnly />
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

export default VendorDashboard;
