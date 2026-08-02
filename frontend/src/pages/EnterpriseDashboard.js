import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import axios from 'axios';

import { motion, AnimatePresence } from 'framer-motion';

import { 

  Package, ShoppingBag, DollarSign, TrendingUp, Clock, CheckCircle, XCircle,

  Plus, Settings, CreditCard, BarChart3, Store, Crown, Sparkles, AlertCircle,

  Menu, Home, Truck, MapPin, Phone, RefreshCw, Loader2, ChevronRight,

  LogOut, Edit, Edit2, X, MessageCircle, Trash2, Users, Copy, Building2, Trophy,

  Award, Image as ImageIcon, Briefcase, Star, FileText, Upload, Download,

  Calendar, MapPin as MapPinIcon, Mail, Linkedin, Globe, Facebook, Instagram,

  Twitter, Youtube, Link as LinkIcon, UserPlus, UserMinus, Shield, Zap,

  Target, Rocket, Award as AwardIcon, Medal, Gem, Heart, ThumbsUp, Save

} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import { Button } from '../components/ui/button';

import { Input } from '../components/ui/input';

import { Skeleton } from '../components/ui/skeleton';

import { toast } from 'sonner';

import { toAbsoluteMediaUrl } from '../utils/media';

import { COUNTRIES, getCountryByCode } from '../utils/countries';

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

import MapboxMap from '../components/MapboxMap';

import MessagesSection from '../components/MessagesSection';

import { 

  AnimatedNumber, 

  staggerContainer, 

  statCardVariant,

  tabContentVariant

} from '../components/AnimatedComponents';

import ImageUpload from '../components/ImageUpload';

import EnterpriseProductModal from '../components/EnterpriseProductModal';



import { API_BASE, API_URL } from '../config/api';



const API = API_URL;



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

  { id: 'products', label: 'Mes produits', icon: Package, badge: true },

  { id: 'orders', label: 'Commandes', icon: ShoppingBag, badge: true },

  { id: 'offers', label: 'Offres', icon: DollarSign, badge: true },

  { id: 'messages', label: 'Messages', icon: MessageCircle },

  { id: 'tracking', label: 'Suivi livraisons', icon: Truck },

  { id: 'stats', label: 'Statistiques', icon: BarChart3 },

  { id: 'subscription', label: 'Abonnement', icon: Crown },

  { id: 'settings', label: 'Paramètres', icon: Settings },

];



