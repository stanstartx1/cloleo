import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Package, ShoppingCart, DollarSign, Settings, LogOut, 
  Menu, X, TrendingUp, Eye, Plus, Search, ChevronRight, Store,
  ArrowUpRight, ArrowDownRight, Package2, ShoppingBag, MapPin, Truck, Phone, User, Clock, CheckCircle, RefreshCw, Loader2, MessageCircle,
  Image, Upload, Trash2, Edit2, Share2, Copy, Check, Sparkles, Users, FolderOpen, Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { loadMapbox } from '../utils/mapboxLoader';
import { toLngLat, upsertMarker } from '../utils/mapboxMap';
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


const API = API_URL;

const withDropshipperFallback = (path) => {
  if (!path.startsWith('/revendeur/')) return [path];
  return [path, path.replace('/revendeur/', '/dropshipper/')];
};

const apiGetWithFallback = async (path, config = {}) => {
  const candidates = withDropshipperFallback(path);
  let lastError;
  for (const candidate of candidates) {
    try {
      return await axios.get(`${API}${candidate}`, config);
    } catch (error) {
      lastError = error;
      if (error?.response?.status !== 404) throw error;
    }
  }
  throw lastError;
};

const RevendeurDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    // Restaurer l'onglet actif depuis localStorage
    const savedTab = localStorage.getItem('revendeur_active_tab');
    return savedTab || 'dashboard';
  });
  const [dashboardData, setDashboardData] = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  
  // Catalog state
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogCategory, setCatalogCategory] = useState('');
  const [catalogCategorySlugs, setCatalogCategorySlugs] = useState([]); // pour inclure sous-catégories
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [allCatalogProducts, setAllCatalogProducts] = useState([]); // tous les produits pour la vue catégorie
  const [allCatalogLoaded, setAllCatalogLoaded] = useState(false);
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

  // Categories state
  const [siteCategories, setSiteCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catEditDesc, setCatEditDesc] = useState('');
  const [catEditSaving, setCatEditSaving] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [catView, setCatView] = useState('grid'); // 'grid' | 'list'

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get(`${API}/revendeur/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDashboardData(response.data);
        try {
          const followersRes = await axios.get(`${API}/subscriptions/my-followers`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setFollowerCount(followersRes.data?.count ?? 0);
        } catch {
          setFollowerCount(0);
        }
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

  // Sauvegarder l'onglet actif dans localStorage
  useEffect(() => {
    localStorage.setItem('revendeur_active_tab', activeTab);
  }, [activeTab]);

  // Fetch catalog products
  const fetchCatalog = async (page = 1, search = '') => {
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 24 });
      if (search) params.append('search', search);
      if (catalogCategorySlugs.length > 0) {
        catalogCategorySlugs.forEach(slug => params.append('category_slug', slug));
      } else if (catalogCategory) {
        params.append('category_slug', catalogCategory);
      }

      const response = await apiGetWithFallback(`/revendeur/catalog?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCatalogProducts(Array.isArray(response.data?.products) ? response.data.products : []);
      setCatalogTotal(Number(response.data?.total || 0));
      setCatalogCategories(Array.isArray(response.data?.categories) ? response.data.categories : []);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du chargement du catalogue');
    } finally {
      setCatalogLoading(false);
    }
  };

  // Charge TOUS les produits sans pagination pour la vue groupée par catégorie/sous-catégorie
  const fetchAllCatalogProducts = async () => {
    if (allCatalogLoaded) return; // déjà chargé
    try {
      const response = await apiGetWithFallback(`/revendeur/catalog?all=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllCatalogProducts(Array.isArray(response.data?.products) ? response.data.products : []);
      setCatalogCategories(prev => prev.length ? prev : (Array.isArray(response.data?.categories) ? response.data.categories : []));
      setAllCatalogLoaded(true);
    } catch (error) {
      console.error('Error fetching all catalog products:', error);
      // silencieux — on aura quand même la vue paginée
      setAllCatalogLoaded(true); // Marquer comme chargé même en cas d'erreur pour éviter boucle infinie
    }
  };

  // Fetch my products
  const fetchMyProducts = async () => {
    setMyProductsLoading(true);
    try {
      const response = await apiGetWithFallback('/revendeur/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(response.data)) {
        setMyProducts(response.data);
      } else if (Array.isArray(response.data?.products)) {
        setMyProducts(response.data.products);
      } else {
        setMyProducts([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du chargement de vos produits');
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

  // Fetch site categories for revendeur
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await axios.get(`${API}/revendeur/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSiteCategories(Array.isArray(response.data?.categories) ? response.data.categories : []);
    } catch (error) {
      toast.error('Erreur lors du chargement des catégories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'catalog') { 
      fetchCatalog(catalogPage, catalogSearch); 
      fetchAllCatalogProducts(); 
    }
    if (activeTab === 'products') fetchMyProducts();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'earnings') fetchEarnings();
    if (activeTab === 'categories') fetchCategories();
  }, [activeTab, catalogCategory, catalogPage, catalogSearch]);

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
      const fullUrl = newUrl.startsWith('http') ? newUrl : `${API_BASE}${newUrl}`;
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
        url.startsWith('http') ? url : `${API_BASE}${url}`
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
    { id: 'products', label: 'Mes produits', icon: Package },
    { id: 'categories', label: 'Catégories', icon: FolderOpen },
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
            <div className="flex items-center gap-2">
              {user?.profile_photo ? (
                <img 
                  src={toAbsoluteMediaUrl(user.profile_photo)} 
                  alt={user?.name || 'Profil'} 
                  className="w-10 h-10 rounded-full object-cover" 
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl">
                  <span>{user?.name?.charAt(0)?.toUpperCase() || 'R'}</span>
                </div>
              )}
              <div>
                <span className="text-xl font-bold text-purple-600">Revendeur</span>
                <p className="text-xs text-gray-500">Espace partenaire</p>
              </div>
            </div>
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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
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

                <motion.div variants={statCardVariant} whileHover={{ y: -5, scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-gradient-to-br from-fuchsia-50 to-white">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">Abonnés</p>
                          <p className="text-3xl font-bold text-gray-900">
                            <AnimatedNumber value={followerCount} />
                          </p>
                        </div>
                        <motion.div 
                          className="w-12 h-12 rounded-full bg-fuchsia-100 flex items-center justify-center"
                          whileHover={{ rotate: 15, scale: 1.1 }}
                        >
                          <Users className="w-6 h-6 text-fuchsia-600" />
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
                <div className="flex items-center gap-3">
                  {(catalogCategory || catalogCategorySlugs.length > 0) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setCatalogCategory(''); setCatalogCategorySlugs([]); setCatalogPage(1); }}
                      className="text-purple-600 border-purple-200 hover:bg-purple-100"
                    >
                      <ChevronRight className="w-4 h-4 mr-1 rotate-180" />
                      Retour
                    </Button>
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Package2 className="w-6 h-6 text-purple-500" />
                      Catalogue produits
                    </h1>
                    <p className="text-gray-500">Sélectionnez des produits à ajouter à votre boutique</p>
                  </div>
                </div>
                <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
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
                  <select
                    value={catalogCategory}
                    onChange={(e) => {
                      setCatalogCategory(e.target.value);
                      setCatalogPage(1);
                    }}
                    className="h-10 rounded-md border border-purple-200 px-3 text-sm bg-white min-w-[220px]"
                  >
                    <option value="">Toutes les catégories</option>
                    {/* Grouper catégories parentes puis leurs sous-catégories */}
                    {catalogCategories
                      .filter(cat => !cat.parent_slug)
                      .map((parent) => {
                        const children = catalogCategories.filter(c => c.parent_slug === parent.slug);
                        return (
                          <React.Fragment key={parent.slug}>
                            <option value={parent.slug}>{parent.name}</option>
                            {children.map(child => (
                              <option key={child.slug} value={child.slug}>
                                &nbsp;&nbsp;↳ {child.name}
                              </option>
                            ))}
                          </React.Fragment>
                        );
                      })}
                  </select>
                </div>
              </motion.div>

              {/* Affichage en catégories/sous-catégories quand pas de filtre actif */}
              {catalogLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                </div>
              ) : catalogCategorySlugs.length > 0 || catalogCategory || catalogSearch ? (
                /* Vue filtrée : grille plate */
                <>
                  {(catalogCategorySlugs.length > 0 || catalogCategory) && (
                    <div className="flex items-center gap-2 text-sm text-purple-600 bg-purple-50 rounded-lg px-4 py-2 w-fit">
                      <Tag className="w-4 h-4" />
                      <span>Filtré par : <strong>{catalogCategorySlugs.length > 0 ? catalogCategorySlugs.map(s => catalogCategories.find(c => c.slug === s)?.name || s).join(' + ') : (catalogCategories.find(c => c.slug === catalogCategory)?.name || catalogCategory)}</strong></span>
                      <button
                        onClick={() => { setCatalogCategory(''); setCatalogCategorySlugs([]); setCatalogPage(1); }}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  <motion.div 
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {catalogProducts.map((product, index) => (
                      <CatalogProductCard key={product.id} product={product} index={index} onAdd={handleAddProduct} />
                    ))}
                  </motion.div>
                  {catalogProducts.length === 0 && (
                    <motion.div className="text-center py-12" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                      <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">Aucun produit trouvé</p>
                    </motion.div>
                  )}
                </>
              ) : (
                /* Vue par catégories/sous-catégories */
                <CatalogByCategoryView
                  products={allCatalogLoaded ? allCatalogProducts : catalogProducts}
                  categories={catalogCategories}
                  onAdd={handleAddProduct}
                  onFilterCategory={(slug) => { setCatalogCategory(slug); setCatalogPage(1); }}
                />
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
                                    className="mt-1 flex flex-wrap items-center gap-2"
                                  >
                                    <Badge 
                                      variant={product.is_active ? 'default' : 'secondary'} 
                                      className={`${product.is_active ? 'bg-green-500' : ''}`}
                                    >
                                      {product.is_active ? 'Actif' : 'Inactif'}
                                    </Badge>
                                    <Badge
                                      variant="outline"
                                      className={`capitalize ${
                                        product.publication_status === 'approved'
                                          ? 'border-green-300 text-green-700 bg-green-50'
                                          : 'border-orange-300 text-orange-600 bg-orange-50'
                                      }`}
                                    >
                                      {product.publication_status === 'approved' ? '✓ Visible sur le site' : '⏳ En attente de validation'}
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


          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <motion.div
              key="categories"
              variants={tabContentVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              {/* Header */}
              <motion.div
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FolderOpen className="w-6 h-6 text-purple-500" />
                    Catégories du site
                  </h1>
                  <p className="text-gray-500">Toutes les catégories disponibles sur la marketplace</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher une catégorie..."
                      value={catSearch}
                      onChange={(e) => setCatSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 rounded-md border border-purple-200 focus:border-purple-400 focus:outline-none text-sm w-64"
                    />
                  </div>
                  <div className="flex rounded-md border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setCatView('grid')}
                      className={`px-3 py-2 text-sm flex items-center gap-1 transition-colors ${catView === 'grid' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span className="grid grid-cols-2 gap-0.5 w-3 h-3">
                        <span className="bg-current rounded-sm" /><span className="bg-current rounded-sm" />
                        <span className="bg-current rounded-sm" /><span className="bg-current rounded-sm" />
                      </span>
                    </button>
                    <button
                      onClick={() => setCatView('list')}
                      className={`px-3 py-2 text-sm flex items-center gap-1 transition-colors ${catView === 'list' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      <span className="flex flex-col gap-0.5 w-3 h-3 justify-center">
                        <span className="bg-current h-0.5 rounded" /><span className="bg-current h-0.5 rounded" /><span className="bg-current h-0.5 rounded" />
                      </span>
                    </button>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={fetchCategories}
                    className="flex items-center gap-2 px-4 py-2 rounded-md border border-purple-200 text-purple-600 text-sm hover:bg-purple-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Rafraîchir
                  </motion.button>
                </div>
              </motion.div>

              {/* Loading */}
              {categoriesLoading ? (
                <div className="flex justify-center py-16">
                  <motion.div
                    className="rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </div>
              ) : (() => {
                const parentCats = siteCategories.filter(c => !c.parent_slug);
                const childCats = siteCategories.filter(c => c.parent_slug);
                const filtered = parentCats.filter(c =>
                  !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase()) ||
                  (c.description || '').toLowerCase().includes(catSearch.toLowerCase())
                );

                if (filtered.length === 0) return (
                  <motion.div
                    className="text-center py-16"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <FolderOpen className="w-14 h-14 mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-500 text-lg">Aucune catégorie trouvée</p>
                    <p className="text-gray-400 text-sm mt-1">Essayez un autre terme de recherche</p>
                  </motion.div>
                );

                return catView === 'grid' ? (
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {filtered.map((cat, index) => {
                      const subs = childCats.filter(c => c.parent_slug === cat.slug);
                      const isEditing = editingCategory?.id === cat.id;
                      return (
                        <motion.div
                          key={cat.id}
                          variants={productCardVariant}
                          whileHover={{ y: -4, boxShadow: '0 12px 40px -10px rgba(139,92,246,0.25)' }}
                          transition={{ delay: index * 0.04 }}
                        >
                          <Card className="overflow-hidden border border-purple-100 hover:border-purple-300 transition-all duration-300">
                            {/* Banner image */}
                            {(cat.banner_images?.[0] || cat.image) && (
                              <div className="h-28 overflow-hidden bg-gradient-to-br from-purple-100 to-indigo-100">
                                <img
                                  src={cat.banner_images?.[0] || cat.image}
                                  alt={cat.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            {!cat.banner_images?.[0] && !cat.image && (
                              <div className="h-28 bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                                <FolderOpen className="w-10 h-10 text-purple-300" />
                              </div>
                            )}
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                                  <span className="text-xs text-purple-500 font-mono">{cat.slug}</span>
                                </div>
                              </div>

                              {!isEditing ? (
                                <>
                                  <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                                    {cat.description || <span className="italic text-gray-300">Pas de description</span>}
                                  </p>
                                  {subs.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                      {subs.slice(0, 4).map(sub => (
                                        <span key={sub.id} className="text-xs bg-purple-50 text-purple-600 border border-purple-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                                          <Tag className="w-2.5 h-2.5" />
                                          {sub.name}
                                        </span>
                                      ))}
                                      {subs.length > 4 && (
                                        <span className="text-xs text-gray-400">+{subs.length - 4} autres</span>
                                      )}
                                    </div>
                                  )}
                                  <div className="mt-4 flex gap-2">
                                    <Button
                                      size="sm"
                                      className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                                      onClick={() => {
                                        const subSlugs = subs.map(s => s.slug);
                                        setCatalogCategorySlugs([cat.slug, ...subSlugs]);
                                        setCatalogCategory('');
                                        setActiveTab('catalog');
                                        toast.success(`Catalogue filtré sur "${cat.name}" et ses sous-catégories`);
                                      }}
                                    >
                                      <Eye className="w-3.5 h-3.5 mr-1" />
                                      Voir produits
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <div className="space-y-3">
                                  <textarea
                                    value={catEditDesc}
                                    onChange={(e) => setCatEditDesc(e.target.value)}
                                    rows={3}
                                    placeholder="Décrivez cette catégorie pour votre boutique..."
                                    className="w-full text-sm border border-purple-200 rounded-md px-3 py-2 focus:border-purple-400 focus:outline-none resize-none"
                                    autoFocus
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1"
                                      onClick={() => { setEditingCategory(null); setCatEditDesc(''); }}
                                    >
                                      Annuler
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600"
                                      disabled={catEditSaving}
                                      onClick={async () => {
                                        setCatEditSaving(true);
                                        try {
                                          await axios.put(`${API}/admin/categories/${cat.id}`,
                                            { description: catEditDesc },
                                            { headers: { Authorization: `Bearer ${token}` } }
                                          );
                                          setSiteCategories(prev => prev.map(c =>
                                            c.id === cat.id ? { ...c, description: catEditDesc } : c
                                          ));
                                          toast.success(`Catégorie "${cat.name}" mise à jour`);
                                          setEditingCategory(null);
                                          setCatEditDesc('');
                                        } catch {
                                          toast.error('Erreur lors de la mise à jour');
                                        } finally {
                                          setCatEditSaving(false);
                                        }
                                      }}
                                    >
                                      {catEditSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                                      Sauvegarder
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  /* List View */
                  <motion.div
                    className="space-y-3"
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                  >
                    {filtered.map((cat, index) => {
                      const subs = childCats.filter(c => c.parent_slug === cat.slug);
                      const isEditing = editingCategory?.id === cat.id;
                      return (
                        <motion.div
                          key={cat.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ x: 4 }}
                        >
                          <Card className="border border-purple-100 hover:border-purple-300 transition-all">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                {(cat.banner_images?.[0] || cat.image) ? (
                                  <img
                                    src={cat.banner_images?.[0] || cat.image}
                                    alt={cat.name}
                                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                                    <FolderOpen className="w-7 h-7 text-purple-300" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                                    {subs.length > 0 && (
                                      <span className="text-xs text-purple-500">{subs.length} sous-catégorie{subs.length > 1 ? 's' : ''}</span>
                                    )}
                                  </div>
                                  {!isEditing ? (
                                    <>
                                      <p className="text-sm text-gray-500 truncate">
                                        {cat.description || <span className="italic text-gray-300">Pas de description</span>}
                                      </p>
                                      {subs.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {subs.slice(0, 6).map(sub => (
                                            <span key={sub.id} className="text-xs bg-purple-50 text-purple-600 rounded-full px-2 py-0.5 flex items-center gap-1">
                                              <Tag className="w-2.5 h-2.5" />{sub.name}
                                            </span>
                                          ))}
                                          {subs.length > 6 && <span className="text-xs text-gray-400">+{subs.length - 6}</span>}
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <div className="flex gap-2 mt-1">
                                      <input
                                        type="text"
                                        value={catEditDesc}
                                        onChange={(e) => setCatEditDesc(e.target.value)}
                                        placeholder="Description de la catégorie..."
                                        className="flex-1 text-sm border border-purple-200 rounded-md px-3 py-1.5 focus:border-purple-400 focus:outline-none"
                                        autoFocus
                                      />
                                      <Button size="sm" variant="outline" onClick={() => { setEditingCategory(null); setCatEditDesc(''); }}>
                                        <X className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="bg-purple-600 hover:bg-purple-700"
                                        disabled={catEditSaving}
                                        onClick={async () => {
                                          setCatEditSaving(true);
                                          try {
                                            await axios.put(`${API}/admin/categories/${cat.id}`,
                                              { description: catEditDesc },
                                              { headers: { Authorization: `Bearer ${token}` } }
                                            );
                                            setSiteCategories(prev => prev.map(c =>
                                              c.id === cat.id ? { ...c, description: catEditDesc } : c
                                            ));
                                            toast.success(`"${cat.name}" mis à jour`);
                                            setEditingCategory(null);
                                            setCatEditDesc('');
                                          } catch {
                                            toast.error('Erreur lors de la mise à jour');
                                          } finally {
                                            setCatEditSaving(false);
                                          }
                                        }}
                                      >
                                        {catEditSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                                {!isEditing && (
                                  <div className="flex gap-2 flex-shrink-0">
                                    <Button
                                      size="sm"
                                      className="bg-gradient-to-r from-purple-600 to-indigo-600"
                                      onClick={() => {
                                        const subSlugs = subs.map(s => s.slug);
                                        setCatalogCategorySlugs([cat.slug, ...subSlugs]);
                                        setCatalogCategory('');
                                        setActiveTab('catalog');
                                        toast.success(`Catalogue filtré sur "${cat.name}" et ses sous-catégories`);
                                      }}
                                    >
                                      <Eye className="w-3.5 h-3.5 mr-1" />
                                      Voir produits
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                );
              })()}

              {/* Summary stats */}
              {!categoriesLoading && siteCategories.length > 0 && (
                <motion.div
                  className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t border-gray-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <span><strong className="text-gray-700">{siteCategories.filter(c => !c.parent_slug).length}</strong> catégories principales</span>
                  <span>·</span>
                  <span><strong className="text-gray-700">{siteCategories.filter(c => c.parent_slug).length}</strong> sous-catégories</span>
                  <span>·</span>
                  <span><strong className="text-green-600">{siteCategories.filter(c => c.is_active).length}</strong> actives</span>
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
  const mapboxRef = useRef(null);
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
      const ws = new WebSocket(`${WS_URL}/api/ws/orders/order_${selectedOrder.id}`);
      
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

  // Initialize Mapbox map
  useEffect(() => {
    if (!selectedOrder || !mapRef.current) return;

    loadMapbox()
      .then((mapboxgl) => {
        mapboxRef.current = mapboxgl;
        createMap(mapboxgl);
      })
      .catch(() => toast.error('Erreur chargement Mapbox'));
  }, [selectedOrder]);

  const createMap = (mapboxgl) => {
    if (!selectedOrder?.delivery_address) return;
    
    const customerPos = {
      latitude: selectedOrder.delivery_address.latitude || 5.3600,
      longitude: selectedOrder.delivery_address.longitude || -4.0083
    };
    
    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: toLngLat(customerPos),
      zoom: 14,
    });
    mapInstance.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    upsertMarker(mapboxgl, mapInstance.current, customerMarker, customerPos, {
      color: '#ef4444',
      title: 'Client'
    });
    
    // Driver marker if available
    if (selectedOrder.driver_live_location || driverLocation) {
      const loc = driverLocation || selectedOrder.driver_live_location;
      updateDriverMarker(loc);
    }
  };

  const updateDriverMarker = (location) => {
    if (!mapInstance.current || !mapboxRef.current || !location) return;

    upsertMarker(mapboxRef.current, mapInstance.current, driverMarker, location, {
      color: '#2563eb',
      title: 'Livreur'
    });
    
    mapInstance.current.easeTo({ center: toLngLat(location), zoom: 14 });
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

// ============================================================
// COMPOSANT : Carte produit catalogue (réutilisable)
// ============================================================
const CatalogProductCard = ({ product, index, onAdd }) => (
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
          <motion.div className="absolute top-2 right-2" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
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
          <Button variant="outline" className="w-full opacity-60" disabled>Déjà ajouté</Button>
        ) : (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md" onClick={() => onAdd(product)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

// ============================================================
// COMPOSANT : Vue catalogue groupé par catégorie + sous-catégorie
// ============================================================
const CatalogByCategoryView = ({ products, categories, onAdd, onFilterCategory }) => {
  const [expandedCats, setExpandedCats] = React.useState({});
  const [expandedSubs, setExpandedSubs] = React.useState({});

  const parentCats = categories.filter(c => !c.parent_slug);
  const childCats = categories.filter(c => c.parent_slug);

  const toggleCat = (slug) => setExpandedCats(prev => ({ ...prev, [slug]: !prev[slug] }));
  const toggleSub = (slug) => setExpandedSubs(prev => ({ ...prev, [slug]: !prev[slug] }));

  if (products.length === 0) {
    return (
      <motion.div className="text-center py-12" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Aucun produit dans le catalogue</p>
      </motion.div>
    );
  }

  // Regrouper produits par category_slug ET subcategory_slug
  // Un produit peut matcher via category_slug (direct) ou subcategory_slug
  const productsBySlug = {};
  products.forEach(p => {
    // Clé principale : subcategory_slug si présent, sinon category_slug
    const mainSlug = p.subcategory_slug || p.category_slug || '__sans_categorie__';
    if (!productsBySlug[mainSlug]) productsBySlug[mainSlug] = [];
    productsBySlug[mainSlug].push(p);
    // Si subcategory_slug présent, ne pas aussi mettre dans le parent pour éviter les doublons
  });

  return (
    <div className="space-y-8">
      {parentCats.map((parent, pIdx) => {
        const subs = childCats.filter(c => c.parent_slug === parent.slug);

        // Produits directement sous la catégorie parente (sans sous-cat)
        const directProducts = productsBySlug[parent.slug] || [];

        // Produits dans les sous-catégories
        const subProductGroups = subs
          .map(sub => ({ sub, prods: productsBySlug[sub.slug] || [] }))
          .filter(g => g.prods.length > 0);

        const totalProducts = directProducts.length + subProductGroups.reduce((s, g) => s + g.prods.length, 0);

        if (totalProducts === 0) return null;

        const isExpanded = expandedCats[parent.slug] !== false; // ouvert par défaut

        return (
          <motion.div
            key={parent.slug}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: pIdx * 0.08 }}
            className="space-y-4"
          >
            {/* En-tête catégorie parente */}
            <button
              onClick={() => toggleCat(parent.slug)}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 hover:border-purple-300 transition-all"
            >
              <div className="flex items-center gap-3">
                {parent.image || parent.banner_images?.[0] ? (
                  <img src={parent.image || parent.banner_images[0]} alt={parent.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-purple-200 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-purple-600" />
                  </div>
                )}
                <div className="text-left">
                  <h2 className="text-lg font-bold text-gray-900">{parent.name}</h2>
                  <p className="text-xs text-gray-500">
                    {totalProducts} produit{totalProducts > 1 ? 's' : ''}
                    {subs.length > 0 && ` · ${subs.length} sous-catégorie${subs.length > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-purple-600 border-purple-200 hover:bg-purple-100 text-xs"
                  onClick={(e) => { e.stopPropagation(); onFilterCategory(parent.slug); }}
                >
                  Voir tout
                </Button>
                <ChevronRight className={`w-5 h-5 text-purple-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
            </button>

            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 pl-2"
              >
                {/* Produits directs (sans sous-catégorie) */}
                {directProducts.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-medium text-gray-600">Général — {parent.name}</span>
                      <span className="text-xs text-gray-400">({directProducts.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {directProducts.slice(0, 8).map((product, index) => (
                        <CatalogProductCard key={product.id} product={product} index={index} onAdd={onAdd} />
                      ))}
                    </div>
                    {directProducts.length > 8 && (
                      <button onClick={() => onFilterCategory(parent.slug)} className="text-sm text-purple-600 hover:underline">
                        + {directProducts.length - 8} autres produits dans {parent.name}
                      </button>
                    )}
                  </div>
                )}

                {/* Sous-catégories */}
                {subProductGroups.map(({ sub, prods }, sIdx) => {
                  const isSubExpanded = expandedSubs[sub.slug] !== false; // ouvert par défaut
                  const PREVIEW = 8;
                  return (
                    <div key={sub.slug} className="space-y-3 border-l-2 border-purple-100 pl-4">
                      <button
                        onClick={() => toggleSub(sub.slug)}
                        className="w-full flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-5 bg-indigo-300 rounded-full" />
                          <Tag className="w-4 h-4 text-indigo-400" />
                          <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">
                            {sub.name}
                          </span>
                          <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200">
                            {prods.length} produit{prods.length > 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {prods.length > PREVIEW && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onFilterCategory(sub.slug); }}
                              className="text-xs text-purple-600 hover:underline"
                            >
                              Filtrer →
                            </button>
                          )}
                          <ChevronRight className={`w-4 h-4 text-indigo-300 transition-transform ${isSubExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </button>
                      {isSubExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {prods.slice(0, PREVIEW).map((product, index) => (
                              <CatalogProductCard key={product.id} product={product} index={index + sIdx * PREVIEW} onAdd={onAdd} />
                            ))}
                          </div>
                          {prods.length > PREVIEW && (
                            <button
                              onClick={() => onFilterCategory(sub.slug)}
                              className="text-sm text-purple-600 hover:underline ml-1"
                            >
                              + {prods.length - PREVIEW} autres produits dans {sub.name}
                            </button>
                          )}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        );
      })}

      {/* Produits sans catégorie */}
      {(productsBySlug['__sans_categorie__'] || []).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Package className="w-4 h-4" />
            <span>Autres produits</span>
            <span className="text-xs text-gray-400">({productsBySlug['__sans_categorie__'].length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {productsBySlug['__sans_categorie__'].map((product, index) => (
              <CatalogProductCard key={product.id} product={product} index={index} onAdd={onAdd} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RevendeurDashboard;
