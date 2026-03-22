import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Package, ShoppingBag, DollarSign, TrendingUp, Clock, CheckCircle, XCircle,
  Plus, Settings, CreditCard, BarChart3, Store, Crown, Sparkles, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { user, token, isVendor, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isVendor) {
      navigate('/connexion');
      return;
    }
    fetchDashboard();
    
    // Check for subscription payment
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      checkSubscriptionPayment(sessionId);
    }
    
    if (searchParams.get('success') === 'true') {
      toast.success('Plan gratuit activé !');
    }
    if (searchParams.get('cancelled') === 'true') {
      toast.info('Paiement annulé');
    }
  }, [isVendor, navigate, searchParams]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/vendor/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionPayment = async (sessionId) => {
    try {
      const response = await axios.get(`${API}/subscriptions/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.payment_status === 'paid') {
        toast.success('Abonnement activé avec succès !');
        await refreshUser();
        fetchDashboard();
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const plan = dashboard?.subscription?.plan;
  const stats = dashboard?.stats;
  const isPendingVerification = !user?.is_verified || !user?.is_active;

  return (
    <div className="min-h-screen py-8 bg-muted/30" data-testid="vendor-dashboard">
      <div className="container mx-auto px-4">
        {/* Pending Verification Alert */}
        {isPendingVerification && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-800">Compte en attente de vérification</h3>
              <p className="text-sm text-amber-700 mt-1">
                Votre compte vendeur est en cours de vérification par notre équipe.
                Vous pouvez préparer vos produits, mais ils ne seront visibles qu'après activation de votre compte.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                La vérification prend généralement 24 à 48 heures.
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Store className="w-8 h-8 text-primary" />
              Tableau de bord Vendeur
              {isPendingVerification && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">En attente</span>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Bienvenue, {user?.shop_name || user?.name} !
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline">
              <Link to="/vendeur/produits">
                <Package className="w-4 h-4 mr-2" /> Mes produits
              </Link>
            </Button>
            <Button asChild>
              <Link to="/vendeur/produits/nouveau">
                <Plus className="w-4 h-4 mr-2" /> Ajouter un produit
              </Link>
            </Button>
          </div>
        </div>

        {/* Subscription Banner */}
        {plan && (
          <div className={`mb-8 p-6 rounded-2xl ${
            plan.id === 'free' 
              ? 'bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-300' 
              : plan.id === 'artisan'
              ? 'bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-300'
              : plan.id === 'commercant'
              ? 'bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300'
              : 'bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-300'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{plan.emoji}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xl">{plan.name}</h3>
                    {plan.badge && (
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                        plan.badge === 'verified' ? 'bg-blue-500 text-white' :
                        plan.badge === 'pro' ? 'bg-amber-500 text-white' :
                        'bg-purple-500 text-white'
                      }`}>
                        {plan.badge === 'verified' ? 'Vérifié' : plan.badge === 'pro' ? 'Pro' : 'Premium'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Commission: {plan.commission_percent}% • 
                    {plan.max_products === -1 ? ' Produits illimités' : ` ${plan.max_products} produits max`}
                  </p>
                  {dashboard.subscription.expires && (
                    <p className="text-xs text-muted-foreground">
                      Expire le: {new Date(dashboard.subscription.expires).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
              <Button asChild variant={plan.id === 'free' ? 'default' : 'outline'}>
                <Link to="/vendeur/abonnement">
                  <Crown className="w-4 h-4 mr-2" />
                  {plan.id === 'free' ? 'Passer au plan payant' : 'Gérer l\'abonnement'}
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border shadow-sm">
            <div className="flex items-center justify-between">
              <Package className="w-8 h-8 text-primary" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="text-3xl font-bold mt-4">{stats?.total_products || 0}</p>
            <p className="text-sm text-muted-foreground">Produits</p>
          </div>

          <div className="bg-white rounded-xl p-6 border shadow-sm">
            <div className="flex items-center justify-between">
              <Clock className="w-8 h-8 text-amber-500" />
              <span className="text-xs text-muted-foreground">En attente</span>
            </div>
            <p className="text-3xl font-bold mt-4">{stats?.pending_products || 0}</p>
            <p className="text-sm text-muted-foreground">À valider</p>
          </div>

          <div className="bg-white rounded-xl p-6 border shadow-sm">
            <div className="flex items-center justify-between">
              <ShoppingBag className="w-8 h-8 text-green-500" />
              <span className="text-xs text-muted-foreground">Ventes</span>
            </div>
            <p className="text-3xl font-bold mt-4">{stats?.total_sales || 0}</p>
            <p className="text-sm text-muted-foreground">Articles vendus</p>
          </div>

          <div className="bg-white rounded-xl p-6 border shadow-sm">
            <div className="flex items-center justify-between">
              <DollarSign className="w-8 h-8 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Revenu</span>
            </div>
            <p className="text-2xl font-bold mt-4">{formatPrice(stats?.total_revenue_fcfa || 0)}</p>
            <p className="text-sm text-muted-foreground">Chiffre d'affaires</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Products Summary */}
          <div className="md:col-span-2 bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">Statut des produits</h3>
              <Button asChild variant="ghost" size="sm">
                <Link to="/vendeur/produits">Voir tout</Link>
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{stats?.approved_products || 0}</p>
                <p className="text-sm text-green-600">Approuvés</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-xl">
                <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-700">{stats?.pending_products || 0}</p>
                <p className="text-sm text-amber-600">En attente</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-700">{stats?.rejected_products || 0}</p>
                <p className="text-sm text-red-600">Rejetés</p>
              </div>
            </div>

            {/* Products remaining */}
            {plan && plan.max_products > 0 && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Produits utilisés</span>
                  <span className="font-medium">{stats?.total_products || 0} / {plan.max_products}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${Math.min(((stats?.total_products || 0) / plan.max_products) * 100, 100)}%` }}
                  />
                </div>
                {dashboard.subscription.products_remaining <= 0 && (
                  <p className="text-sm text-destructive mt-2">
                    Limite atteinte ! <Link to="/vendeur/abonnement" className="underline">Passez à un plan supérieur</Link>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-bold text-lg mb-4">Actions rapides</h3>
            <div className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/vendeur/produits/nouveau">
                  <Plus className="w-4 h-4 mr-3" /> Ajouter un produit
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/vendeur/abonnement">
                  <CreditCard className="w-4 h-4 mr-3" /> Mon abonnement
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/vendeur/profil">
                  <Settings className="w-4 h-4 mr-3" /> Paramètres boutique
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link to="/vendeur/statistiques">
                  <BarChart3 className="w-4 h-4 mr-3" /> Statistiques
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
