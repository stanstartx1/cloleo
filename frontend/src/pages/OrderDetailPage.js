import { API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ShoppingBag, Package, Truck, CheckCircle, Clock, 
  XCircle, ArrowLeft, MapPin, Phone, User, RefreshCw,
  Calendar, Copy
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

const OrderTimeline = ({ status }) => {
  const steps = [
    { key: 'pending', label: 'En attente' },
    { key: 'processing', label: 'En traitement' },
    { key: 'shipped', label: 'Expédié' },
    { key: 'delivered', label: 'Livré' }
  ];

  const statusOrder = ['pending', 'processing', 'shipped', 'delivered'];
  const currentIndex = statusOrder.indexOf(status);

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;
        
        return (
          <div key={step.key} className="flex-1 flex flex-col items-center">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
              isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-gray-100 border-gray-300 text-gray-400',
              isCurrent && 'ring-4 ring-green-100'
            )}>
              {isCompleted ? <CheckCircle className="w-5 h-5" /> : <span className="text-sm font-medium">{index + 1}</span>}
            </div>
            <span className={cn(
              "text-xs mt-2 font-medium",
              isCompleted ? 'text-green-600' : 'text-gray-400'
            )}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    if (!isAuthenticated || !token) {
      navigate('/connexion');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API}/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Erreur lors du chargement de la commande');
      navigate('/commandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id, isAuthenticated, token, navigate]);

  const copyOrderNumber = () => {
    if (order?.order_number) {
      navigator.clipboard.writeText(order.order_number);
      toast.success('Numéro de commande copié !');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2">Commande introuvable</h2>
            <p className="text-slate-600 mb-6">Cette commande n'existe pas ou a été supprimée.</p>
            <Button onClick={() => navigate('/commandes')}>
              Retour à mes commandes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/commandes')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Détails de la commande</h1>
              <p className="text-white/80">#{order.order_number}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Status Card */}
        <Card className="mb-6 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-3 rounded-full",
                  statusConfig.color
                )}>
                  <StatusIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{statusConfig.label}</h2>
                  <p className="text-sm text-slate-500">Commande passée le {formatDate(order.created_at)}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyOrderNumber}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copier
              </Button>
            </div>
            
            {order.status !== 'cancelled' && order.status !== 'refunded' && (
              <OrderTimeline status={order.status} />
            )}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Articles commandés ({order.items?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items?.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="w-20 h-20 rounded-lg overflow-hidden bg-white flex-shrink-0">
                        <img
                          src={toAbsoluteMediaUrl(item.product_image || item.image)}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-800 truncate">
                          {item.product_name}
                        </h4>
                        <p className="text-sm text-slate-500">
                          Quantité: {item.quantity} × {formatPrice(item.price_fcfa || item.price)}
                        </p>
                        {item.is_wholesale_price && (
                          <span className="text-xs font-semibold text-amber-700">Prix de gros</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-slate-800">
                          {formatPrice(item.subtotal_fcfa || (item.quantity * (item.price_fcfa || item.price)))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Adresse de livraison
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.delivery_address ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="font-medium">{order.customer_name || order.delivery_address.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span>{order.customer_phone || order.delivery_address.phone}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-500 mt-1" />
                      <span className="text-slate-600">
                        {typeof order.delivery_address === 'object' 
                          ? `${order.delivery_address.street}, ${order.delivery_address.city}, ${order.delivery_address.country || "Côte d'Ivoire"}`
                          : order.delivery_address}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500">Adresse non disponible</p>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Instructions de livraison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Récapitulatif</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Sous-total</span>
                    <span className="font-medium">{formatPrice(order.subtotal_fcfa || order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Livraison</span>
                    <span className="font-medium">{formatPrice(order.delivery_fee_fcfa || order.shipping_cost || 0)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-end">
                      <span className="font-bold text-lg">Total</span>
                      <span className="font-bold text-2xl text-orange-600">
                        {formatPrice(order.total_fcfa || order.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Mode de paiement</span>
                    <span className="font-medium capitalize">
                      {order.payment_method === 'cash' ? 'Paiement à la livraison' : order.payment_method}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Statut paiement</span>
                    <span className={cn(
                      "font-medium capitalize",
                      order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                    )}>
                      {order.payment_status === 'paid' ? 'Payé' : 'En attente'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/suivi/${order.id}`)}
                  >
                    <Truck className="w-4 h-4 mr-2" />
                    Suivre la livraison
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/commandes')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour aux commandes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
