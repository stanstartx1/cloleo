import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, ShoppingBag, DollarSign, TrendingUp, Clock, CheckCircle, XCircle,
  Plus, Settings, CreditCard, BarChart3, Store, Crown, Sparkles, AlertCircle,
  Menu, Home, Truck, MapPin, Phone, RefreshCw, Loader2, ChevronRight,
  LogOut, Edit, X, MessageCircle, Trash2, Users, Copy, Building2, Trophy,
  Award, Image as ImageIcon, Briefcase, Star, FileText, Upload, Download,
  Calendar, MapPin as MapPinIcon, Mail, Linkedin, Globe, Facebook, Instagram,
  Twitter, Youtube, Link as LinkIcon, UserPlus, UserMinus, Shield, Zap,
  Target, Rocket, Award as AwardIcon, Medal, Gem, Heart, ThumbsUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { toAbsoluteMediaUrl } from '../utils/media';
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
  { id: 'products', label: 'Mes produits', icon: Package },
  { id: 'orders', label: 'Commandes', icon: ShoppingBag, badge: true },
  { id: 'offers', label: 'Offres', icon: DollarSign, badge: true },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'tracking', label: 'Suivi livraisons', icon: Truck },
  { id: 'stats', label: 'Statistiques', icon: BarChart3 },
  { id: 'subscription', label: 'Abonnement', icon: Crown },
  { id: 'trophies', label: 'Trophées & Awards', icon: Trophy },
  { id: 'certifications', label: 'Certifications', icon: Award },
  { id: 'portfolio', label: 'Réalisations', icon: ImageIcon },
  { id: 'team', label: 'Équipe', icon: Users },
  { id: 'projects', label: 'Projets', icon: Briefcase },
  { id: 'testimonials', label: 'Témoignages', icon: Star },
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
  
  // Enterprise specific data
  const [trophies, setTrophies] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [team, setTeam] = useState([]);
  const [projects, setProjects] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  
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
    try {
      const [trophiesRes, certificationsRes, portfolioRes, teamRes, projectsRes, testimonialsRes] = await Promise.all([
        axios.get(`${API}/enterprises/trophies`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API}/enterprises/certifications`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API}/enterprises/portfolio`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API}/enterprises/team`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API}/enterprises/projects`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get(`${API}/enterprises/testimonials`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
      ]);
      
      setTrophies(trophiesRes.data || []);
      setCertifications(certificationsRes.data || []);
      setPortfolio(portfolioRes.data || []);
      setTeam(teamRes.data || []);
      setProjects(projectsRes.data || []);
      setTestimonials(testimonialsRes.data || []);
    } catch (error) {
      console.error('Error fetching enterprise data:', error);
    }
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
                      {item.id === 'orders' ? dashboard?.pending_orders || 0 : offers.length}
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
              formatPrice={formatPrice}
            />
          )}
          
          {activeSection === 'orders' && (
            <OrdersSection 
              orders={orders}
              loading={loading}
              onRefresh={fetchOrders}
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
              formatPrice={formatPrice}
            />
          )}
          
          {activeSection === 'messages' && (
            <MessagesSection />
          )}
          
          {activeSection === 'tracking' && (
            <TrackingSection 
              orders={orders}
              selectedOrder={selectedOrder}
              onSelectOrder={setSelectedOrder}
              driverLocation={driverLocation}
              onSetDriverLocation={setDriverLocation}
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
          
          {activeSection === 'trophies' && (
            <TrophiesSection 
              trophies={trophies}
              loading={loading}
              onRefresh={fetchEnterpriseData}
              token={token}
            />
          )}
          
          {activeSection === 'certifications' && (
            <CertificationsSection 
              certifications={certifications}
              loading={loading}
              onRefresh={fetchEnterpriseData}
              token={token}
            />
          )}
          
          {activeSection === 'portfolio' && (
            <PortfolioSection 
              portfolio={portfolio}
              loading={loading}
              onRefresh={fetchEnterpriseData}
              token={token}
            />
          )}
          
          {activeSection === 'team' && (
            <TeamSection 
              team={team}
              loading={loading}
              onRefresh={fetchEnterpriseData}
              token={token}
            />
          )}
          
          {activeSection === 'projects' && (
            <ProjectsSection 
              projects={projects}
              loading={loading}
              onRefresh={fetchEnterpriseData}
              token={token}
            />
          )}
          
          {activeSection === 'testimonials' && (
            <TestimonialsSection 
              testimonials={testimonials}
              loading={loading}
              onRefresh={fetchEnterpriseData}
              token={token}
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

// Placeholder sections for other tabs
const ProductsSection = ({ products, loading, onRefresh, formatPrice }) => (
  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
    <h3 className="font-bold text-lg mb-4 text-white">Mes produits</h3>
    <p className="text-slate-400">Section produits - À implémenter</p>
  </div>
);

const OrdersSection = ({ orders, loading, onRefresh, formatPrice }) => (
  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
    <h3 className="font-bold text-lg mb-4 text-white">Commandes</h3>
    <p className="text-slate-400">Section commandes - À implémenter</p>
  </div>
);

const OffersSection = ({ offers, loading, onRefresh, onAccept, onReject, onCounter, onWithdraw, onCopyLink, formatPrice }) => (
  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
    <h3 className="font-bold text-lg mb-4 text-white">Offres</h3>
    <p className="text-slate-400">Section offres - À implémenter</p>
  </div>
);

const TrackingSection = ({ orders, selectedOrder, onSelectOrder, driverLocation, onSetDriverLocation }) => (
  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
    <h3 className="font-bold text-lg mb-4 text-white">Suivi des livraisons</h3>
    <p className="text-slate-400">Section tracking - À implémenter</p>
  </div>
);

const StatsSection = ({ dashboard, orders, products, formatPrice }) => (
  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
    <h3 className="font-bold text-lg mb-4 text-white">Statistiques</h3>
    <p className="text-slate-400">Section statistiques - À implémenter</p>
  </div>
);

const SubscriptionSection = ({ user, token, onRefresh }) => (
  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
    <h3 className="font-bold text-lg mb-4 text-white">Abonnement</h3>
    <p className="text-slate-400">Section abonnement - À implémenter</p>
  </div>
);

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

const SettingsSection = ({ user, token, onRefresh }) => (
  <div className="bg-white rounded-2xl shadow-sm p-6">
    <h3 className="font-bold text-lg mb-4">Paramètres</h3>
    <p className="text-slate-500">Section paramètres - À implémenter</p>
  </div>
);

export default EnterpriseDashboard;