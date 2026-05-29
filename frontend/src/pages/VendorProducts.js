import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Package, Plus, Edit, Trash2, Eye, Clock, CheckCircle, XCircle,
  Search, Filter, ArrowLeft, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';

const VendorProducts = () => {
  const navigate = useNavigate();
  const { token, isVendor, logout } = useAuth();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isVendor) {
      navigate('/connexion');
      return;
    }
    fetchProducts();
  }, [isVendor, navigate]);

  const fetchProducts = async (status = null) => {
    try {
      const url = status 
        ? `${API}/vendor/products?status=${status}`
        : `${API}/vendor/products`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    
    try {
      await axios.delete(`${API}/vendor/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Produit supprimé');
      fetchProducts();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setLoading(true);
    if (tab === 'all') {
      fetchProducts();
    } else {
      fetchProducts(tab);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="flex items-center gap-1 text-green-600 bg-green-100 px-2 py-1 rounded-full text-xs">
            <CheckCircle className="w-3 h-3" /> Approuvé
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-amber-600 bg-amber-100 px-2 py-1 rounded-full text-xs">
            <Clock className="w-3 h-3" /> En attente
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 text-red-600 bg-red-100 px-2 py-1 rounded-full text-xs">
            <XCircle className="w-3 h-3" /> Rejeté
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-muted/30 dashboard-card-skin home-premium-gradient" data-testid="vendor-products">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/vendeur">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Package className="w-8 h-8 text-primary" />
                Mes produits
              </h1>
              <p className="text-muted-foreground mt-1">
                {products.length} produit(s) au total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild>
              <Link to="/vendeur/produits/nouveau" data-testid="add-product-btn">
                <Plus className="w-4 h-4 mr-2" /> Ajouter un produit
              </Link>
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Déconnexion
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="approved">Approuvés</TabsTrigger>
            <TabsTrigger value="pending">En attente</TabsTrigger>
            <TabsTrigger value="rejected">Rejetés</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border">
                <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Aucun produit</h3>
                <p className="text-muted-foreground mb-6">
                  {activeTab === 'all' 
                    ? 'Commencez par ajouter votre premier produit'
                    : `Aucun produit ${activeTab === 'approved' ? 'approuvé' : activeTab === 'pending' ? 'en attente' : 'rejeté'}`
                  }
                </p>
                <Button asChild>
                  <Link to="/vendeur/produits/nouveau">
                    <Plus className="w-4 h-4 mr-2" /> Ajouter un produit
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="divide-y">
                  {filteredProducts.map((product) => (
                    <div key={product.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                      {/* Image */}
                      <img
                        src={product.images?.[0] || 'https://via.placeholder.com/80'}
                        alt={product.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{product.name}</h3>
                          {getStatusBadge(product.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {product.category_slug} • Stock: {product.stock}
                        </p>
                        {product.rejection_reason && (
                          <p className="text-xs text-red-500 mt-1">
                            Raison: {product.rejection_reason}
                          </p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatPrice(product.price_fcfa)}</p>
                        {product.promo_price_fcfa && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatPrice(product.promo_price_fcfa)}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {product.status === 'approved' && (
                          <Button asChild variant="ghost" size="icon">
                            <Link to={`/produit/${product.id}`}>
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                        )}
                        <Button asChild variant="ghost" size="icon">
                          <Link to={`/vendeur/produits/${product.id}/modifier`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default VendorProducts;
