import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, ShoppingBag, DollarSign, TrendingUp, Clock, CheckCircle, XCircle,
  Plus, Settings, CreditCard, BarChart3, Store, Crown, Sparkles, AlertCircle,
  Menu, Home, Truck, MapPin, Phone, RefreshCw, Loader2, ChevronRight,
  LogOut, Edit, X, MessageCircle, Trash2, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { toAbsoluteMediaUrl } from '../utils/media';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import GoogleMap from '../components/GoogleMap';
import MessagesSection from '../components/MessagesSection';
import { 
  AnimatedNumber, 
  staggerContainer, 
  statCardVariant,
  tabContentVariant
} from '../components/AnimatedComponents';

import { API_BASE, API_URL } from '../config/api';
const WS_URL = BACKEND_URL
  .replace(/^https:\/\//, 'wss://')
  .replace(/^http:\/\//, 'ws://');
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
  
  // Edit product modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price_fcfa: '',
    promo_price_fcfa: '',
    stock: '',
    condition: 'new'
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  
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
      fetchOrders();
      fetchProducts();
      try {
        const followersRes = await axios.get(`${API}/subscriptions/my-followers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFollowerCount(followersRes.data?.count ?? 0);
      } catch {
        setFollowerCount(0);
      }
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

  // Open edit modal for vendor product
  const openEditModal = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name || '',
      description: product.description || '',
      price_fcfa: product.price_fcfa?.toString() || '',
      promo_price_fcfa: product.promo_price_fcfa?.toString() || '',
      stock: product.stock?.toString() || '',
      condition: product.condition || 'new'
    });
    setShowEditModal(true);
  };

  // Save edited product
  const saveEditedProduct = async () => {
    if (!editingProduct) return;
    
    setSavingEdit(true);
    try {
      const updateData = {};
      if (editForm.name) updateData.name = editForm.name;
      if (editForm.description) updateData.description = editForm.description;
      if (editForm.price_fcfa) updateData.price_fcfa = parseInt(editForm.price_fcfa);
      if (editForm.promo_price_fcfa) updateData.promo_price_fcfa = parseInt(editForm.promo_price_fcfa);
      if (editForm.stock) updateData.stock = parseInt(editForm.stock);
      if (editForm.condition) updateData.condition = editForm.condition;

      await axios.put(`${API}/vendor/products/${editingProduct.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Produit modifié ! En attente de validation admin.');
      setShowEditModal(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    try {
      await axios.delete(`${API}/vendor/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Produit supprimé');
      if (editingProduct?.id === productId) {
        setShowEditModal(false);
        setEditingProduct(null);
      }
      fetchProducts();
      fetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

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
    
    const ws = new WebSocket(`${WS_URL}/api/ws/orders/order_${selectedOrder.id}`);
    
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

  const plan = dashboard?.subscription?.plan;
  const stats = dashboard?.stats;
  const computedStats = {
    total_products: Math.max(Number(stats?.total_products || 0), products.length),
    pending_products: Math.max(
      Number(stats?.pending_products || 0),
      products.filter((p) => p.status === 'pending').length
    ),
    approved_products: Math.max(
      Number(stats?.approved_products || 0),
      products.filter((p) => p.status === 'approved').length
    ),
    total_sales: Math.max(Number(stats?.total_sales || 0), orders.length),
    total_revenue_fcfa: Math.max(
      Number(stats?.total_revenue_fcfa || 0),
      orders.reduce((sum, o) => sum + Number(o.total_fcfa || 0), 0)
    ),
  };
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

  const revenueSeries = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
    const map = {};
    orders.forEach((o) => {
      const date = new Date(o.created_at || o.updated_at || Date.now());
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!map[key]) map[key] = { label: months[date.getMonth()], revenue: 0, orders: 0 };
      map[key].revenue += Number(o.total_fcfa || 0);
      map[key].orders += 1;
    });
    return Object.values(map).slice(-6);
  }, [orders]);

  const productStatusSeries = useMemo(() => {
    const statusCount = { approved: 0, pending: 0, rejected: 0 };
    products.forEach((p) => {
      if (p.status === 'approved') statusCount.approved += 1;
      else if (p.status === 'pending') statusCount.pending += 1;
      else statusCount.rejected += 1;
    });
    return [
      { name: 'Approuvés', value: statusCount.approved, color: '#22c55e' },
      { name: 'En attente', value: statusCount.pending, color: '#f59e0b' },
      { name: 'Rejetés', value: statusCount.rejected, color: '#ef4444' },
    ];
  }, [products]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen premium-dashboard-bg dashboard-card-skin" data-testid="vendor-dashboard">
      {/* Mobile Header */}
      <header className="lg:hidden premium-panel border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
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
        <div className="lg:hidden premium-panel border-b border-slate-700 p-4 space-y-2">
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
        <aside className="hidden lg:flex flex-col w-64 premium-panel border-r border-slate-700 min-h-screen fixed left-0 top-0">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-500/20 flex items-center justify-center">
                {user?.profile_photo ? (
                  <img src={toAbsoluteMediaUrl(user.profile_photo)} alt={user?.name || 'Profil'} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-6 h-6 text-indigo-300" />
                )}
              </div>
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
          <div className="mb-4 flex justify-end">
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Déconnexion
            </Button>
          </div>

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
          <AnimatePresence mode="wait">
          {activeSection === 'dashboard' && (
            <motion.div 
              key="dashboard"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              {plan && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-6 rounded-2xl border ${
                    plan.id === 'free' ? 'bg-slate-700/50 border-slate-600' : 'bg-indigo-900/30 border-indigo-500/50'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        className="text-4xl"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {plan.emoji}
                      </motion.div>
                      <div>
                        <h3 className="font-bold text-xl text-white">{plan.name}</h3>
                        <p className="text-sm text-slate-400">Commission: {plan.commission_percent}%</p>
                      </div>
                    </div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button onClick={() => setActiveSection('subscription')} variant={plan.id === 'free' ? 'default' : 'outline'}>
                        <Crown className="w-4 h-4 mr-2" /> {plan.id === 'free' ? 'Passer au plan payant' : 'Gérer'}
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              <motion.div 
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <motion.div 
                  variants={statCardVariant} 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border border-slate-700 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <motion.div whileHover={{ rotate: 10, scale: 1.1 }}>
                    <Package className="w-7 h-7 text-blue-400 mb-3" />
                  </motion.div>
                  <p className="text-3xl font-bold text-white"><AnimatedNumber value={computedStats.total_products} /></p>
                  <p className="text-sm text-slate-400">Produits</p>
                </motion.div>
                <motion.div 
                  variants={statCardVariant} 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border border-slate-700 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <motion.div whileHover={{ rotate: 10, scale: 1.1 }}>
                    <Clock className="w-7 h-7 text-amber-400 mb-3" />
                  </motion.div>
                  <p className="text-3xl font-bold text-white"><AnimatedNumber value={computedStats.pending_products} /></p>
                  <p className="text-sm text-slate-400">En attente</p>
                </motion.div>
                <motion.div 
                  variants={statCardVariant} 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border border-slate-700 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <motion.div whileHover={{ rotate: 10, scale: 1.1 }}>
                    <ShoppingBag className="w-7 h-7 text-green-400 mb-3" />
                  </motion.div>
                  <p className="text-3xl font-bold text-white"><AnimatedNumber value={computedStats.total_sales} /></p>
                  <p className="text-sm text-slate-400">Ventes</p>
                </motion.div>
                <motion.div 
                  variants={statCardVariant} 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border border-slate-700 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <motion.div 
                    whileHover={{ rotate: 10, scale: 1.1 }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <DollarSign className="w-7 h-7 text-emerald-400 mb-3" />
                  </motion.div>
                  <p className="text-2xl font-bold text-white"><AnimatedNumber value={computedStats.total_revenue_fcfa} /></p>
                  <p className="text-sm text-slate-400">Revenus FCFA</p>
                </motion.div>
                <motion.div 
                  variants={statCardVariant} 
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border border-slate-700 shadow-lg hover:shadow-xl transition-shadow col-span-2 md:col-span-1"
                >
                  <motion.div whileHover={{ rotate: 10, scale: 1.1 }}>
                    <Users className="w-7 h-7 text-fuchsia-400 mb-3" />
                  </motion.div>
                  <p className="text-3xl font-bold text-white"><AnimatedNumber value={followerCount} /></p>
                  <p className="text-sm text-slate-400">Abonnés</p>
                </motion.div>
              </motion.div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border border-slate-700 shadow-lg">
                  <h3 className="text-white font-semibold mb-3">Évolution des revenus (6 derniers mois)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueSeries}>
                        <defs>
                          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                          formatter={(value) => [`${formatPrice(Number(value))} FCFA`, 'Revenus']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revenueFill)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 border border-slate-700 shadow-lg">
                  <h3 className="text-white font-semibold mb-3">État des produits</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={productStatusSeries} dataKey="value" nameKey="name" outerRadius={85} innerRadius={45} paddingAngle={4}>
                          {productStatusSeries.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {productStatusSeries.map((s) => (
                      <div key={s.name} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}: {s.value}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Products Section */}
          {activeSection === 'products' && (
            <motion.div 
              key="products"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.div 
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Package className="w-6 h-6 text-blue-400" />
                  Mes produits
                </h2>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button asChild className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg">
                    <Link to="/vendeur/produits/nouveau">
                      <Plus className="w-4 h-4 mr-2" /> Ajouter
                    </Link>
                  </Button>
                </motion.div>
              </motion.div>
              
              <motion.div 
                className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {products.length > 0 ? (
                  <div className="divide-y divide-slate-700">
                    {products.map((product, index) => (
                      <motion.div 
                        key={product.id} 
                        className="p-4 flex items-center gap-4 hover:bg-slate-700/30 transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 5 }}
                      >
                        <motion.img 
                          src={product.images?.[0] || 'https://via.placeholder.com/60'} 
                          alt={product.name} 
                          className="w-14 h-14 rounded-lg object-cover shadow-md" 
                          whileHover={{ scale: 1.1 }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{product.name}</p>
                          <p className="text-sm text-slate-400">{formatPrice(product.price_fcfa)} FCFA</p>
                        </div>
                        <motion.span 
                          className={`px-2 py-1 rounded-full text-xs ${
                            product.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                            product.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                          }`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          {product.status === 'approved' ? 'Approuvé' : product.status === 'pending' ? 'En attente' : 'Rejeté'}
                        </motion.span>
                        <div className="flex gap-2">
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => navigate(`/vendeur/produits/${product.id}/modifier`)}
                              className="border-slate-600 text-slate-300 hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/50"
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Modifier
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteProduct(product.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Supprimer
                            </Button>
                          </motion.div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div 
                    className="p-12 text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Package className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                    </motion.div>
                    <p className="text-slate-400">Aucun produit</p>
                    <Button className="mt-4" asChild>
                      <Link to="/vendeur/produits/nouveau"><Plus className="w-4 h-4 mr-2" /> Ajouter</Link>
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Orders Section */}
          {activeSection === 'orders' && (
            <motion.div 
              key="orders"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.div 
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-green-400" />
                  Commandes
                </h2>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="sm" variant="outline" onClick={fetchOrders} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
                  </Button>
                </motion.div>
              </motion.div>

              <motion.div 
                className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {orders.length > 0 ? (
                  <div className="overflow-x-auto touch-scroll-x">
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
                        {orders.map((order, index) => (
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
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setActiveSection('tracking');
                                    }}
                                    className="text-blue-400 hover:bg-blue-500/20"
                                  >
                                    <MapPin className="w-4 h-4 mr-1" /> Suivre
                                  </Button>
                                </motion.div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <motion.div 
                    className="p-12 text-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                    </motion.div>
                    <p className="text-slate-400">Aucune commande</p>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Messages Section */}
          {activeSection === 'messages' && (
            <motion.div 
              key="messages"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.h2 
                className="text-xl font-bold text-white flex items-center gap-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <MessageCircle className="w-6 h-6 text-purple-400" />
                Messages clients
              </motion.h2>
              <MessagesSection token={token} userType="vendor" />
            </motion.div>
          )}

          {/* Tracking Section */}
          {activeSection === 'tracking' && (
            <motion.div 
              key="tracking"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.div 
                className="flex items-center justify-between"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Truck className="w-6 h-6 text-blue-400" />
                  Suivi des livraisons
                </h2>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="sm" variant="outline" onClick={fetchOrders} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
                  </Button>
                </motion.div>
              </motion.div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Orders List */}
                <motion.div 
                  className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <Truck className="w-5 h-5 text-blue-400" />
                      En cours ({activeOrders.length})
                    </h3>
                  </div>
                  
                  {activeOrders.length > 0 ? (
                    <div className="divide-y divide-slate-700 max-h-96 overflow-y-auto">
                      {activeOrders.map((order, index) => (
                        <motion.div 
                          key={order.id}
                          className={`p-4 cursor-pointer hover:bg-slate-700/50 transition-colors ${selectedOrder?.id === order.id ? 'bg-slate-700/70 border-l-4 border-l-blue-500' : ''}`}
                          onClick={() => setSelectedOrder(order)}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ x: 5 }}
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
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <Truck className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">Aucune livraison en cours</p>
                    </div>
                  )}
                </motion.div>

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
            </motion.div>
          )}

          {/* Stats Section */}
          {activeSection === 'stats' && (
            <motion.div 
              key="stats"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.h2 
                className="text-xl font-bold text-white flex items-center gap-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <BarChart3 className="w-6 h-6 text-indigo-400" />
                Statistiques
              </motion.h2>
              <motion.div 
                className="grid md:grid-cols-2 gap-6"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <motion.div 
                  variants={statCardVariant}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6 shadow-lg"
                >
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                    Ventes
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                      <span className="text-slate-400">Total des ventes</span>
                      <span className="font-bold text-white text-xl"><AnimatedNumber value={computedStats.total_sales} /></span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                      <span className="text-slate-400">Revenus</span>
                      <motion.span 
                        className="font-bold text-emerald-400 text-xl"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <AnimatedNumber value={computedStats.total_revenue_fcfa} /> FCFA
                      </motion.span>
                    </div>
                  </div>
                </motion.div>
                <motion.div 
                  variants={statCardVariant}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6 shadow-lg"
                >
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-400" />
                    Produits
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                      <span className="text-slate-400">Total</span>
                      <span className="font-bold text-white text-xl"><AnimatedNumber value={computedStats.total_products} /></span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                      <span className="text-slate-400">Approuvés</span>
                      <span className="font-bold text-green-400 text-xl"><AnimatedNumber value={computedStats.approved_products} /></span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {/* Subscription Section */}
          {activeSection === 'subscription' && (
            <motion.div 
              key="subscription"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.h2 
                className="text-xl font-bold text-white flex items-center gap-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Crown className="w-6 h-6 text-yellow-400" />
                Mon abonnement
              </motion.h2>
              {plan && (
                <motion.div 
                  className={`p-6 rounded-2xl border ${
                    plan.id === 'free' ? 'bg-slate-700/50 border-slate-600' : 'bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border-purple-500/50'
                  }`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <motion.div 
                      className="text-5xl"
                      animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      {plan.emoji}
                    </motion.div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                      <p className="text-slate-400">{plan.price_fcfa > 0 ? `${formatPrice(plan.price_fcfa)} FCFA/mois` : 'Gratuit'}</p>
                    </div>
                  </div>
                  
                  <motion.div 
                    className="grid md:grid-cols-3 gap-4 mb-6"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    <motion.div 
                      variants={statCardVariant}
                      className="bg-slate-800/50 rounded-xl p-4"
                    >
                      <p className="text-sm text-slate-400">Commission</p>
                      <p className="text-xl font-bold text-white">{plan.commission_percent}%</p>
                    </motion.div>
                    <motion.div 
                      variants={statCardVariant}
                      className="bg-slate-800/50 rounded-xl p-4"
                    >
                      <p className="text-sm text-slate-400">Produits max</p>
                      <p className="text-xl font-bold text-white">{plan.max_products === -1 ? 'Illimité' : plan.max_products}</p>
                    </motion.div>
                    <motion.div 
                      variants={statCardVariant}
                      className="bg-slate-800/50 rounded-xl p-4"
                    >
                      <p className="text-sm text-slate-400">Utilisés</p>
                      <p className="text-xl font-bold text-white">{computedStats.total_products}</p>
                    </motion.div>
                  </motion.div>
                  
                  {plan.id === 'free' && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button asChild className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg">
                        <Link to="/vendeur/abonnement"><Crown className="w-4 h-4 mr-2" /> Passer à un plan supérieur</Link>
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Settings Section */}
          {activeSection === 'settings' && (
            <motion.div 
              key="settings"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.h2 
                className="text-xl font-bold text-white flex items-center gap-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Settings className="w-6 h-6 text-slate-400" />
                Paramètres
              </motion.h2>
              <motion.div 
                className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="font-bold text-white mb-4">Informations de la boutique</h3>
                <div className="space-y-4">
                  <motion.div whileHover={{ x: 5 }} className="p-3 bg-slate-700/30 rounded-lg">
                    <label className="block text-sm text-slate-400 mb-1">Nom</label>
                    <Input value={user?.shop_name || ''} className="bg-slate-700 border-slate-600 text-white" readOnly />
                  </motion.div>
                  <motion.div whileHover={{ x: 5 }} className="p-3 bg-slate-700/30 rounded-lg">
                    <label className="block text-sm text-slate-400 mb-1">Email</label>
                    <Input value={user?.email || ''} className="bg-slate-700 border-slate-600 text-white" readOnly />
                  </motion.div>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-400 mb-3">
                    Modifiez votre nom, photo de profil, mot de passe et informations boutique depuis la page profil complète.
                  </p>
                  <Button asChild className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                    <Link to="/parametres">
                      <Settings className="w-4 h-4 mr-2" />
                      Ouvrir les paramètres du profil
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
          </AnimatePresence>
        </main>
      </div>

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-lg"
          >
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Modifier le produit
                </h2>
              </div>
              
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Product Preview */}
                <div className="flex gap-4 p-3 bg-slate-700/50 rounded-xl">
                  <img
                    src={editingProduct.images?.[0] || 'https://via.placeholder.com/80'}
                    alt={editingProduct.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="text-white font-medium">{editingProduct.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      editingProduct.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      editingProduct.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {editingProduct.status === 'approved' ? 'Approuvé' : editingProduct.status === 'pending' ? 'En attente' : 'Rejeté'}
                    </span>
                  </div>
                </div>

                {/* Edit Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Nom du produit</label>
                    <Input 
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                      placeholder="Nom du produit"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white resize-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                      placeholder="Description du produit..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Prix (FCFA)</label>
                      <Input 
                        type="number"
                        value={editForm.price_fcfa}
                        onChange={(e) => setEditForm({...editForm, price_fcfa: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="10000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Prix promo (FCFA)</label>
                      <Input 
                        type="number"
                        value={editForm.promo_price_fcfa}
                        onChange={(e) => setEditForm({...editForm, promo_price_fcfa: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="Optionnel"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Stock</label>
                      <Input 
                        type="number"
                        value={editForm.stock}
                        onChange={(e) => setEditForm({...editForm, stock: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">État</label>
                      <select
                        value={editForm.condition}
                        onChange={(e) => setEditForm({...editForm, condition: e.target.value})}
                        className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      >
                        <option value="new">Neuf</option>
                        <option value="like_new">Comme neuf</option>
                        <option value="good">Bon état</option>
                        <option value="fair">État correct</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/20 rounded-lg">
                    <p className="text-amber-400 text-sm">
                      ⚠️ Les modifications importantes (nom, description, prix) nécessitent une nouvelle validation admin.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingProduct(null);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    onClick={saveEditedProduct}
                    disabled={savingEdit}
                  >
                    {savingEdit ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Sauvegarder
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
