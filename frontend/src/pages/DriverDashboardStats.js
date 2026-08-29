import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Package, Truck, Clock, CheckCircle, Star, Bell,
  MapPin, DollarSign, TrendingUp, Navigation, Calendar,
  ArrowRight, Settings, LogOut, User, RefreshCw, MessageCircle,
  Award, Target, BarChart3, Menu, Home, Zap, Activity
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

const DriverDashboardStats = () => {
  const navigate = useNavigate();
  const { user, token, logout, isDriver } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Redirect if not driver
  useEffect(() => {
    if (!isDriver && user) {
      navigate('/');
    }
  }, [isDriver, user, navigate]);

  // WebSocket for real-time updates
  const {
    isConnected: wsConnected,
    notifications: wsNotifications,
    orderUpdates
  } = useUserRealtime(token, user?.id);

  // Fetch dashboard stats
  const fetchDashboard = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${API}/driver/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Extract stats from the response
      const dashboardData = response.data;
      setStats({
        total_orders: dashboardData.total_orders || 0,
        completed_orders: dashboardData.completed_orders || 0,
        in_progress_orders: dashboardData.in_progress_orders || 0,
        total_earnings: dashboardData.total_earnings || 0,
        today_earnings: dashboardData.today_earnings || 0,
        rating: dashboardData.rating || 0,
        is_online: dashboardData.user?.is_online || false,
        driver_status: dashboardData.user?.driver_status || 'offline'
      });
      
      setRecentOrders(dashboardData.recent_orders || []);
      setNotifications(dashboardData.notifications || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      // Set default stats on error to prevent disappearing
      setStats({
        total_orders: 0,
        completed_orders: 0,
        in_progress_orders: 0,
        total_earnings: 0,
        today_earnings: 0,
        rating: 0,
        is_online: false,
        driver_status: 'offline'
      });
      setRecentOrders([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboard();
      toast.success('Tableau de bord actualisé');
    } catch (error) {
      toast.error('Erreur lors de l\'actualisation');
    } finally {
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (token) {
      fetchDashboard();
    }
  }, [token]);

  // Handle WebSocket notifications
  useEffect(() => {
    if (wsNotifications.length > 0) {
      setNotifications(prev => [...wsNotifications, ...prev].slice(0, 20));
    }
  }, [wsNotifications]);

  // Handle order updates - manual refresh only
  useEffect(() => {
    if (orderUpdates.length > 0) {
      setRefreshing(true);
      fetchDashboard().then(() => setRefreshing(false));
    }
  }, [orderUpdates]);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/connexion');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3, path: '/livreur/stats' },
    { id: 'orders', label: 'Mes livraisons', icon: Package, path: '/livreur' },
    { id: 'messages', label: 'Messages', icon: MessageCircle, path: '/livreur' },
    { id: 'settings', label: 'Paramètres', icon: Settings, path: '/livreur' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-green-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">Tableau de bord Livreur</h1>
                <p className="text-sm text-slate-500">{user?.name || 'Livreur'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="relative"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                {wsConnected && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                )}
              </Button>
              
              <Badge variant={stats?.is_online ? "default" : "secondary"} className={stats?.is_online ? "bg-green-500" : "bg-slate-400"}>
                {stats?.is_online ? 'En ligne' : 'Hors ligne'}
              </Badge>
              
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-green-200 z-50">
        <div className="flex justify-around py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center p-2 text-slate-600 hover:text-green-600"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-100">Livraisons totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total_orders || 0}</div>
              <p className="text-xs text-green-100 mt-1">Depuis l'inscription</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-100">Livraisons complétées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.completed_orders || 0}</div>
              <p className="text-xs text-blue-100 mt-1">Succès</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-100">Revenus totaux</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatPrice(stats?.total_earnings || 0)}</div>
              <p className="text-xs text-purple-100 mt-1">Cumulés</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-100">Revenus du jour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatPrice(stats?.today_earnings || 0)}</div>
              <p className="text-xs text-amber-100 mt-1">Aujourd'hui</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Orders */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Livraisons en cours
              </CardTitle>
              <Badge variant="outline">{stats?.in_progress_orders || 0}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.in_progress_orders > 0 ? (
              <Button
                onClick={() => navigate('/livreur')}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Voir les livraisons en cours
              </Button>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Aucune livraison en cours</p>
                <Button
                  onClick={() => navigate('/livreur')}
                  variant="outline"
                  className="mt-4"
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Chercher des commandes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Note moyenne
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-amber-500">
                {stats?.rating?.toFixed(1) || '0.0'}
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${
                      star <= Math.round(stats?.rating || 0)
                        ? 'fill-amber-500 text-amber-500'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Livraisons récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">#{order.order_number || order.id?.slice(0, 8)}</p>
                        <p className="text-sm text-slate-500">{formatPrice(order.total_fcfa || order.total_amount || 0)}</p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        order.status === 'delivered' ? 'default' :
                        order.status === 'cancelled' ? 'destructive' : 'secondary'
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Aucune livraison récente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => navigate('/livreur')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Commencer les livraisons
              </Button>
              <Button
                onClick={() => navigate('/livreur')}
                variant="outline"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Voir les messages
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DriverDashboardStats;