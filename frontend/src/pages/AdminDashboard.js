import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Package, DollarSign, Clock, CheckCircle, XCircle, TrendingUp,
  Store, Crown, Search, Eye, Ban, Check, X, Settings, Truck, MapPin,
  BarChart3, CreditCard, ChevronRight, Menu, Home, UserCog, Cog
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

// Sidebar Navigation Items
const SIDEBAR_ITEMS = [
  { id: 'vendors', label: 'Vendeurs', icon: Store, color: 'text-purple-400' },
  { id: 'drivers', label: 'Livreurs', icon: Truck, color: 'text-blue-400' },
  { id: 'products', label: 'Produits', icon: Package, color: 'text-green-400' },
  { id: 'stats', label: 'Stats', icon: BarChart3, color: 'text-amber-400' },
  { id: 'transactions', label: 'Transactions', icon: CreditCard, color: 'text-emerald-400' },
  { id: 'routes', label: 'Trajet livreurs', icon: MapPin, color: 'text-cyan-400' },
  { id: 'settings-vendors', label: 'Paramètres vendeurs', icon: UserCog, color: 'text-orange-400' },
  { id: 'settings-drivers', label: 'Paramètres livreurs', icon: Settings, color: 'text-pink-400' },
  { id: 'settings-general', label: 'Paramètre général', icon: Cog, color: 'text-slate-400' },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, token, isAdmin } = useAuth();
  
  const [activeSection, setActiveSection] = useState('stats');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [products, setProducts] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({});
  
  // Filter states
  const [productFilter, setProductFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/connexion');
      return;
    }
    fetchAllData();
  }, [isAdmin, navigate]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [dashRes, vendorsRes, driversRes, productsRes, pendingRes, transactionsRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard`, { headers }),
        axios.get(`${API}/admin/vendors`, { headers }),
        axios.get(`${API}/admin/drivers`, { headers }).catch(() => ({ data: { drivers: [] } })),
        axios.get(`${API}/admin/products`, { headers }),
        axios.get(`${API}/admin/products/pending`, { headers }),
        axios.get(`${API}/admin/transactions`, { headers })
      ]);
      
      setStats(dashRes.data.stats);
      setVendors(vendorsRes.data.vendors || []);
      setDrivers(driversRes.data.drivers || []);
      setProducts(productsRes.data.products || []);
      setPendingProducts(pendingRes.data.products || []);
      setTransactions(transactionsRes.data.transactions || []);
      
      // Load settings
      const [vendorSettings, driverSettings, platformSettings] = await Promise.all([
        axios.get(`${API}/admin/settings/vendor`, { headers }),
        axios.get(`${API}/admin/settings/delivery`, { headers }),
        axios.get(`${API}/admin/settings/platform`, { headers })
      ]);
      
      setSettings({
        vendor: vendorSettings.data,
        delivery: driverSettings.data,
        platform: platformSettings.data
      });
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProduct = async (productId) => {
    try {
      await axios.post(`${API}/admin/products/${productId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Produit approuvé !');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleRejectProduct = async (productId) => {
    const reason = prompt('Raison du rejet :');
    if (!reason) return;
    
    try {
      await axios.post(`${API}/admin/products/${productId}/reject?reason=${encodeURIComponent(reason)}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Produit rejeté');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur lors du rejet');
    }
  };

  const handleToggleVendorStatus = async (vendorId) => {
    try {
      await axios.put(`${API}/admin/vendors/${vendorId}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Statut mis à jour');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleVerifyDriver = async (driverId) => {
    try {
      await axios.put(`${API}/admin/drivers/${driverId}/verify`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Livreur vérifié et activé !');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur lors de la vérification');
    }
  };

  const handleToggleDriver = async (driverId) => {
    try {
      await axios.put(`${API}/admin/drivers/${driverId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Statut mis à jour');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleSaveSettings = async (type) => {
    try {
      await axios.put(`${API}/admin/settings/${type}`, { settings: settings[type] }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Paramètres sauvegardés !');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const updateSetting = (type, key, value) => {
    setSettings(prev => ({
      ...prev,
      [type]: { ...prev[type], [key]: value }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex">
        <div className="w-64 bg-slate-800 p-4">
          {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-10 mb-2 bg-slate-700" />)}
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-10 w-64 mb-8 bg-slate-800" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 bg-slate-800" />)}
          </div>
        </div>
      </div>
    );
  }

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'stats':
        return <StatsSection stats={stats} pendingCount={pendingProducts.length} />;
      case 'vendors':
        return <VendorsSection vendors={vendors} onToggle={handleToggleVendorStatus} searchTerm={searchTerm} />;
      case 'drivers':
        return <DriversSection drivers={drivers} onVerify={handleVerifyDriver} onToggle={handleToggleDriver} />;
      case 'products':
        return <ProductsSection 
          products={products} 
          pendingProducts={pendingProducts}
          filter={productFilter} 
          setFilter={setProductFilter}
          onApprove={handleApproveProduct}
          onReject={handleRejectProduct}
        />;
      case 'transactions':
        return <TransactionsSection transactions={transactions} />;
      case 'routes':
        return <RoutesSection drivers={drivers} />;
      case 'settings-vendors':
        return <SettingsSection type="vendor" settings={settings.vendor} onUpdate={(k, v) => updateSetting('vendor', k, v)} onSave={() => handleSaveSettings('vendor')} />;
      case 'settings-drivers':
        return <SettingsSection type="delivery" settings={settings.delivery} onUpdate={(k, v) => updateSetting('delivery', k, v)} onSave={() => handleSaveSettings('delivery')} />;
      case 'settings-general':
        return <SettingsSection type="platform" settings={settings.platform} onUpdate={(k, v) => updateSetting('platform', k, v)} onSave={() => handleSaveSettings('platform')} />;
      default:
        return <StatsSection stats={stats} pendingCount={pendingProducts.length} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex" data-testid="admin-dashboard">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-500" />
              <span className="font-bold">Admin</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-slate-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const isPending = item.id === 'products' && pendingProducts.length > 0;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-slate-700 text-white' 
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <Icon className={`w-5 h-5 ${item.color}`} />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left text-sm">{item.label}</span>
                    {isPending && (
                      <span className="bg-amber-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                        {pendingProducts.length}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
            <Home className="w-4 h-4" />
            {sidebarOpen && <span>Voir la boutique</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-slate-800/50 border-b border-slate-700 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">
                {SIDEBAR_ITEMS.find(i => i.id === activeSection)?.label || 'Dashboard'}
              </h1>
              <p className="text-sm text-slate-400">Bienvenue, {user?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 bg-slate-700 border-slate-600 text-white"
                />
              </div>
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

// ============== SECTION COMPONENTS ==============

const StatsSection = ({ stats, pendingCount }) => (
  <div className="space-y-6">
    {/* Alert for pending */}
    {pendingCount > 0 && (
      <div className="p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-center gap-3">
        <Clock className="w-6 h-6 text-amber-400" />
        <div>
          <p className="font-bold text-amber-200">{pendingCount} produit(s) en attente de validation</p>
          <p className="text-sm text-amber-300/70">Des vendeurs attendent votre approbation</p>
        </div>
      </div>
    )}

    {/* Stats Grid */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={Users} color="text-blue-400" value={stats?.total_users || 0} label="Utilisateurs" />
      <StatCard icon={Store} color="text-purple-400" value={stats?.total_vendors || 0} label="Vendeurs" />
      <StatCard icon={Truck} color="text-cyan-400" value={stats?.total_drivers || 0} label="Livreurs" />
      <StatCard icon={Package} color="text-green-400" value={stats?.total_products || 0} label="Produits" />
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={Clock} color="text-amber-400" value={stats?.pending_products || 0} label="En attente" />
      <StatCard icon={CheckCircle} color="text-emerald-400" value={stats?.approved_products || 0} label="Approuvés" />
      <StatCard icon={Crown} color="text-yellow-400" value={stats?.paid_vendors || 0} label="Vendeurs payants" />
      <StatCard icon={DollarSign} color="text-green-400" value={`$${stats?.total_revenue_usd?.toFixed(2) || 0}`} label="Revenus" />
    </div>

    {/* Charts placeholder */}
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" /> Aperçu des ventes
        </h3>
        <div className="h-48 flex items-center justify-center text-slate-500">
          Graphique à venir
        </div>
      </div>
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" /> Répartition abonnements
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Gratuit</span>
            <span className="font-bold">{stats?.free_vendors || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Payants</span>
            <span className="font-bold text-green-400">{stats?.paid_vendors || 0}</span>
          </div>
          <div className="border-t border-slate-700 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Taux conversion</span>
              <span className="font-bold text-amber-400">
                {stats?.total_vendors > 0 ? ((stats?.paid_vendors / stats?.total_vendors) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const StatCard = ({ icon: Icon, color, value, label }) => (
  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
    <Icon className={`w-6 h-6 ${color} mb-2`} />
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-sm text-slate-400">{label}</p>
  </div>
);

const VendorsSection = ({ vendors, onToggle, searchTerm }) => {
  const filteredVendors = vendors.filter(v => 
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
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
            {filteredVendors.map((vendor) => (
              <tr key={vendor.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="p-4">
                  <p className="font-medium">{vendor.shop_name || vendor.name}</p>
                  <p className="text-sm text-slate-400">{vendor.email}</p>
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
                <td className="p-4 font-medium">{vendor.product_count || 0}</td>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggle(vendor.id)}
                    className="text-slate-400 hover:text-white"
                  >
                    {vendor.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filteredVendors.length === 0 && (
        <div className="p-12 text-center text-slate-500">
          Aucun vendeur trouvé
        </div>
      )}
    </div>
  );
};

const DriversSection = ({ drivers, onVerify, onToggle }) => (
  <div className="space-y-4">
    {drivers.length === 0 ? (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
        <Truck className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Aucun livreur inscrit</h3>
        <p className="text-slate-400">Les livreurs apparaîtront ici après leur inscription</p>
      </div>
    ) : (
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-slate-400">Livreur</th>
              <th className="text-left p-4 text-sm font-medium text-slate-400">Véhicule</th>
              <th className="text-left p-4 text-sm font-medium text-slate-400">Ville</th>
              <th className="text-left p-4 text-sm font-medium text-slate-400">Permis</th>
              <th className="text-left p-4 text-sm font-medium text-slate-400">Statut</th>
              <th className="text-left p-4 text-sm font-medium text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                <td className="p-4">
                  <p className="font-medium">{driver.name}</p>
                  <p className="text-sm text-slate-400">{driver.email}</p>
                  <p className="text-xs text-slate-500">{driver.phone}</p>
                </td>
                <td className="p-4">
                  <span className="capitalize">{driver.vehicle_type}</span>
                </td>
                <td className="p-4">{driver.city}</td>
                <td className="p-4">
                  {driver.license_image ? (
                    <a href={`${BACKEND_URL}${driver.license_image}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">
                      Voir le permis
                    </a>
                  ) : (
                    <span className="text-slate-500 text-sm">Non uploadé</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    {driver.is_verified ? (
                      <span className="text-green-400 text-xs flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Vérifié
                      </span>
                    ) : (
                      <span className="text-amber-400 text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" /> En attente
                      </span>
                    )}
                    {driver.is_active ? (
                      <span className="text-green-400 text-xs">Actif</span>
                    ) : (
                      <span className="text-red-400 text-xs">Inactif</span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {!driver.is_verified && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onVerify(driver.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => onToggle(driver.id)} className="text-slate-400">
                      {driver.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const ProductsSection = ({ products, pendingProducts, filter, setFilter, onApprove, onReject }) => {
  const displayProducts = filter === 'pending' ? pendingProducts : 
                          filter === 'all' ? products : 
                          products.filter(p => p.status === filter);

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'pending', 'approved', 'rejected'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? 'bg-slate-700' : 'border-slate-600 text-slate-400'}
          >
            {f === 'all' ? 'Tous' : f === 'pending' ? `En attente (${pendingProducts.length})` : f === 'approved' ? 'Approuvés' : 'Rejetés'}
          </Button>
        ))}
      </div>

      {/* Products List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700">
        {displayProducts.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Aucun produit</h3>
            <p className="text-slate-400">
              {filter === 'pending' ? 'Aucun produit en attente de validation' : 'Aucun produit dans cette catégorie'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {displayProducts.map((product) => (
              <div key={product.id} className="p-4 flex gap-4 items-center">
                <img 
                  src={product.images?.[0] || 'https://via.placeholder.com/80'}
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{product.name}</h4>
                  <p className="text-sm text-slate-400 truncate">{product.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="text-amber-400 font-bold">{formatPrice(product.price_fcfa)} FCFA</span>
                    <span>{product.category_slug}</span>
                    {product.seller && <span>Par: {product.seller.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    product.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    product.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {product.status}
                  </span>
                  {product.status === 'pending' && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onApprove(product.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/50 text-red-400" onClick={() => onReject(product.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TransactionsSection = ({ transactions }) => (
  <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
    {transactions.length === 0 ? (
      <div className="p-12 text-center text-slate-500">
        <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>Aucune transaction</p>
      </div>
    ) : (
      <table className="w-full">
        <thead className="bg-slate-700/50">
          <tr>
            <th className="text-left p-4 text-sm font-medium text-slate-400">Date</th>
            <th className="text-left p-4 text-sm font-medium text-slate-400">Utilisateur</th>
            <th className="text-left p-4 text-sm font-medium text-slate-400">Plan</th>
            <th className="text-left p-4 text-sm font-medium text-slate-400">Montant</th>
            <th className="text-left p-4 text-sm font-medium text-slate-400">Statut</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-t border-slate-700">
              <td className="p-4 text-sm">{new Date(tx.created_at).toLocaleDateString('fr-FR')}</td>
              <td className="p-4">
                <p className="text-sm font-medium">{tx.user_name}</p>
                <p className="text-xs text-slate-400">{tx.user_email}</p>
              </td>
              <td className="p-4 capitalize">{tx.plan_id}</td>
              <td className="p-4">
                <p className="font-medium">${tx.amount_usd}</p>
                <p className="text-xs text-slate-400">{formatPrice(tx.amount_fcfa)} FCFA</p>
              </td>
              <td className="p-4">
                <span className={`px-2 py-1 rounded text-xs ${
                  tx.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {tx.payment_status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

const RoutesSection = ({ drivers }) => (
  <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
    <div className="flex items-center gap-3 mb-6">
      <MapPin className="w-6 h-6 text-cyan-400" />
      <div>
        <h3 className="font-bold">Trajet des livreurs</h3>
        <p className="text-sm text-slate-400">Fonctionnalité temps réel reportée</p>
      </div>
    </div>
    
    <div className="bg-slate-700/50 rounded-lg p-8 text-center">
      <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
      <h4 className="text-lg font-medium mb-2">Carte en développement</h4>
      <p className="text-slate-400 text-sm">
        Le suivi en temps réel des livreurs sera disponible dans une prochaine mise à jour.
        <br />
        Pour l'instant, les livreurs peuvent mettre à jour leur position manuellement.
      </p>
    </div>

    {/* Active drivers list */}
    {drivers.filter(d => d.is_active && d.status === 'available').length > 0 && (
      <div className="mt-6">
        <h4 className="font-medium mb-3">Livreurs disponibles</h4>
        <div className="space-y-2">
          {drivers.filter(d => d.is_active && d.status === 'available').map(driver => (
            <div key={driver.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span>{driver.name}</span>
              <span className="text-sm text-slate-400">- {driver.city}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

const SettingsSection = ({ type, settings, onUpdate, onSave }) => {
  if (!settings) return <Skeleton className="h-64 bg-slate-800" />;

  const renderFields = () => {
    switch (type) {
      case 'vendor':
        return (
          <>
            <SettingField label="Max images par produit" value={settings.max_images_per_product} onChange={(v) => onUpdate('max_images_per_product', parseInt(v))} type="number" />
            <SettingField label="Prix minimum (FCFA)" value={settings.min_product_price} onChange={(v) => onUpdate('min_product_price', parseInt(v))} type="number" />
            <SettingField label="Longueur min. description" value={settings.min_description_length} onChange={(v) => onUpdate('min_description_length', parseInt(v))} type="number" />
            <SettingField label="Promo max (%)" value={settings.max_promo_percent} onChange={(v) => onUpdate('max_promo_percent', parseInt(v))} type="number" />
            <SettingToggle label="Auto-approuver vendeurs vérifiés" value={settings.auto_approve_verified} onChange={(v) => onUpdate('auto_approve_verified', v)} />
            <SettingToggle label="Autoriser promotions" value={settings.allow_promotions} onChange={(v) => onUpdate('allow_promotions', v)} />
          </>
        );
      case 'delivery':
        return (
          <>
            <SettingField label="Frais de base (FCFA)" value={settings.base_delivery_fee} onChange={(v) => onUpdate('base_delivery_fee', parseInt(v))} type="number" />
            <SettingField label="Prix par km (FCFA)" value={settings.price_per_km} onChange={(v) => onUpdate('price_per_km', parseInt(v))} type="number" />
            <SettingField label="Rayon max (km)" value={settings.max_delivery_radius_km} onChange={(v) => onUpdate('max_delivery_radius_km', parseInt(v))} type="number" />
            <SettingField label="Note min. pour rester actif" value={settings.min_rating_active} onChange={(v) => onUpdate('min_rating_active', parseFloat(v))} type="number" />
            <SettingToggle label="Vérification permis requise" value={settings.require_license_verification} onChange={(v) => onUpdate('require_license_verification', v)} />
          </>
        );
      case 'platform':
        return (
          <>
            <SettingField label="Nom du site" value={settings.site_name} onChange={(v) => onUpdate('site_name', v)} />
            <SettingField label="Description" value={settings.site_description} onChange={(v) => onUpdate('site_description', v)} />
            <SettingField label="Email de contact" value={settings.contact_email} onChange={(v) => onUpdate('contact_email', v)} />
            <SettingField label="Téléphone" value={settings.contact_phone} onChange={(v) => onUpdate('contact_phone', v)} />
            <SettingField label="Devise" value={settings.currency} onChange={(v) => onUpdate('currency', v)} />
            <SettingToggle label="Mode maintenance" value={settings.maintenance_mode} onChange={(v) => onUpdate('maintenance_mode', v)} />
            <SettingToggle label="Checkout invité" value={settings.allow_guest_checkout} onChange={(v) => onUpdate('allow_guest_checkout', v)} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
        <Settings className="w-5 h-5" />
        {type === 'vendor' ? 'Paramètres Vendeurs' : type === 'delivery' ? 'Paramètres Livreurs' : 'Paramètres Généraux'}
      </h3>
      
      <div className="space-y-4">
        {renderFields()}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-700">
        <Button onClick={onSave} className="bg-green-600 hover:bg-green-700">
          <Check className="w-4 h-4 mr-2" /> Sauvegarder
        </Button>
      </div>
    </div>
  );
};

const SettingField = ({ label, value, onChange, type = 'text' }) => (
  <div className="flex items-center justify-between gap-4">
    <label className="text-sm text-slate-400">{label}</label>
    <Input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-48 bg-slate-700 border-slate-600"
    />
  </div>
);

const SettingToggle = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between gap-4">
    <label className="text-sm text-slate-400">{label}</label>
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-green-500' : 'bg-slate-600'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  </div>
);

export default AdminDashboard;
