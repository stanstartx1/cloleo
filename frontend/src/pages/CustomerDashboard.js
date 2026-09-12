import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Package, Truck, Clock, CheckCircle, Star, Bell,
  MapPin, DollarSign, TrendingUp, ShoppingBag, Calendar,
  ArrowRight, Settings, LogOut, User, RefreshCw, MessageCircle,
  Heart, Wallet, Award, Target, BarChart3, Menu, XCircle, Home
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUserRealtime } from '../hooks/useUserRealtime';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { API_URL, WS_URL } from '../config/api';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // WebSocket for real-time updates
  const {
    isConnected: wsConnected,
    notifications: wsNotifications,
    orderUpdates
  } = useUserRealtime(token, user?.id);

  // Fetch dashboard stats
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/customer/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data.stats);
      setRecentOrders(response.data.recent_orders || []);
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Erreur lors du chargement du tableau de bord');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
    toast.success('Tableau de bord actualisé');
  };

  // Initial load
  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Handle WebSocket notifications
  useEffect(() => {
    if (wsNotifications.length > 0) {
      setNotifications(prev => [...wsNotifications, ...prev].slice(0, 20));
    }
  }, [wsNotifications]);

  // Handle order updates
  useEffect(() => {
    if (orderUpdates.length > 0) {
      // Refresh orders when updates come in
      fetchDashboard();
    }
  }, [orderUpdates, fetchDashboard]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3, path: '/tableau-de-bord' },
    { id: 'home', label: 'Accueil', icon: Home, path: '/' },
    { id: 'orders', label: 'Mes commandes', icon: Package, path: '/commandes' },
    { id: 'tracking', label: 'Suivi en direct', icon: Truck, path: '/commandes' },
    { id: 'favorites', label: 'Favoris', icon: Heart, path: '/favoris' },
    { id: 'wallet', label: 'Portefeuille', icon: Wallet, path: '/wallet' },
    { id: 'messages', label: 'Messages', icon: MessageCircle, path: '/mes-messages' },
    { id: 'settings', label: 'Paramètres', icon: Settings, path: '/parametres' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Bonjour, {user?.name || 'Client'} 👋</h1>
                <p className="text-sm text-slate-500">Bienvenue sur votre tableau de bord</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                wsConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                {wsConnected ? 'En ligne' : 'Hors ligne'}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-3 hover:bg-gray-100 rounded-lg"
                >
                  <item.icon className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 rounded-2xl p-8 mb-8 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Bonjour, {user?.name || 'Client'} ! 👋</h1>
              <p className="text-purple-100">Bienvenue sur votre espace personnel</p>
              <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-white/30">
                  {stats?.total_orders || 0} commandes
                </Badge>
                <Badge className="bg-white/20 text-white border-white/30">
                  {stats?.loyalty_points || 0} points
                </Badge>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-100">Commandes totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats?.total_orders || 0}</div>
                <Package className="w-8 h-8 text-blue-200" />
              </div>
              <div className="mt-2 text-xs text-blue-200">
                {stats?.orders_this_month || 0} ce mois
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl shadow-green-500/30 hover:shadow-green-500/50 transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-100">Dépenses totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{formatPrice(stats?.total_spent || 0)}</div>
                <DollarSign className="w-8 h-8 text-green-200" />
              </div>
              <div className="mt-2 text-xs text-green-200">
                {formatPrice(stats?.spent_this_month || 0)} ce mois
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-100">Commandes en cours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats?.active_orders || 0}</div>
                <Truck className="w-8 h-8 text-purple-200" />
              </div>
              <div className="mt-2 text-xs text-purple-200">
                {stats?.pending_orders || 0} en attente
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-100">Points de fidélité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{stats?.loyalty_points || 0}</div>
                <Award className="w-8 h-8 text-amber-200" />
              </div>
              <div className="mt-2 text-xs text-amber-200">
                Niveau {stats?.loyalty_level || 'Bronze'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-purple-600" />
                    Commandes récentes
                  </CardTitle>
                  <Link to="/commandes">
                    <Button variant="ghost" size="sm">
                      Voir tout
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentOrders.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <ShoppingBag className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Aucune commande récente</h3>
                    <p className="text-slate-500 mb-4">Commencez vos achats pour voir vos commandes ici</p>
                    <Link to="/">
                      <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Découvrir nos produits
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentOrders.map(order => (
                      <div
                        key={order.id}
                        className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:from-purple-100 hover:to-pink-100 transition-all cursor-pointer border border-purple-100 hover:border-purple-200"
                        onClick={() => navigate(`/suivi/${order.id}`)}
                      >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md ${
                          order.status === 'delivered' ? 'bg-gradient-to-br from-green-400 to-green-500' :
                          order.status === 'in_transit' ? 'bg-gradient-to-br from-purple-400 to-purple-500' :
                          order.status === 'cancelled' ? 'bg-gradient-to-br from-red-400 to-red-500' : 'bg-gradient-to-br from-blue-400 to-blue-500'
                        }`}>
                          {order.status === 'delivered' ? <CheckCircle className="w-7 h-7 text-white" /> :
                           order.status === 'in_transit' ? <Truck className="w-7 h-7 text-white" /> :
                           order.status === 'cancelled' ? <X className="w-7 h-7 text-white" /> :
                           <Clock className="w-7 h-7 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-slate-800">{order.order_number}</h4>
                            <span className="text-lg font-bold text-purple-600">{formatPrice(order.total_amount)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge className={
                              order.status === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' :
                              order.status === 'in_transit' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                            }>
                              {order.status}
                            </Badge>
                            <span className="text-xs text-slate-400">
                              {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="w-6 h-6 text-purple-400" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notifications */}
          <div>
            <Card className="shadow-lg border-purple-100">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Bell className="w-5 h-5" />
                  Notifications
                  {notifications.length > 0 && (
                    <Badge className="ml-auto bg-gradient-to-r from-purple-600 to-pink-600">
                      {notifications.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                      <Bell className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-slate-500">Aucune notification</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {notifications.map((notif, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-l-4 border-purple-500 hover:from-purple-100 hover:to-pink-100 transition-all"
                      >
                        <p className="text-sm text-slate-700 font-medium">{notif.message || notif.content}</p>
                        <span className="text-xs text-slate-400 mt-2 block">
                          {new Date(notif.timestamp || notif.created_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6 shadow-lg border-purple-100">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Target className="w-5 h-5" />
                  Actions rapides
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Link to="/" className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl hover:from-purple-100 hover:to-pink-100 transition-all">
                    <ShoppingBag className="w-6 h-6 text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-slate-700">Acheter</span>
                  </Link>
                  <Link to="/favoris" className="flex flex-col items-center p-4 bg-gradient-to-br from-pink-50 to-orange-50 rounded-xl hover:from-pink-100 hover:to-orange-100 transition-all">
                    <Heart className="w-6 h-6 text-pink-600 mb-2" />
                    <span className="text-sm font-medium text-slate-700">Favoris</span>
                  </Link>
                  <Link to="/commandes" className="flex flex-col items-center p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl hover:from-orange-100 hover:to-amber-100 transition-all">
                    <Package className="w-6 h-6 text-orange-600 mb-2" />
                    <span className="text-sm font-medium text-slate-700">Commandes</span>
                  </Link>
                  <Link to="/parametres" className="flex flex-col items-center p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl hover:from-amber-100 hover:to-yellow-100 transition-all">
                    <Settings className="w-6 h-6 text-amber-600 mb-2" />
                    <span className="text-sm font-medium text-slate-700">Paramètres</span>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
