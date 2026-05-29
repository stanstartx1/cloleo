import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Package, DollarSign, Clock, CheckCircle, XCircle, TrendingUp,
  Store, Crown, Search, Eye, Ban, Check, X, Settings, Truck, MapPin,
  BarChart3, CreditCard, ChevronRight, Menu, Home, UserCog, Cog, Sparkles, Star, MessageCircle,
  Trash2, Edit, Plus, AlertTriangle, RefreshCw, LogOut, Zap, Grip, Tag, Palette, Ruler, Footprints, Shirt, Gem, Weight, Box, Type, List, Hash, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../components/FloatingChat';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import ImageUpload from '../components/ImageUpload';
import { toast } from 'sonner';
import AdminLiveTracking from '../components/AdminLiveTracking';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const SIDEBAR_ITEMS = [
  { id: 'stats', label: 'Stats', icon: BarChart3, color: 'text-amber-400' },
  { id: 'users', label: 'Utilisateurs', icon: Users, color: 'text-rose-400' },
  { id: 'vendors', label: 'Vendeurs', icon: Store, color: 'text-purple-400' },
  { id: 'drivers', label: 'Livreurs', icon: Truck, color: 'text-blue-400' },
  { id: 'revendeurs', label: 'Revendeurs', icon: Package, color: 'text-indigo-400' },
  { id: 'products', label: 'Produits', icon: Package, color: 'text-green-400' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, color: 'text-fuchsia-400' },
  { id: 'categories', label: 'Catégories', icon: Cog, color: 'text-teal-400' },
  { id: 'transactions', label: 'Transactions', icon: CreditCard, color: 'text-emerald-400' },
  { id: 'plans', label: 'Plans abonnement', icon: Crown, color: 'text-yellow-400' },
  { id: 'routes', label: 'Trajet livreurs', icon: MapPin, color: 'text-cyan-400' },
  { id: 'settings-vendors', label: 'Paramètres vendeurs', icon: UserCog, color: 'text-orange-400' },
  { id: 'settings-drivers', label: 'Paramètres livreurs', icon: Settings, color: 'text-pink-400' },
  { id: 'settings-general', label: 'Paramètre général', icon: Cog, color: 'text-slate-400' },
  { id: 'settings-layout', label: 'Apparence du site', icon: Cog, color: 'text-pink-400' },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, token, isAdmin, logout } = useAuth();
  const { openConversation } = useChat();
  
  const [activeSection, setActiveSection] = useState('stats');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [products, setProducts] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({});
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [revendeurs, setRevendeurs] = useState([]);
  const [dropshippingStats, setDropshippingStats] = useState(null);
  const [dropshippingTransactions, setDropshippingTransactions] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCategory, setNewCategory] = useState({ name: '', description: '', banner_images: [], custom_fields: [] });
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [productFilter, setProductFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [adminConversations, setAdminConversations] = useState([]);

  // ===== AUTO-APPROVE STATES =====
  const [autoApprove, setAutoApprove] = useState({
    vendors: false,
    drivers: false,
    products: false,
    revendeurs: false,
  });
  
  const autoSweepRef = useRef(false);

  const loadAutoApproveFromPlatform = (platformSettings) => {
    setAutoApprove({
      vendors: Boolean(platformSettings?.auto_approve_vendors),
      drivers: Boolean(platformSettings?.auto_approve_drivers),
      products: Boolean(platformSettings?.auto_approve_products),
      revendeurs: Boolean(platformSettings?.auto_approve_revendeurs),
    });
  };

  useEffect(() => {
    if (!isAdmin) {
      navigate('/connexion');
      return;
    }
    fetchAllData();
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    fetchAdminConversations();
  }, [isAdmin, token]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [dashRes, vendorsRes, driversRes, productsRes, pendingRes, transactionsRes, plansRes, revendeursRes, dropStatsRes, usersRes, catsRes] = await Promise.all([
        axios.get(`${API}/admin/dashboard`, { headers }),
        axios.get(`${API}/admin/vendors`, { headers }),
        axios.get(`${API}/admin/drivers`, { headers }).catch(() => ({ data: { drivers: [] } })),
        axios.get(`${API}/admin/products`, { headers }),
        axios.get(`${API}/admin/products/pending`, { headers }),
        axios.get(`${API}/admin/transactions`, { headers }),
        axios.get(`${API}/subscriptions/plans`, { headers }),
        axios.get(`${API}/admin/revendeurs`, { headers }).catch(() => ({ data: { revendeurs: [] } })),
        axios.get(`${API}/admin/dropshipping/stats`, { headers }).catch(() => ({ data: { stats: {}, recent_transactions: [] } })),
        axios.get(`${API}/admin/users`, { headers }).catch(() => ({ data: { users: [] } })),
        axios.get(`${API}/categories`, { headers }).catch(() => ({ data: [] }))
      ]);
      
      setStats(dashRes.data.stats);
      setVendors(vendorsRes.data.vendors || []);
      setDrivers(driversRes.data.drivers || []);
      setProducts(productsRes.data.products || []);
      setPendingProducts(pendingRes.data.products || []);
      setTransactions(transactionsRes.data.transactions || []);
      setSubscriptionPlans(plansRes.data || []);
      setRevendeurs(revendeursRes.data.revendeurs || []);
      setDropshippingStats(dropStatsRes.data.stats || {});
      setDropshippingTransactions(dropStatsRes.data.recent_transactions || []);
      setAllUsers(usersRes.data.users || []);
      setCategories(catsRes.data || []);
      
      const [vendorSettings, driverSettings, platformSettings] = await Promise.all([
        axios.get(`${API}/admin/settings/vendor`, { headers }),
        axios.get(`${API}/admin/settings/delivery`, { headers }),
        axios.get(`${API}/admin/settings/platform`, { headers })
      ]);
      
      const nextSettings = {
        vendor: vendorSettings.data,
        delivery: driverSettings.data,
        platform: platformSettings.data
      };
      setSettings(nextSettings);
      loadAutoApproveFromPlatform(nextSettings.platform || {});
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  // ===== AUTO-APPROVE LOGIC =====
  const persistAutoApprove = async (nextAutoApprove) => {
    const headers = { Authorization: `Bearer ${token}` };
    const platform = settings.platform || {};
    const mergedPlatform = {
      ...platform,
      auto_approve_vendors: Boolean(nextAutoApprove.vendors),
      auto_approve_drivers: Boolean(nextAutoApprove.drivers),
      auto_approve_products: Boolean(nextAutoApprove.products),
      auto_approve_revendeurs: Boolean(nextAutoApprove.revendeurs),
    };

    await axios.put(
      `${API}/admin/settings/platform`,
      { settings: mergedPlatform },
      { headers }
    );

    setSettings((prev) => ({ ...prev, platform: mergedPlatform }));
  };

  const handleToggleAutoApprove = async (type) => {
    const newValue = !autoApprove[type];
    const nextAutoApprove = { ...autoApprove, [type]: newValue };
    setAutoApprove(nextAutoApprove);

    try {
      await persistAutoApprove(nextAutoApprove);
    } catch (error) {
      toast.error("Erreur sauvegarde du mode automatique");
      setAutoApprove(autoApprove);
      return;
    }

    if (newValue) {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        // Approuver immédiatement les éléments déjà en attente
        if (type === 'products') {
          await Promise.all(
            pendingProducts.map(p =>
              axios.post(`${API}/admin/products/${p.id}/approve`, {}, { headers })
            )
          );
          toast.success(`? ${pendingProducts.length} produit(s) approuvé(s) automatiquement`);
        } else if (type === 'vendors') {
          const pending = vendors.filter(v => !v.is_verified);
          await Promise.all(
            pending.map(v =>
              axios.put(`${API}/admin/vendors/${v.id}/verify`, {}, { headers })
            )
          );
          toast.success(`? ${pending.length} vendeur(s) approuvé(s) automatiquement`);
        } else if (type === 'drivers') {
          const pending = drivers.filter(d => !d.is_verified);
          await Promise.all(
            pending.map(d =>
              axios.put(`${API}/admin/drivers/${d.id}/verify`, {}, { headers })
            )
          );
          toast.success(`? ${pending.length} livreur(s) approuvé(s) automatiquement`);
        } else if (type === 'revendeurs') {
          const pending = revendeurs.filter(r => !r.is_active);
          await Promise.all(
            pending.map(r =>
              axios.put(`${API}/admin/revendeurs/${r.id}/verify`, {}, { headers })
            )
          );
          toast.success(`? ${pending.length} revendeur(s) approuvé(s) automatiquement`);
        }
        fetchAllData();
      } catch (error) {
        toast.error("Erreur lors de l'approbation automatique");
        const rollback = { ...nextAutoApprove, [type]: false };
        setAutoApprove(rollback);
        try {
          await persistAutoApprove(rollback);
        } catch {}
      }
    } else {
      toast.info(`Approbation automatique désactivée pour les ${type}`);
    }
  };

  useEffect(() => {
    if (!token || autoSweepRef.current) return;

    const shouldRun =
      (autoApprove.products && pendingProducts.length > 0) ||
      (autoApprove.vendors && vendors.some(v => !v.is_verified)) ||
      (autoApprove.drivers && drivers.some(d => !d.is_verified)) ||
      (autoApprove.revendeurs && revendeurs.some(r => !r.is_active));

    if (!shouldRun) return;

    const runAutoSweep = async () => {
      autoSweepRef.current = true;
      const headers = { Authorization: `Bearer ${token}` };
      try {
        if (autoApprove.products && pendingProducts.length > 0) {
          await Promise.all(
            pendingProducts.map(p => axios.post(`${API}/admin/products/${p.id}/approve`, {}, { headers }))
          );
        }
        if (autoApprove.vendors) {
          const pending = vendors.filter(v => !v.is_verified);
          await Promise.all(pending.map(v => axios.put(`${API}/admin/vendors/${v.id}/verify`, {}, { headers })));
        }
        if (autoApprove.drivers) {
          const pending = drivers.filter(d => !d.is_verified);
          await Promise.all(pending.map(d => axios.put(`${API}/admin/drivers/${d.id}/verify`, {}, { headers })));
        }
        if (autoApprove.revendeurs) {
          const pending = revendeurs.filter(r => !r.is_active);
          await Promise.all(pending.map(r => axios.put(`${API}/admin/revendeurs/${r.id}/verify`, {}, { headers })));
        }
        await fetchAllData();
      } catch (e) {
        console.error('Auto-sweep error:', e);
      } finally {
        autoSweepRef.current = false;
      }
    };

    runAutoSweep();
  }, [token, autoApprove, pendingProducts, vendors, drivers, revendeurs]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleApproveProduct = async (productId) => {
    try {
      await axios.post(`${API}/admin/products/${productId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Produit approuvé !');
      fetchAllData();
    } catch (error) {
      toast.error("Erreur lors de l'approbation");
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

  const handleVerifyVendor = async (vendorId) => {
    try {
      await axios.put(`${API}/admin/vendors/${vendorId}/verify`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Vendeur vérifié et activé !');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur lors de la vérification');
    }
  };

  const handleToggleProductFeatured = async (productId) => {
    try {
      const response = await axios.put(`${API}/admin/products/${productId}/feature`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const isFeaturedNow = response.data?.is_featured;
      setProducts(prev =>
        prev.map(p =>
          p.id === productId
            ? { ...p, is_featured: isFeaturedNow !== undefined ? isFeaturedNow : !p.is_featured }
            : p
        )
      );
      toast.success(response.data?.message || 'Mis à jour');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur lors de la mise en avant');
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

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${userName}" ?\n\nTous ses produits et données seront supprimés définitivement.`)) return;
    try {
      const response = await axios.delete(`${API}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleToggleUserActive = async (userId) => {
    try {
      const response = await axios.put(`${API}/admin/users/${userId}/toggle-active`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      fetchAllData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Supprimer le produit "${productName}" ?`)) return;
    try {
      await axios.delete(`${API}/admin/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Produit supprimé');
      fetchAllData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteVendor = async (vendorId, vendorName) => {
    if (!window.confirm(`Supprimer le vendeur "${vendorName}" ?\n\nTous ses produits et données seront supprimés définitivement.`)) return;
    try {
      const response = await axios.delete(`${API}/admin/vendors/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleDeleteDriver = async (driverId, driverName) => {
    if (!window.confirm(`Supprimer le livreur "${driverName}" ?\n\nToutes ses données seront supprimées définitivement.`)) return;
    try {
      await axios.delete(`${API}/admin/drivers/${driverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Livreur supprimé');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleDeleteRevendeur = async (revendeurId, revendeurName) => {
    if (!window.confirm(`Supprimer le revendeur "${revendeurName}" ?\n\nTous ses produits et données seront supprimés définitivement.`)) return;
    try {
      const response = await axios.delete(`${API}/admin/revendeurs/${revendeurId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleAdminWriteMessage = async (targetUser) => {
    try {
      const targetUserId = targetUser?.id || targetUser?.user_id;
      if (!targetUserId) {
        toast.error("Utilisateur introuvable pour ouvrir le chat");
        return;
      }
      const response = await axios.post(
        `${API}/admin/conversations/start`,
        { target_user_id: targetUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const conversationId = response.data?.id;
      if (!conversationId) {
        toast.error("Conversation non créée");
        return;
      }
      openConversation(conversationId);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de l'ouverture du chat");
    }
  };

  const handleOpenConversation = (conversationId) => {
    openConversation(conversationId);
  };

  const fetchAdminConversations = async () => {
    try {
      const response = await axios.get(`${API}/admin/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdminConversations(response.data?.conversations || []);
    } catch (error) {
      toast.error('Erreur de chargement des messages admin');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name) { toast.error('Le nom est requis'); return; }
    try {
      const slug = newCategory.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      await axios.post(`${API}/admin/categories`, { ...newCategory, slug, icon: 'Package', custom_fields: newCategory.custom_fields || [] }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Catégorie créée');
      setNewCategory({ name: '', description: '', banner_images: [], custom_fields: [] });
      setShowNewCategoryForm(false);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const handleUpdateCategory = async (categoryId) => {
    if (!editingCategory) return;
    try {
      const slug = (editingCategory.slug && editingCategory.slug.trim())
        ? editingCategory.slug
        : editingCategory.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      await axios.put(`${API}/admin/categories/${categoryId}`, { ...editingCategory, slug, icon: editingCategory.icon || 'Package', custom_fields: editingCategory.custom_fields || [] }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Catégorie mise à jour');
      setEditingCategory(null);
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`Supprimer la catégorie "${categoryName}" ?`)) return;
    try {
      await axios.delete(`${API}/admin/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Catégorie supprimée');
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleToggleCategory = async (categoryId) => {
    try {
      const response = await axios.put(`${API}/admin/categories/${categoryId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      fetchAllData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const filteredUsers = allUsers.filter(u => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesSearch = !userSearch ||
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const { vendorsWithCounts, revendeursWithCounts } = useMemo(() => {
    const vendorCountById = new Map();
    const revendeurCountByShopSlug = new Map();
    const revendeurCountById = new Map();

    for (const p of products || []) {
      const sellerId = p?.seller_id;
      const shopSlug = p?.shop_slug;

      if (sellerId) {
        vendorCountById.set(sellerId, (vendorCountById.get(sellerId) || 0) + 1);
        revendeurCountById.set(sellerId, (revendeurCountById.get(sellerId) || 0) + 1);
      }

      if (shopSlug) {
        revendeurCountByShopSlug.set(shopSlug, (revendeurCountByShopSlug.get(shopSlug) || 0) + 1);
      }
    }

    return {
      vendorsWithCounts: vendors.map((v) => ({
        ...v,
        product_count: vendorCountById.get(v.id) || 0,
      })),
      revendeursWithCounts: revendeurs.map((r) => ({
        ...r,
        product_count: revendeurCountByShopSlug.get(r.shop_slug) || revendeurCountById.get(r.id) || 0,
      })),
    };
  }, [vendors, revendeurs, products]);

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

  const renderContent = () => {
    switch (activeSection) {
      case 'stats':
        return <StatsSection stats={stats} pendingCount={pendingProducts.length} pendingVendors={vendors.filter(v => !v.is_verified).length} categories={categories} products={products} />;
      case 'users':
        return <UsersSection users={filteredUsers} roleFilter={userRoleFilter} setRoleFilter={setUserRoleFilter} search={userSearch} setSearch={setUserSearch} onDelete={handleDeleteUser} onToggleActive={handleToggleUserActive} />;
      case 'vendors':
        return <VendorsSection vendors={vendorsWithCounts} onToggle={handleToggleVendorStatus} onVerify={handleVerifyVendor} onDelete={handleDeleteVendor} onMessage={handleAdminWriteMessage} searchTerm={searchTerm} autoApprove={autoApprove.vendors} onToggleAutoApprove={() => handleToggleAutoApprove('vendors')} />;
      case 'drivers':
        return <DriversSection drivers={drivers} onVerify={handleVerifyDriver} onToggle={handleToggleDriver} onDelete={handleDeleteDriver} onMessage={handleAdminWriteMessage} autoApprove={autoApprove.drivers} onToggleAutoApprove={() => handleToggleAutoApprove('drivers')} />;
      case 'revendeurs':
        return <RevendeursSection revendeurs={revendeursWithCounts} stats={dropshippingStats} transactions={dropshippingTransactions} token={token} onRefresh={fetchAllData} onDelete={handleDeleteRevendeur} onMessage={handleAdminWriteMessage} autoApprove={autoApprove.revendeurs} onToggleAutoApprove={() => handleToggleAutoApprove('revendeurs')} />;
      case 'products':
        return <ProductsSection products={products} pendingProducts={pendingProducts} filter={productFilter} setFilter={setProductFilter} onApprove={handleApproveProduct} onReject={handleRejectProduct} onToggleFeatured={handleToggleProductFeatured} onDelete={handleDeleteProduct} autoApprove={autoApprove.products} onToggleAutoApprove={() => handleToggleAutoApprove('products')} />;
      case 'messages':
        return <AdminMessagesSection conversations={adminConversations} onRefresh={fetchAdminConversations} onOpenConversation={handleOpenConversation} />;
      case 'categories':
        return <CategoriesSection token={token} categories={categories} editingCategory={editingCategory} setEditingCategory={setEditingCategory} newCategory={newCategory} setNewCategory={setNewCategory} showNewForm={showNewCategoryForm} setShowNewForm={setShowNewCategoryForm} onCreate={handleCreateCategory} onUpdate={handleUpdateCategory} onDelete={handleDeleteCategory} onToggle={handleToggleCategory} onRefresh={fetchAllData} products={products} />;
      case 'transactions':
        return <TransactionsSection transactions={transactions} />;
      case 'plans':
        return <PlansSection plans={subscriptionPlans} vendors={vendors} />;
      case 'routes':
        return <AdminLiveTracking token={token} />;
      case 'settings-vendors':
        return <SettingsSection type="vendor" settings={settings.vendor} onUpdate={(k, v) => updateSetting('vendor', k, v)} onSave={() => handleSaveSettings('vendor')} />;
      case 'settings-drivers':
        return <SettingsSection type="delivery" settings={settings.delivery} onUpdate={(k, v) => updateSetting('delivery', k, v)} onSave={() => handleSaveSettings('delivery')} />;
      case 'settings-general':
        return <SettingsSection type="platform" settings={settings.platform} onUpdate={(k, v) => updateSetting('platform', k, v)} onSave={() => handleSaveSettings('platform')} />;
      case 'settings-layout':
        return <LayoutAppearanceSection token={token} API={API} />;
      default:
        return <StatsSection stats={stats} pendingCount={pendingProducts.length} pendingVendors={vendors.filter(v => !v.is_verified).length} categories={categories} products={products} />;
    }
  };

  return (
    <div className="min-h-screen premium-dashboard-bg dashboard-card-skin text-white flex" data-testid="admin-dashboard">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} premium-panel border-r border-slate-700 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-500" />
              <span className="font-bold">Admin</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const isPending = item.id === 'products' && pendingProducts.length > 0;
            return (
              <button key={item.id} onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
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
        <div className="p-4 border-t border-slate-700">
          <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm">
            <Home className="w-4 h-4" />
            {sidebarOpen && <span>Voir la boutique</span>}
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="premium-panel border-b border-slate-700 p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{SIDEBAR_ITEMS.find(i => i.id === activeSection)?.label || 'Dashboard'}</h1>
              <p className="text-sm text-slate-400">Bienvenue, {user?.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-64 bg-slate-700 border-slate-600 text-white" />
              </div>
              <Button variant="destructive" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Déconnexion
              </Button>
            </div>
          </div>
        </header>
        <div className="p-6 space-y-4">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

// ===== COMPOSANT AUTO-APPROVE TOGGLE =====
const AutoApproveToggle = ({ enabled, onToggle, label }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${enabled ? 'bg-green-500/10 border-green-500/40' : 'bg-slate-700/50 border-slate-600'} transition-all`}>
    <Zap className={`w-5 h-5 ${enabled ? 'text-green-400' : 'text-slate-400'}`} />
    <div className="flex-1">
      <p className={`text-sm font-semibold ${enabled ? 'text-green-300' : 'text-slate-300'}`}>
        Approbation automatique
      </p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
    <button
      onClick={onToggle}
      className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-green-500' : 'bg-slate-600'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

// ===== STATS SECTION avec produits par catégorie =====
const StatsSection = ({ stats, pendingCount, pendingVendors, categories, products }) => {
  // Calcul dynamique du nombre de produits par catégorie
  const productsByCategory = categories.map(cat => ({
    name: cat.name,
    count: products.filter(p => p.category_slug === cat.slug).length,
    slug: cat.slug,
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {pendingCount > 0 && (
        <div className="p-4 bg-amber-500/20 border border-amber-500/50 rounded-xl flex items-center gap-3">
          <Clock className="w-6 h-6 text-amber-400" />
          <div>
            <p className="font-bold text-amber-200">{pendingCount} produit(s) en attente de validation</p>
            <p className="text-sm text-amber-300/70">Des vendeurs attendent votre approbation</p>
          </div>
        </div>
      )}
      {pendingVendors > 0 && (
        <div className="p-4 bg-purple-500/20 border border-purple-500/50 rounded-xl flex items-center gap-3">
          <Store className="w-6 h-6 text-purple-400" />
          <div>
            <p className="font-bold text-purple-200">{pendingVendors} vendeur(s) en attente de vérification</p>
            <p className="text-sm text-purple-300/70">De nouveaux vendeurs attendent votre approbation</p>
          </div>
        </div>
      )}

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

      {/* ===== PRODUITS PAR CATÉGORIE ===== */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="font-bold mb-5 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-teal-400" /> Produits par catégorie
        </h3>
        {productsByCategory.length === 0 ? (
          <p className="text-slate-400 text-sm">Aucune donnée disponible</p>
        ) : (
          <div className="space-y-3">
            {productsByCategory.map((cat) => {
              const maxCount = productsByCategory[0]?.count || 1;
              const pct = maxCount > 0 ? (cat.count / maxCount) * 100 : 0;
              return (
                <div key={cat.slug} className="flex items-center gap-3">
                  <span className="text-sm text-slate-300 w-40 truncate">{cat.name}</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-teal-400 w-8 text-right">{cat.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" /> Aperçu des ventes
          </h3>
          <div className="h-48 flex items-center justify-center text-slate-500">Graphique à venir</div>
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
};

const StatCard = ({ icon: Icon, color, value, label }) => (
  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
    <Icon className={`w-6 h-6 ${color} mb-2`} />
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-sm text-slate-400">{label}</p>
  </div>
);

const VendorsSection = ({ vendors, onToggle, onVerify, onDelete, onMessage, searchTerm, autoApprove, onToggleAutoApprove }) => {
  const filteredVendors = vendors.filter(v =>
    v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedVendors = [...filteredVendors].sort((a, b) => {
    if (!a.is_verified && b.is_verified) return -1;
    if (a.is_verified && !b.is_verified) return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      <AutoApproveToggle
        enabled={autoApprove}
        onToggle={onToggleAutoApprove}
        label={`Active : vérifie automatiquement tous les vendeurs en attente (${sortedVendors.filter(v => !v.is_verified).length} en attente)`}
      />

      {sortedVendors.filter(v => !v.is_verified).length > 0 && (
        <div className="p-4 bg-purple-500/20 border border-purple-500/50 rounded-xl flex items-center gap-3">
          <Clock className="w-6 h-6 text-purple-400" />
          <div>
            <p className="font-bold text-purple-200">{sortedVendors.filter(v => !v.is_verified).length} vendeur(s) en attente de vérification</p>
            <p className="text-sm text-purple-300/70">Vérifiez leurs informations avant de les activer</p>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto touch-scroll-x">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-400">Vendeur</th>
                <th className="text-left p-4 text-sm font-medium text-slate-400">Abonnement</th>
                <th className="text-left p-4 text-sm font-medium text-slate-400">Produits</th>
                <th className="text-left p-4 text-sm font-medium text-slate-400">Vérification</th>
                <th className="text-left p-4 text-sm font-medium text-slate-400">Statut</th>
                <th className="text-left p-4 text-sm font-medium text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedVendors.map((vendor) => (
                <tr key={vendor.id} className={`border-t border-slate-700 hover:bg-slate-700/30 ${!vendor.is_verified ? 'bg-purple-500/5' : ''}`}>
                  <td className="p-4">
                    <p className="font-medium">{vendor.shop_name || vendor.name}</p>
                    <p className="text-sm text-slate-400">{vendor.email}</p>
                    {vendor.phone && <p className="text-xs text-slate-500">{vendor.phone}</p>}
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
                    {vendor.is_verified ? (
                      <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-4 h-4" /> Vérifié</span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 text-xs"><Clock className="w-4 h-4" /> En attente</span>
                    )}
                  </td>
                  <td className="p-4">
                    {vendor.is_active ? (
                      <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle className="w-4 h-4" /> Actif</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 text-sm"><XCircle className="w-4 h-4" /> Inactif</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline" className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10">
                        <Link to={`/vendeur-boutique/${vendor.id}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4 mr-1" /> Voir la boutique
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" className="border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/10" onClick={() => onMessage(vendor)}>
                        Écrire
                      </Button>
                      {!vendor.is_verified && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onVerify(vendor.id)}>
                          <Check className="w-4 h-4 mr-1" /> Vérifier
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => onToggle(vendor.id)} className="text-slate-400 hover:text-white" title={vendor.is_active ? 'Désactiver' : 'Activer'}>
                        {vendor.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(vendor.id, vendor.shop_name || vendor.name)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" data-testid={`delete-vendor-${vendor.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedVendors.length === 0 && <div className="p-12 text-center text-slate-500">Aucun vendeur trouvé</div>}
      </div>
    </div>
  );
};

const DriversSection = ({ drivers, onVerify, onToggle, onDelete, onMessage, autoApprove, onToggleAutoApprove }) => (
  <div className="space-y-4">
    <AutoApproveToggle
      enabled={autoApprove}
      onToggle={onToggleAutoApprove}
      label={`Active : vérifie automatiquement tous les livreurs en attente (${drivers.filter(d => !d.is_verified).length} en attente)`}
    />

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
                <td className="p-4 capitalize">{driver.vehicle_type}</td>
                <td className="p-4">{driver.city}</td>
                <td className="p-4">
                  {driver.license_image ? (
                    <a href={`${API_BASE}${driver.license_image}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-sm">Voir le permis</a>
                  ) : (
                    <span className="text-slate-500 text-sm">Non uploadé</span>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    {driver.is_verified ? (
                      <span className="text-green-400 text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Vérifié</span>
                    ) : (
                      <span className="text-amber-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</span>
                    )}
                    {driver.is_active ? <span className="text-green-400 text-xs">Actif</span> : <span className="text-red-400 text-xs">Inactif</span>}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {!driver.is_verified && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onVerify(driver.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => onToggle(driver.id)} className="text-slate-400" title={driver.is_active ? 'Désactiver' : 'Activer'}>
                      {driver.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(driver.id, driver.name)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" data-testid={`delete-driver-${driver.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/10" onClick={() => onMessage(driver)}>
                      Écrire
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

const ProductsSection = ({ products, pendingProducts, filter, setFilter, onApprove, onReject, onToggleFeatured, onDelete, autoApprove, onToggleAutoApprove }) => {
  const featuredCount = products.filter(p => p.is_featured).length;
  const displayProducts = filter === 'pending' ? pendingProducts
    : filter === 'featured' ? products.filter(p => p.is_featured)
    : filter === 'approved' ? products.filter(p => p.status === 'approved')
    : filter === 'rejected' ? products.filter(p => p.status === 'rejected')
    : products;

  return (
    <div className="space-y-4">
      <AutoApproveToggle
        enabled={autoApprove}
        onToggle={onToggleAutoApprove}
        label={`Active : approuve automatiquement tous les produits en attente (${pendingProducts.length} en attente)`}
      />

      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
        <Star className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-amber-300">
          Les produits <strong>en vedette</strong> apparaissent en priorité sur la page d'accueil.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: `Tous (${products.length})` },
          { key: 'pending', label: `En attente (${pendingProducts.length})` },
          { key: 'approved', label: `Approuvés (${products.filter(p => p.status === 'approved').length})` },
          { key: 'featured', label: `? En vedette (${featuredCount})` },
          { key: 'rejected', label: `Rejetés (${products.filter(p => p.status === 'rejected').length})` },
        ].map(({ key, label }) => (
          <Button key={key} variant={filter === key ? 'default' : 'outline'} size="sm" onClick={() => setFilter(key)}
            className={filter === key ? (key === 'featured' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-700') : 'border-slate-600 text-slate-400 hover:text-white'}>
            {label}
          </Button>
        ))}
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        {displayProducts.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Aucun produit</h3>
            <p className="text-slate-400">
              {filter === 'pending' ? 'Aucun produit en attente' : filter === 'featured' ? 'Aucun produit en vedette' : 'Aucun produit'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {displayProducts.map((product) => (
              <div key={product.id} className={`p-4 flex gap-4 items-center transition-colors ${product.is_featured ? 'bg-amber-500/5 border-l-2 border-amber-500' : ''}`}>
                <div className="relative flex-shrink-0">
                  <img src={product.images?.[0] || 'https://via.placeholder.com/80'} alt={product.name} className={`w-16 h-16 rounded-lg object-cover ${product.is_featured ? 'ring-2 ring-amber-400' : ''}`} />
                  {product.is_featured && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
                      <Star className="w-3.5 h-3.5 text-white fill-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium truncate">{product.name}</h4>
                    {product.is_featured && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full font-semibold">? En vedette</span>}
                  </div>
                  <p className="text-sm text-slate-400 truncate">{product.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                    {product.promo_price_fcfa && product.promo_price_fcfa < product.price_fcfa ? (
                      <>
                        <span className="line-through">{formatPrice(product.price_fcfa)} FCFA</span>
                        <span className="text-green-400 font-bold">{formatPrice(product.promo_price_fcfa)} FCFA</span>
                      </>
                    ) : (
                      <span className="text-amber-400 font-bold">{formatPrice(product.price_fcfa)} FCFA</span>
                    )}
                    <span>{product.category_slug}</span>
                    <span>
                      Par : {product.shop_slug ? (
                        <Link
                          to={`/boutique/${product.shop_slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {product.revendeur_name || product.shop_name || product.seller_name || product.seller?.name || 'Boutique revendeur'}
                        </Link>
                      ) : product.seller_id ? (
                        <Link
                          to={`/vendeur-boutique/${product.seller_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {product.seller_name || product.seller?.name || 'Boutique vendeur'}
                        </Link>
                      ) : (
                        product.seller_name || product.revendeur_name || product.shop_name || product.seller?.name || 'Inconnu'
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                  <span className={`px-2 py-1 rounded text-xs ${product.status === 'approved' ? 'bg-green-500/20 text-green-400' : product.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {product.status}
                  </span>
                  {product.status === 'approved' && (
                    <Button size="sm" variant={product.is_featured ? 'default' : 'outline'}
                      className={product.is_featured ? 'bg-amber-500 hover:bg-amber-600 text-white gap-1' : 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10 gap-1'}
                      onClick={() => onToggleFeatured(product.id)}>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-xs">{product.is_featured ? 'Retirer' : 'Vedette'}</span>
                    </Button>
                  )}
                  {product.status === 'pending' && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => onApprove(product.id)}><Check className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={() => onReject(product.id)}><X className="w-4 h-4" /></Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => onDelete(product.id, product.name)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" data-testid={`delete-product-${product.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
                <span className={`px-2 py-1 rounded text-xs ${tx.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
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

const PlansSection = ({ plans, vendors }) => {
  const planCounts = plans.reduce((acc, plan) => {
    acc[plan.id] = vendors.filter(v => v.subscription_plan === plan.id).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className={`bg-slate-800 rounded-xl border p-6 ${plan.id === 'entreprise' ? 'border-purple-500/50' : plan.id === 'commercant' ? 'border-amber-500/50' : plan.id === 'artisan' ? 'border-blue-500/50' : 'border-slate-700'}`}>
            <div className="text-3xl mb-2">{plan.emoji}</div>
            <h3 className="font-bold text-lg">{plan.name}</h3>
            <div className="mt-2">
              <p className="text-2xl font-bold">{plan.price_fcfa === 0 ? 'Gratuit' : `${formatPrice(plan.price_fcfa)} FCFA`}</p>
              {plan.price_usd > 0 && <p className="text-xs text-slate-400">~${plan.price_usd}/mois</p>}
            </div>
            <div className="my-4 py-3 border-t border-b border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Vendeurs actifs</span>
                <span className="font-bold">{planCounts[plan.id] || 0}</span>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /><span>{plan.max_products === -1 ? 'Produits illimités' : `${plan.max_products} produits max`}</span></li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /><span>Commission de {plan.commission_percent}%</span></li>
              {plan.badge && <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /><span>Badge {plan.badge}</span></li>}
              {plan.priority_support && <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /><span>Support prioritaire</span></li>}
              {plan.featured_products > 0 && <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /><span>{plan.featured_products} produits en vedette</span></li>}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Crown className="w-5 h-5 text-amber-400" />Répartition des abonnements</h3>
        <div className="grid md:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const count = planCounts[plan.id] || 0;
            const percentage = vendors.length > 0 ? ((count / vendors.length) * 100).toFixed(1) : 0;
            return (
              <div key={plan.id} className="p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2"><span className="text-2xl">{plan.emoji}</span><span className="text-lg font-bold">{count}</span></div>
                <p className="text-sm text-slate-400">{plan.name}</p>
                <div className="mt-2 h-2 bg-slate-600 rounded-full overflow-hidden">
                  <div className={`h-full ${plan.id === 'entreprise' ? 'bg-purple-500' : plan.id === 'commercant' ? 'bg-amber-500' : plan.id === 'artisan' ? 'bg-blue-500' : 'bg-slate-400'}`} style={{ width: `${percentage}%` }} />
                </div>
                <p className="text-xs text-slate-500 mt-1">{percentage}%</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-400" />Potentiel de revenus mensuels</h3>
        <div className="overflow-x-auto touch-scroll-x">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-slate-400">
                <th className="p-3">Plan</th><th className="p-3">Prix/mois</th><th className="p-3">Vendeurs</th><th className="p-3">Revenu potentiel</th>
              </tr>
            </thead>
            <tbody>
              {plans.filter(p => p.price_fcfa > 0).map((plan) => {
                const count = planCounts[plan.id] || 0;
                const revenue = count * plan.price_fcfa;
                return (
                  <tr key={plan.id} className="border-t border-slate-700">
                    <td className="p-3"><span className="mr-2">{plan.emoji}</span>{plan.name}</td>
                    <td className="p-3">{formatPrice(plan.price_fcfa)} FCFA</td>
                    <td className="p-3 font-medium">{count}</td>
                    <td className="p-3 font-bold text-green-400">{formatPrice(revenue)} FCFA</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-slate-600 font-bold">
                <td className="p-3" colSpan={3}>Total</td>
                <td className="p-3 text-green-400">
                  {formatPrice(plans.filter(p => p.price_fcfa > 0).reduce((sum, plan) => sum + ((planCounts[plan.id] || 0) * plan.price_fcfa), 0))} FCFA
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

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
      default: return null;
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
        <Settings className="w-5 h-5" />
        {type === 'vendor' ? 'Paramètres Vendeurs' : type === 'delivery' ? 'Paramètres Livreurs' : 'Paramètres Généraux'}
      </h3>
      <div className="space-y-4">{renderFields()}</div>
      <div className="mt-6 pt-6 border-t border-slate-700">
        <Button onClick={onSave} className="bg-green-600 hover:bg-green-700"><Check className="w-4 h-4 mr-2" /> Sauvegarder</Button>
      </div>
    </div>
  );
};

const SettingField = ({ label, value, onChange, type = 'text' }) => (
  <div className="flex items-center justify-between gap-4">
    <label className="text-sm text-slate-400">{label}</label>
    <Input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-48 bg-slate-700 border-slate-600" />
  </div>
);

const SettingToggle = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between gap-4">
    <label className="text-sm text-slate-400">{label}</label>
    <button onClick={() => onChange(!value)} className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-green-500' : 'bg-slate-600'}`}>
      <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${value ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

const RevendeursSection = ({ revendeurs, stats, transactions, token, onRefresh, onDelete, onMessage, autoApprove, onToggleAutoApprove }) => {
  const [loading, setLoading] = useState(false);

  const handleToggleRevendeur = async (revendeurId) => {
    setLoading(true);
    try {
      await axios.put(`${API}/admin/revendeurs/${revendeurId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Statut mis à jour');
      onRefresh();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AutoApproveToggle
        enabled={autoApprove}
        onToggle={onToggleAutoApprove}
        label={`Active : active automatiquement tous les revendeurs inactifs (${revendeurs.filter(r => !r.is_active).length} inactifs)`}
      />

      <h2 className="text-xl font-bold flex items-center gap-2"><Package className="w-6 h-6 text-indigo-400" />Gestion Revente</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700"><p className="text-slate-400 text-sm">Revendeurs actifs</p><p className="text-2xl font-bold text-indigo-400">{stats?.active_revendeurs || 0}</p></div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700"><p className="text-slate-400 text-sm">Produits dropshippés</p><p className="text-2xl font-bold text-purple-400">{stats?.total_products || 0}</p></div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700"><p className="text-slate-400 text-sm">Revenus Admin</p><p className="text-2xl font-bold text-green-400">{formatPrice(stats?.admin_earnings_fcfa || 0)} F</p></div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700"><p className="text-slate-400 text-sm">Marges totales</p><p className="text-2xl font-bold text-amber-400">{formatPrice(stats?.total_margins_fcfa || 0)} F</p></div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="p-4 border-b border-slate-700"><h3 className="font-semibold">Liste des Revendeurs ({revendeurs.length})</h3></div>
        <div className="overflow-x-auto touch-scroll-x">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 text-left text-sm text-slate-400">
                <th className="p-4">Revendeur</th><th className="p-4">Boutique</th><th className="p-4">Produits</th><th className="p-4">Commandes</th><th className="p-4">Gains</th><th className="p-4">Statut</th><th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {revendeurs.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">Aucun revendeur inscrit</td></tr>
              ) : (
                revendeurs.map((d) => (
                  <tr key={d.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="p-4"><div><p className="font-medium">{d.name}</p><p className="text-sm text-slate-400">{d.email}</p></div></td>
                    <td className="p-4"><span className="text-indigo-400">{d.shop_name}</span></td>
                    <td className="p-4">{d.product_count || 0}</td>
                    <td className="p-4">{d.order_count || 0}</td>
                    <td className="p-4 text-green-400">{formatPrice(d.total_earnings || 0)} F</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${d.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{d.is_active ? 'Actif' : 'Inactif'}</span></td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {d.shop_slug && (
                          <Button asChild size="sm" variant="outline" className="border-blue-500/40 text-blue-300 hover:bg-blue-500/10">
                            <Link to={`/boutique/${d.shop_slug}`} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4 mr-1" /> Voir la boutique
                            </Link>
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/10" onClick={() => onMessage(d)}>
                          Écrire
                        </Button>
                        <Button size="sm" variant={d.is_active ? 'destructive' : 'default'} onClick={() => handleToggleRevendeur(d.id)} disabled={loading}>
                          {d.is_active ? 'Désactiver' : 'Activer'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onDelete(d.id, d.shop_name || d.name)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" data-testid={`delete-revendeur-${d.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700">
        <div className="p-4 border-b border-slate-700"><h3 className="font-semibold">Transactions Revente récentes</h3></div>
        <div className="p-4 space-y-3">
          {transactions.length === 0 ? (
            <p className="text-slate-400 text-center py-4">Aucune transaction</p>
          ) : (
            transactions.slice(0, 10).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div><p className="font-medium">{t.product_name}</p><p className="text-sm text-slate-400">{t.revendeur_name} · {t.order_number}</p></div>
                <div className="text-right"><p className="text-green-400 font-medium">+{formatPrice(t.admin_share || 0)} F</p><p className="text-xs text-slate-400">sur {formatPrice(t.total_margin || 0)} F de marge</p></div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const UsersSection = ({ users, roleFilter, setRoleFilter, search, setSearch, onDelete, onToggleActive }) => {
  const roleLabels = { all: 'Tous', customer: 'Clients', vendor: 'Vendeurs', driver: 'Livreurs', revendeur: 'Revendeurs' };
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400';
      case 'vendor': return 'bg-purple-500/20 text-purple-400';
      case 'driver': return 'bg-blue-500/20 text-blue-400';
      case 'revendeur': return 'bg-indigo-500/20 text-indigo-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2"><Users className="w-6 h-6 text-rose-400" />Gestion des Utilisateurs ({users.length})</h2>
      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap">
          {Object.entries(roleLabels).map(([key, label]) => (
            <Button key={key} size="sm" variant={roleFilter === key ? 'default' : 'outline'} onClick={() => setRoleFilter(key)} className={roleFilter === key ? 'bg-rose-600 hover:bg-rose-700' : ''}>{label}</Button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-slate-800 border-slate-700" />
        </div>
      </div>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto touch-scroll-x">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 text-left text-sm text-slate-400">
                <th className="p-4">Utilisateur</th><th className="p-4">Rôle</th><th className="p-4">Téléphone</th><th className="p-4">Produits</th><th className="p-4">Statut</th><th className="p-4">Inscrit le</th><th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">Aucun utilisateur trouvé</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white font-bold">{u.name?.[0]?.toUpperCase() || '?'}</div>
                        <div><p className="font-medium">{u.name}</p><p className="text-sm text-slate-400">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${getRoleColor(u.role)}`}>{roleLabels[u.role] || u.role}</span></td>
                    <td className="p-4 text-slate-300">{u.phone || '-'}</td>
                    <td className="p-4">{u.product_count || 0}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{u.is_active ? 'Actif' : 'Désactivé'}</span></td>
                    <td className="p-4 text-slate-400 text-sm">{u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '-'}</td>
                    <td className="p-4">
                      {u.role !== 'admin' && (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => onToggleActive(u.id, u.name)} className="text-xs">{u.is_active ? <Ban className="w-3 h-3" /> : <Check className="w-3 h-3" />}</Button>
                          <Button size="sm" variant="destructive" onClick={() => onDelete(u.id, u.name)} className="text-xs"><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
// ============================================================
// ============================================================
// PREDEFINED FIELD TEMPLATES for category custom fields
// ============================================================
const PREDEFINED_FIELD_TEMPLATES = [
  {
    key: 'tailles',
    label: 'Tailles',
    icon: Ruler,
    color: 'text-blue-400',
    field_type: 'multiselect',
    options: [
      { label: 'XS', value: 'xs' }, { label: 'S', value: 's' }, { label: 'M', value: 'm' },
      { label: 'L', value: 'l' }, { label: 'XL', value: 'xl' }, { label: 'XXL', value: 'xxl' },
      { label: '3XL', value: '3xl' }, { label: '4XL', value: '4xl' },
    ],
    placeholder: 'Sélectionner les tailles disponibles',
  },
  {
    key: 'pointures',
    label: 'Pointures',
    icon: Footprints,
    color: 'text-orange-400',
    field_type: 'multiselect',
    options: Array.from({ length: 16 }, (_, i) => ({ label: String(35 + i), value: String(35 + i) })),
    placeholder: 'Sélectionner les pointures disponibles',
  },
  {
    key: 'couleurs',
    label: 'Couleurs',
    icon: Palette,
    color: 'text-pink-400',
    field_type: 'multiselect',
    options: [
      { label: 'Noir', value: 'noir' }, { label: 'Blanc', value: 'blanc' }, { label: 'Rouge', value: 'rouge' },
      { label: 'Bleu', value: 'bleu' }, { label: 'Vert', value: 'vert' }, { label: 'Jaune', value: 'jaune' },
      { label: 'Rose', value: 'rose' }, { label: 'Orange', value: 'orange' }, { label: 'Violet', value: 'violet' },
      { label: 'Gris', value: 'gris' }, { label: 'Marron', value: 'marron' }, { label: 'Beige', value: 'beige' },
      { label: 'Doré', value: 'dore' }, { label: 'Argenté', value: 'argente' }, { label: 'Multicolore', value: 'multicolore' },
    ],
    placeholder: 'Sélectionner les couleurs disponibles',
  },
  {
    key: 'matiere',
    label: 'Matière',
    icon: Shirt,
    color: 'text-emerald-400',
    field_type: 'select',
    options: [
      { label: 'Coton', value: 'coton' }, { label: 'Polyester', value: 'polyester' }, { label: 'Soie', value: 'soie' },
      { label: 'Lin', value: 'lin' }, { label: 'Laine', value: 'laine' }, { label: 'Cuir', value: 'cuir' },
      { label: 'Cuir synthétique', value: 'cuir-synthetique' }, { label: 'Jean/Denim', value: 'denim' },
      { label: 'Satin', value: 'satin' }, { label: 'Velours', value: 'velours' }, { label: 'Wax', value: 'wax' },
      { label: 'Bazin', value: 'bazin' }, { label: 'Kente', value: 'kente' }, { label: 'Autre', value: 'autre' },
    ],
    placeholder: 'Sélectionner la matière',
  },
  {
    key: 'genre',
    label: 'Genre',
    icon: Users,
    color: 'text-violet-400',
    field_type: 'select',
    options: [
      { label: 'Homme', value: 'homme' }, { label: 'Femme', value: 'femme' },
      { label: 'Enfant', value: 'enfant' }, { label: 'Mixte / Unisexe', value: 'mixte' },
    ],
    placeholder: 'Sélectionner le genre',
  },
  {
    key: 'poids',
    label: 'Poids (kg)',
    icon: Weight,
    color: 'text-amber-400',
    field_type: 'number',
    options: [],
    placeholder: 'Ex: 0.5',
  },
  {
    key: 'dimensions',
    label: 'Dimensions (L x l x H)',
    icon: Box,
    color: 'text-cyan-400',
    field_type: 'text',
    options: [],
    placeholder: 'Ex: 30 x 20 x 10 cm',
  },
  {
    key: 'marque',
    label: 'Marque',
    icon: Tag,
    color: 'text-rose-400',
    field_type: 'text',
    options: [],
    placeholder: 'Ex: Nike, Adidas...',
  },
  {
    key: 'capacite',
    label: 'Capacité / Volume',
    icon: Box,
    color: 'text-teal-400',
    field_type: 'text',
    options: [],
    placeholder: 'Ex: 500ml, 1L, 32GB...',
  },
];

// ============================================================
// CustomFieldsBuilder - Premium UI component
// ============================================================
const CustomFieldsBuilder = ({ fields, onChange, compact = false }) => {
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customFieldName, setCustomFieldName] = useState('');
  const [customFieldType, setCustomFieldType] = useState('text');
  const [customFieldOptions, setCustomFieldOptions] = useState('');
  const [expandedField, setExpandedField] = useState(null);

  const activeKeys = new Set((fields || []).map(f => f.key));

  const togglePredefined = (template) => {
    const current = fields || [];
    if (activeKeys.has(template.key)) {
      onChange(current.filter(f => f.key !== template.key));
    } else {
      onChange([...current, {
        key: template.key,
        label: template.label,
        field_type: template.field_type,
        options: template.options,
        required: false,
        placeholder: template.placeholder || '',
      }]);
    }
  };

  const addCustomField = () => {
    if (!customFieldName.trim()) return;
    const key = customFieldName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (activeKeys.has(key)) { toast.error('Ce champ existe déjà'); return; }

    const options = (customFieldType === 'select' || customFieldType === 'multiselect')
      ? customFieldOptions.split(',').map(o => o.trim()).filter(Boolean).map(o => ({ label: o, value: o.toLowerCase().replace(/\s+/g, '-') }))
      : [];

    onChange([...(fields || []), {
      key,
      label: customFieldName.trim(),
      field_type: customFieldType,
      options,
      required: false,
      placeholder: '',
    }]);
    setCustomFieldName('');
    setCustomFieldType('text');
    setCustomFieldOptions('');
    setShowAddCustom(false);
  };

  const removeField = (key) => {
    onChange((fields || []).filter(f => f.key !== key));
  };

  const toggleRequired = (key) => {
    onChange((fields || []).map(f => f.key === key ? { ...f, required: !f.required } : f));
  };

  const updateFieldOptions = (key, newOptions) => {
    onChange((fields || []).map(f => f.key === key ? { ...f, options: newOptions } : f));
  };

  const addOptionToField = (key, optionLabel) => {
    if (!optionLabel.trim()) return;
    const current = (fields || []).find(f => f.key === key);
    if (!current) return;
    const newOpt = { label: optionLabel.trim(), value: optionLabel.trim().toLowerCase().replace(/\s+/g, '-') };
    updateFieldOptions(key, [...(current.options || []), newOpt]);
  };

  const removeOptionFromField = (key, optionValue) => {
    const current = (fields || []).find(f => f.key === key);
    if (!current) return;
    updateFieldOptions(key, (current.options || []).filter(o => o.value !== optionValue));
  };

  return (
    <div className={`mt-${compact ? '3' : '6'} space-y-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Settings className="w-5 h-5 text-teal-400" />
        <h4 className="font-semibold text-sm text-slate-200">Champs personnalisés</h4>
        <span className="text-xs text-slate-500 ml-auto">{(fields || []).length} champ(s) activé(s)</span>
      </div>

      {/* Predefined field templates as toggleable cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {PREDEFINED_FIELD_TEMPLATES.map((tpl) => {
          const isActive = activeKeys.has(tpl.key);
          const Icon = tpl.icon;
          return (
            <button
              key={tpl.key}
              type="button"
              onClick={() => togglePredefined(tpl)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all text-sm ${
                isActive
                  ? 'bg-teal-900/50 border-teal-500/60 text-teal-300 shadow-lg shadow-teal-500/10'
                  : 'bg-slate-800/50 border-slate-600/40 text-slate-400 hover:border-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-teal-400' : tpl.color}`} />
              <span className="truncate">{tpl.label}</span>
              {isActive && <Check className="w-3.5 h-3.5 ml-auto text-teal-400 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Active fields detail list */}
      {(fields || []).length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Champs activés</p>
          {(fields || []).map((field) => {
            const isExpanded = expandedField === field.key;
            const predefined = PREDEFINED_FIELD_TEMPLATES.find(t => t.key === field.key);
            const Icon = predefined?.icon || Tag;
            return (
              <div key={field.key} className="bg-slate-900/60 rounded-lg border border-slate-700/50 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${predefined?.color || 'text-slate-400'}`} />
                  <span className="font-medium text-sm text-slate-200 flex-1">{field.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-400">{field.field_type}</span>
                  <button
                    type="button"
                    onClick={() => toggleRequired(field.key)}
                    className={`text-xs px-2 py-0.5 rounded transition-colors ${field.required ? 'bg-red-900/50 text-red-400 border border-red-500/30' : 'bg-slate-700/50 text-slate-500 hover:text-slate-300'}`}
                  >
                    {field.required ? 'Requis' : 'Optionnel'}
                  </button>
                  {(field.field_type === 'select' || field.field_type === 'multiselect') && (
                    <button type="button" onClick={() => setExpandedField(isExpanded ? null : field.key)} className="text-slate-400 hover:text-slate-200">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                  <button type="button" onClick={() => removeField(field.key)} className="text-red-400/60 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Expandable options editor */}
                {isExpanded && (field.field_type === 'select' || field.field_type === 'multiselect') && (
                  <div className="px-4 pb-3 border-t border-slate-700/30 pt-3">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(field.options || []).map((opt) => (
                        <span key={opt.value} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-300">
                          {opt.label}
                          <button type="button" onClick={() => removeOptionFromField(field.key, opt.value)} className="text-red-400/50 hover:text-red-400">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ajouter une option..."
                        className="h-8 text-xs bg-slate-800"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addOptionToField(field.key, e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add custom field button & form */}
      {!showAddCustom ? (
        <button
          type="button"
          onClick={() => setShowAddCustom(true)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-teal-400 transition-colors mt-2"
        >
          <Plus className="w-4 h-4" /> Ajouter un champ personnalisé
        </button>
      ) : (
        <div className="bg-slate-900/60 rounded-lg border border-teal-500/20 p-4 space-y-3">
          <h5 className="text-sm font-medium text-teal-400">Nouveau champ personnalisé</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              value={customFieldName}
              onChange={(e) => setCustomFieldName(e.target.value)}
              placeholder="Nom du champ"
              className="bg-slate-800 text-sm"
            />
            <select
              value={customFieldType}
              onChange={(e) => setCustomFieldType(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-md p-2 text-white text-sm"
            >
              <option value="text">Texte libre</option>
              <option value="number">Nombre</option>
              <option value="select">Liste déroulante</option>
              <option value="multiselect">Sélection multiple</option>
            </select>
            {(customFieldType === 'select' || customFieldType === 'multiselect') && (
              <Input
                value={customFieldOptions}
                onChange={(e) => setCustomFieldOptions(e.target.value)}
                placeholder="Options (séparées par des virgules)"
                className="bg-slate-800 text-sm"
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addCustomField} className="bg-teal-600 hover:bg-teal-700 text-sm">
              Ajouter
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddCustom(false)} className="text-sm">
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};


const CategoriesSection = ({ 
  token, 
  categories, 
  editingCategory, 
  setEditingCategory, 
  newCategory, 
  setNewCategory, 
  showNewForm, 
  setShowNewForm, 
  onCreate, 
  onUpdate, 
  onDelete, 
  onToggle,
  onRefresh
}) => {
  const [showSubForm, setShowSubForm] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);

  const [newSubCategory, setNewSubCategory] = useState({ 
    name: '', 
    description: '', 
    parent_slug: '', 
    banner_images: [],
    custom_fields: [],
  });

  const parentCategories = categories.filter(c => !c.parent_slug);
  const getSubCategories = (parentSlug) => categories.filter(c => c.parent_slug === parentSlug);

  const handleCreateSubCategory = async () => {
    if (!newSubCategory.name || !newSubCategory.parent_slug) {
      toast.error('Le nom et la catégorie parente sont obligatoires');
      return;
    }

    try {
      const parent = parentCategories.find(p => p.slug === newSubCategory.parent_slug);
      const baseSlug = newSubCategory.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const finalSlug = parent ? `${parent.slug}-${baseSlug}` : baseSlug;

      const payload = {
        name: newSubCategory.name,
        slug: finalSlug,
        description: newSubCategory.description || '',
        banner_images: newSubCategory.banner_images || [],
        parent_slug: newSubCategory.parent_slug,
        icon: 'Package',
        custom_fields: newSubCategory.custom_fields || [],
      };

      await axios.post(`${API}/admin/categories`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Sous-catégorie créée avec succès !');
      
      setNewSubCategory({ name: '', description: '', parent_slug: '', banner_images: [], custom_fields: [] });
      setShowSubForm(false);
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error(error.response?.data);
      toast.error(error.response?.data?.detail || 'Erreur lors de la création de la sous-catégorie');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Cog className="w-6 h-6 text-teal-400" />
          Catégories & Sous-catégories ({categories.length})
        </h2>
        <div className="flex gap-3">
          <Button onClick={() => { setShowSubForm(true); setShowNewForm(false); }} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" /> Nouvelle sous-catégorie
          </Button>
          <Button onClick={() => { setShowNewForm(true); setShowSubForm(false); }} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" /> Nouvelle catégorie
          </Button>
        </div>
      </div>

      {/* Formulaire Catégorie principale */}
      {showNewForm && (
        <div className="bg-slate-800 rounded-xl border border-teal-500/30 p-6">
          <h3 className="font-semibold mb-4 text-teal-400">Créer une Catégorie principale</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Nom de la catégorie *</label>
              <Input 
                value={newCategory.name} 
                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})} 
                placeholder="Ex: Mode" 
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Description</label>
              <Input 
                value={newCategory.description} 
                onChange={(e) => setNewCategory({...newCategory, description: e.target.value})} 
              />
            </div>
          </div>

          <div className="mt-5">
            <ImageUpload 
              images={newCategory.banner_images || []}
              onChange={(images) => setNewCategory({ ...newCategory, banner_images: images.slice(0, 3) })}
              maxImages={3}
              token={token}
              label="3 photos de mise en avant (bannière)"
              hint="Ces images défileront en haut de la catégorie"
            />
          </div>

          {/* Custom Fields Builder */}
          <CustomFieldsBuilder
            fields={newCategory.custom_fields || []}
            onChange={(fields) => setNewCategory({ ...newCategory, custom_fields: fields })}
          />

          <div className="flex gap-3 mt-6">
            <Button onClick={onCreate} className="bg-teal-600 hover:bg-teal-700">
              Créer la catégorie
            </Button>
            <Button variant="outline" onClick={() => setShowNewForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {/* Formulaire Sous-catégorie */}
      {showSubForm && (
        <div className="bg-slate-800 rounded-xl border border-purple-500/30 p-6">
          <h3 className="font-semibold mb-4 text-purple-400">Créer une Sous-catégorie</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Catégorie parente *</label>
              <select 
                value={newSubCategory.parent_slug} 
                onChange={(e) => setNewSubCategory({...newSubCategory, parent_slug: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white"
              >
                <option value="">Sélectionner une catégorie</option>
                {parentCategories.map(cat => (
                  <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Nom de la sous-catégorie *</label>
              <Input 
                value={newSubCategory.name} 
                onChange={(e) => setNewSubCategory({...newSubCategory, name: e.target.value})} 
                placeholder="Ex: Robes Traditionnelles" 
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Description</label>
              <Input 
                value={newSubCategory.description} 
                onChange={(e) => setNewSubCategory({...newSubCategory, description: e.target.value})} 
              />
            </div>
          </div>

          <div className="mt-5">
            <ImageUpload 
              images={newSubCategory.banner_images || []}
              onChange={(images) => setNewSubCategory({ ...newSubCategory, banner_images: images.slice(0, 3) })}
              maxImages={3}
              token={token}
              label="3 photos de mise en avant (bannière)"
              hint="Ces images défileront en haut de la sous-catégorie"
            />
          </div>

          {/* Custom Fields Builder for sub-category */}
          <CustomFieldsBuilder
            fields={newSubCategory.custom_fields || []}
            onChange={(fields) => setNewSubCategory({ ...newSubCategory, custom_fields: fields })}
          />

          <div className="flex gap-3 mt-6">
            <Button onClick={handleCreateSubCategory} className="bg-purple-600 hover:bg-purple-700">
              Créer la sous-catégorie
            </Button>
            <Button variant="outline" onClick={() => setShowSubForm(false)}>Annuler</Button>
          </div>
        </div>
      )}

      {/* Formulaire d'édition */}
      {editingCategory && (
        <div className="bg-slate-800 rounded-xl border border-amber-500/30 p-6">
          <h3 className="font-semibold mb-4 text-amber-400">
            {editingCategory.parent_slug ? 'Modifier la Sous-catégorie' : 'Modifier la Catégorie'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Nom *</label>
              <Input 
                value={editingCategory.name || ''} 
                onChange={(e) => setEditingCategory({...editingCategory, name: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Description</label>
              <Input 
                value={editingCategory.description || ''} 
                onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})} 
              />
            </div>
            {editingCategory.parent_slug && (
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Catégorie parente</label>
                <select 
                  value={editingCategory.parent_slug || ''} 
                  onChange={(e) => setEditingCategory({...editingCategory, parent_slug: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {parentCategories.map(cat => (
                    <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-5">
            <ImageUpload 
              images={editingCategory.banner_images || []}
              onChange={(images) => setEditingCategory({ ...editingCategory, banner_images: images.slice(0, 3) })}
              maxImages={3}
              token={token}
              label="3 photos de mise en avant (bannière)"
              hint="Ces images défileront en haut"
            />
          </div>

          {/* Custom Fields Builder for editing */}
          <CustomFieldsBuilder
            fields={editingCategory.custom_fields || []}
            onChange={(fields) => setEditingCategory({ ...editingCategory, custom_fields: fields })}
          />

          <div className="flex gap-3 mt-6">
            <Button onClick={() => onUpdate(editingCategory.id)} className="bg-amber-600 hover:bg-amber-700">
              Mettre à jour
            </Button>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>Annuler</Button>
          </div>
        </div>
      )}

      {/* Liste des catégories */}
      <div className="space-y-4">
        {parentCategories.map((cat) => {
          const subCats = getSubCategories(cat.slug);
          const isExpanded = expandedCategory === cat.id;
          const fieldCount = (cat.custom_fields || []).length;
          return (
            <div key={cat.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div 
                className="p-5 flex items-center justify-between bg-slate-700/40 cursor-pointer hover:bg-slate-700/60 transition-colors"
                onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
              >
                <div className="flex items-center gap-3">
                  <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  <div>
                    <h3 className="font-bold text-lg">{cat.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span>{subCats.length} sous-catégorie{subCats.length > 1 ? 's' : ''}</span>
                      {fieldCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-900/30 text-teal-400 text-xs">
                          <Settings className="w-3 h-3" /> {fieldCount} champ{fieldCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {(cat.banner_images || []).slice(0,3).map((img,i) => (
                    <img key={i} src={img} className="w-12 h-12 object-cover rounded" alt="" />
                  ))}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" onClick={() => setEditingCategory({...cat, custom_fields: cat.custom_fields || []})}><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => onToggle(cat.id)}>
                      {cat.is_active !== false ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(cat.id, cat.name)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>

              {/* Sous-catégories */}
              {isExpanded && (
                <div className="p-4 pl-8 bg-slate-900/30">
                  {/* Show parent custom fields summary */}
                  {fieldCount > 0 && (
                    <div className="mb-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Champs de la catégorie</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(cat.custom_fields || []).map(f => {
                          const tpl = PREDEFINED_FIELD_TEMPLATES.find(t => t.key === f.key);
                          const Icon = tpl?.icon || Tag;
                          return (
                            <span key={f.key} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700/60 text-xs text-slate-300">
                              <Icon className={`w-3 h-3 ${tpl?.color || 'text-slate-400'}`} /> {f.label}
                              {f.required && <span className="text-red-400">*</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {subCats.length > 0 ? subCats.map(sub => {
                    const subFieldCount = (sub.custom_fields || []).length;
                    return (
                      <div key={sub.id} className="flex justify-between items-center p-3 hover:bg-slate-700/50 rounded-lg mb-1">
                        <div className="flex items-center gap-3">
                          <span className="text-purple-300">{sub.name}</span>
                          {subFieldCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-900/30 text-purple-400 text-xs">
                              <Settings className="w-3 h-3" /> {subFieldCount} champ{subFieldCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditingCategory({...sub, custom_fields: sub.custom_fields || []})}><Edit className="w-4 h-4" /></Button>
                          <Button size="sm" variant="outline" onClick={() => onToggle(sub.id)}>
                            {sub.is_active !== false ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => onDelete(sub.id, sub.name)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-sm text-slate-500 italic py-2">Aucune sous-catégorie</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminMessagesSection = ({ conversations, onRefresh, onOpenConversation }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Messages ({conversations.length})</h2>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
        </Button>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto touch-scroll-x">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-slate-400">Conversation</th>
                <th className="text-left p-4 text-sm font-medium text-slate-400">Dernier message</th>
                <th className="text-left p-4 text-sm font-medium text-slate-400">Date</th>
                <th className="text-left p-4 text-sm font-medium text-slate-400">Non lus</th>
                <th className="text-left p-4 text-sm font-medium text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((conv) => (
                <tr key={conv.id} className="border-t border-slate-700 hover:bg-slate-700/20">
                  <td className="p-4">
                    <p className="font-medium">{conv.seller_name || 'Utilisateur'}</p>
                    <p className="text-xs text-slate-400">{conv.product_name || 'Message direct'}</p>
                  </td>
                  <td className="p-4 text-sm text-slate-300">{conv.last_message || 'Aucun message'}</td>
                  <td className="p-4 text-sm text-slate-400">
                    {conv.updated_at ? new Date(conv.updated_at).toLocaleString('fr-FR') : '-'}
                  </td>
                  <td className="p-4">
                    {(conv.unread_customer || 0) > 0 ? (
                      <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                        {conv.unread_customer}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">0</span>
                    )}
                  </td>
                  <td className="p-4">
                    <Button size="sm" onClick={() => onOpenConversation(conv.id)} className="bg-fuchsia-600 hover:bg-fuchsia-700">
                      Ouvrir le chat
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {conversations.length === 0 && (
          <div className="p-12 text-center text-slate-500">Aucune conversation pour le moment</div>
        )}
      </div>
    </div>
  );
};

// ─── Composant Apparence du site (sidebars) ────────────────────────────────
const LayoutAppearanceSection = ({ token, API }) => {
  const [settings, setSettings] = React.useState({
    sidebar_type: 'color',
    sidebar_color_left: '#f97316',
    sidebar_color_right: '#f97316',
    sidebar_image_left: '',
    sidebar_image_right: '',
    sidebar_width: 160,
  });
  const [saving, setSaving] = React.useState(false);
  const [uploadingLeft, setUploadingLeft] = React.useState(false);
  const [uploadingRight, setUploadingRight] = React.useState(false);
  const inputLeftRef = React.useRef(null);
  const inputRightRef = React.useRef(null);

  React.useEffect(() => {
    axios.get(`${API}/admin/settings/layout`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setSettings(s => ({ ...s, ...res.data }))).catch(() => {});
  }, [token, API]);

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/settings/layout`, { settings }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Apparence sauvegardée !');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file, side) => {
    const setUploading = side === 'left' ? setUploadingLeft : setUploadingRight;
    const field = side === 'left' ? 'sidebar_image_left' : 'sidebar_image_right';
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', file);
      const res = await axios.post(`${API}/upload/multiple`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data.urls?.[0] || '';
      setSettings(s => ({ ...s, [field]: url }));
      toast.success('Image uploadée !');
    } catch {
      toast.error('Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const SidePreview = ({ side }) => {
    const color = side === 'left' ? settings.sidebar_color_left : settings.sidebar_color_right;
    const image = side === 'left' ? settings.sidebar_image_left : settings.sidebar_image_right;
    const isUploading = side === 'left' ? uploadingLeft : uploadingRight;
    const inputRef = side === 'left' ? inputLeftRef : inputRightRef;
    const label = side === 'left' ? 'Gauche' : 'Droite';

    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-slate-200">Sidebar {label}</h4>
        {/* Prévisualisation */}
        <div
          className="w-full h-48 rounded-xl border border-slate-600 overflow-hidden flex items-center justify-center"
          style={settings.sidebar_type === 'image' && image
            ? { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { backgroundColor: color }
          }
        >
          {settings.sidebar_type === 'image' && !image && (
            <span className="text-slate-400 text-sm">Aucune image</span>
          )}
        </div>

        {settings.sidebar_type === 'color' && (
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-300">Couleur :</label>
            <input
              type="color"
              value={color}
              onChange={e => setSettings(s => ({
                ...s,
                [side === 'left' ? 'sidebar_color_left' : 'sidebar_color_right']: e.target.value
              }))}
              className="w-12 h-10 rounded cursor-pointer border-0 bg-transparent"
            />
            <input
              type="text"
              value={color}
              onChange={e => setSettings(s => ({
                ...s,
                [side === 'left' ? 'sidebar_color_left' : 'sidebar_color_right']: e.target.value
              }))}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-slate-200 text-sm font-mono"
              placeholder="#f97316"
            />
          </div>
        )}

        {settings.sidebar_type === 'image' && (
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              className="hidden"
              onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], side)}
            />
            <button
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-2 px-4 rounded-lg border-2 border-dashed border-slate-500 text-slate-300 hover:border-orange-400 hover:text-orange-300 transition text-sm flex items-center justify-center gap-2"
            >
              {isUploading ? '⏳ Upload...' : '📁 Choisir une image (PNG, JPG, GIF, WEBP)'}
            </button>
            {image && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={image}
                  onChange={e => setSettings(s => ({
                    ...s,
                    [side === 'left' ? 'sidebar_image_left' : 'sidebar_image_right']: e.target.value
                  }))}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 text-xs font-mono truncate"
                  placeholder="URL de l'image"
                />
                <button
                  onClick={() => setSettings(s => ({
                    ...s,
                    [side === 'left' ? 'sidebar_image_left' : 'sidebar_image_right']: ''
                  }))}
                  className="text-red-400 hover:text-red-300 text-sm px-2"
                >✕</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Apparence du site</h2>
        <p className="text-slate-400 text-sm mt-1">
          Configurez les marges latérales de la page d'accueil (hors hero et carrousels).
          Les sidebars sont visibles uniquement sur écrans larges (&gt;1280px).
        </p>
      </div>

      {/* Type de sidebar */}
      <div className="bg-slate-800 rounded-xl p-5 space-y-4 border border-slate-700">
        <h3 className="font-semibold text-slate-200">Type de décoration</h3>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sidebar_type"
              value="color"
              checked={settings.sidebar_type === 'color'}
              onChange={() => setSettings(s => ({ ...s, sidebar_type: 'color' }))}
            />
            <span className="text-slate-200">🎨 Couleur unie</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="sidebar_type"
              value="image"
              checked={settings.sidebar_type === 'image'}
              onChange={() => setSettings(s => ({ ...s, sidebar_type: 'image' }))}
            />
            <span className="text-slate-200">🖼️ Image / GIF</span>
          </label>
        </div>

        {/* Largeur */}
        <div className="flex items-center gap-4">
          <label className="text-sm text-slate-300 whitespace-nowrap">Largeur sidebar :</label>
          <input
            type="range"
            min={80}
            max={300}
            value={settings.sidebar_width}
            onChange={e => setSettings(s => ({ ...s, sidebar_width: Number(e.target.value) }))}
            className="flex-1"
          />
          <span className="text-slate-200 font-mono text-sm w-16 text-right">{settings.sidebar_width}px</span>
        </div>
      </div>

      {/* Prévisualisations gauche / droite */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <SidePreview side="left" />
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <SidePreview side="right" />
        </div>
      </div>

      {/* Option : même config des deux côtés */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSettings(s => ({
            ...s,
            sidebar_color_right: s.sidebar_color_left,
            sidebar_image_right: s.sidebar_image_left,
          }))}
          className="text-sm text-orange-400 hover:text-orange-300 underline"
        >
          ← Copier gauche → droite
        </button>
        <button
          onClick={() => setSettings(s => ({
            ...s,
            sidebar_color_left: s.sidebar_color_right,
            sidebar_image_left: s.sidebar_image_right,
          }))}
          className="text-sm text-orange-400 hover:text-orange-300 underline"
        >
          ← Copier droite → gauche
        </button>
      </div>

      {/* Bouton save */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-base hover:from-orange-600 hover:to-amber-600 transition disabled:opacity-60"
      >
        {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder l\'apparence'}
      </button>
    </div>
  );
};
export default AdminDashboard;

