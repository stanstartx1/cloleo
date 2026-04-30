import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  LayoutDashboard, Package, ShoppingCart, DollarSign, Settings, LogOut, 
  Menu, X, TrendingUp, Eye, Plus, Search, ChevronRight, Store,
  ArrowUpRight, ArrowDownRight, Package2, ShoppingBag, MapPin, Truck, Phone, User, Clock, CheckCircle, RefreshCw, Loader2, MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import MessagesSection from '../components/MessagesSection';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');
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
        toast.error('Erreur lors du chargement du tableau de bord');
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
    setCustomPrice(product.price_fcfa.toString());
    setCustomDescription(product.description);
    setShowCustomizeModal(true);
  };

  const submitCustomizedProduct = async () => {
    if (!selectedProduct) return;
    
    const sellingPrice = parseInt(customPrice);
    if (sellingPrice < selectedProduct.price_fcfa) {
      toast.error(`Le prix doit être supérieur ou égal à ${selectedProduct.price_fcfa} FCFA`);
      return;
    }
    
    try {
      await axios.post(`${API}/revendeur/products`, {
        original_product_id: selectedProduct.id,
        selling_price_fcfa: sellingPrice,
        custom_description: customDescription !== selectedProduct.description ? customDescription : null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Produit ajouté à votre catalogue !');
      setShowCustomizeModal(false);
      setSelectedProduct(null);
      
      // Refresh catalog to update "is_dropshipped" status
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
    <div className="min-h-screen bg-gray-50" data-testid="revendeur-dashboard">
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
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r shadow-sm transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
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
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Store className="w-5 h-5 text-purple-600" />
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
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && dashboardData && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.name} !</h1>
                <p className="text-gray-500">Voici un aperçu de votre activité revente</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Produits actifs</p>
                        <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.active_products}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <Package className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Commandes</p>
                        <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.total_orders}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <ShoppingCart className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Complétées</p>
                        <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.completed_orders}</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Gains totaux</p>
                        <p className="text-3xl font-bold text-green-600">{dashboardData.stats.total_earnings_fcfa.toLocaleString()} FCFA</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('catalog')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                        <Plus className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">Ajouter des produits</h3>
                        <p className="text-sm text-gray-500">Parcourir le catalogue</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.open(`/boutique/${user?.shop_slug}`, '_blank')}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Eye className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">Voir ma boutique</h3>
                        <p className="text-sm text-gray-500">Aperçu public</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Orders */}
              {dashboardData.recent_orders.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Commandes récentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dashboardData.recent_orders.slice(0, 5).map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Catalog Tab */}
          {activeTab === 'catalog' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Catalogue produits</h1>
                  <p className="text-gray-500">Sélectionnez des produits à ajouter à votre boutique</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher..."
                    value={catalogSearch}
                    onChange={(e) => {
                      setCatalogSearch(e.target.value);
                      fetchCatalog(1, e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {catalogLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {catalogProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden">
                      <div className="aspect-square relative">
                        <img
                          src={product.images?.[0] || '/placeholder.jpg'}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        {product.is_dropshipped && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-green-500">Ajouté</Badge>
                          </div>
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
                          <Button variant="outline" className="w-full" disabled>
                            Déjà ajouté
                          </Button>
                        ) : (
                          <Button 
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            onClick={() => handleAddProduct(product)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Ajouter
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {catalogProducts.length === 0 && !catalogLoading && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Aucun produit trouvé</p>
                </div>
              )}
            </div>
          )}

          {/* My Products Tab */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Mes produits</h1>
                  <p className="text-gray-500">Gérez les produits de votre boutique</p>
                </div>
                <Button onClick={() => setActiveTab('catalog')} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>

              {myProductsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                </div>
              ) : myProducts.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {myProducts.map((product) => (
                    <Card key={product.id}>
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <img
                            src={product.original_images?.[0] || '/placeholder.jpg'}
                            alt={product.original_name}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-medium">{product.original_name}</h3>
                                <Badge variant={product.is_active ? 'default' : 'secondary'} className="mt-1">
                                  {product.is_active ? 'Actif' : 'Inactif'}
                                </Badge>
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
                                <p className="text-lg font-bold text-green-600">+{product.revendeur_share_fcfa?.toLocaleString()} FCFA</p>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => toggleProductStatus(product.id, product.is_active)}
                                >
                                  {product.is_active ? 'Désactiver' : 'Activer'}
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => deleteProduct(product.id)}
                                >
                                  Supprimer
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-4">Vous n'avez pas encore de produits</p>
                    <Button onClick={() => setActiveTab('catalog')} className="bg-purple-600 hover:bg-purple-700">
                      Parcourir le catalogue
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mes commandes</h1>
                <p className="text-gray-500">Suivez les commandes de vos clients</p>
              </div>

              {ordersLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id}>
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
                            <p className="font-medium text-green-600">+{order.margin_breakdown?.revendeur_receives_fcfa?.toLocaleString()} FCFA</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Adresse</p>
                            <p className="font-medium">{order.delivery_address?.city}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Aucune commande pour le moment</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                  Messages clients
                </h1>
                <p className="text-gray-500">Répondez aux questions de vos clients</p>
              </div>
              <MessagesSection token={token} userType="revendeur" />
            </div>
          )}

          {/* Tracking Tab - Live Delivery Tracking */}
          {activeTab === 'tracking' && (
            <RevendeurOrderTracking token={token} />
          )}

          {/* Earnings Tab */}
          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mes gains</h1>
                <p className="text-gray-500">Historique de vos revenus</p>
              </div>

              {earningsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                </div>
              ) : earnings.length > 0 ? (
                <div className="space-y-4">
                  {earnings.map((earning) => (
                    <Card key={earning.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{earning.product_name}</p>
                            <p className="text-sm text-gray-500">Commande {earning.order_number}</p>
                            <p className="text-xs text-gray-400">{new Date(earning.created_at).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">+{earning.revendeur_share?.toLocaleString()} FCFA</p>
                            <p className="text-xs text-gray-500">sur {earning.total_margin?.toLocaleString()} FCFA de marge</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <DollarSign className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">Pas encore de gains</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Shop Tab */}
          {activeTab === 'shop' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ma boutique</h1>
                <p className="text-gray-500">Informations de votre boutique</p>
              </div>

              <Card>
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

                  <div className="p-4 bg-gray-50 rounded-lg mb-4">
                    <p className="text-sm text-gray-500 mb-1">Lien de votre boutique</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-white rounded border text-sm">
                        {window.location.origin}/boutique/{user?.shop_slug}
                      </code>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/boutique/${user?.shop_slug}`);
                          toast.success('Lien copié !');
                        }}
                      >
                        Copier
                      </Button>
                    </div>
                  </div>

                  <Button 
                    className="w-full"
                    onClick={() => window.open(`/boutique/${user?.shop_slug}`, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Voir ma boutique
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
                <p className="text-gray-500">Gérez votre compte</p>
              </div>

              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Nom</p>
                    <p className="font-medium">{user?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <p className="font-medium">{user?.phone || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Membre depuis</p>
                    <p className="font-medium">{new Date(user?.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Customize Product Modal */}
      {showCustomizeModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Personnaliser le produit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <img
                  src={selectedProduct.images?.[0] || '/placeholder.jpg'}
                  alt={selectedProduct.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <div>
                  <h3 className="font-medium">{selectedProduct.name}</h3>
                  <div className="mt-1">
                    {selectedProduct.promo_price_fcfa && selectedProduct.promo_price_fcfa < selectedProduct.price_fcfa ? (
                      <div>
                        <p className="text-xs text-gray-400 line-through">Prix normal: {selectedProduct.price_fcfa?.toLocaleString()} FCFA</p>
                        <p className="text-sm text-green-600 font-medium">Prix promo: {selectedProduct.promo_price_fcfa?.toLocaleString()} FCFA</p>
                        <Badge className="bg-green-100 text-green-700 text-xs mt-1">
                          -{Math.round((1 - selectedProduct.promo_price_fcfa / selectedProduct.price_fcfa) * 100)}% de réduction
                        </Badge>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Prix d'achat: {selectedProduct.price_fcfa?.toLocaleString()} FCFA</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Votre prix de vente (FCFA)</label>
                <Input
                  type="number"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  min={selectedProduct.promo_price_fcfa || selectedProduct.price_fcfa}
                />
                {parseInt(customPrice) > (selectedProduct.promo_price_fcfa || selectedProduct.price_fcfa) && (
                  <p className="text-sm text-green-600">
                    Votre marge: +{((parseInt(customPrice) - (selectedProduct.promo_price_fcfa || selectedProduct.price_fcfa)) / 2).toLocaleString()} FCFA (50%)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description personnalisée (optionnel)</label>
                <textarea
                  className="w-full p-3 border rounded-lg text-sm"
                  rows={4}
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Modifiez la description si nécessaire..."
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowCustomizeModal(false)}>
                  Annuler
                </Button>
                <Button className="flex-1 bg-purple-600 hover:bg-purple-700" onClick={submitCustomizedProduct}>
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
          <div className="overflow-x-auto">
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