const EnterpriseDashboard = () => {

  const navigate = useNavigate();

  const { user, token, isEnterprise, refreshUser, logout } = useAuth();

  const [searchParams] = useSearchParams();

  

  const [activeSection, setActiveSection] = useState('dashboard');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [dashboard, setDashboard] = useState(null);

  const [orders, setOrders] = useState([]);

  const [products, setProducts] = useState([]);

  const [offers, setOffers] = useState([]);

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

    if (!isEnterprise) {

      navigate('/connexion');

      return;

    }

    fetchDashboard();

    

    const sessionId = searchParams.get('session_id');

    if (sessionId) checkSubscriptionPayment(sessionId);

    if (searchParams.get('success') === 'true') toast.success('Plan gratuit activé !');

    if (searchParams.get('cancelled') === 'true') toast.info('Paiement annulé');

  }, [isEnterprise, navigate, searchParams]);



  const fetchDashboard = async () => {

    try {

      const response = await axios.get(`${API}/enterprises/dashboard`, {

        headers: { Authorization: `Bearer ${token}` }

      });

      setDashboard(response.data);

      fetchOrders();

      fetchProducts();

      fetchOffers();

      fetchEnterpriseData();

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

      const productsData = Array.isArray(response.data) ? response.data : (response.data.products || []);

      setProducts(productsData);

    } catch (error) {

      console.error('Error:', error);

    }

  }, [token]);



  const fetchOffers = useCallback(async () => {

    try {

      const response = await axios.get(`${API}/offers/received`, { headers: { Authorization: `Bearer ${token}` } });

      setOffers(response.data.offers || []);

    } catch (error) {

      console.error('Error fetching offers:', error);

    }

  }, [token]);



  const fetchEnterpriseData = async () => {

    // Removed enterprise-specific data fetching for trophies, certifications, etc.

  };



  const handleAcceptOffer = async (offerId) => {

    try {

      await axios.post(`${API}/offers/${offerId}/respond`, {

        status: 'accepted',

        response_message: 'Offre acceptée'

      }, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Offre acceptée ! Un lien de paiement a été généré.');

      fetchOffers();

    } catch (error) {

      console.error('Error accepting offer:', error);

      toast.error('Erreur lors de l\'acceptation de l\'offre');

    }

  };



  const handleRejectOffer = async (offerId) => {

    try {

      await axios.post(`${API}/offers/${offerId}/respond`, {

        status: 'rejected',

        response_message: 'Offre refusée'

      }, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Offre refusée');

      fetchOffers();

    } catch (error) {

      console.error('Error rejecting offer:', error);

      toast.error('Erreur lors du refus de l\'offre');

    }

  };



  const handleCounterOffer = async (offerId) => {

    const counterPrice = prompt('Entrez votre contre-offre (en FCFA):');

    if (!counterPrice || parseInt(counterPrice) <= 0) {

      toast.error('Prix invalide');

      return;

    }

    

    const message = prompt('Ajoutez un message (optionnel):') || '';

    

    try {

      await axios.post(`${API}/offers/${offerId}/counter`, {

        counter_price_fcfa: parseInt(counterPrice),

        message: message

      }, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Contre-offre envoyée');

      fetchOffers();

    } catch (error) {

      console.error('Error sending counter offer:', error);

      toast.error('Erreur lors de l\'envoi de la contre-offre');

    }

  };



  const handleWithdrawOffer = async (offerId) => {

    try {

      await axios.post(`${API}/offers/${offerId}/withdraw`, {}, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Offre annulée');

      fetchOffers();

    } catch (error) {

      console.error('Error withdrawing offer:', error);

      toast.error('Erreur lors de l\'annulation de l\'offre');

    }

  };



  const copyNegotiatedLink = (token) => {

    const link = `${window.location.origin}/offer-link/${token}`;

    navigator.clipboard.writeText(link);

    toast.success('Lien copié dans le presse-papier');

  };



  const handleLogout = () => {

    logout();

    navigate('/');

  };



  const checkSubscriptionPayment = async (sessionId) => {

    try {

      await axios.post(`${API}/subscriptions/verify-payment`, { session_id: sessionId }, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Abonnement activé avec succès !');

      refreshUser();

    } catch (error) {

      console.error('Payment verification error:', error);

    }

  };



  if (loading) {

    return (

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">

        <div className="text-center">

          <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-4" />

          <p className="text-slate-400">Chargement du tableau de bord...</p>

        </div>

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">

      {/* Sidebar */}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        <div className="flex flex-col h-full">

          {/* Logo */}

          <div className="p-6 border-b border-slate-800/50">

            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-amber-500/30">

                C

              </div>

              <div>

                <h1 className="font-black text-lg text-white">

                  <span className="text-amber-400">Clo</span><span className="text-yellow-500">léo</span>

                </h1>

                <p className="text-xs text-slate-400">Entreprise Premium</p>

              </div>

            </div>

          </div>



          {/* Navigation */}

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">

            {NAV_ITEMS.map((item) => {

              const Icon = item.icon;

              const isActive = activeSection === item.id;

              return (

                <button

                  key={item.id}

                  onClick={() => {

                    setActiveSection(item.id);

                    setMobileMenuOpen(false);

                  }}

                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${

                    isActive

                      ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white shadow-lg shadow-amber-500/30 border border-amber-400/30'

                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white hover:border hover:border-slate-700/50'

                  }`}

                >

                  <Icon className="w-5 h-5" />

                  <span className="font-medium text-sm">{item.label}</span>

                  {item.badge && (

                    <span className="ml-auto bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/30">

                      {item.id === 'orders' ? dashboard?.pending_orders || 0 : item.id === 'products' ? products.length : offers.length}

                    </span>

                  )}

                </button>

              );

            })}

          </nav>



          {/* User Info */}

          <div className="p-4 border-t border-slate-800/50">

            <div className="flex items-center gap-3 mb-3">

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/30">

                {user?.company_name?.[0] || user?.name?.[0] || 'E'}

              </div>

              <div className="flex-1 min-w-0">

                <p className="font-semibold text-sm text-white truncate">{user?.company_name || user?.name}</p>

                <p className="text-xs text-slate-400 truncate">{user?.email}</p>

              </div>

            </div>

            <Button

              variant="outline"

              size="sm"

              className="w-full bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:text-white hover:border-slate-600"

              onClick={handleLogout}

            >

              <LogOut className="w-4 h-4 mr-2" />

              Déconnexion

            </Button>

          </div>

        </div>

      </aside>



      {/* Mobile Overlay */}

      {mobileMenuOpen && (

        <div

          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-sm"

          onClick={() => setMobileMenuOpen(false)}

        />

      )}



      {/* Main Content */}

      <main className="flex-1 lg:ml-0 overflow-auto">

        {/* Top Bar */}

        <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 sticky top-0 z-30">

          <div className="px-4 lg:px-8 py-4 flex items-center justify-between">

            <div className="flex items-center gap-4">

              <Button

                variant="ghost"

                size="icon"

                className="lg:hidden text-slate-400 hover:text-white hover:bg-slate-800/50"

                onClick={() => setMobileMenuOpen(true)}

              >

                <Menu className="w-5 h-5" />

              </Button>

              <div>

                <h2 className="text-xl font-bold text-white">

                  {NAV_ITEMS.find(item => item.id === activeSection)?.label}

                </h2>

                <p className="text-sm text-slate-400">

                  {user?.company_name || user?.name}

                </p>

              </div>

            </div>

            <div className="flex items-center gap-2">

              <Button

                variant="outline"

                size="sm"

                className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700/50 hover:text-white hover:border-slate-600"

                onClick={() => navigate('/')}

              >

                <Store className="w-4 h-4 mr-2" />

                Voir le site

              </Button>

            </div>

          </div>

        </header>



        {/* Content Area */}

        <div className="p-4 lg:p-8 bg-slate-900/50 min-h-screen">

          {activeSection === 'dashboard' && (

            <DashboardSection 

              dashboard={dashboard} 

              orders={orders} 

              products={products}

              offers={offers}

              followerCount={followerCount}

              onAcceptOffer={handleAcceptOffer}

              onRejectOffer={handleRejectOffer}

              onCounterOffer={handleCounterOffer}

              onWithdrawOffer={handleWithdrawOffer}

              onCopyLink={copyNegotiatedLink}

              formatPrice={formatPrice}

            />

          )}

          

          {activeSection === 'products' && (

            <ProductsSection 

              products={products}

              loading={loading}

              onRefresh={fetchProducts}

              token={token}

              formatPrice={formatPrice}

            />

          )}

          

          {activeSection === 'orders' && (

            <OrdersSection 

              orders={orders}

              loading={loading}

              onRefresh={fetchOrders}

              token={token}

              formatPrice={formatPrice}

            />

          )}

          

          {activeSection === 'offers' && (

            <OffersSection 

              offers={offers}

              loading={loading}

              onRefresh={fetchOffers}

              onAccept={handleAcceptOffer}

              onReject={handleRejectOffer}

              onCounter={handleCounterOffer}

              onWithdraw={handleWithdrawOffer}

              onCopyLink={copyNegotiatedLink}

              token={token}

              formatPrice={formatPrice}

            />

          )}

          

          {activeSection === 'messages' && (

            <EnterpriseMessagesSection 

              user={user}

              token={token}

            />

          )}

          

          {activeSection === 'tracking' && (

            <TrackingSection 

              orders={orders}

              selectedOrder={selectedOrder}

              onSelectOrder={setSelectedOrder}

              driverLocation={driverLocation}

              onSetDriverLocation={setDriverLocation}

              token={token}

            />

          )}

          

          {activeSection === 'stats' && (

            <StatsSection 

              dashboard={dashboard}

              orders={orders}

              products={products}

              formatPrice={formatPrice}

            />

          )}

          

          {activeSection === 'subscription' && (

            <SubscriptionSection 

              user={user}

              token={token}

              onRefresh={refreshUser}

            />

          )}

          

          {activeSection === 'settings' && (

            <SettingsSection 

              user={user}

              token={token}

              onRefresh={refreshUser}

            />

          )}

        </div>

      </main>

    </div>

  );

};



// Dashboard Section Component

const DashboardSection = ({ dashboard, orders, products, offers, followerCount, onAcceptOffer, onRejectOffer, onCounterOffer, onWithdrawOffer, onCopyLink, formatPrice }) => {

  return (

    <div className="space-y-6">

      {/* Stats Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <StatCard icon={Package} color="text-amber-400" value={dashboard?.total_products || 0} label="Produits" />

        <StatCard icon={ShoppingBag} color="text-cyan-400" value={dashboard?.total_orders || 0} label="Commandes" />

        <StatCard icon={DollarSign} color="text-emerald-400" value={`${formatPrice(dashboard?.total_revenue || 0)} FCFA`} label="Revenus" />

        <StatCard icon={Users} color="text-purple-400" value={followerCount} label="Abonnés" />

      </div>



      {/* Quick Actions */}

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

        <h3 className="font-bold text-lg mb-4 text-white">Actions rapides</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

          <QuickAction icon={Plus} label="Ajouter produit" color="bg-gradient-to-r from-amber-500 to-yellow-500" />

          <QuickAction icon={ShoppingBag} label="Voir commandes" color="bg-gradient-to-r from-cyan-500 to-blue-500" />

          <QuickAction icon={DollarSign} label="Offres" color="bg-gradient-to-r from-emerald-500 to-teal-500" />

          <QuickAction icon={Trophy} label="Ajouter trophée" color="bg-gradient-to-r from-purple-500 to-pink-500" />

        </div>

      </div>



      {/* Recent Orders */}

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

        <h3 className="font-bold text-lg mb-4 text-white">Commandes récentes</h3>

        {orders?.slice(0, 5).map(order => (

          <OrderCard key={order.id} order={order} formatPrice={formatPrice} />

        ))}

      </div>



      {/* Recent Offers */}

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

        <h3 className="font-bold text-lg mb-4 text-white">Offres récentes</h3>

        {offers?.slice(0, 3).map(offer => (

          <OfferCard 

            key={offer._id} 

            offer={offer} 

            onAccept={onAcceptOffer}

            onReject={onRejectOffer}

            onCounter={onCounterOffer}

            onWithdraw={onWithdrawOffer}

            onCopyLink={onCopyLink}

            formatPrice={formatPrice}

          />

        ))}

      </div>

    </div>

  );

};



// Stat Card Component

const StatCard = ({ icon: Icon, color, value, label }) => (

  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

    <div className="flex items-center justify-between mb-4">

      <Icon className={`w-8 h-8 ${color}`} />

      <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center">

        <TrendingUp className="w-5 h-5 text-slate-400" />

      </div>

    </div>

    <p className="text-3xl font-bold text-white">{value}</p>

    <p className="text-sm text-slate-400">{label}</p>

  </div>

);



// Quick Action Component

const QuickAction = ({ icon: Icon, label, color }) => (

  <button className={`flex flex-col items-center gap-2 p-4 rounded-xl ${color} text-white hover:opacity-90 transition-opacity shadow-lg`}>

    <Icon className="w-6 h-6" />

    <span className="text-sm font-medium">{label}</span>

  </button>

);



// Order Card Component

const OrderCard = ({ order, formatPrice }) => (

  <div className="flex items-center justify-between p-4 border-b border-slate-700/50 last:border-0">

    <div>

      <p className="font-semibold text-white">{order.order_number || order.id}</p>

      <p className="text-sm text-slate-400">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>

    </div>

    <div className="text-right">

      <p className="font-bold text-white">{formatPrice(order.total_fcfa)} FCFA</p>

      <span className={`text-xs px-2 py-1 rounded-full ${

        order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :

        order.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :

        'bg-slate-700/50 text-slate-400 border border-slate-600/50'

      }`}>

        {order.status}

      </span>

    </div>

  </div>

);



// Offer Card Component

const OfferCard = ({ offer, onAccept, onReject, onCounter, onWithdraw, onCopyLink, formatPrice }) => (

  <div className="border border-slate-700/50 rounded-xl p-4 mb-4 bg-slate-800/30">

    <div className="flex items-start justify-between mb-3">

      <div>

        <p className="font-semibold text-white">{offer.product?.name}</p>

        <p className="text-sm text-slate-400">Offre de {offer.buyer?.name}</p>

      </div>

      <span className={`px-2 py-1 rounded-full text-xs font-medium ${

        offer.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :

        offer.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :

        'bg-slate-700/50 text-slate-400 border border-slate-600/50'

      }`}>

        {offer.status}

      </span>

    </div>

    <div className="flex items-center gap-4 mb-3">

      <div>

        <p className="text-xs text-slate-400">Prix original</p>

        <p className="text-sm text-slate-500 line-through">{formatPrice(offer.original_price_fcfa)} FCFA</p>

      </div>

      <div>

        <p className="text-xs text-slate-400">Offre</p>

        <p className="text-lg font-bold text-emerald-400">{formatPrice(offer.offered_price_fcfa)} FCFA</p>

      </div>

    </div>

    {offer.status === 'pending' && (

      <div className="flex gap-2">

        <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600" onClick={() => onAccept(offer._id)}>

          <CheckCircle className="w-4 h-4 mr-1" /> Accepter

        </Button>

        <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700/50" onClick={() => onReject(offer._id)}>

          <XCircle className="w-4 h-4 mr-1" /> Refuser

        </Button>

      </div>

    )}

  </div>

);



// Products Section Component

const ProductsSection = ({ products, loading, onRefresh, token, formatPrice }) => {

  const [showAddModal, setShowAddModal] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);

  const [categories, setCategories] = useState([]);



  useEffect(() => {

    fetchCategories();

  }, []);



  const fetchCategories = async () => {

    try {

      const response = await axios.get(`${API}/categories`);

      setCategories(response.data);

    } catch (error) {

      console.error('Error fetching categories:', error);

    }

  };



  const handleAddProduct = async (data) => {

    try {

      await axios.post(`${API}/vendor/products`, data, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Produit ajouté avec succès');

      setShowAddModal(false);

      onRefresh();

    } catch (error) {

      console.error('Error adding product:', error);

      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout du produit');

    }

  };



  const handleDeleteProduct = async (productId) => {

    if (!window.confirm('Supprimer ce produit ?')) return;

    

    try {

      await axios.delete(`${API}/vendor/products/${productId}`, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Produit supprimé');

      onRefresh();

    } catch (error) {

      console.error('Error deleting product:', error);

      toast.error('Erreur lors de la suppression');

    }

  };



  const handleEditProduct = (product) => {

    setEditingProduct(product);

    setShowEditModal(true);

  };



  const handleUpdateProduct = async (data) => {

    try {

      await axios.put(`${API}/vendor/products/${editingProduct.id}`, data, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Produit mis à jour avec succès');

      setShowEditModal(false);

      setEditingProduct(null);

      onRefresh();

    } catch (error) {

      console.error('Error updating product:', error);

      toast.error('Erreur lors de la mise à jour du produit');

    }

  };



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-white">Mes produits</h3>

          <p className="text-sm text-slate-400">Gérez votre catalogue de produits</p>

        </div>

        <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600">

          <Plus className="w-4 h-4 mr-2" />

          Ajouter un produit

        </Button>

      </div>



      {/* Products Grid */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {products?.length > 0 ? products.map((product) => (

          <div key={product.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden group shadow-xl">

            {product.images?.length > 0 && (

              <div className="relative h-48">

                <img 

                  src={toAbsoluteMediaUrl(product.images[0])} 

                  alt={product.name}

                  className="w-full h-full object-cover"

                />

                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">

                  <Button

                    size="sm"

                    variant="outline"

                    onClick={() => handleEditProduct(product)}

                    className="bg-slate-900/80 border-slate-600 text-white hover:bg-slate-800"

                  >

                    <Edit2 className="w-4 h-4" />

                  </Button>

                  <Button

                    size="sm"

                    variant="destructive"

                    onClick={() => handleDeleteProduct(product.id)}

                    className="bg-red-500 hover:bg-red-600"

                  >

                    <Trash2 className="w-4 h-4" />

                  </Button>

                </div>

              </div>

            )}

            <div className="p-4">

              <div className="flex items-start justify-between mb-2">

                <div className="flex-1">

                  <h4 className="font-bold text-white mb-1">{product.name}</h4>

                  <p className="text-lg font-bold text-amber-400">{formatPrice(product.price_fcfa)} FCFA</p>

                </div>

                <span className={`px-2 py-1 rounded-full text-xs font-medium ${

                  product.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :

                  product.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :

                  'bg-red-500/20 text-red-400 border border-red-500/30'

                }`}>

                  {product.status}

                </span>

              </div>

              <p className="text-sm text-slate-400 line-clamp-2 mb-2">{product.description}</p>

              <div className="flex items-center gap-2 text-xs text-slate-500">

                <MapPin className="w-3 h-3" />

                <span>{product.location}</span>

              </div>

            </div>

          </div>

        )) : (

          <div className="col-span-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center shadow-xl">

            <Package className="w-16 h-16 mx-auto mb-4 text-slate-600" />

            <p className="text-slate-400">Aucun produit ajouté</p>

            <p className="text-sm text-slate-500">Commencez par ajouter vos premiers produits</p>

          </div>

        )}

      </div>



      {/* Product Modals */}

      <EnterpriseProductModal

        isOpen={showAddModal}

        onClose={() => setShowAddModal(false)}

        onSubmit={handleAddProduct}

        categories={categories}

        token={token}

      />

      <EnterpriseProductModal

        isOpen={showEditModal}

        onClose={() => setShowEditModal(false)}

        onSubmit={handleUpdateProduct}

        product={editingProduct}

        categories={categories}

        token={token}

      />

    </div>

  );

};



const OrdersSection = ({ orders, loading, onRefresh, token, formatPrice }) => {

  const [filterStatus, setFilterStatus] = useState('all');

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [showDetailModal, setShowDetailModal] = useState(false);



  const filteredOrders = orders?.filter(order => 

    filterStatus === 'all' || order.status === filterStatus

  ) || [];



  const handleUpdateStatus = async (orderId, newStatus) => {

    try {

      await axios.put(`${API}/orders/${orderId}/status`, 

        { status: newStatus },

        { headers: { Authorization: `Bearer ${token}` } }

      );

      toast.success('Statut mis à jour');

      onRefresh();

    } catch (error) {

      console.error('Error updating status:', error);

      toast.error('Erreur lors de la mise à jour');

    }

  };



  const statusColors = {

    pending: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',

    confirmed: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',

    processing: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',

    shipped: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',

    delivered: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',

    cancelled: 'bg-red-500/20 text-red-400 border border-red-500/30'

  };



  const statusLabels = {

    pending: 'En attente',

    confirmed: 'Confirmée',

    processing: 'En traitement',

    shipped: 'Expédiée',

    delivered: 'Livrée',

    cancelled: 'Annulée'

  };



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-white">Commandes</h3>

          <p className="text-sm text-slate-400">Gérez vos commandes clients</p>

        </div>

        <div className="flex gap-2">

          <select

            className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"

            value={filterStatus}

            onChange={(e) => setFilterStatus(e.target.value)}

          >

            <option value="all">Tous les statuts</option>

            <option value="pending">En attente</option>

            <option value="confirmed">Confirmées</option>

            <option value="processing">En traitement</option>

            <option value="shipped">Expédiées</option>

            <option value="delivered">Livrées</option>

            <option value="cancelled">Annulées</option>

          </select>

        </div>

      </div>



      {/* Orders List */}

      <div className="space-y-4">

        {filteredOrders.length > 0 ? filteredOrders.map((order) => (

          <div key={order.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

            <div className="flex items-start justify-between mb-4">

              <div className="flex-1">

                <div className="flex items-center gap-3 mb-2">

                  <h4 className="font-bold text-white">Commande #{order.order_number || order.id}</h4>

                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || statusColors.pending}`}>

                    {statusLabels[order.status] || order.status}

                  </span>

                </div>

                <p className="text-sm text-slate-400 mb-2">

                  <Calendar className="w-4 h-4 inline mr-1" />

                  {new Date(order.created_at).toLocaleDateString('fr-FR', { 

                    day: '2-digit', 

                    month: 'long', 

                    year: 'numeric',

                    hour: '2-digit',

                    minute: '2-digit'

                  })}

                </p>

                {order.buyer_name && (

                  <p className="text-sm text-slate-400">

                    <User className="w-4 h-4 inline mr-1" />

                    {order.buyer_name}

                  </p>

                )}

              </div>

              <div className="text-right">

                <p className="text-lg font-bold text-amber-400">{formatPrice(order.total_fcfa)} FCFA</p>

                <p className="text-sm text-slate-500">{order.items?.length || 0} article(s)</p>

              </div>

            </div>



            {/* Order Items */}

            <div className="mb-4">

              {order.items?.map((item, index) => (

                <div key={index} className="flex items-center gap-3 py-2 border-b border-slate-700/50 last:border-0">

                  {item.image && (

                    <img src={toAbsoluteMediaUrl(item.image)} alt="" className="w-12 h-12 rounded-lg object-cover" />

                  )}

                  <div className="flex-1">

                    <p className="text-sm font-medium text-white">{item.name}</p>

                    <p className="text-xs text-slate-400">Qté: {item.quantity}</p>

                  </div>

                  <p className="text-sm text-slate-300">{formatPrice(item.price_fcfa)} FCFA</p>

                </div>

              ))}

            </div>



            {/* Actions */}

            <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">

              <Button

                size="sm"

                variant="outline"

                onClick={() => {

                  setSelectedOrder(order);

                  setShowDetailModal(true);

                }}

                className="border-slate-600 text-slate-300 hover:bg-slate-700/50"

              >

                <Eye className="w-4 h-4 mr-2" />

                Voir détails

              </Button>

              

              {order.status === 'pending' && (

                <div className="flex gap-2">

                  <Button

                    size="sm"

                    onClick={() => handleUpdateStatus(order.id, 'confirmed')}

                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"

                  >

                    <CheckCircle className="w-4 h-4 mr-1" />

                    Confirmer

                  </Button>

                  <Button

                    size="sm"

                    variant="outline"

                    onClick={() => handleUpdateStatus(order.id, 'cancelled')}

                    className="border-red-500 text-red-400 hover:bg-red-500/20"

                  >

                    <XCircle className="w-4 h-4 mr-1" />

                    Annuler

                  </Button>

                </div>

              )}



              {order.status === 'confirmed' && (

                <Button

                  size="sm"

                  onClick={() => handleUpdateStatus(order.id, 'processing')}

                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"

                >

                  <Package className="w-4 h-4 mr-1" />

                  Préparer

                </Button>

              )}



              {order.status === 'processing' && (

                <Button

                  size="sm"

                  onClick={() => handleUpdateStatus(order.id, 'shipped')}

                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"

                >

                  <Truck className="w-4 h-4 mr-1" />

                  Expédier

                </Button>

              )}



              {order.status === 'shipped' && (

                <Button

                  size="sm"

                  onClick={() => handleUpdateStatus(order.id, 'delivered')}

                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"

                >

                  <CheckCircle className="w-4 h-4 mr-1" />

                  Marquer livrée

                </Button>

              )}

            </div>

          </div>

        )) : (

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center shadow-xl">

            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-slate-600" />

            <p className="text-slate-400">Aucune commande trouvée</p>

            <p className="text-sm text-slate-500">Les commandes apparaîtront ici</p>

          </div>

        )}

      </div>



      {/* Order Detail Modal */}

      {showDetailModal && selectedOrder && (

        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">

          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl">

            <div className="flex items-center justify-between mb-4">

              <h4 className="font-bold text-lg text-white">Détails de la commande</h4>

              <Button variant="ghost" size="icon" onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-white hover:bg-slate-800/50">

                <X className="w-5 h-5" />

              </Button>

            </div>

            

            <div className="space-y-4">

              <div className="grid grid-cols-2 gap-4 text-sm">

                <div>

                  <p className="text-slate-400">Numéro</p>

                  <p className="text-white font-medium">{selectedOrder.order_number || selectedOrder.id}</p>

                </div>

                <div>

                  <p className="text-slate-400">Statut</p>

                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[selectedOrder.status]}`}>

                    {statusLabels[selectedOrder.status]}

                  </span>

                </div>

                <div>

                  <p className="text-slate-400">Date</p>

                  <p className="text-white">{new Date(selectedOrder.created_at).toLocaleDateString('fr-FR')}</p>

                </div>

                <div>

                  <p className="text-slate-400">Total</p>

                  <p className="text-amber-400 font-bold">{formatPrice(selectedOrder.total_fcfa)} FCFA</p>

                </div>

              </div>



              {selectedOrder.buyer_name && (

                <div>

                  <p className="text-slate-400 text-sm mb-1">Client</p>

                  <p className="text-white">{selectedOrder.buyer_name}</p>

                </div>

              )}



              {selectedOrder.delivery_address && (

                <div>

                  <p className="text-slate-400 text-sm mb-1">Adresse de livraison</p>

                  <p className="text-white text-sm">{selectedOrder.delivery_address}</p>

                </div>

              )}



              <div>

                <p className="text-slate-400 text-sm mb-2">Articles</p>

                <div className="space-y-2">

                  {selectedOrder.items?.map((item, index) => (

                    <div key={index} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">

                      {item.image && (

                        <img src={toAbsoluteMediaUrl(item.image)} alt="" className="w-10 h-10 rounded object-cover" />

                      )}

                      <div className="flex-1">

                        <p className="text-sm text-white">{item.name}</p>

                        <p className="text-xs text-slate-400">Qté: {item.quantity}</p>

                      </div>

                      <p className="text-sm text-amber-400">{formatPrice(item.price_fcfa)} FCFA</p>

                    </div>

                  ))}

                </div>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



const OffersSection = ({ offers, loading, onRefresh, onAccept, onReject, onCounter, onWithdraw, onCopyLink, token, formatPrice }) => {

  const [filterStatus, setFilterStatus] = useState('all');

  const [showCounterModal, setShowCounterModal] = useState(false);

  const [selectedOffer, setSelectedOffer] = useState(null);

  const [counterPrice, setCounterPrice] = useState('');



  const filteredOffers = offers?.filter(offer => 

    filterStatus === 'all' || offer.status === filterStatus

  ) || [];



  const handleCounterOffer = () => {

    if (!counterPrice || !selectedOffer) return;

    onCounter(selectedOffer._id, counterPrice);

    setShowCounterModal(false);

    setCounterPrice('');

    setSelectedOffer(null);

  };



  const statusColors = {

    pending: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',

    accepted: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',

    rejected: 'bg-red-500/20 text-red-400 border border-red-500/30',

    counter_offered: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',

    withdrawn: 'bg-slate-500/20 text-slate-400 border border-slate-500/30'

  };



  const statusLabels = {

    pending: 'En attente',

    accepted: 'Acceptée',

    rejected: 'Refusée',

    counter_offered: 'Contre-offre',

    withdrawn: 'Retirée'

  };



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-white">Offres de négociation</h3>

          <p className="text-sm text-slate-400">Gérez les offres sur vos produits</p>

        </div>

        <div className="flex gap-2">

          <select

            className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"

            value={filterStatus}

            onChange={(e) => setFilterStatus(e.target.value)}

          >

            <option value="all">Tous les statuts</option>

            <option value="pending">En attente</option>

            <option value="accepted">Acceptées</option>

            <option value="rejected">Refusées</option>

            <option value="counter_offered">Contre-offres</option>

            <option value="withdrawn">Retirées</option>

          </select>

        </div>

      </div>



      {/* Offers List */}

      <div className="space-y-4">

        {filteredOffers.length > 0 ? filteredOffers.map((offer) => (

          <div key={offer._id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

            <div className="flex items-start justify-between mb-4">

              <div className="flex-1">

                <div className="flex items-center gap-3 mb-2">

                  <h4 className="font-bold text-white">{offer.product?.name}</h4>

                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[offer.status] || statusColors.pending}`}>

                    {statusLabels[offer.status] || offer.status}

                  </span>

                </div>

                <p className="text-sm text-slate-400 mb-2">

                  <User className="w-4 h-4 inline mr-1" />

                  Offre de {offer.buyer?.name}

                </p>

                <p className="text-xs text-slate-500">

                  <Calendar className="w-4 h-4 inline mr-1" />

                  {new Date(offer.created_at).toLocaleDateString('fr-FR', { 

                    day: '2-digit', 

                    month: 'long', 

                    year: 'numeric',

                    hour: '2-digit',

                    minute: '2-digit'

                  })}

                </p>

              </div>

            </div>



            {/* Price Comparison */}

            <div className="flex items-center gap-6 mb-4 bg-slate-900/50 rounded-xl p-4">

              <div>

                <p className="text-xs text-slate-400 mb-1">Prix original</p>

                <p className="text-lg text-slate-500 line-through">{formatPrice(offer.original_price_fcfa)} FCFA</p>

              </div>

              <div className="h-12 w-px bg-slate-700"></div>

              <div>

                <p className="text-xs text-slate-400 mb-1">Offre</p>

                <p className="text-2xl font-bold text-amber-400">{formatPrice(offer.offered_price_fcfa)} FCFA</p>

              </div>

              <div className="h-12 w-px bg-slate-700"></div>

              <div>

                <p className="text-xs text-slate-400 mb-1">Réduction</p>

                <p className="text-lg font-bold text-emerald-400">

                  {Math.round((1 - offer.offered_price_fcfa / offer.original_price_fcfa) * 100)}%

                </p>

              </div>

            </div>



            {/* Actions */}

            {offer.status === 'pending' && (

              <div className="flex gap-2 pt-4 border-t border-slate-700/50">

                <Button

                  size="sm"

                  onClick={() => onAccept(offer._id)}

                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"

                >

                  <CheckCircle className="w-4 h-4 mr-1" />

                  Accepter

                </Button>

                <Button

                  size="sm"

                  onClick={() => {

                    setSelectedOffer(offer);

                    setShowCounterModal(true);

                  }}

                  variant="outline"

                  className="flex-1 border-purple-500 text-purple-400 hover:bg-purple-500/20"

                >

                  <RefreshCw className="w-4 h-4 mr-1" />

                  Contre-offre

                </Button>

                <Button

                  size="sm"

                  onClick={() => onReject(offer._id)}

                  variant="outline"

                  className="flex-1 border-red-500 text-red-400 hover:bg-red-500/20"

                >

                  <XCircle className="w-4 h-4 mr-1" />

                  Refuser

                </Button>

              </div>

            )}



            {offer.status === 'counter_offered' && (

              <div className="flex gap-2 pt-4 border-t border-slate-700/50">

                <Button

                  size="sm"

                  onClick={() => onAccept(offer._id)}

                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"

                >

                  <CheckCircle className="w-4 h-4 mr-1" />

                  Accepter la contre-offre

                </Button>

                <Button

                  size="sm"

                  onClick={() => onReject(offer._id)}

                  variant="outline"

                  className="flex-1 border-red-500 text-red-400 hover:bg-red-500/20"

                >

                  <XCircle className="w-4 h-4 mr-1" />

                  Refuser

                </Button>

              </div>

            )}



            {offer.status === 'accepted' && (

              <div className="flex gap-2 pt-4 border-t border-slate-700/50">

                <Button

                  size="sm"

                  onClick={() => onCopyLink(offer._id)}

                  variant="outline"

                  className="flex-1 border-cyan-500 text-cyan-400 hover:bg-cyan-500/20"

                >

                  <Link2 className="w-4 h-4 mr-1" />

                  Copier le lien de négociation

                </Button>

              </div>

            )}

          </div>

        )) : (

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center shadow-xl">

            <DollarSign className="w-16 h-16 mx-auto mb-4 text-slate-600" />

            <p className="text-slate-400">Aucune offre trouvée</p>

            <p className="text-sm text-slate-500">Les offres de négociation apparaîtront ici</p>

          </div>

        )}

      </div>



      {/* Counter Offer Modal */}

      {showCounterModal && selectedOffer && (

        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">

          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">

            <div className="flex items-center justify-between mb-4">

              <h4 className="font-bold text-lg text-white">Contre-offre</h4>

              <Button variant="ghost" size="icon" onClick={() => setShowCounterModal(false)} className="text-slate-400 hover:text-white hover:bg-slate-800/50">

                <X className="w-5 h-5" />

              </Button>

            </div>

            

            <div className="space-y-4">

              <div>

                <p className="text-sm text-slate-400 mb-1">Produit</p>

                <p className="text-white font-medium">{selectedOffer.product?.name}</p>

              </div>

              

              <div>

                <p className="text-sm text-slate-400 mb-1">Offre actuelle</p>

                <p className="text-amber-400 font-bold">{formatPrice(selectedOffer.offered_price_fcfa)} FCFA</p>

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Votre contre-offre (FCFA)</label>

                <Input

                  type="number"

                  value={counterPrice}

                  onChange={(e) => setCounterPrice(e.target.value)}

                  placeholder="Entrez votre prix"

                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"

                />

              </div>

              

              <div className="flex gap-2 pt-4">

                <Button onClick={handleCounterOffer} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">

                  <RefreshCw className="w-4 h-4 mr-2" />

                  Envoyer

                </Button>

                <Button variant="outline" onClick={() => setShowCounterModal(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700/50">

                  Annuler

                </Button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



const EnterpriseMessagesSection = ({ user, token }) => {

  const [conversations, setConversations] = useState([]);

  const [selectedConversation, setSelectedConversation] = useState(null);

  const [messages, setMessages] = useState([]);

  const [newMessage, setNewMessage] = useState('');

  const [loading, setLoading] = useState(true);

  const [sending, setSending] = useState(false);



  const fetchConversations = async () => {

    try {

      const response = await axios.get(`${API}/chat/conversations`, {

        headers: { Authorization: `Bearer ${token}` }

      });

      setConversations(response.data);

    } catch (error) {

      console.error('Error fetching conversations:', error);

    } finally {

      setLoading(false);

    }

  };



  const fetchMessages = async (conversationId) => {

    try {

      const response = await axios.get(`${API}/chat/conversations/${conversationId}/messages`, {

        headers: { Authorization: `Bearer ${token}` }

      });

      setMessages(response.data);

    } catch (error) {

      console.error('Error fetching messages:', error);

    }

  };



  const sendMessage = async () => {

    if (!newMessage.trim() || !selectedConversation) return;



    setSending(true);

    try {

      await axios.post(`${API}/chat/conversations/${selectedConversation._id}/messages`, 

        { content: newMessage },

        { headers: { Authorization: `Bearer ${token}` } }

      );

      setNewMessage('');

      fetchMessages(selectedConversation._id);

      toast.success('Message envoyé');

    } catch (error) {

      console.error('Error sending message:', error);

      toast.error('Erreur lors de l\'envoi');

    } finally {

      setSending(false);

    }

  };



  useEffect(() => {

    fetchConversations();

  }, []);



  useEffect(() => {

    if (selectedConversation) {

      fetchMessages(selectedConversation._id);

    }

  }, [selectedConversation]);



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-white">Messagerie</h3>

          <p className="text-sm text-slate-400">Communiquez avec vos clients</p>

        </div>

      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">

        {/* Conversations List */}

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">

          <div className="p-4 border-b border-slate-700/50">

            <h4 className="font-semibold text-white">Conversations</h4>

          </div>

          <div className="overflow-y-auto h-full">

            {loading ? (

              <div className="p-4 text-center text-slate-400">Chargement...</div>

            ) : conversations.length > 0 ? (

              conversations.map((conv) => (

                <div

                  key={conv._id}

                  onClick={() => setSelectedConversation(conv)}

                  className={`p-4 border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/30 transition-colors ${

                    selectedConversation?._id === conv._id ? 'bg-slate-700/50' : ''

                  }`}

                >

                  <div className="flex items-center gap-3">

                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">

                      {conv.participant?.name?.[0] || 'U'}

                    </div>

                    <div className="flex-1 min-w-0">

                      <p className="font-medium text-white truncate">{conv.participant?.name || 'Client'}</p>

                      <p className="text-xs text-slate-400 truncate">{conv.lastMessage || 'Aucun message'}</p>

                    </div>

                    {conv.unreadCount > 0 && (

                      <div className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">

                        {conv.unreadCount}

                      </div>

                    )}

                  </div>

                </div>

              ))

            ) : (

              <div className="p-8 text-center text-slate-400">

                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-slate-600" />

                <p>Aucune conversation</p>

              </div>

            )}

          </div>

        </div>



        {/* Messages Area */}

        <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl flex flex-col">

          {selectedConversation ? (

            <>

              <div className="p-4 border-b border-slate-700/50 flex items-center gap-3">

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">

                  {selectedConversation.participant?.name?.[0] || 'U'}

                </div>

                <div>

                  <p className="font-semibold text-white">{selectedConversation.participant?.name || 'Client'}</p>

                  <p className="text-xs text-slate-400">

                    {selectedConversation.product?.name ? `À propos de: ${selectedConversation.product.name}` : 'Discussion générale'}

                  </p>

                </div>

              </div>



              <div className="flex-1 overflow-y-auto p-4 space-y-4">

                {messages.map((msg) => (

                  <div

                    key={msg._id}

                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}

                  >

                    <div className={`max-w-[70%] rounded-2xl p-3 ${

                      msg.sender_id === user?.id

                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white'

                        : 'bg-slate-700/50 text-white'

                    }`}>

                      <p className="text-sm">{msg.content}</p>

                      <p className="text-xs opacity-70 mt-1">

                        {new Date(msg.created_at).toLocaleTimeString('fr-FR', {

                          hour: '2-digit',

                          minute: '2-digit'

                        })}

                      </p>

                    </div>

                  </div>

                ))}

              </div>



              <div className="p-4 border-t border-slate-700/50">

                <div className="flex gap-2">

                  <Input

                    value={newMessage}

                    onChange={(e) => setNewMessage(e.target.value)}

                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}

                    placeholder="Écrivez votre message..."

                    className="flex-1 bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"

                  />

                  <Button

                    onClick={sendMessage}

                    disabled={sending || !newMessage.trim()}

                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"

                  >

                    <Send className="w-4 h-4" />

                  </Button>

                </div>

              </div>

            </>

          ) : (

            <div className="flex-1 flex items-center justify-center">

              <div className="text-center text-slate-400">

                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-600" />

                <p>Sélectionnez une conversation pour commencer</p>

              </div>

            </div>

          )}

        </div>

      </div>

    </div>

  );

};



const TrackingSection = ({ orders, selectedOrder, onSelectOrder, driverLocation, onSetDriverLocation, token }) => {

  const [showMap, setShowMap] = useState(false);

  const [trackingData, setTrackingData] = useState(null);



  const shippedOrders = orders?.filter(order => order.status === 'shipped' || order.status === 'processing') || [];



  const handleTrackOrder = async (order) => {

    onSelectOrder(order);

    try {

      const response = await axios.get(`${API}/orders/${order.id}/tracking`, {

        headers: { Authorization: `Bearer ${token}` }

      });

      setTrackingData(response.data);

      setShowMap(true);

    } catch (error) {

      console.error('Error fetching tracking:', error);

      toast.error('Erreur lors du chargement du suivi');

    }

  };



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-white">Suivi des livraisons</h3>

          <p className="text-sm text-slate-400">Suivez vos livraisons en temps réel</p>

        </div>

      </div>



      {!showMap ? (

        <div className="space-y-4">

          {shippedOrders.length > 0 ? shippedOrders.map((order) => (

            <div key={order.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

              <div className="flex items-start justify-between mb-4">

                <div className="flex-1">

                  <div className="flex items-center gap-3 mb-2">

                    <h4 className="font-bold text-white">Commande #{order.order_number || order.id}</h4>

                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${

                      order.status === 'shipped' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :

                      'bg-purple-500/20 text-purple-400 border border-purple-500/30'

                    }`}>

                      {order.status === 'shipped' ? 'Expédiée' : 'En préparation'}

                    </span>

                  </div>

                  {order.buyer_name && (

                    <p className="text-sm text-slate-400 mb-2">

                      <User className="w-4 h-4 inline mr-1" />

                      {order.buyer_name}

                    </p>

                  )}

                  {order.delivery_address && (

                    <p className="text-sm text-slate-400">

                      <MapPin className="w-4 h-4 inline mr-1" />

                      {order.delivery_address}

                    </p>

                  )}

                </div>

                <Button

                  onClick={() => handleTrackOrder(order)}

                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"

                >

                  <Map className="w-4 h-4 mr-2" />

                  Suivre

                </Button>

              </div>



              {/* Progress Bar */}

              <div className="mb-4">

                <div className="flex justify-between text-xs text-slate-400 mb-2">

                  <span>Confirmée</span>

                  <span>Préparation</span>

                  <span>Expédiée</span>

                  <span>Livrée</span>

                </div>

                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">

                  <div 

                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"

                    style={{

                      width: order.status === 'processing' ? '50%' : 

                             order.status === 'shipped' ? '75%' : 

                             order.status === 'delivered' ? '100%' : '25%'

                    }}

                  />

                </div>

              </div>

            </div>

          )) : (

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center shadow-xl">

              <Truck className="w-16 h-16 mx-auto mb-4 text-slate-600" />

              <p className="text-slate-400">Aucune livraison en cours</p>

              <p className="text-sm text-slate-500">Les livraisons actives apparaîtront ici</p>

            </div>

          )}

        </div>

      ) : (

        <div className="space-y-4">

          <Button

            variant="outline"

            onClick={() => setShowMap(false)}

            className="border-slate-600 text-slate-300 hover:bg-slate-700/50"

          >

            <ArrowLeft className="w-4 h-4 mr-2" />

            Retour

          </Button>



          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

            <div className="flex items-center justify-between mb-4">

              <div>

                <h4 className="font-bold text-white">Commande #{selectedOrder?.order_number || selectedOrder?.id}</h4>

                <p className="text-sm text-slate-400">Suivi en direct</p>

              </div>

              <div className="flex items-center gap-2">

                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>

                <span className="text-sm text-green-400">En direct</span>

              </div>

            </div>



            {/* Map Placeholder */}

            <div className="bg-slate-900/50 rounded-xl h-80 mb-4 flex items-center justify-center border border-slate-700/50">

              <div className="text-center">

                <Map className="w-16 h-16 mx-auto mb-4 text-slate-600" />

                <p className="text-slate-400">Carte de suivi</p>

                <p className="text-sm text-slate-500">Intégration Google Maps prévue</p>

              </div>

            </div>



            {/* Tracking Details */}

            <div className="grid grid-cols-2 gap-4">

              <div className="bg-slate-900/50 rounded-xl p-4">

                <p className="text-xs text-slate-400 mb-1">Livreur</p>

                <p className="text-white font-medium">{trackingData?.driver?.name || 'En attente'}</p>

              </div>

              <div className="bg-slate-900/50 rounded-xl p-4">

                <p className="text-xs text-slate-400 mb-1">Téléphone</p>

                <p className="text-white font-medium">{trackingData?.driver?.phone || 'En attente'}</p>

              </div>

              <div className="bg-slate-900/50 rounded-xl p-4">

                <p className="text-xs text-slate-400 mb-1">ETA estimée</p>

                <p className="text-white font-medium">{trackingData?.eta || 'Calcul en cours...'}</p>

              </div>

              <div className="bg-slate-900/50 rounded-xl p-4">

                <p className="text-xs text-slate-400 mb-1">Distance</p>

                <p className="text-white font-medium">{trackingData?.distance || 'Calcul en cours...'}</p>

              </div>

            </div>



            {/* Timeline */}

            <div className="mt-4">

              <h5 className="font-semibold text-white mb-3">Historique</h5>

              <div className="space-y-3">

                <div className="flex items-start gap-3">

                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">

                    <CheckCircle className="w-4 h-4 text-emerald-400" />

                  </div>

                  <div>

                    <p className="text-sm text-white">Commande confirmée</p>

                    <p className="text-xs text-slate-400">{new Date(selectedOrder?.created_at).toLocaleString('fr-FR')}</p>

                  </div>

                </div>

                {selectedOrder?.status === 'processing' && (

                  <div className="flex items-start gap-3">

                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">

                      <Package className="w-4 h-4 text-purple-400" />

                    </div>

                    <div>

                      <p className="text-sm text-white">En préparation</p>

                      <p className="text-xs text-slate-400">En cours</p>

                    </div>

                  </div>

                )}

                {selectedOrder?.status === 'shipped' && (

                  <>

                    <div className="flex items-start gap-3">

                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">

                        <Package className="w-4 h-4 text-purple-400" />

                      </div>

                      <div>

                        <p className="text-sm text-white">En préparation</p>

                        <p className="text-xs text-slate-400">Terminé</p>

                      </div>

                    </div>

                    <div className="flex items-start gap-3">

                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">

                        <Truck className="w-4 h-4 text-cyan-400" />

                      </div>

                      <div>

                        <p className="text-sm text-white">Expédiée</p>

                        <p className="text-xs text-slate-400">En cours de livraison</p>

                      </div>

                    </div>

                  </>

                )}

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



const StatsSection = ({ dashboard, orders, products, formatPrice }) => {

  const [timeRange, setTimeRange] = useState('30d');



  const calculateStats = () => {

    const totalRevenue = orders?.reduce((sum, order) => 

      order.status === 'delivered' ? sum + (order.total_fcfa || 0) : sum, 0) || 0;

    

    const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;

    const completedOrders = orders?.filter(o => o.status === 'delivered').length || 0;

    const avgOrderValue = completedOrders > 0 ? totalRevenue / completedOrders : 0;



    return {

      totalRevenue,

      pendingOrders,

      completedOrders,

      avgOrderValue,

      conversionRate: products?.length > 0 ? Math.round((completedOrders / products.length) * 100) : 0

    };

  };



  const stats = calculateStats();



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-white">Statistiques</h3>

          <p className="text-sm text-slate-400">Analysez vos performances</p>

        </div>

        <select

          className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"

          value={timeRange}

          onChange={(e) => setTimeRange(e.target.value)}

        >

          <option value="7d">7 derniers jours</option>

          <option value="30d">30 derniers jours</option>

          <option value="90d">90 derniers jours</option>

          <option value="1y">Cette année</option>

        </select>

      </div>



      {/* Key Metrics */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

          <div className="flex items-center justify-between mb-4">

            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">

              <DollarSign className="w-6 h-6 text-white" />

            </div>

            <div className="flex items-center gap-1 text-emerald-400 text-sm">

              <TrendingUp className="w-4 h-4" />

              <span>+12%</span>

            </div>

          </div>

          <p className="text-3xl font-bold text-white mb-1">{formatPrice(stats.totalRevenue)}</p>

          <p className="text-sm text-slate-400">Revenus totaux</p>

        </div>



        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

          <div className="flex items-center justify-between mb-4">

            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">

              <ShoppingBag className="w-6 h-6 text-white" />

            </div>

            <div className="flex items-center gap-1 text-emerald-400 text-sm">

              <TrendingUp className="w-4 h-4" />

              <span>+8%</span>

            </div>

          </div>

          <p className="text-3xl font-bold text-white mb-1">{stats.completedOrders}</p>

          <p className="text-sm text-slate-400">Commandes livrées</p>

        </div>



        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

          <div className="flex items-center justify-between mb-4">

            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">

              <Package className="w-6 h-6 text-white" />

            </div>

            <div className="flex items-center gap-1 text-amber-400 text-sm">

              <TrendingUp className="w-4 h-4" />

              <span>+5%</span>

            </div>

          </div>

          <p className="text-3xl font-bold text-white mb-1">{products?.length || 0}</p>

          <p className="text-sm text-slate-400">Produits actifs</p>

        </div>



        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

          <div className="flex items-center justify-between mb-4">

            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">

              <Target className="w-6 h-6 text-white" />

            </div>

            <div className="flex items-center gap-1 text-emerald-400 text-sm">

              <TrendingUp className="w-4 h-4" />

              <span>+15%</span>

            </div>

          </div>

          <p className="text-3xl font-bold text-white mb-1">{stats.conversionRate}%</p>

          <p className="text-sm text-slate-400">Taux de conversion</p>

        </div>

      </div>



      {/* Charts Section */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Revenue Chart Placeholder */}

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

          <h4 className="font-semibold text-white mb-4">Évolution des revenus</h4>

          <div className="h-64 flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-700/50">

            <div className="text-center">

              <BarChart className="w-16 h-16 mx-auto mb-4 text-slate-600" />

              <p className="text-slate-400">Graphique des revenus</p>

              <p className="text-sm text-slate-500">Intégration Chart.js prévue</p>

            </div>

          </div>

        </div>



        {/* Orders Chart Placeholder */}

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

          <h4 className="font-semibold text-white mb-4">Répartition des commandes</h4>

          <div className="h-64 flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-700/50">

            <div className="text-center">

              <PieChart className="w-16 h-16 mx-auto mb-4 text-slate-600" />

              <p className="text-slate-400">Répartition par statut</p>

              <p className="text-sm text-slate-500">Intégration Chart.js prévue</p>

            </div>

          </div>

        </div>

      </div>



      {/* Recent Activity */}

      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

        <h4 className="font-semibold text-white mb-4">Activité récente</h4>

        <div className="space-y-4">

          {orders?.slice(0, 5).map((order) => (

            <div key={order.id} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-xl">

              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${

                order.status === 'delivered' ? 'bg-emerald-500/20' :

                order.status === 'pending' ? 'bg-amber-500/20' :

                'bg-slate-700/50'

              }`}>

                {order.status === 'delivered' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :

                 order.status === 'pending' ? <Clock className="w-5 h-5 text-amber-400" /> :

                 <Package className="w-5 h-5 text-slate-400" />}

              </div>

              <div className="flex-1">

                <p className="text-sm text-white">Commande #{order.order_number || order.id}</p>

                <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>

              </div>

              <p className="text-sm font-bold text-amber-400">{formatPrice(order.total_fcfa)} FCFA</p>

            </div>

          ))}

        </div>

      </div>

    </div>

  );

};



const SubscriptionSection = ({ user, token, onRefresh }) => {

  const [loading, setLoading] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState(null);



  const plans = [

    {

      id: 'free',

      name: 'Gratuit',

      price: 0,

      features: [

        'Jusqu\'à 10 produits',

        'Commandes illimitées',

        'Support par email',

        'Statistiques basiques'

      ],

      popular: false

    },

    {

      id: 'pro',

      name: 'Pro',

      price: 25000,

      features: [

        'Produits illimités',

        'Commandes illimitées',

        'Support prioritaire',

        'Statistiques avancées',

        'Badge Pro',

        'Mise en avant des produits'

      ],

      popular: true

    },

    {

      id: 'enterprise',

      name: 'Enterprise',

      price: 75000,

      features: [

        'Tout le plan Pro',

        'API dédiée',

        'Account manager',

        'Personnalisation',

        'Formation incluse',

        'SLA garanti'

      ],

      popular: false

    }

  ];



  const currentPlan = user?.subscription_plan || 'free';



  const handleSubscribe = async (planId) => {

    setLoading(true);

    try {

      const response = await axios.post(`${API}/subscriptions/checkout`, 

        { plan_id: planId },

        { headers: { Authorization: `Bearer ${token}` } }

      );

      

      if (response.data.checkout_url) {

        window.location.href = response.data.checkout_url;

      } else if (response.data.session_id) {

        window.location.href = `/enterprise?session_id=${response.data.session_id}`;

      }

    } catch (error) {

      console.error('Subscription error:', error);

      toast.error('Erreur lors de la souscription');

    } finally {

      setLoading(false);

    }

  };



  const handleCancelSubscription = async () => {

    if (!window.confirm('Voulez-vous vraiment annuler votre abonnement ?')) return;

    

    setLoading(true);

    try {

      await axios.post(`${API}/subscriptions/cancel`, {}, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Abonnement annulé');

      onRefresh();

    } catch (error) {

      console.error('Cancel error:', error);

      toast.error('Erreur lors de l\'annulation');

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-white">Abonnement</h3>

          <p className="text-sm text-slate-400">Gérez votre plan d'abonnement</p>

        </div>

        {currentPlan !== 'free' && (

          <Button

            variant="outline"

            onClick={handleCancelSubscription}

            disabled={loading}

            className="border-red-500 text-red-400 hover:bg-red-500/20"

          >

            <XCircle className="w-4 h-4 mr-2" />

            Annuler l'abonnement

          </Button>

        )}

      </div>



      {/* Current Plan */}

      <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-2xl p-6 shadow-xl">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm text-slate-400 mb-1">Plan actuel</p>

            <p className="text-2xl font-bold text-white capitalize">{currentPlan}</p>

          </div>

          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">

            <Crown className="w-6 h-6 text-white" />

          </div>

        </div>

      </div>



      {/* Plans Grid */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {plans.map((plan) => (

          <div 

            key={plan.id}

            className={`bg-slate-800/50 backdrop-blur-sm border rounded-2xl p-6 shadow-xl relative ${

              plan.popular ? 'border-amber-500/50' : 'border-slate-700/50'

            } ${currentPlan === plan.id ? 'ring-2 ring-amber-500' : ''}`}

          >

            {plan.popular && (

              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">

                <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full">

                  Populaire

                </span>

              </div>

            )}

            

            <div className="text-center mb-6">

              <h4 className="text-xl font-bold text-white mb-2">{plan.name}</h4>

              <p className="text-3xl font-bold text-amber-400">

                {plan.price === 0 ? 'Gratuit' : `${plan.price.toLocaleString()} FCFA`}

                <span className="text-sm text-slate-400 font-normal">/mois</span>

              </p>

            </div>



            <ul className="space-y-3 mb-6">

              {plan.features.map((feature, index) => (

                <li key={index} className="flex items-center gap-2 text-sm text-slate-300">

                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />

                  {feature}

                </li>

              ))}

            </ul>



            <Button

              onClick={() => handleSubscribe(plan.id)}

              disabled={loading || currentPlan === plan.id}

              className={`w-full ${

                plan.popular 

                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600' 

                  : 'bg-slate-700 hover:bg-slate-600'

              } ${currentPlan === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}

            >

              {currentPlan === plan.id ? 'Plan actuel' : 'S\'abonner'}

            </Button>

          </div>

        ))}

      </div>



      {/* Billing Info */}

      {currentPlan !== 'free' && (

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

          <h4 className="font-semibold text-white mb-4">Informations de facturation</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>

              <p className="text-xs text-slate-400 mb-1">Date de début</p>

              <p className="text-white">{user?.subscription_start ? new Date(user.subscription_start).toLocaleDateString('fr-FR') : 'N/A'}</p>

            </div>

            <div>

              <p className="text-xs text-slate-400 mb-1">Prochain renouvellement</p>

              <p className="text-white">{user?.subscription_end ? new Date(user.subscription_end).toLocaleDateString('fr-FR') : 'N/A'}</p>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



const TrophiesSection = ({ trophies, loading, onRefresh, token }) => {

  const [showAddModal, setShowAddModal] = useState(false);

  const [newTrophy, setNewTrophy] = useState({

    title: '',

    description: '',

    year: '',

    organization: '',

    image: null

  });

  const [uploading, setUploading] = useState(false);



  const handleImageUpload = async (file) => {

    setUploading(true);

    try {

      const formData = new FormData();

      formData.append('file', file);

      

      const response = await axios.post(`${API}/upload`, formData, {

        headers: { 

          Authorization: `Bearer ${token}`,

          'Content-Type': 'multipart/form-data'

        }

      });

      

      setNewTrophy({ ...newTrophy, image: response.data.url });

      toast.success('Image uploadée avec succès');

    } catch (error) {

      console.error('Upload error:', error);

      toast.error('Erreur lors de l\'upload de l\'image');

    } finally {

      setUploading(false);

    }

  };



  const handleAddTrophy = async () => {

    if (!newTrophy.title || !newTrophy.year) {

      toast.error('Veuillez remplir le titre et l\'année');

      return;

    }



    try {

      await axios.post(`${API}/enterprises/trophies`, newTrophy, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Trophée ajouté avec succès');

      setShowAddModal(false);

      setNewTrophy({ title: '', description: '', year: '', organization: '', image: null });

      onRefresh();

    } catch (error) {

      console.error('Error adding trophy:', error);

      toast.error('Erreur lors de l\'ajout du trophée');

    }

  };



  const handleDeleteTrophy = async (trophyId) => {

    if (!window.confirm('Supprimer ce trophée ?')) return;

    

    try {

      await axios.delete(`${API}/enterprises/trophies/${trophyId}`, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Trophée supprimé');

      onRefresh();

    } catch (error) {

      console.error('Error deleting trophy:', error);

      toast.error('Erreur lors de la suppression');

    }

  };



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-white">Trophées & Awards</h3>

          <p className="text-sm text-slate-400">Affichez vos réalisations et distinctions</p>

        </div>

        <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600">

          <Trophy className="w-4 h-4 mr-2" />

          Ajouter un trophée

        </Button>

      </div>



      {/* Trophies Grid */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {trophies?.length > 0 ? trophies.map((trophy) => (

          <div key={trophy.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden group shadow-xl">

            {trophy.image && (

              <div className="relative h-48 bg-gradient-to-br from-amber-900/30 to-orange-900/30">

                <img 

                  src={toAbsoluteMediaUrl(trophy.image)} 

                  alt={trophy.title}

                  className="w-full h-full object-cover"

                />

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">

                  <Button

                    size="sm"

                    variant="destructive"

                    onClick={() => handleDeleteTrophy(trophy.id)}

                    className="bg-red-500 hover:bg-red-600"

                  >

                    <Trash2 className="w-4 h-4" />

                  </Button>

                </div>

              </div>

            )}

            <div className="p-4">

              <div className="flex items-start justify-between mb-2">

                <div>

                  <h4 className="font-bold text-white">{trophy.title}</h4>

                  <p className="text-sm text-amber-400 font-semibold">{trophy.year}</p>

                </div>

                <Medal className="w-6 h-6 text-amber-500" />

              </div>

              {trophy.organization && (

                <p className="text-sm text-slate-400 mb-2">

                  <AwardIcon className="w-4 h-4 inline mr-1" />

                  {trophy.organization}

                </p>

              )}

              {trophy.description && (

                <p className="text-sm text-slate-500 line-clamp-2">{trophy.description}</p>

              )}

            </div>

          </div>

        )) : (

          <div className="col-span-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center shadow-xl">

            <Trophy className="w-16 h-16 mx-auto mb-4 text-slate-600" />

            <p className="text-slate-400">Aucun trophée ajouté</p>

            <p className="text-sm text-slate-500">Commencez par ajouter vos premières distinctions</p>

          </div>

        )}

      </div>



      {/* Add Trophy Modal */}

      {showAddModal && (

        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">

          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">

            <div className="flex items-center justify-between mb-4">

              <h4 className="font-bold text-lg text-white">Ajouter un trophée</h4>

              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white hover:bg-slate-800/50">

                <X className="w-5 h-5" />

              </Button>

            </div>

            

            <div className="space-y-4">

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Titre *</label>

                <Input

                  value={newTrophy.title}

                  onChange={(e) => setNewTrophy({ ...newTrophy, title: e.target.value })}

                  placeholder="Ex: Prix de l'innovation 2024"

                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Année *</label>

                <Input

                  type="number"

                  value={newTrophy.year}

                  onChange={(e) => setNewTrophy({ ...newTrophy, year: e.target.value })}

                  placeholder="2024"

                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Organisation</label>

                <Input

                  value={newTrophy.organization}

                  onChange={(e) => setNewTrophy({ ...newTrophy, organization: e.target.value })}

                  placeholder="Ex: Chambre de commerce"

                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Description</label>

                <textarea

                  className="w-full border border-slate-700 bg-slate-800/50 rounded-lg p-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"

                  rows="3"

                  value={newTrophy.description}

                  onChange={(e) => setNewTrophy({ ...newTrophy, description: e.target.value })}

                  placeholder="Description du trophée..."

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Image</label>

                <ImageUpload

                  onUpload={handleImageUpload}

                  currentImage={newTrophy.image}

                  accept="image/*"

                />

              </div>

              

              <div className="flex gap-2 pt-4">

                <Button onClick={handleAddTrophy} disabled={uploading} className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600">

                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trophy className="w-4 h-4 mr-2" />}

                  Ajouter

                </Button>

                <Button variant="outline" onClick={() => setShowAddModal(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700/50">

                  Annuler

                </Button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



const CertificationsSection = ({ certifications, loading, onRefresh, token }) => {

  const [showAddModal, setShowAddModal] = useState(false);

  const [newCertification, setNewCertification] = useState({

    name: '',

    issuing_organization: '',

    issue_date: '',

    expiry_date: '',

    certificate_number: '',

    document: null

  });

  const [uploading, setUploading] = useState(false);



  const handleDocumentUpload = async (file) => {

    setUploading(true);

    try {

      const formData = new FormData();

      formData.append('file', file);

      

      const response = await axios.post(`${API}/upload`, formData, {

        headers: { 

          Authorization: `Bearer ${token}`,

          'Content-Type': 'multipart/form-data'

        }

      });

      

      setNewCertification({ ...newCertification, document: response.data.url });

      toast.success('Document uploadé avec succès');

    } catch (error) {

      console.error('Upload error:', error);

      toast.error('Erreur lors de l\'upload du document');

    } finally {

      setUploading(false);

    }

  };



  const handleAddCertification = async () => {

    if (!newCertification.name || !newCertification.issuing_organization) {

      toast.error('Veuillez remplir le nom et l\'organisation émettrice');

      return;

    }



    try {

      await axios.post(`${API}/enterprises/certifications`, newCertification, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Certification ajoutée avec succès');

      setShowAddModal(false);

      setNewCertification({ 

        name: '', 

        issuing_organization: '', 

        issue_date: '', 

        expiry_date: '', 

        certificate_number: '', 

        document: null 

      });

      onRefresh();

    } catch (error) {

      console.error('Error adding certification:', error);

      toast.error('Erreur lors de l\'ajout de la certification');

    }

  };



  const handleDeleteCertification = async (certId) => {

    if (!window.confirm('Supprimer cette certification ?')) return;

    

    try {

      await axios.delete(`${API}/enterprises/certifications/${certId}`, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Certification supprimée');

      onRefresh();

    } catch (error) {

      console.error('Error deleting certification:', error);

      toast.error('Erreur lors de la suppression');

    }

  };



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-white">Certifications</h3>

          <p className="text-sm text-slate-400">Gérez vos certifications professionnelles</p>

        </div>

        <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">

          <Award className="w-4 h-4 mr-2" />

          Ajouter une certification

        </Button>

      </div>



      {/* Certifications List */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {certifications?.length > 0 ? certifications.map((cert) => (

          <div key={cert.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 border-l-4 border-cyan-500 shadow-xl">

            <div className="flex items-start justify-between mb-4">

              <div className="flex items-center gap-3">

                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">

                  <Shield className="w-6 h-6 text-cyan-400" />

                </div>

                <div>

                  <h4 className="font-bold text-white">{cert.name}</h4>

                  <p className="text-sm text-slate-400">{cert.issuing_organization}</p>

                </div>

              </div>

              <Button

                size="sm"

                variant="ghost"

                onClick={() => handleDeleteCertification(cert.id)}

                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"

              >

                <Trash2 className="w-4 h-4" />

              </Button>

            </div>

            

            <div className="space-y-2 text-sm">

              {cert.certificate_number && (

                <div className="flex items-center gap-2 text-slate-400">

                  <FileText className="w-4 h-4" />

                  <span>N°: {cert.certificate_number}</span>

                </div>

              )}

              {cert.issue_date && (

                <div className="flex items-center gap-2 text-slate-400">

                  <Calendar className="w-4 h-4" />

                  <span>Délivré: {new Date(cert.issue_date).toLocaleDateString('fr-FR')}</span>

                </div>

              )}

              {cert.expiry_date && (

                <div className="flex items-center gap-2 text-slate-400">

                  <Clock className="w-4 h-4" />

                  <span>Expire: {new Date(cert.expiry_date).toLocaleDateString('fr-FR')}</span>

                </div>

              )}

            </div>

            

            {cert.document && (

              <div className="mt-4 pt-4 border-t border-slate-700/50">

                <a 

                  href={toAbsoluteMediaUrl(cert.document)}

                  target="_blank"

                  rel="noopener noreferrer"

                  className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium"

                >

                  <Download className="w-4 h-4" />

                  Voir le document

                </a>

              </div>

            )}

          </div>

        )) : (

          <div className="col-span-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center shadow-xl">

            <Award className="w-16 h-16 mx-auto mb-4 text-slate-600" />

            <p className="text-slate-400">Aucune certification ajoutée</p>

            <p className="text-sm text-slate-500">Ajoutez vos certifications pour renforcer votre crédibilité</p>

          </div>

        )}

      </div>



      {/* Add Certification Modal */}

      {showAddModal && (

        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">

          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">

            <div className="flex items-center justify-between mb-4">

              <h4 className="font-bold text-lg text-white">Ajouter une certification</h4>

              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white hover:bg-slate-800/50">

                <X className="w-5 h-5" />

              </Button>

            </div>

            

            <div className="space-y-4">

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Nom de la certification *</label>

                <Input

                  value={newCertification.name}

                  onChange={(e) => setNewCertification({ ...newCertification, name: e.target.value })}

                  placeholder="Ex: ISO 9001"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Organisation émettrice *</label>

                <Input

                  value={newCertification.issuing_organization}

                  onChange={(e) => setNewCertification({ ...newCertification, issuing_organization: e.target.value })}

                  placeholder="Ex: AFNOR"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Numéro de certificat</label>

                <Input

                  value={newCertification.certificate_number}

                  onChange={(e) => setNewCertification({ ...newCertification, certificate_number: e.target.value })}

                  placeholder="Ex: CERT-2024-001"

                />

              </div>

              

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="text-sm font-medium text-slate-700 mb-1 block">Date de délivrance</label>

                  <Input

                    type="date"

                    value={newCertification.issue_date}

                    onChange={(e) => setNewCertification({ ...newCertification, issue_date: e.target.value })}

                  />

                </div>

                <div>

                  <label className="text-sm font-medium text-slate-700 mb-1 block">Date d'expiration</label>

                  <Input

                    type="date"

                    value={newCertification.expiry_date}

                    onChange={(e) => setNewCertification({ ...newCertification, expiry_date: e.target.value })}

                  />

                </div>

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Document (PDF/Image)</label>

                <ImageUpload

                  onUpload={handleDocumentUpload}

                  currentImage={newCertification.document}

                  accept=".pdf,image/*"

                />

              </div>

              

              <div className="flex gap-2 pt-4">

                <Button onClick={handleAddCertification} disabled={uploading} className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500">

                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Award className="w-4 h-4 mr-2" />}

                  Ajouter

                </Button>

                <Button variant="outline" onClick={() => setShowAddModal(false)}>

                  Annuler

                </Button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



const PortfolioSection = ({ portfolio, loading, onRefresh, token }) => {

  const [showAddModal, setShowAddModal] = useState(false);

  const [newProject, setNewProject] = useState({

    title: '',

    description: '',

    client: '',

    completion_date: '',

    images: [],

    category: ''

  });

  const [uploading, setUploading] = useState(false);



  const handleImageUpload = async (file) => {

    setUploading(true);

    try {

      const formData = new FormData();

      formData.append('file', file);

      

      const response = await axios.post(`${API}/upload`, formData, {

        headers: { 

          Authorization: `Bearer ${token}`,

          'Content-Type': 'multipart/form-data'

        }

      });

      

      setNewProject({ 

        ...newProject, 

        images: [...newProject.images, response.data.url] 

      });

      toast.success('Image uploadée avec succès');

    } catch (error) {

      console.error('Upload error:', error);

      toast.error('Erreur lors de l\'upload de l\'image');

    } finally {

      setUploading(false);

    }

  };



  const handleAddProject = async () => {

    if (!newProject.title || !newProject.description) {

      toast.error('Veuillez remplir le titre et la description');

      return;

    }



    try {

      await axios.post(`${API}/enterprises/portfolio`, newProject, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Réalisation ajoutée avec succès');

      setShowAddModal(false);

      setNewProject({ 

        title: '', 

        description: '', 

        client: '', 

        completion_date: '', 

        images: [], 

        category: '' 

      });

      onRefresh();

    } catch (error) {

      console.error('Error adding portfolio item:', error);

      toast.error('Erreur lors de l\'ajout de la réalisation');

    }

  };



  const handleDeleteProject = async (projectId) => {

    if (!window.confirm('Supprimer cette réalisation ?')) return;

    

    try {

      await axios.delete(`${API}/enterprises/portfolio/${projectId}`, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Réalisation supprimée');

      onRefresh();

    } catch (error) {

      console.error('Error deleting portfolio item:', error);

      toast.error('Erreur lors de la suppression');

    }

  };



  const handleRemoveImage = (index) => {

    setNewProject({

      ...newProject,

      images: newProject.images.filter((_, i) => i !== index)

    });

  };



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-white">Réalisations / Portfolio</h3>

          <p className="text-sm text-slate-400">Montrez vos projets et réalisations</p>

        </div>

        <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">

          <ImageIcon className="w-4 h-4 mr-2" />

          Ajouter une réalisation

        </Button>

      </div>



      {/* Portfolio Grid */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {portfolio?.length > 0 ? portfolio.map((item) => (

          <div key={item.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden group shadow-xl">

            {item.images?.length > 0 && (

              <div className="relative h-56">

                <img 

                  src={toAbsoluteMediaUrl(item.images[0])} 

                  alt={item.title}

                  className="w-full h-full object-cover"

                />

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">

                  <Button

                    size="sm"

                    variant="destructive"

                    onClick={() => handleDeleteProject(item.id)}

                  >

                    <Trash2 className="w-4 h-4" />

                  </Button>

                </div>

                {item.images.length > 1 && (

                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">

                    +{item.images.length - 1}

                  </div>

                )}

              </div>

            )}

            <div className="p-4">

              {item.category && (

                <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full mb-2">

                  {item.category}

                </span>

              )}

              <h4 className="font-bold text-slate-800 mb-1">{item.title}</h4>

              {item.client && (

                <p className="text-sm text-slate-400 mb-2">

                  <Building2 className="w-4 h-4 inline mr-1" />

                  {item.client}

                </p>

              )}

              {item.completion_date && (

                <p className="text-xs text-slate-500 mb-2">

                  <Calendar className="w-4 h-4 inline mr-1" />

                  {new Date(item.completion_date).toLocaleDateString('fr-FR')}

                </p>

              )}

              <p className="text-sm text-slate-500 line-clamp-2">{item.description}</p>

            </div>

          </div>

        )) : (

          <div className="col-span-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center shadow-xl">

            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-slate-600" />

            <p className="text-slate-400">Aucune réalisation ajoutée</p>

            <p className="text-sm text-slate-500">Commencez par ajouter vos premiers projets</p>

          </div>

        )}

      </div>



      {/* Add Portfolio Modal */}

      {showAddModal && (

        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">

          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 my-8 shadow-2xl">

            <div className="flex items-center justify-between mb-4">

              <h4 className="font-bold text-lg text-white">Ajouter une réalisation</h4>

              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white hover:bg-slate-800/50">

                <X className="w-5 h-5" />

              </Button>

            </div>

            

            <div className="space-y-4">

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Titre *</label>

                <Input

                  value={newProject.title}

                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}

                  placeholder="Ex: Rénovation bureau ABC"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Catégorie</label>

                <Input

                  value={newProject.category}

                  onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}

                  placeholder="Ex: Construction, Design, etc."

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Client</label>

                <Input

                  value={newProject.client}

                  onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}

                  placeholder="Nom du client"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Date de réalisation</label>

                <Input

                  type="date"

                  value={newProject.completion_date}

                  onChange={(e) => setNewProject({ ...newProject, completion_date: e.target.value })}

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Description *</label>

                <textarea

                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"

                  rows="4"

                  value={newProject.description}

                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}

                  placeholder="Description du projet..."

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Images</label>

                <ImageUpload

                  onUpload={handleImageUpload}

                  accept="image/*"

                />

                {newProject.images.length > 0 && (

                  <div className="mt-2 flex flex-wrap gap-2">

                    {newProject.images.map((img, index) => (

                      <div key={index} className="relative">

                        <img 

                          src={toAbsoluteMediaUrl(img)} 

                          alt={`Upload ${index + 1}`}

                          className="w-16 h-16 object-cover rounded-lg"

                        />

                        <button

                          type="button"

                          onClick={() => handleRemoveImage(index)}

                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"

                        >

                          <X className="w-3 h-3" />

                        </button>

                      </div>

                    ))}

                  </div>

                )}

              </div>

              

              <div className="flex gap-2 pt-4">

                <Button onClick={handleAddProject} disabled={uploading} className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500">

                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}

                  Ajouter

                </Button>

                <Button variant="outline" onClick={() => setShowAddModal(false)}>

                  Annuler

                </Button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



const TeamSection = ({ team, loading, onRefresh, token }) => {

  const [showAddModal, setShowAddModal] = useState(false);

  const [newMember, setNewMember] = useState({

    name: '',

    position: '',

    email: '',

    phone: '',

    photo: null,

    linkedin: '',

    bio: ''

  });

  const [uploading, setUploading] = useState(false);



  const handlePhotoUpload = async (file) => {

    setUploading(true);

    try {

      const formData = new FormData();

      formData.append('file', file);

      

      const response = await axios.post(`${API}/upload`, formData, {

        headers: { 

          Authorization: `Bearer ${token}`,

          'Content-Type': 'multipart/form-data'

        }

      });

      

      setNewMember({ ...newMember, photo: response.data.url });

      toast.success('Photo uploadée avec succès');

    } catch (error) {

      console.error('Upload error:', error);

      toast.error('Erreur lors de l\'upload de la photo');

    } finally {

      setUploading(false);

    }

  };



  const handleAddMember = async () => {

    if (!newMember.name || !newMember.position) {

      toast.error('Veuillez remplir le nom et le poste');

      return;

    }



    try {

      await axios.post(`${API}/enterprises/team`, newMember, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Membre ajouté avec succès');

      setShowAddModal(false);

      setNewMember({ 

        name: '', 

        position: '', 

        email: '', 

        phone: '', 

        photo: null, 

        linkedin: '', 

        bio: '' 

      });

      onRefresh();

    } catch (error) {

      console.error('Error adding team member:', error);

      toast.error('Erreur lors de l\'ajout du membre');

    }

  };



  const handleDeleteMember = async (memberId) => {

    if (!window.confirm('Supprimer ce membre ?')) return;

    

    try {

      await axios.delete(`${API}/enterprises/team/${memberId}`, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Membre supprimé');

      onRefresh();

    } catch (error) {

      console.error('Error deleting team member:', error);

      toast.error('Erreur lors de la suppression');

    }

  };



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-slate-800">Notre Équipe</h3>

          <p className="text-sm text-slate-500">Présentez les membres de votre équipe</p>

        </div>

        <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-green-500 to-teal-500">

          <UserPlus className="w-4 h-4 mr-2" />

          Ajouter un membre

        </Button>

      </div>



      {/* Team Grid */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {team?.length > 0 ? team.map((member) => (

          <div key={member.id} className="bg-white rounded-2xl shadow-sm p-6 text-center group">

            <div className="relative inline-block mb-4">

              {member.photo ? (

                <img 

                  src={toAbsoluteMediaUrl(member.photo)} 

                  alt={member.name}

                  className="w-24 h-24 rounded-full object-cover mx-auto"

                />

              ) : (

                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-teal-100 flex items-center justify-center mx-auto">

                  <Users className="w-12 h-12 text-green-500" />

                </div>

              )}

              <Button

                size="sm"

                variant="ghost"

                onClick={() => handleDeleteMember(member.id)}

                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"

              >

                <X className="w-4 h-4" />

              </Button>

            </div>

            

            <h4 className="font-bold text-slate-800 mb-1">{member.name}</h4>

            <p className="text-sm text-green-600 font-medium mb-3">{member.position}</p>

            

            {member.bio && (

              <p className="text-sm text-slate-500 line-clamp-2 mb-3">{member.bio}</p>

            )}

            

            <div className="flex justify-center gap-2">

              {member.email && (

                <a href={`mailto:${member.email}`} className="text-slate-400 hover:text-slate-600">

                  <Mail className="w-4 h-4" />

                </a>

              )}

              {member.linkedin && (

                <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-600">

                  <Linkedin className="w-4 h-4" />

                </a>

              )}

            </div>

          </div>

        )) : (

          <div className="col-span-full bg-white rounded-2xl shadow-sm p-12 text-center">

            <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />

            <p className="text-slate-500">Aucun membre ajouté</p>

            <p className="text-sm text-slate-400">Commencez par ajouter les membres de votre équipe</p>

          </div>

        )}

      </div>



      {/* Add Team Member Modal */}

      {showAddModal && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-2xl max-w-md w-full p-6">

            <div className="flex items-center justify-between mb-4">

              <h4 className="font-bold text-lg">Ajouter un membre</h4>

              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>

                <X className="w-5 h-5" />

              </Button>

            </div>

            

            <div className="space-y-4">

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Nom *</label>

                <Input

                  value={newMember.name}

                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}

                  placeholder="Nom complet"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Poste *</label>

                <Input

                  value={newMember.position}

                  onChange={(e) => setNewMember({ ...newMember, position: e.target.value })}

                  placeholder="Ex: Directeur technique"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>

                <Input

                  type="email"

                  value={newMember.email}

                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}

                  placeholder="email@exemple.com"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Téléphone</label>

                <Input

                  value={newMember.phone}

                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}

                  placeholder="+225 07 00 00 00"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">LinkedIn</label>

                <Input

                  value={newMember.linkedin}

                  onChange={(e) => setNewMember({ ...newMember, linkedin: e.target.value })}

                  placeholder="https://linkedin.com/in/..."

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Bio</label>

                <textarea

                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"

                  rows="3"

                  value={newMember.bio}

                  onChange={(e) => setNewMember({ ...newMember, bio: e.target.value })}

                  placeholder="Courte description..."

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Photo</label>

                <ImageUpload

                  onUpload={handlePhotoUpload}

                  currentImage={newMember.photo}

                  accept="image/*"

                />

              </div>

              

              <div className="flex gap-2 pt-4">

                <Button onClick={handleAddMember} disabled={uploading} className="flex-1 bg-gradient-to-r from-green-500 to-teal-500">

                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}

                  Ajouter

                </Button>

                <Button variant="outline" onClick={() => setShowAddModal(false)}>

                  Annuler

                </Button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



const ProjectsSection = ({ projects, loading, onRefresh, token }) => {

  const [showAddModal, setShowAddModal] = useState(false);

  const [newProject, setNewProject] = useState({

    title: '',

    description: '',

    client: '',

    start_date: '',

    end_date: '',

    budget: '',

    status: 'in_progress',

    technologies: []

  });



  const handleAddProject = async () => {

    if (!newProject.title || !newProject.description) {

      toast.error('Veuillez remplir le titre et la description');

      return;

    }



    try {

      await axios.post(`${API}/enterprises/projects`, newProject, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Projet ajouté avec succès');

      setShowAddModal(false);

      setNewProject({ 

        title: '', 

        description: '', 

        client: '', 

        start_date: '', 

        end_date: '', 

        budget: '', 

        status: 'in_progress',

        technologies: []

      });

      onRefresh();

    } catch (error) {

      console.error('Error adding project:', error);

      toast.error('Erreur lors de l\'ajout du projet');

    }

  };



  const handleDeleteProject = async (projectId) => {

    if (!window.confirm('Supprimer ce projet ?')) return;

    

    try {

      await axios.delete(`${API}/enterprises/projects/${projectId}`, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Projet supprimé');

      onRefresh();

    } catch (error) {

      console.error('Error deleting project:', error);

      toast.error('Erreur lors de la suppression');

    }

  };



  const handleAddTechnology = () => {

    const tech = prompt('Ajouter une technologie:');

    if (tech) {

      setNewProject({ ...newProject, technologies: [...newProject.technologies, tech] });

    }

  };



  const handleRemoveTechnology = (index) => {

    setNewProject({

      ...newProject,

      technologies: newProject.technologies.filter((_, i) => i !== index)

    });

  };



  const statusColors = {

    completed: 'bg-green-100 text-green-700',

    in_progress: 'bg-blue-100 text-blue-700',

    planned: 'bg-amber-100 text-amber-700',

    on_hold: 'bg-red-100 text-red-700'

  };



  const statusLabels = {

    completed: 'Terminé',

    in_progress: 'En cours',

    planned: 'Planifié',

    on_hold: 'En pause'

  };



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-slate-800">Projets</h3>

          <p className="text-sm text-slate-500">Gérez vos projets en cours et passés</p>

        </div>

        <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-indigo-500 to-purple-500">

          <Briefcase className="w-4 h-4 mr-2" />

          Ajouter un projet

        </Button>

      </div>



      {/* Projects List */}

      <div className="space-y-4">

        {projects?.length > 0 ? projects.map((project) => (

          <div key={project.id} className="bg-white rounded-2xl shadow-sm p-6">

            <div className="flex items-start justify-between mb-4">

              <div className="flex-1">

                <div className="flex items-center gap-3 mb-2">

                  <h4 className="font-bold text-slate-800">{project.title}</h4>

                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status] || statusColors.in_progress}`}>

                    {statusLabels[project.status] || project.status}

                  </span>

                </div>

                {project.client && (

                  <p className="text-sm text-slate-600 mb-2">

                    <Building2 className="w-4 h-4 inline mr-1" />

                    Client: {project.client}

                  </p>

                )}

                <p className="text-sm text-slate-500 line-clamp-2">{project.description}</p>

              </div>

              <Button

                size="sm"

                variant="ghost"

                onClick={() => handleDeleteProject(project.id)}

                className="text-red-500 hover:text-red-700"

              >

                <Trash2 className="w-4 h-4" />

              </Button>

            </div>

            

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">

              {project.start_date && (

                <div>

                  <p className="text-slate-500">Début</p>

                  <p className="font-medium text-slate-700">{new Date(project.start_date).toLocaleDateString('fr-FR')}</p>

                </div>

              )}

              {project.end_date && (

                <div>

                  <p className="text-slate-500">Fin</p>

                  <p className="font-medium text-slate-700">{new Date(project.end_date).toLocaleDateString('fr-FR')}</p>

                </div>

              )}

              {project.budget && (

                <div>

                  <p className="text-slate-500">Budget</p>

                  <p className="font-medium text-slate-700">{formatPrice(project.budget)} FCFA</p>

                </div>

              )}

              {project.technologies?.length > 0 && (

                <div>

                  <p className="text-slate-500">Technologies</p>

                  <p className="font-medium text-slate-700">{project.technologies.slice(0, 2).join(', ')}{project.technologies.length > 2 ? '...' : ''}</p>

                </div>

              )}

            </div>

          </div>

        )) : (

          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">

            <Briefcase className="w-16 h-16 mx-auto mb-4 text-slate-300" />

            <p className="text-slate-500">Aucun projet ajouté</p>

            <p className="text-sm text-slate-400">Commencez par ajouter vos premiers projets</p>

          </div>

        )}

      </div>



      {/* Add Project Modal */}

      {showAddModal && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-2xl max-w-lg w-full p-6">

            <div className="flex items-center justify-between mb-4">

              <h4 className="font-bold text-lg">Ajouter un projet</h4>

              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>

                <X className="w-5 h-5" />

              </Button>

            </div>

            

            <div className="space-y-4">

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Titre *</label>

                <Input

                  value={newProject.title}

                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}

                  placeholder="Ex: Développement application mobile"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Client</label>

                <Input

                  value={newProject.client}

                  onChange={(e) => setNewProject({ ...newProject, client: e.target.value })}

                  placeholder="Nom du client"

                />

              </div>

              

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="text-sm font-medium text-slate-700 mb-1 block">Date de début</label>

                  <Input

                    type="date"

                    value={newProject.start_date}

                    onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}

                  />

                </div>

                <div>

                  <label className="text-sm font-medium text-slate-700 mb-1 block">Date de fin</label>

                  <Input

                    type="date"

                    value={newProject.end_date}

                    onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}

                  />

                </div>

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Budget (FCFA)</label>

                <Input

                  type="number"

                  value={newProject.budget}

                  onChange={(e) => setNewProject({ ...newProject, budget: e.target.value })}

                  placeholder="5000000"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Statut</label>

                <select

                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"

                  value={newProject.status}

                  onChange={(e) => setNewProject({ ...newProject, status: e.target.value })}

                >

                  <option value="planned">Planifié</option>

                  <option value="in_progress">En cours</option>

                  <option value="completed">Terminé</option>

                  <option value="on_hold">En pause</option>

                </select>

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Description *</label>

                <textarea

                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"

                  rows="4"

                  value={newProject.description}

                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}

                  placeholder="Description détaillée du projet..."

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Technologies</label>

                <div className="flex flex-wrap gap-2 mb-2">

                  {newProject.technologies.map((tech, index) => (

                    <span key={index} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">

                      {tech}

                      <button type="button" onClick={() => handleRemoveTechnology(index)} className="hover:text-indigo-900">

                        <X className="w-3 h-3" />

                      </button>

                    </span>

                  ))}

                </div>

                <Button type="button" variant="outline" size="sm" onClick={handleAddTechnology}>

                  <Plus className="w-4 h-4 mr-1" />

                  Ajouter

                </Button>

              </div>

              

              <div className="flex gap-2 pt-4">

                <Button onClick={handleAddProject} className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500">

                  <Briefcase className="w-4 h-4 mr-2" />

                  Ajouter

                </Button>

                <Button variant="outline" onClick={() => setShowAddModal(false)}>

                  Annuler

                </Button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



const TestimonialsSection = ({ testimonials, loading, onRefresh, token }) => {

  const [showAddModal, setShowAddModal] = useState(false);

  const [newTestimonial, setNewTestimonial] = useState({

    client_name: '',

    company: '',

    position: '',

    content: '',

    rating: 5,

    project: '',

    date: '',

    photo: null

  });

  const [uploading, setUploading] = useState(false);



  const handlePhotoUpload = async (file) => {

    setUploading(true);

    try {

      const formData = new FormData();

      formData.append('file', file);

      

      const response = await axios.post(`${API}/upload`, formData, {

        headers: { 

          Authorization: `Bearer ${token}`,

          'Content-Type': 'multipart/form-data'

        }

      });

      

      setNewTestimonial({ ...newTestimonial, photo: response.data.url });

      toast.success('Photo uploadée avec succès');

    } catch (error) {

      console.error('Upload error:', error);

      toast.error('Erreur lors de l\'upload de la photo');

    } finally {

      setUploading(false);

    }

  };



  const handleAddTestimonial = async () => {

    if (!newTestimonial.client_name || !newTestimonial.content) {

      toast.error('Veuillez remplir le nom du client et le témoignage');

      return;

    }



    try {

      await axios.post(`${API}/enterprises/testimonials`, newTestimonial, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Témoignage ajouté avec succès');

      setShowAddModal(false);

      setNewTestimonial({ 

        client_name: '', 

        company: '', 

        position: '', 

        content: '', 

        rating: 5,

        project: '',

        date: '',

        photo: null 

      });

      onRefresh();

    } catch (error) {

      console.error('Error adding testimonial:', error);

      toast.error('Erreur lors de l\'ajout du témoignage');

    }

  };



  const handleDeleteTestimonial = async (testimonialId) => {

    if (!window.confirm('Supprimer ce témoignage ?')) return;

    

    try {

      await axios.delete(`${API}/enterprises/testimonials/${testimonialId}`, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Témoignage supprimé');

      onRefresh();

    } catch (error) {

      console.error('Error deleting testimonial:', error);

      toast.error('Erreur lors de la suppression');

    }

  };



  const renderStars = (rating) => {

    return Array.from({ length: 5 }, (_, i) => (

      <Star 

        key={i} 

        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} 

      />

    ));

  };



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-slate-800">Témoignages Clients</h3>

          <p className="text-sm text-slate-500">Affichez les avis de vos clients</p>

        </div>

        <Button onClick={() => setShowAddModal(true)} className="bg-gradient-to-r from-yellow-500 to-orange-500">

          <Star className="w-4 h-4 mr-2" />

          Ajouter un témoignage

        </Button>

      </div>



      {/* Testimonials Grid */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {testimonials?.length > 0 ? testimonials.map((testimonial) => (

          <div key={testimonial.id} className="bg-white rounded-2xl shadow-sm p-6 relative">

            <Button

              size="sm"

              variant="ghost"

              onClick={() => handleDeleteTestimonial(testimonial.id)}

              className="absolute top-4 right-4 text-red-500 hover:text-red-700"

            >

              <Trash2 className="w-4 h-4" />

            </Button>

            

            <div className="flex items-start gap-4 mb-4">

              {testimonial.photo ? (

                <img 

                  src={toAbsoluteMediaUrl(testimonial.photo)} 

                  alt={testimonial.client_name}

                  className="w-12 h-12 rounded-full object-cover"

                />

              ) : (

                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 flex items-center justify-center">

                  <Users className="w-6 h-6 text-yellow-500" />

                </div>

              )}

              <div className="flex-1">

                <h4 className="font-bold text-slate-800">{testimonial.client_name}</h4>

                {testimonial.position && testimonial.company && (

                  <p className="text-sm text-slate-500">{testimonial.position} chez {testimonial.company}</p>

                )}

                {testimonial.company && !testimonial.position && (

                  <p className="text-sm text-slate-500">{testimonial.company}</p>

                )}

              </div>

            </div>

            

            <div className="flex gap-1 mb-3">

              {renderStars(testimonial.rating)}

            </div>

            

            <p className="text-slate-600 mb-3 italic">"{testimonial.content}"</p>

            

            {testimonial.project && (

              <p className="text-sm text-slate-500">

                <Briefcase className="w-4 h-4 inline mr-1" />

                Projet: {testimonial.project}

              </p>

            )}

            

            {testimonial.date && (

              <p className="text-xs text-slate-400 mt-2">

                {new Date(testimonial.date).toLocaleDateString('fr-FR')}

              </p>

            )}

          </div>

        )) : (

          <div className="col-span-full bg-white rounded-2xl shadow-sm p-12 text-center">

            <Star className="w-16 h-16 mx-auto mb-4 text-slate-300" />

            <p className="text-slate-500">Aucun témoignage ajouté</p>

            <p className="text-sm text-slate-400">Ajoutez les avis de vos clients pour renforcer votre crédibilité</p>

          </div>

        )}

      </div>



      {/* Add Testimonial Modal */}

      {showAddModal && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">

          <div className="bg-white rounded-2xl max-w-md w-full p-6">

            <div className="flex items-center justify-between mb-4">

              <h4 className="font-bold text-lg">Ajouter un témoignage</h4>

              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>

                <X className="w-5 h-5" />

              </Button>

            </div>

            

            <div className="space-y-4">

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Nom du client *</label>

                <Input

                  value={newTestimonial.client_name}

                  onChange={(e) => setNewTestimonial({ ...newTestimonial, client_name: e.target.value })}

                  placeholder="Nom complet"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Entreprise</label>

                <Input

                  value={newTestimonial.company}

                  onChange={(e) => setNewTestimonial({ ...newTestimonial, company: e.target.value })}

                  placeholder="Nom de l'entreprise"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Poste</label>

                <Input

                  value={newTestimonial.position}

                  onChange={(e) => setNewTestimonial({ ...newTestimonial, position: e.target.value })}

                  placeholder="Ex: Directeur général"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Note</label>

                <div className="flex gap-2">

                  {[1, 2, 3, 4, 5].map((star) => (

                    <button

                      key={star}

                      type="button"

                      onClick={() => setNewTestimonial({ ...newTestimonial, rating: star })}

                      className="focus:outline-none"

                    >

                      <Star 

                        className={`w-6 h-6 ${star <= newTestimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} 

                      />

                    </button>

                  ))}

                </div>

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Témoignage *</label>

                <textarea

                  className="w-full border border-slate-200 rounded-lg p-3 text-sm"

                  rows="4"

                  value={newTestimonial.content}

                  onChange={(e) => setNewTestimonial({ ...newTestimonial, content: e.target.value })}

                  placeholder="Ce que le client a dit..."

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Projet concerné</label>

                <Input

                  value={newTestimonial.project}

                  onChange={(e) => setNewTestimonial({ ...newTestimonial, project: e.target.value })}

                  placeholder="Nom du projet"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Date</label>

                <Input

                  type="date"

                  value={newTestimonial.date}

                  onChange={(e) => setNewTestimonial({ ...newTestimonial, date: e.target.value })}

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-700 mb-1 block">Photo du client</label>

                <ImageUpload

                  onUpload={handlePhotoUpload}

                  currentImage={newTestimonial.photo}

                  accept="image/*"

                />

              </div>

              

              <div className="flex gap-2 pt-4">

                <Button onClick={handleAddTestimonial} disabled={uploading} className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500">

                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Star className="w-4 h-4 mr-2" />}

                  Ajouter

                </Button>

                <Button variant="outline" onClick={() => setShowAddModal(false)}>

                  Annuler

                </Button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};



const SettingsSection = ({ user, token, onRefresh }) => {

  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('profile');

  const [formData, setFormData] = useState({

    company_name: user?.company_name || '',

    contact_person: user?.contact_person || '',

    phone: user?.phone || '',

    email: user?.email || '',

    business_type: user?.business_type || '',

    city: user?.city || '',

    country: user?.country || '',

    address: user?.address || '',

    website: user?.website || '',

    description: user?.company_description || '',

    profile_photo: user?.profile_photo || '',

    cover_photo: user?.cover_photo || '',

    shop_cover_photo: user?.shop_cover_photo || ''

  });

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (file, field) => {
    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      
      const response = await axios.post(`${API}/upload`, uploadFormData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log(`DEBUG: Setting ${field} to ${response.data.url}`);
      
      // Update the photo directly via dedicated endpoint
      let endpoint;
      if (field === 'profile_photo') {
        endpoint = `${API}/enterprises/profile-photo`;
      } else if (field === 'cover_photo') {
        endpoint = `${API}/enterprises/cover-photo`;
      } else if (field === 'shop_cover_photo') {
        endpoint = `${API}/enterprises/shop-cover-photo`;
      }
      
      await axios.put(endpoint, { photo_url: response.data.url }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFormData(prev => ({ ...prev, [field]: response.data.url }));
      toast.success('Image mise à jour avec succès');
      onRefresh();
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUpdateProfile = async () => {

    setLoading(true);

    try {

      await axios.put(`${API}/enterprises/profile`, formData, {

        headers: { Authorization: `Bearer ${token}` }

      });

      toast.success('Profil mis à jour avec succès');

      onRefresh();

    } catch (error) {

      console.error('Error updating profile:', error);

      toast.error('Erreur lors de la mise à jour');

    } finally {

      setLoading(false);

    }

  };



  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-bold text-xl text-white">Paramètres</h3>

          <p className="text-sm text-slate-400">Gérez votre profil et préférences</p>

        </div>

      </div>



      {/* Tabs */}

      <div className="flex gap-2 border-b border-slate-700/50">

        <button

          onClick={() => setActiveTab('profile')}

          className={`px-4 py-2 text-sm font-medium transition-colors ${

            activeTab === 'profile'

              ? 'text-amber-400 border-b-2 border-amber-400'

              : 'text-slate-400 hover:text-white'

          }`}

        >

          Profil

        </button>

        <button

          onClick={() => setActiveTab('security')}

          className={`px-4 py-2 text-sm font-medium transition-colors ${

            activeTab === 'security'

              ? 'text-amber-400 border-b-2 border-amber-400'

              : 'text-slate-400 hover:text-white'

          }`}

        >

          Sécurité

        </button>

        <button

          onClick={() => setActiveTab('notifications')}

          className={`px-4 py-2 text-sm font-medium transition-colors ${

            activeTab === 'notifications'

              ? 'text-amber-400 border-b-2 border-amber-400'

              : 'text-slate-400 hover:text-white'

          }`}

        >

          Notifications

        </button>

      </div>



      {activeTab === 'profile' && (

        <div className="space-y-6">

          {/* Profile Photo */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <h4 className="font-semibold text-white mb-4">Photo de profil</h4>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                {formData.profile_photo ? (
                  <img src={toAbsoluteMediaUrl(formData.profile_photo)} alt="" className="w-full h-full object-cover" />
                ) : (
                  user?.company_name?.[0] || user?.name?.[0] || 'E'
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files?.[0], 'profile_photo')}
                  disabled={uploadingImage}
                  className="hidden"
                  id="profile-photo-upload"
                />
                <label
                  htmlFor="profile-photo-upload"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white px-4 py-2 cursor-pointer"
                >
                  {uploadingImage ? 'Upload en cours...' : 'Changer la photo de profil'}
                </label>
              </div>
            </div>
          </div>

          {/* Cover Photo - Profil */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-6 shadow-xl">
            <h4 className="font-semibold text-white mb-4">Photo de couverture du profil</h4>
            <div className="space-y-4">
              <div className="relative h-48 rounded-xl overflow-hidden bg-slate-800">
                {formData.cover_photo ? (
                  <img src={toAbsoluteMediaUrl(formData.cover_photo)} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files?.[0], 'cover_photo')}
                disabled={uploadingImage}
                className="hidden"
                id="cover-photo-upload"
              />
              <label
                htmlFor="cover-photo-upload"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white px-4 py-2 cursor-pointer"
              >
                {uploadingImage ? 'Upload en cours...' : 'Changer la photo de couverture du profil'}
              </label>
            </div>
          </div>

          {/* Shop Cover Photo - Boutique */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-cyan-500/30 rounded-2xl p-6 shadow-xl">
            <h4 className="font-semibold text-white mb-4">Photo de couverture de la boutique</h4>
            <div className="space-y-4">
              <div className="relative h-48 rounded-xl overflow-hidden bg-slate-800">
                {formData.shop_cover_photo ? (
                  <img src={toAbsoluteMediaUrl(formData.shop_cover_photo)} alt="Shop Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <Store className="w-12 h-12" />
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e.target.files?.[0], 'shop_cover_photo')}
                disabled={uploadingImage}
                className="hidden"
                id="shop-cover-photo-upload"
              />
              <label
                htmlFor="shop-cover-photo-upload"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2 cursor-pointer"
              >
                {uploadingImage ? 'Upload en cours...' : 'Changer la photo de couverture de la boutique'}
              </label>
            </div>
          </div>

          {/* Company Info */}

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

            <h4 className="font-semibold text-white mb-4">Informations entreprise</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Nom de l'entreprise *</label>

                <Input

                  value={formData.company_name}

                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}

                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Personne de contact *</label>

                <Input

                  value={formData.contact_person}

                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}

                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Email *</label>

                <Input

                  type="email"

                  value={formData.email}

                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}

                  disabled

                  className="bg-slate-900/50 border-slate-700 text-slate-500 placeholder:text-slate-500 focus:border-amber-500"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Téléphone *</label>

                <Input

                  value={formData.phone}

                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}

                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Type d'activité</label>

                <Input

                  value={formData.business_type}

                  onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}

                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Site web</label>

                <Input

                  value={formData.website}

                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}

                  placeholder="https://"

                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"

                />

              </div>

              

              <div className="md:col-span-2">

                <label className="text-sm font-medium text-slate-300 mb-1 block">Adresse</label>

                <Input

                  value={formData.address}

                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}

                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Ville</label>

                <Input

                  value={formData.city}

                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}

                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"

                />

              </div>

              

              <div>

                <label className="text-sm font-medium text-slate-300 mb-1 block">Pays</label>

                <Input

                  value={formData.country}

                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}

                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"

                />

              </div>

              

              <div className="md:col-span-2">

                <label className="text-sm font-medium text-slate-300 mb-1 block">Description</label>

                <textarea

                  className="w-full border border-slate-700 bg-slate-900/50 rounded-lg p-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"

                  rows="4"

                  value={formData.description}

                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}

                  placeholder="Description de votre entreprise..."

                />

              </div>

            </div>

            

            <div className="flex justify-end mt-6">

              <Button

                onClick={handleUpdateProfile}

                disabled={loading}

                className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600"

              >

                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}

                Enregistrer

              </Button>

            </div>

          </div>

        </div>

      )}



      {activeTab === 'security' && (

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

          <h4 className="font-semibold text-white mb-4">Sécurité</h4>

          <p className="text-slate-400">Section sécurité - À implémenter</p>

        </div>

      )}



      {activeTab === 'notifications' && (

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">

          <h4 className="font-semibold text-white mb-4">Notifications</h4>

          <p className="text-slate-400">Section notifications - À implémenter</p>

        </div>

      )}

    </div>

  );

};



export default EnterpriseDashboard;