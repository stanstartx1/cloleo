import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Package, Truck, Clock, CheckCircle, Star, Bell,
  MapPin, DollarSign, TrendingUp, Calendar,
  ArrowRight, Settings, LogOut, User, RefreshCw, MessageCircle,
  Award, Target, BarChart3, Menu, Home, Zap, Activity, Navigation,
  PackageCheck, Wallet, Map
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUserRealtime } from '../hooks/useUserRealtime';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { API_URL, WS_URL } from '../config/api';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';

const DriverHomeDashboard = () => {
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
      const response = await axios.get(`${API}/driver/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
      setRecentOrders(response.data.recent_orders || []);
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
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
  }, [token]);

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

  // Handle order updates
  useEffect(() => {
    if (orderUpdates.length > 0) {
      setRefreshing(true);
      fetchDashboard().then(() => setRefreshing(false));
    }
  }, [orderUpdates, fetchDashboard]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboard();
    } catch (error) {
      console.error('Dashboard refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/connexion');
  };

  // Navigation items
  const navItems = [
    { path: '/livreur/home', label: 'Tableau de bord', icon: Home },
    { path: '/livreur/stats', label: 'Statistiques', icon: BarChart3 },
    { path: '/livreur', label: 'Mes livraisons', icon: Package },
    { path: '/livreur/orders', label: 'Commandes disponibles', icon: Truck },
    { path: '/livreur/messages', label: 'Messages', icon: MessageCircle },
    { path: '/livreur/settings', label: 'Paramètres', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">Tableau de bord Livreur</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stats?.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-sm text-gray-600">
                  {stats?.is_online ? 'En ligne' : 'Hors ligne'}
                </span>
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b shadow-lg">
          <nav className="px-4 py-3 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700"
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Commandes totales</CardTitle>
              <Package className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_orders || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Toutes les livraisons</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Commandes terminées</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.completed_orders || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Livraisons réussies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Gains totaux</CardTitle>
              <DollarSign className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats?.total_earnings || 0)}</div>
              <p className="text-xs text-gray-500 mt-1">Cumul des revenus</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Note moyenne</CardTitle>
              <Star className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.rating?.toFixed(1) || '0.0'}</div>
              <p className="text-xs text-gray-500 mt-1">Évaluation clients</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                Performance du jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Gains du jour</span>
                  <span className="font-bold text-lg">{formatPrice(stats?.today_earnings || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Commandes en cours</span>
                  <span className="font-bold text-lg">{stats?.in_progress_orders || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Statut</span>
                  <Badge variant={stats?.is_online ? 'default' : 'secondary'}>
                    {stats?.driver_status || 'offline'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Statut de connexion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-gray-600">
                    {wsConnected ? 'Connecté en temps réel' : 'Déconnecté'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${stats?.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-gray-600">
                    {stats?.is_online ? 'Disponible pour les commandes' : 'Indisponible'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/livreur')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Mes livraisons</h3>
                  <p className="text-sm text-gray-500">Gérer les commandes actives</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/livreur/orders')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <PackageCheck className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Commandes disponibles</h3>
                  <p className="text-sm text-gray-500">Voir les nouvelles commandes</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/livreur/messages')}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Messages</h3>
                  <p className="text-sm text-gray-500">Communications clients</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Livraisons récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg">
                        <Package className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">Commande #{order.order_number?.slice(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-gray-500">{order.delivery_address?.address || 'Adresse non disponible'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(order.total_fcfa || 0)}</p>
                      <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune livraison récente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Desktop Navigation Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 bg-white border-r flex-col p-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default DriverHomeDashboard;