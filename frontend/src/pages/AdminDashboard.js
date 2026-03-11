import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Package, DollarSign, Clock, CheckCircle, XCircle, TrendingUp,
  Store, Crown, Search, ChevronRight, Eye, Ban, Check, X, Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, token, isAdmin } = useAuth();
  
  const [dashboard, setDashboard] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/connexion');
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    try {
      const [dashRes, vendorsRes, productsRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/vendors`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/products/pending`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setDashboard(dashRes.data);
      setVendors(vendorsRes.data.vendors);
      setPendingProducts(productsRes.data.products);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProduct = async (productId) => {
    try {
      await axios.post(
        `${API}/admin/products/${productId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Produit approuvé !');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleRejectProduct = async (productId) => {
    const reason = prompt('Raison du rejet :');
    if (!reason) return;
    
    try {
      await axios.post(
        `${API}/admin/products/${productId}/reject?reason=${encodeURIComponent(reason)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Produit rejeté');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors du rejet');
    }
  };

  const handleToggleVendorStatus = async (vendorId, currentStatus) => {
    try {
      await axios.put(
        `${API}/admin/vendors/${vendorId}/toggle-status`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(currentStatus ? 'Vendeur désactivé' : 'Vendeur activé');
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 bg-slate-900">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-64 mb-8 bg-slate-800" />
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl bg-slate-800" />)}
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats;

  return (
    <div className="min-h-screen py-8 bg-slate-900 text-white" data-testid="admin-dashboard">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Crown className="w-8 h-8 text-amber-500" />
              Administration Cloléo
            </h1>
            <p className="text-slate-400 mt-1">
              Bienvenue, {user?.name}
            </p>
          </div>
          <Button asChild variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
            <Link to="/">Voir la boutique</Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-3xl font-bold mt-4">{stats?.total_users || 0}</p>
            <p className="text-sm text-slate-400">Utilisateurs</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <Store className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-3xl font-bold mt-4">{stats?.total_vendors || 0}</p>
            <p className="text-sm text-slate-400">Vendeurs</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <Package className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-3xl font-bold mt-4">{stats?.total_products || 0}</p>
            <p className="text-sm text-slate-400">Produits</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <DollarSign className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold mt-4">${stats?.total_revenue_usd?.toFixed(2) || 0}</p>
            <p className="text-sm text-slate-400">Revenus abonnements</p>
          </div>
        </div>

        {/* Alert for pending products */}
        {stats?.pending_products > 0 && (
          <div className="mb-8 p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-amber-400" />
              <div>
                <p className="font-bold text-amber-200">{stats.pending_products} produit(s) en attente de validation</p>
                <p className="text-sm text-amber-300/70">Des vendeurs attendent votre approbation</p>
              </div>
            </div>
            <Button 
              onClick={() => setActiveTab('products')}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              Voir les produits
            </Button>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="vendors" className="data-[state=active]:bg-slate-700">
              Vendeurs ({stats?.total_vendors || 0})
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-slate-700">
              Produits en attente ({stats?.pending_products || 0})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Subscription stats */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" /> Abonnements
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Vendeurs gratuits</span>
                    <span className="font-bold">{stats?.free_vendors || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Vendeurs payants</span>
                    <span className="font-bold text-green-400">{stats?.paid_vendors || 0}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Taux de conversion</span>
                      <span className="font-bold text-amber-400">
                        {stats?.total_vendors > 0 
                          ? ((stats?.paid_vendors / stats?.total_vendors) * 100).toFixed(1) 
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent transactions */}
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" /> Transactions récentes
                </h3>
                {dashboard?.recent_transactions?.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.recent_transactions.slice(0, 5).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{tx.plan_id}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tx.payment_status === 'paid' ? 'text-green-400' : 'text-amber-400'}`}>
                            ${tx.amount_usd}
                          </p>
                          <p className="text-xs text-slate-400">{tx.payment_status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">Aucune transaction</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors">
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input 
                      placeholder="Rechercher un vendeur..."
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Vendeur</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Abonnement</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Produits</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Statut</th>
                      <th className="text-left p-4 text-sm font-medium text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((vendor) => (
                      <tr key={vendor.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{vendor.shop_name || vendor.name}</p>
                            <p className="text-sm text-slate-400">{vendor.email}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            vendor.subscription_plan === 'free' ? 'bg-slate-600' :
                            vendor.subscription_plan === 'artisan' ? 'bg-blue-500/20 text-blue-400' :
                            vendor.subscription_plan === 'commercant' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-purple-500/20 text-purple-400'
                          }`}>
                            {vendor.subscription_plan || 'free'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{vendor.product_count || 0}</span>
                        </td>
                        <td className="p-4">
                          {vendor.is_active ? (
                            <span className="flex items-center gap-1 text-green-400 text-sm">
                              <CheckCircle className="w-4 h-4" /> Actif
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-400 text-sm">
                              <XCircle className="w-4 h-4" /> Inactif
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleVendorStatus(vendor.id, vendor.is_active)}
                              className="text-slate-400 hover:text-white"
                            >
                              {vendor.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Pending Products Tab */}
          <TabsContent value="products">
            <div className="bg-slate-800 rounded-xl border border-slate-700">
              {pendingProducts.length === 0 ? (
                <div className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Tout est à jour !</h3>
                  <p className="text-slate-400">Aucun produit en attente de validation</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-700">
                  {pendingProducts.map((product) => (
                    <div key={product.id} className="p-6 flex gap-6">
                      {/* Product image */}
                      <img 
                        src={product.images?.[0] || 'https://via.placeholder.com/120'}
                        alt={product.name}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                      
                      {/* Product info */}
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1">{product.name}</h4>
                        <p className="text-sm text-slate-400 mb-2 line-clamp-2">{product.description}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-amber-400 font-bold">
                            {formatPrice(product.price_fcfa)} FCFA
                          </span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{product.category_slug}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-400">{product.condition}</span>
                        </div>
                        {product.seller && (
                          <p className="text-xs text-slate-500 mt-2">
                            Par: {product.seller.shop_name || product.seller.name} ({product.seller.email})
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleApproveProduct(product.id)}
                          className="bg-green-600 hover:bg-green-700"
                          data-testid={`approve-${product.id}`}
                        >
                          <Check className="w-4 h-4 mr-2" /> Approuver
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRejectProduct(product.id)}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                          data-testid={`reject-${product.id}`}
                        >
                          <X className="w-4 h-4 mr-2" /> Rejeter
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
