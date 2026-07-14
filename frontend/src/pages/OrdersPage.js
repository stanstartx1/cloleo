import { API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ShoppingBag, Package, Truck, CheckCircle, Clock, 
  XCircle, Eye, RefreshCw,
  Calendar, MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { toAbsoluteMediaUrl } from '../utils/media';

const API = API_URL;

const formatPrice = (price, currency = 'FCFA') => {
  if (currency === 'FCFA') {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  }
  return '$' + price.toFixed(2);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getStatusConfig = (status) => {
  const configs = {
    pending: {
      label: 'En attente',
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      dotColor: 'bg-yellow-500'
    },
    processing: {
      label: 'En traitement',
      icon: RefreshCw,
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      dotColor: 'bg-blue-500'
    },
    shipped: {
      label: 'Expédié',
      icon: Truck,
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      dotColor: 'bg-purple-500'
    },
    delivered: {
      label: 'Livré',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700 border-green-200',
      dotColor: 'bg-green-500'
    },
    cancelled: {
      label: 'Annulé',
      icon: XCircle,
      color: 'bg-red-100 text-red-700 border-red-200',
      dotColor: 'bg-red-500'
    },
    refunded: {
      label: 'Remboursé',
      icon: RefreshCw,
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      dotColor: 'bg-gray-500'
    }
  };
  return configs[status] || configs.pending;
};

const OrderCard = ({ order }) => {
  const navigate = useNavigate();
  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-bold text-slate-800">
              Commande #{order.id?.slice(-8) || order.order_number}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(order.created_at)}</span>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium",
            statusConfig.color
          )}>
            <StatusIcon className="w-4 h-4" />
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {/* Products */}
        <div className="space-y-3 mb-4">
          {order.items?.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-white flex-shrink-0">
                <img
                  src={toAbsoluteMediaUrl(item.product_image || item.image)}
                  alt={item.product_name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-800 text-sm truncate">
                  {item.product_name}
                </h4>
                <p className="text-xs text-slate-500">
                  Quantité: {item.quantity} × {formatPrice(item.price_fcfa || item.price)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">
                  {formatPrice(item.subtotal_fcfa || (item.quantity * (item.price_fcfa || item.price)))}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Order Details */}
        <div className="border-t pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Sous-total</span>
            <span className="font-medium">{formatPrice(order.subtotal_fcfa || order.subtotal || order.total_amount)}</span>
          </div>
          {(order.delivery_fee_fcfa || order.shipping_cost) && (
            <div className="flex justify-between">
              <span className="text-slate-600">Livraison</span>
              <span className="font-medium">{formatPrice(order.delivery_fee_fcfa || order.shipping_cost)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span className="text-slate-800">Total</span>
            <span className="text-orange-600">{formatPrice(order.total_fcfa || order.total_amount)}</span>
          </div>
        </div>

        {/* Shipping Address */}
        {(order.delivery_address || order.shipping_address) && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <MapPin className="w-4 h-4" />
              <span>Adresse de livraison</span>
            </div>
            <p className="text-sm text-slate-600">
              {typeof order.delivery_address === 'object' 
                ? `${order.delivery_address.street}, ${order.delivery_address.city}`
                : (order.delivery_address || order.shipping_address)}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button
            onClick={() => navigate(`/commande/${order.id}`)}
            className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            size="sm"
          >
            <Eye className="w-4 h-4 mr-2" />
            Voir détails
          </Button>
          {order.status === 'pending' && (
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => {
                toast.info('Contactez le support pour annuler cette commande');
              }}
            >
              Annuler
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const OrdersPage = () => {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchOrders = async () => {
    if (!isAuthenticated || !token) {
      navigate('/connexion');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const ordersData = response.data?.orders || [];
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Erreur lors du chargement des commandes');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [isAuthenticated, token, navigate]);

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h2 className="text-2xl font-bold mb-2">Connexion requise</h2>
            <p className="text-slate-600 mb-6">Vous devez être connecté pour voir vos commandes.</p>
            <Button
              onClick={() => navigate('/connexion')}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            >
              Se connecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingBag className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Mes commandes</h1>
          </div>
          <p className="text-white/80">Suivez et gérez toutes vos commandes</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { key: 'total', label: 'Total', count: stats.total, color: 'from-slate-500 to-slate-600' },
            { key: 'pending', label: 'En attente', count: stats.pending, color: 'from-yellow-500 to-amber-500' },
            { key: 'processing', label: 'En cours', count: stats.processing, color: 'from-blue-500 to-cyan-500' },
            { key: 'shipped', label: 'Expédié', count: stats.shipped, color: 'from-purple-500 to-pink-500' },
            { key: 'delivered', label: 'Livré', count: stats.delivered, color: 'from-green-500 to-emerald-500' },
            { key: 'cancelled', label: 'Annulé', count: stats.cancelled, color: 'from-red-500 to-rose-500' }
          ].map(stat => (
            <Card key={stat.key} className="overflow-hidden">
              <CardContent className="p-4">
                <div className={`bg-gradient-to-r ${stat.color} text-white rounded-lg p-3 mb-2`}>
                  <Package className="w-6 h-6" />
                </div>
                <p className="text-2xl font-bold text-slate-800">{stat.count}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'pending', label: 'En attente' },
            { key: 'processing', label: 'En cours' },
            { key: 'shipped', label: 'Expédié' },
            { key: 'delivered', label: 'Livré' },
            { key: 'cancelled', label: 'Annulées' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                filter === tab.key
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-1/3 mb-4" />
                  <Skeleton className="h-20 w-full mb-4" />
                  <Skeleton className="h-10 w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {filter === 'all' ? 'Aucune commande' : `Aucune commande ${filter === 'cancelled' ? 'annulée' : 'en ce statut'}`}
              </h3>
              <p className="text-slate-600 mb-6">
                {filter === 'all' 
                  ? 'Vous n\'avez pas encore passé de commande.' 
                  : 'Vous n\'avez aucune commande avec ce statut.'}
              </p>
              <Button
                onClick={() => navigate('/produits')}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Découvrir nos produits
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
