import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Package, ShoppingCart, DollarSign, Settings, LogOut, 
  Menu, X, TrendingUp, Eye, Plus, Search, ChevronRight, Store,
  ArrowUpRight, ArrowDownRight, Package2, ShoppingBag, MapPin, Truck, Phone, User, Clock, CheckCircle, RefreshCw, Loader2, MessageCircle,
  Image, Upload, Trash2, Edit2, Share2, Copy, Check, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { toAbsoluteMediaUrl } from '../utils/media';
import { copyToClipboard } from '../utils/share';
import axios from 'axios';
import MessagesSection from '../components/MessagesSection';
import ShareButtons from '../components/ShareButtons';
import { 
  AnimatedNumber, 
  staggerContainer, 
  statCardVariant,
  fadeInUp,
  productCardVariant,
  tabContentVariant
} from '../components/AnimatedComponents';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;
const WS_URL = BACKEND_URL
  .replace(/^https:\/\//, 'wss://')
  .replace(/^http:\/\//, 'ws://');
const API = `${BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const RevendeurDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  
  // Catalog state
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);
  
  // My products state
  const [myProducts, setMyProducts] = useState([]);
  const [myProductsLoading, setMyProductsLoading] = useState(false);
  
  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  // Earnings state
  const [earnings, setEarnings] = useState([]);
  const [earningsLoading, setEarningsLoading] = useState(false);
  
  // Product customization modal
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customPrice, setCustomPrice] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customImages, setCustomImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageInputRef = useRef(null);
  const [copied, setCopied] = useState(null);
  
  // Edit product modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImages, setEditImages] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const editImageInputRef = useRef(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get(`${API}/revendeur/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDashboardData(response.data);
      } catch (error) {
        console.error('Error fetching dashboard:', error);
        toast.error(error.response?.data?.detail || 'Erreur lors du chargement du tableau de bord');
        // Keep UI usable even if dashboard API fails once (prevents blank content).
        setDashboardData({
          stats: { active_products: 0, total_products: 0, order_count: 0, revenue_fcfa: 0 },
          shop: { slug: user?.shop_slug || '', name: user?.shop_name || user?.name || 'Ma boutique' },
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (token) fetchDashboard();
  }, [token]);

  // Fetch catalog products
  const fetchCatalog = async (page = 1, search = '') => {
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search) params.append('search', search);
      
      const response = await axios.get(`${API}/revendeur/catalog?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCatalogProducts(response.data.products);
      setCatalogTotal(response.data.total);
    } catch (error) {
      toast.error('Erreur lors du chargement du catalogue');
    } finally {
      setCatalogLoading(false);
    }
  };

  // Fetch my products
  const fetchMyProducts = async () => {
    setMyProductsLoading(true);
    try {
      const response = await axios.get(`${API}/revendeur/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyProducts(response.data);
    } catch (error) {
      toast.error('Erreur lors du chargement de vos produits');
    } finally {
      setMyProductsLoading(false);
    }
  };

  // Fetch orders
  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const response = await axios.get(`${API}/revendeur/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.orders);
    } catch (error) {
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setOrdersLoading(false);
    }
  };

  // Fetch earnings
  const fetchEarnings = async () => {
    setEarningsLoading(true);
    try {
      const response = await axios.get(`${API}/revendeur/earnings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEarnings(response.data.earnings);
    } catch (error) {
      toast.error('Erreur lors du chargement des gains');
    } finally {
      setEarningsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'catalog') fetchCatalog(catalogPage, catalogSearch);
    if (activeTab === 'products') fetchMyProducts();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'earnings') fetchEarnings();
  }, [activeTab]);

  // Add product to my catalog
  const handleAddProduct = (product) => {
    setSelectedProduct(product);
    setCustomPrice((product.promo_price_fcfa || product.price_fcfa).toString());
    setCustomDescription(product.description);
    setCustomImages(product.images || []);
    setShowCustomizeModal(true);
  };

  // Open edit modal for existing product
  const openEditModal = (product) => {
    setEditingProduct(product);
    setEditPrice(product.selling_price_fcfa?.toString() || '');
    setEditDescription(product.custom_description || '');
    setEditImages(product.custom_image_url ? [product.custom_image_url] : (product.original_images || []));
    setShowEditModal(true);
  };

  // Save edited product
  const saveEditedProduct = async () => {
    if (!editingProduct) return;
    
    const price = parseInt(editPrice);
    const originalPrice = editingProduct.original_promo_price_fcfa || editingProduct.original_price_fcfa;
    
    if (price < originalPrice) {
      toast.error(`Le prix doit être supérieur ou égal à ${originalPrice.toLocaleString()} FCFA`);
      return;
    }
    
    setSavingEdit(true);
    try {
      await axios.put(`${API}/revendeur/products/${editingProduct.id}`, {
        selling_price_fcfa: price,
        custom_description: editDescription,
        custom_image_url: editImages[0] || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Produit modifié avec succès !');
      setShowEditModal(false);
      setEditingProduct(null);
      fetchMyProducts();
    } catch (error) {
      toast.error('Erreur lors de la modification');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle edit image upload
  const handleEditImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const formData = new FormData();
    formData.append('files', files[0]);

    try {
      const response = await axios.post(`${API}/upload/multiple`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const newUrl = response.data.urls[0];
      const fullUrl = newUrl.startsWith('http') ? newUrl : `${BACKEND_URL}${newUrl}`;
      setEditImages([fullUrl]);
      toast.success('Image mise à jour !');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploadingImages(false);
    }
  };

  // Handle image upload for customization
  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const formData = new FormData();
    
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await axios.post(`${API}/upload/multiple`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const newUrls = response.data.urls.map(url => 
        url.startsWith('http') ? url : `${BACKEND_URL}${url}`
      );
      
      setCustomImages(prev => [...prev, ...newUrls]);
      toast.success(`${newUrls.length} image(s) ajoutée(s) !`);
    } catch (error) {
      toast.error('Erreur lors du téléchargement des images');
    } finally {
      setUploadingImages(false);
    }
  };

  // Remove image from custom images
  const removeImage = (index) => {
    setCustomImages(prev => prev.filter((_, i) => i !== index));
  };

  // Copy product link
  const handleCopyLink = async (productId) => {
    const url = `${window.location.origin}/produit/${productId}`;
    try {
      const ok = await copyToClipboard(url);
      if (!ok) throw new Error('copy_failed');
      setCopied(productId);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Erreur lors de la copie');
    }
  };

  const submitCustomizedProduct = async () => {
    if (!selectedProduct) return;
    
    const basePrice = selectedProduct.promo_price_fcfa || selectedProduct.price_fcfa;
    const sellingPrice = parseInt(customPrice);
    if (sellingPrice < basePrice) {
      toast.error(`Le prix doit être supérieur ou égal à ${basePrice} FCFA`);
      return;
    }
    
    try {
      await axios.post(`${API}/revendeur/products`, {
        original_product_id: selectedProduct.id,
        selling_price_fcfa: sellingPrice,
        custom_description: customDescription !== selectedProduct.description ? customDescription : null,
        custom_images: customImages.length > 0 && JSON.stringify(customImages) !== JSON.stringify(selectedProduct.images) ? customImages : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Produit ajouté à votre catalogue !');
      setShowCustomizeModal(false);
      setSelectedProduct(null);
      setCustomImages([]);
      
      // Refresh catalog to update "is_revendeur" status
      fetchCatalog(catalogPage, catalogSearch);
      
      // Update dashboard stats
      const dashResponse = await axios.get(`${API}/revendeur/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(dashResponse.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'ajout');
    }
  };

  // Toggle product status
  const toggleProductStatus = async (productId, currentStatus) => {
    try {
      await axios.put(`${API}/revendeur/products/${productId}`, {
        is_active: !currentStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(currentStatus ? 'Produit désactivé' : 'Produit activé');
      fetchMyProducts();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Delete product
  const deleteProduct = async (productId) => {
    if (!window.confirm('Supprimer ce produit de votre catalogue ?')) return;
    
    try {
      await axios.delete(`${API}/revendeur/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Produit supprimé');
      fetchMyProducts();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const safeStats = {
    active_products: Math.max(
      Number(dashboardData?.stats?.active_products || dashboardData?.stats?.product_count || 0),
      myProducts.filter((p) => p.is_active !== false).length
    ),
    total_orders: Math.max(
      Number(dashboardData?.stats?.total_orders || dashboardData?.stats?.order_count || 0),
      orders.length
    ),
    completed_orders: Math.max(
      Number(dashboardData?.stats?.completed_orders || 0),
      orders.filter((o) => ['delivered', 'cancelled'].includes(o.status)).length
    ),
    total_earnings_fcfa: Math.max(
      Number(dashboardData?.stats?.total_earnings_fcfa || dashboardData?.stats?.revenue_fcfa || 0),
      earnings.reduce((sum, e) => sum + Number(e.revendeur_share || 0), 0)
    ),
  };

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'catalog', label: 'Catalogue produits', icon: Package2 },
    { id: 'products', label: 'Mes produits', icon: Package },
    { id: 'orders', label: 'Commandes', icon: ShoppingCart },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'tracking', label: 'Suivi livraisons', icon: Truck },
    { id: 'earnings', label: 'Mes gains', icon: DollarSign },
    { id: 'shop', label: 'Ma boutique', icon: Store },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen home-premium-gradient dashboard-card-skin" data-testid="revendeur-dashboard">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white shadow-lg"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 premium-panel-soft border-r shadow-sm transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                C
              </div>
              <div>
                <span className="text-xl font-bold text-purple-600">Revendeur</span>
                <p className="text-xs text-gray-500">Espace partenaire</p>
              </div>
            </Link>
          </div>

          {/* User Info */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 overflow-hidden flex items-center justify-center">
                {user?.profile_photo ? (
                  <img src={toAbsoluteMediaUrl(user.profile_photo)} alt={user?.name || 'Profil'} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-5 h-5 text-purple-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user?.shop_name || user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === item.id
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8">
          <div className="mb-4 flex justify-end">
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Déconnexion
            </Button>
          </div>

          {/* Dashboard Tab */}
          <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-500" />
                  Bonjour, {user?.name} !
                </h1>
                <p className="text-gray-500">Voici un aperçu de votre activité revente</p>
              </motion.div>

              {/* Stats Cards - Animated */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <motion.div variants={statCardVariant} whileHover={{ y: -5, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-purple-50 to-white">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Produits actifs</p>
                          <p className="text-3xl font-bold text-gray-900">
                            <AnimatedNumber value={safeStats.active_products} />
                          </p>
                        </div>
                        <motion.div 
                          className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center"
                          whileHover={{ rotate: 15, scale: 1.1 }}
                        >
                          <Package className="w-6 h-6 text-purple-600" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={statCardVariant} whileHover={{ y: -5, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-blue-50 to-white">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Commandes</p>
                          <p className="text-3xl font-bold text-gray-900">
                            <AnimatedNumber value={safeStats.total_orders} />
                          </p>
                        </div>
                        <motion.div 
                          className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center"
                          whileHover={{ rotate: 15, scale: 1.1 }}
                        >
                          <ShoppingCart className="w-6 h-6 text-blue-600" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={statCardVariant} whileHover={{ y: -5, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-green-50 to-white">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Complétées</p>
                          <p className="text-3xl font-bold text-gray-900">
                            <AnimatedNumber value={safeStats.completed_orders} />
                          </p>
                        </div>
                        <motion.div 
                          className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center"
                          whileHover={{ rotate: 15, scale: 1.1 }}
                        >
                          <TrendingUp className="w-6 h-6 text-green-600" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={statCardVariant} whileHover={{ y: -5, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-emerald-50 to-white">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Gains totaux</p>
                          <p className="text-3xl font-bold text-green-600">
                            <AnimatedNumber value={safeStats.total_earnings_fcfa} /> FCFA
                          </p>
                        </div>
                        <motion.div 
                          className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center"
                          whileHover={{ rotate: 15, scale: 1.1 }}
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <DollarSign className="w-6 h-6 text-green-600" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Quick Actions - Animated */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <motion.div whileHover={{ scale: 1.02, y: -3 }} whileTap={{ scale: 0.98 }}>
                  <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-purple-200" onClick={() => setActiveTab('catalog')}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <motion.div 
                          className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg"
                          whileHover={{ rotate: 5 }}
                        >
                          <Plus className="w-6 h-6 text-white" />
                        </motion.div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Ajouter des produits</h3>
                          <p className="text-sm text-gray-500">Parcourir le catalogue</p>
                        </div>
                        <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                          <ChevronRight className="w-5 h-5 text-purple-400" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02, y: -3 }} whileTap={{ scale: 0.98 }}>
                  <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-indigo-200" onClick={() => window.open(`/boutique/${user?.shop_slug}`, '_blank')}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <motion.div 
                          className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg"
                          whileHover={{ rotate: -5 }}
                        >
                          <Eye className="w-6 h-6 text-white" />
                        </motion.div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Voir ma boutique</h3>
                          <p className="text-sm text-gray-500">Aperçu public</p>
                        </div>
                        <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}>
                          <ChevronRight className="w-5 h-5 text-indigo-400" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>

              {/* Recent Orders - Animated */}
              {(dashboardData?.recent_orders?.length || 0) > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card className="overflow-hidden shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5" />
                        Commandes récentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {(dashboardData?.recent_orders || []).slice(0, 5).map((order, index) => (
                          <motion.div 
                            key={order.id} 
                            className="flex items-center justify-between p-4 hover:bg-purple-50 transition-colors"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 + index * 0.1 }}
                            whileHover={{ x: 5 }}
                          >
                            <div>
                              <p className="font-medium">{order.order_number}</p>
                              <p className="text-sm text-gray-500">{order.customer_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{order.total_fcfa?.toLocaleString()} FCFA</p>
                              <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                                {order.status}
                              </Badge>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Catalog Tab */}
          {activeTab === 'catalog' && (
            <motion.div 
              key="catalog"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.div 
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Package2 className="w-6 h-6 text-purple-500" />
                    Catalogue produits
                  </h1>
                  <p className="text-gray-500">Sélectionnez des produits à ajouter à votre boutique</p>
                </div>
                <motion.div 
                  className="relative w-full sm:w-64"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher..."
                    value={catalogSearch}
                    onChange={(e) => {
                      setCatalogSearch(e.target.value);
                      fetchCatalog(1, e.target.value);
                    }}
                    className="pl-10 border-purple-200 focus:border-purple-400"
                  />
                </motion.div>
              </motion.div>

              {catalogLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <motion.div 
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {catalogProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      variants={productCardVariant}
                      whileHover={{ y: -8, scale: 1.02 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
                        <div className="aspect-square relative group">
                          <motion.img
                            src={product.images?.[0] || '/placeholder.jpg'}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          {product.is_dropshipped && (
                            <motion.div 
                              className="absolute top-2 right-2"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              <Badge className="bg-green-500 shadow-lg">
                                <Check className="w-3 h-3 mr-1" />
                                Ajouté
                              </Badge>
                            </motion.div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-medium text-sm line-clamp-2 mb-2">{product.name}</h3>
                          {product.promo_price_fcfa && product.promo_price_fcfa < product.price_fcfa ? (
                            <div className="space-y-1">
                              <p className="text-xs text-gray-400 line-through">{product.price_fcfa?.toLocaleString()} FCFA</p>
                              <p className="text-lg font-bold text-green-600">{product.promo_price_fcfa?.toLocaleString()} FCFA</p>
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                -{Math.round((1 - product.promo_price_fcfa / product.price_fcfa) * 100)}%
                              </Badge>
                            </div>
                          ) : (
                            <p className="text-lg font-bold text-purple-600">{product.price_fcfa?.toLocaleString()} FCFA</p>
                          )}
                          <p className="text-xs text-gray-500 mb-3">Prix d'achat minimum</p>
                          {product.is_dropshipped ? (
                            <Button variant="outline" className="w-full opacity-60" disabled>
                              Déjà ajouté
                            </Button>
                          ) : (
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button 
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md"
                                onClick={() => handleAddProduct(product)}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Ajouter
                              </Button>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {catalogProducts.length === 0 && !catalogLoading && (
                <motion.div 
                  className="text-center py-12"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Aucun produit trouvé</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* My Products Tab */}
          {activeTab === 'products' && (
            <motion.div 
              key="products"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.div 
                className="flex justify-between items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="w-6 h-6 text-purple-500" />
                    Mes produits
                  </h1>
                  <p className="text-gray-500">Gérez les produits de votre boutique</p>
                </div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button onClick={() => setActiveTab('catalog')} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </motion.div>
              </motion.div>

              {myProductsLoading ? (
                <div className="flex justify-center py-12">
                  <motion.div 
                    className="rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              ) : myProducts.length > 0 ? (
                <motion.div 
                  className="grid grid-cols-1 gap-4"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {myProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, x: -30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 5, boxShadow: "0 10px 40px -10px rgba(139, 92, 246, 0.3)" }}
                    >
                      <Card className="overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <motion.img
                              src={product.original_images?.[0] || '/placeholder.jpg'}
                              alt={product.original_name}
                              className="w-24 h-24 object-cover rounded-lg shadow-md"
                              whileHover={{ scale: 1.05 }}
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-medium">{product.original_name}</h3>
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 500 }}
                                  >
                                    <Badge 
                                      variant={product.is_active ? 'default' : 'secondary'} 
                                      className={`mt-1 ${product.is_active ? 'bg-green-500' : ''}`}
                                    >
                                      {product.is_active ? 'Actif' : 'Inactif'}
                                    </Badge>
                                  </motion.div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-500">Prix d'achat</p>
                                  {product.original_promo_price_fcfa && product.original_promo_price_fcfa < product.original_price_fcfa ? (
                                    <div>
                                      <p className="text-xs text-gray-400 line-through">{product.original_price_fcfa?.toLocaleString()} FCFA</p>
                                      <p className="font-medium text-green-600">{product.original_promo_price_fcfa?.toLocaleString()} FCFA</p>
                                    </div>
                                  ) : (
                                    <p className="font-medium">{product.original_price_fcfa?.toLocaleString()} FCFA</p>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-4">
                                <div className="flex-1">
                                  <p className="text-sm text-gray-500">Votre prix de vente</p>
                                  <p className="text-lg font-bold text-purple-600">{product.selling_price_fcfa?.toLocaleString()} FCFA</p>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm text-gray-500">Votre marge</p>
                                  <motion.p 
                                    className="text-lg font-bold text-green-600"
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                  >
                                    +{(product.dropshipper_share_fcfa || product.revendeur_share_fcfa)?.toLocaleString()} FCFA
                                  </motion.p>
                                </div>
                                <div className="flex gap-2">
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => navigate(`/revendeur/produits/${product.id}/modifier`)}
                                      className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
                                    >
                                      <Edit2 className="w-4 h-4 mr-1" />
                                      Modifier
                                    </Button>
                                  </motion.div>
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => toggleProductStatus(product.id, product.is_active)}
                                      className="hover:bg-purple-50"
                                    >
                                      {product.is_active ? 'Désactiver' : 'Activer'}
                                    </Button>
                                  </motion.div>
                                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button 
                                      variant="destructive" 
                                      size="sm"
                                      onClick={() => deleteProduct(product.id)}
                                    >
                                      Supprimer
                                    </Button>
                                  </motion.div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="border-dashed border-2">
                    <CardContent className="py-12 text-center">
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      </motion.div>
                      <p className="text-gray-500 mb-4">Vous n'avez pas encore de produits</p>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button onClick={() => setActiveTab('catalog')} className="bg-gradient-to-r from-purple-600 to-indigo-600">
                          Parcourir le catalogue
                        </Button>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <motion.div 
              key="orders"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-6 h-6 text-purple-500" />
                  Mes commandes
                </h1>
                <p className="text-gray-500">Suivez les commandes de vos clients</p>
              </motion.div>

              {ordersLoading ? (
                <div className="flex justify-center py-12">
                  <motion.div 
                    className="rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              ) : orders.length > 0 ? (
                <motion.div 
                  className="space-y-4"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {orders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.01, x: 5 }}
                    >
                      <Card className="shadow-md hover:shadow-xl transition-all duration-300">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="font-semibold">{order.order_number}</p>
                              <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                            {order.status === 'pending' && 'En attente'}
                            {order.status === 'assigned' && 'Assignée'}
                            {order.status === 'picked_up' && 'Récupérée'}
                            {order.status === 'in_transit' && 'En transit'}
                            {order.status === 'delivered' && 'Livrée'}
                            {order.status === 'cancelled' && 'Annulée'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Client</p>
                            <p className="font-medium">{order.customer_name}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Total</p>
                            <p className="font-medium">{order.total_fcfa?.toLocaleString()} FCFA</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Votre gain</p>
                            <motion.p 
                              className="font-medium text-green-600"
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            >
                              +{order.margin_breakdown?.revendeur_receives_fcfa?.toLocaleString()} FCFA
                            </motion.p>
                          </div>
                          <div>
                            <p className="text-gray-500">Adresse</p>
                            <p className="font-medium">{order.delivery_address?.city}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="border-dashed border-2">
                    <CardContent className="py-12 text-center">
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      </motion.div>
                      <p className="text-gray-500">Aucune commande pour le moment</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <motion.div 
              key="messages"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                  Messages clients
                </h1>
                <p className="text-gray-500">Répondez aux questions de vos clients</p>
              </motion.div>
              <MessagesSection token={token} userType="revendeur" />
            </motion.div>
          )}

          {/* Tracking Tab - Live Delivery Tracking */}
          {activeTab === 'tracking' && (
            <motion.div
              key="tracking"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <RevendeurOrderTracking token={token} />
            </motion.div>
          )}

          {/* Earnings Tab */}
          {activeTab === 'earnings' && (
            <motion.div 
              key="earnings"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-green-500" />
                  Mes gains
                </h1>
                <p className="text-gray-500">Historique de vos revenus</p>
              </motion.div>

              {earningsLoading ? (
                <div className="flex justify-center py-12">
                  <motion.div 
                    className="rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              ) : earnings.length > 0 ? (
                <motion.div 
                  className="space-y-4"
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                >
                  {earnings.map((earning, index) => (
                    <motion.div
                      key={earning.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.01, x: 5 }}
                    >
                      <Card className="shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-green-50 to-white">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{earning.product_name}</p>
                              <p className="text-sm text-gray-500">Commande {earning.order_number}</p>
                              <p className="text-xs text-gray-400">{new Date(earning.created_at).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <div className="text-right">
                              <motion.p 
                                className="text-lg font-bold text-green-600"
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                +{earning.revendeur_share?.toLocaleString()} FCFA
                              </motion.p>
                              <p className="text-xs text-gray-500">sur {earning.total_margin?.toLocaleString()} FCFA de marge</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="border-dashed border-2">
                    <CardContent className="py-12 text-center">
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <DollarSign className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      </motion.div>
                      <p className="text-gray-500">Pas encore de gains</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Shop Tab */}
          {activeTab === 'shop' && (
            <motion.div 
              key="shop"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Store className="w-6 h-6 text-purple-500" />
                  Ma boutique
                </h1>
                <p className="text-gray-500">Informations de votre boutique</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="shadow-lg overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Store className="w-10 h-10 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{user?.shop_name}</h2>
                      <p className="text-gray-500">{user?.shop_description || 'Pas de description'}</p>
                    </div>
                  </div>

                  <motion.div 
                    className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-sm text-gray-500 mb-1">Lien de votre boutique</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-white rounded-lg border text-sm font-mono">
                        {window.location.origin}/boutique/{user?.shop_slug}
                      </code>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            copyToClipboard(`${window.location.origin}/boutique/${user?.shop_slug}`);
                            toast.success('Lien copié !');
                          }}
                          className="hover:bg-purple-50"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copier
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg"
                      onClick={() => window.open(`/boutique/${user?.shop_slug}`, '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Voir ma boutique
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
              </motion.div>
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Settings className="w-6 h-6 text-gray-500" />
                  Paramètres
                </h1>
                <p className="text-gray-500">Gérez votre compte</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="shadow-lg">
                  <CardContent className="p-6 space-y-4">
                    <motion.div 
                      className="p-3 bg-gray-50 rounded-lg"
                      whileHover={{ backgroundColor: "rgba(139, 92, 246, 0.05)" }}
                    >
                      <p className="text-sm text-gray-500">Nom</p>
                      <p className="font-medium">{user?.name}</p>
                    </motion.div>
                    <motion.div 
                      className="p-3 bg-gray-50 rounded-lg"
                      whileHover={{ backgroundColor: "rgba(139, 92, 246, 0.05)" }}
                    >
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{user?.email}</p>
                    </motion.div>
                    <motion.div 
                      className="p-3 bg-gray-50 rounded-lg"
                      whileHover={{ backgroundColor: "rgba(139, 92, 246, 0.05)" }}
                    >
                      <p className="text-sm text-gray-500">Téléphone</p>
                      <p className="font-medium">{user?.phone || 'Non renseigné'}</p>
                    </motion.div>
                    <motion.div 
                      className="p-3 bg-gray-50 rounded-lg"
                      whileHover={{ backgroundColor: "rgba(139, 92, 246, 0.05)" }}
                    >
                      <p className="text-sm text-gray-500">Membre depuis</p>
                      <p className="font-medium">{new Date(user?.created_at).toLocaleDateString('fr-FR')}</p>
                    </motion.div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-500 mb-3">
                        Pour modifier nom, photo de profil, mot de passe et informations boutique, utilisez la page profil complète.
                      </p>
                      <Button asChild className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                        <Link to="/parametres">
                          <Settings className="w-4 h-4 mr-2" />
                          Ouvrir les paramètres du profil
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </main>

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5" />
                  Modifier le produit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
                {/* Product Info */}
                <div className="flex gap-4 p-3 bg-gray-50 rounded-xl">
                  <img
                    src={editImages?.[0] || editingProduct.original_images?.[0] || '/placeholder.jpg'}
                    alt={editingProduct.original_name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium">{editingProduct.original_name}</h3>
                    <p className="text-sm text-gray-500">
                      Prix d'achat: {(editingProduct.original_promo_price_fcfa || editingProduct.original_price_fcfa)?.toLocaleString()} FCFA
                    </p>
                    <Badge className={editingProduct.is_active ? 'bg-green-500 mt-1' : 'bg-gray-400 mt-1'}>
                      {editingProduct.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </div>

                {/* Edit Image */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Image className="w-4 h-4 text-blue-500" />
                    Image du produit
                  </label>
                  <div className="flex items-center gap-4">
                    <img
                      src={editImages?.[0] || editingProduct.original_images?.[0] || '/placeholder.jpg'}
                      alt="Product"
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                    <div className="flex-1">
                      <input
                        ref={editImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => editImageInputRef.current?.click()}
                        disabled={uploadingImages}
                        className="w-full"
                      >
                        {uploadingImages ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Envoi...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Changer l'image
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-gray-400 mt-1">
                        Format: JPG, PNG. Max 5 Mo
                      </p>
                    </div>
                  </div>
                </div>

                {/* Edit Price */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    Votre prix de vente (FCFA)
                  </label>
                  <Input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="Ex: 15000"
                    className="text-lg font-semibold"
                  />
                  <p className="text-xs text-gray-500">
                    Prix minimum: {(editingProduct.original_promo_price_fcfa || editingProduct.original_price_fcfa)?.toLocaleString()} FCFA
                  </p>
                  {editPrice && parseInt(editPrice) > (editingProduct.original_promo_price_fcfa || editingProduct.original_price_fcfa) && (
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700 font-medium">
                        💰 Nouvelle marge: +{((parseInt(editPrice) - (editingProduct.original_promo_price_fcfa || editingProduct.original_price_fcfa)) / 2).toLocaleString()} FCFA (50%)
                      </p>
                    </div>
                  )}
                </div>

                {/* Edit Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-blue-500" />
                    Description personnalisée
                  </label>
                  <textarea
                    className="w-full p-3 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Modifiez la description..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingProduct(null);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600" 
                    onClick={saveEditedProduct}
                    disabled={savingEdit}
                  >
                    {savingEdit ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Sauvegarder
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Customize Product Modal */}
      {showCustomizeModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Personnaliser le produit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              {/* Product Info */}
              <div className="flex gap-4 p-3 bg-gray-50 rounded-xl">
                <img
                  src={customImages?.[0] || selectedProduct.images?.[0] || '/placeholder.jpg'}
                  alt={selectedProduct.name}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-medium">{selectedProduct.name}</h3>
                  <div className="mt-1">
                    {selectedProduct.promo_price_fcfa && selectedProduct.promo_price_fcfa < selectedProduct.price_fcfa ? (
                      <div>
                        <p className="text-xs text-gray-400 line-through">Prix normal: {selectedProduct.price_fcfa?.toLocaleString()} FCFA</p>
                        <p className="text-sm text-green-600 font-medium">Prix promo: {selectedProduct.promo_price_fcfa?.toLocaleString()} FCFA</p>
                        <Badge className="bg-green-100 text-green-700 text-xs mt-1">
                          -{Math.round((1 - selectedProduct.promo_price_fcfa / selectedProduct.price_fcfa) * 100)}%
                        </Badge>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Prix d'achat: {selectedProduct.price_fcfa?.toLocaleString()} FCFA</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom Images */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Image className="w-4 h-4 text-purple-500" />
                  Images du produit
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {customImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img}
                        alt={`Image ${idx + 1}`}
                        className="w-full h-20 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImages}
                    className="w-full h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                  >
                    {uploadingImages ? (
                      <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-xs text-gray-500">Ajouter</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <p className="text-xs text-gray-500">Vous pouvez remplacer les images par les vôtres</p>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  Votre prix de vente (FCFA)
                </label>
                <Input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  min={selectedProduct.promo_price_fcfa || selectedProduct.price_fcfa}
                  className="text-lg font-semibold"
                />
                {parseInt(customPrice) > (selectedProduct.promo_price_fcfa || selectedProduct.price_fcfa) && (
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">
                      💰 Votre marge: +{((parseInt(customPrice) - (selectedProduct.promo_price_fcfa || selectedProduct.price_fcfa)) / 2).toLocaleString()} FCFA (50%)
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-500" />
                  Description personnalisée
                </label>
                <textarea
                  className="w-full p-3 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={3}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Modifiez la description si nécessaire..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => {
                    setShowCustomizeModal(false);
                    setCustomImages([]);
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600" 
                  onClick={submitCustomizedProduct}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter à ma boutique
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// =============== REVENDEUR ORDER TRACKING COMPONENT ===============
const ORDER_STATUSES = {
  pending: { label: 'En attente', color: 'amber', bg: 'bg-amber-100', text: 'text-amber-700' },
  assigned: { label: 'Livreur assigné', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700' },
  picked_up: { label: 'Colis récupéré', color: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-700' },
  in_transit: { label: 'En livraison', color: 'purple', bg: 'bg-purple-100', text: 'text-purple-700' },
  delivered: { label: 'Livrée', color: 'green', bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { label: 'Annulée', color: 'red', bg: 'bg-red-100', text: 'text-red-700' }
};

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price || 0);

const RevendeurOrderTracking = ({ token }) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarker = useRef(null);
  const customerMarker = useRef(null);
  const wsRef = useRef(null);

  // Fetch revendeur orders
  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/revendeur/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // WebSocket for selected order
  useEffect(() => {
    if (!selectedOrder) return;
    
    const connectWebSocket = () => {
      const ws = new WebSocket(`${WS_URL}/ws/orders/order_${selectedOrder.id}`);
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'driver_location') {
            setDriverLocation(data.location);
            updateDriverMarker(data.location);
          }
          
          if (data.type === 'order_update') {
            fetchOrders();
            toast.info(data.message || 'Mise à jour de la commande');
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };
      
      ws.onclose = () => {
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current = ws;
    };
    
    connectWebSocket();
    
    return () => wsRef.current?.close();
  }, [selectedOrder, fetchOrders]);

  // Initialize Google Map
  useEffect(() => {
    if (!selectedOrder || !mapRef.current) return;
    
    const initMap = () => {
      if (!window.google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => createMap();
        document.head.appendChild(script);
      } else {
        createMap();
      }
    };
    
    initMap();
  }, [selectedOrder]);

  const createMap = () => {
    if (!selectedOrder?.delivery_address) return;
    
    const customerPos = {
      lat: selectedOrder.delivery_address.latitude || 5.3600,
      lng: selectedOrder.delivery_address.longitude || -4.0083
    };
    
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: customerPos,
      zoom: 14,
      styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
    });
    
    // Customer marker (red)
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
    
    // Pan to driver
    mapInstance.current.panTo(pos);
  };

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Suivi des livraisons</h1>
        <p className="text-gray-500">Suivez vos commandes en temps réel</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white hover:shadow-lg transition-all duration-300">
          <CardContent className="pt-6">
            <Package className="w-6 h-6 text-purple-600 mb-2" />
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-sm text-gray-500">Total commandes</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200 hover:shadow-lg transition-all duration-300">
          <CardContent className="pt-6">
            <Clock className="w-6 h-6 text-amber-500 mb-2" />
            <p className="text-2xl font-bold text-amber-700">{activeOrders.length}</p>
            <p className="text-sm text-amber-600">En cours</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200 hover:shadow-lg transition-all duration-300">
          <CardContent className="pt-6">
            <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-700">
              {orders.filter(o => o.status === 'delivered').length}
            </p>
            <p className="text-sm text-green-600">Livrées</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200 hover:shadow-lg transition-all duration-300">
          <CardContent className="pt-6">
            <Truck className="w-6 h-6 text-purple-500 mb-2 animate-bounce" />
            <p className="text-2xl font-bold text-purple-700">
              {orders.filter(o => o.status === 'in_transit').length}
            </p>
            <p className="text-sm text-purple-600">En livraison</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Orders List */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b flex flex-row items-center justify-between py-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5 text-purple-600" />
              Commandes actives
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={fetchOrders} className="hover:bg-purple-50">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </CardHeader>
          
          {activeOrders.length > 0 ? (
            <div className="divide-y max-h-[400px] overflow-y-auto">
              {activeOrders.map((order) => (
                <div 
                  key={order.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-all duration-300 ${
                    selectedOrder?.id === order.id ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">#{order.order_number?.slice(-8)}</p>
                      <p className="text-sm text-gray-500">{order.customer_name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ORDER_STATUSES[order.status]?.bg} ${ORDER_STATUSES[order.status]?.text}`}>
                      {ORDER_STATUSES[order.status]?.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {order.items?.length || 1} article(s)
                    </span>
                    <span className="font-medium">{formatPrice(order.total_fcfa)} FCFA</span>
                  </div>
                  
                  {order.driver_name && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-purple-600">
                      <Truck className="w-4 h-4 animate-pulse" />
                      {order.driver_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">Aucune commande active</p>
            </CardContent>
          )}
        </Card>

        {/* Map & Order Details */}
        <Card className="overflow-hidden">
          {selectedOrder ? (
            <>
              <CardHeader className="border-b py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Suivi en temps réel</CardTitle>
                    <p className="text-sm text-gray-500">#{selectedOrder.order_number}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${ORDER_STATUSES[selectedOrder.status]?.bg} ${ORDER_STATUSES[selectedOrder.status]?.text}`}>
                    {ORDER_STATUSES[selectedOrder.status]?.label}
                  </span>
                </div>
              </CardHeader>
              
              {/* Map */}
              <div ref={mapRef} className="w-full h-48 bg-gray-100" data-testid="revendeur-tracking-map">
                {!GOOGLE_MAPS_API_KEY && (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <MapPin className="w-8 h-8 mr-2" />
                    Carte non disponible
                  </div>
                )}
              </div>
              
              {/* Order Info */}
              <CardContent className="p-4 space-y-4">
                {/* Customer */}
                <div className="flex items-start gap-3 animate-fade-in">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                    <p className="text-sm text-gray-500">
                      {selectedOrder.delivery_address?.street || selectedOrder.delivery_address?.city}
                    </p>
                    {selectedOrder.delivery_address?.phone && (
                      <a 
                        href={`tel:${selectedOrder.delivery_address.phone}`}
                        className="text-sm text-purple-600 flex items-center gap-1 mt-1 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        {selectedOrder.delivery_address.phone}
                      </a>
                    )}
                  </div>
                </div>
                
                {/* Driver */}
                {selectedOrder.driver_name && (
                  <div className="flex items-start gap-3 animate-fade-in stagger-1">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Truck className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedOrder.driver_name}</p>
                      <p className="text-sm text-gray-500">Livreur en route</p>
                      {driverLocation && (
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          Position en temps réel
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Margin info */}
                {selectedOrder.margin_breakdown && (
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Votre gain sur cette commande</span>
                      <span className="font-bold text-green-600">
                        +{formatPrice(selectedOrder.margin_breakdown.revendeur_receives_fcfa)} FCFA
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="h-96 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">
                  Sélectionnez une commande pour voir le suivi
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Completed Orders Table */}
      {completedOrders.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Commandes terminées
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto touch-scroll-x">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Commande</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Client</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Total</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Votre gain</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Statut</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {completedOrders.slice(0, 10).map((order) => (
                  <tr key={order.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-mono text-sm">#{order.order_number?.slice(-8)}</td>
                    <td className="p-3 text-sm">{order.customer_name}</td>
                    <td className="p-3 font-medium">{formatPrice(order.total_fcfa)} FCFA</td>
                    <td className="p-3 font-medium text-green-600">
                      +{formatPrice(order.margin_breakdown?.revendeur_receives_fcfa)} FCFA
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ORDER_STATUSES[order.status]?.bg} ${ORDER_STATUSES[order.status]?.text}`}>
                        {ORDER_STATUSES[order.status]?.label}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default RevendeurDashboard;
