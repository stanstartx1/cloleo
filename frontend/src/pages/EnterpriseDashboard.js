import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { toAbsoluteMediaUrl } from '../utils/media';
import { 
  Building2, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  Users,
  Plus,
  Settings,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  XCircle,
  Edit2,
  Copy,
  X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

const EnterpriseDashboard = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [stats, setStats] = useState({
    total_products: 0,
    total_orders: 0,
    total_revenue: 0,
    total_visitors: 0,
    pending_orders: 0,
    completed_orders: 0,
    active_products: 0,
    pending_products: 0,
    recent_orders: []
  });
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/enterprises/dashboard`);
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await axios.get(`${API_URL}/offers/received`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOffers(response.data.offers || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
    }
  };

  const handleAcceptOffer = async (offerId) => {
    try {
      await axios.post(`${API_URL}/offers/${offerId}/respond`, {
        status: 'accepted',
        response_message: 'Offre acceptée'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Offre acceptée ! Un lien de paiement a été généré.');
      fetchOffers();
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error('Erreur lors de l\'acceptation de l\'offre');
    }
  };

  const handleRejectOffer = async (offerId) => {
    try {
      await axios.post(`${API_URL}/offers/${offerId}/respond`, {
        status: 'rejected',
        response_message: 'Offre refusée'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Offre refusée');
      fetchOffers();
    } catch (error) {
      console.error('Error rejecting offer:', error);
      toast.error('Erreur lors du refus de l\'offre');
    }
  };

  const handleCounterOffer = async (offerId) => {
    const counterPrice = prompt('Entrez votre contre-offre (en FCFA):');
    if (!counterPrice || parseInt(counterPrice) <= 0) {
      toast.error('Prix invalide');
      return;
    }
    
    const message = prompt('Ajoutez un message (optionnel):') || '';
    
    try {
      await axios.post(`${API_URL}/offers/${offerId}/counter`, {
        counter_price_fcfa: parseInt(counterPrice),
        message: message
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Contre-offre envoyée');
      fetchOffers();
    } catch (error) {
      console.error('Error sending counter offer:', error);
      toast.error('Erreur lors de l\'envoi de la contre-offre');
    }
  };

  const handleWithdrawOffer = async (offerId) => {
    try {
      await axios.post(`${API_URL}/offers/${offerId}/withdraw`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Offre annulée');
      fetchOffers();
    } catch (error) {
      console.error('Error withdrawing offer:', error);
      toast.error('Erreur lors de l\'annulation de l\'offre');
    }
  };

  const copyNegotiatedLink = (token) => {
    const link = `${window.location.origin}/offer-link/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien copié dans le presse-papier');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Building2 className="w-10 h-10" />
              <div>
                <h1 className="text-2xl font-bold">Tableau de bord Entreprise</h1>
                <p className="text-blue-100">Gérez votre entreprise</p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate('/devenir-entreprise')}>
              <Plus className="w-4 h-4 mr-2" />
              Modifier le profil
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produits</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_products}</div>
              <p className="text-xs text-muted-foreground">
                {stats.active_products} actifs • {stats.pending_products} en attente
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Commandes</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_orders}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pending_orders} en attente • {stats.completed_orders} livrées
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenus</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats.total_revenue)} FCFA</div>
              <p className="text-xs text-muted-foreground">Revenus totaux</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visiteurs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_visitors}</div>
              <p className="text-xs text-muted-foreground">Visites du profil</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Répartition des commandes
              </CardTitle>
              <CardDescription>Statut des commandes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="text-sm">En attente</span>
                  </div>
                  <span className="font-semibold">{stats.pending_orders}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full" 
                    style={{ width: stats.total_orders > 0 ? `${(stats.pending_orders / stats.total_orders) * 100}%` : '0%' }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Livrées</span>
                  </div>
                  <span className="font-semibold">{stats.completed_orders}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: stats.total_orders > 0 ? `${(stats.completed_orders / stats.total_orders) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Répartition des produits
              </CardTitle>
              <CardDescription>Statut des produits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Actifs</span>
                  </div>
                  <span className="font-semibold">{stats.active_products}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: stats.total_products > 0 ? `${(stats.active_products / stats.total_products) * 100}%` : '0%' }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm">En attente</span>
                  </div>
                  <span className="font-semibold">{stats.pending_products}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full" 
                    style={{ width: stats.total_products > 0 ? `${(stats.pending_products / stats.total_products) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Commandes récentes
            </CardTitle>
            <CardDescription>Les dernières commandes reçues</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recent_orders && stats.recent_orders.length > 0 ? (
              <div className="space-y-4">
                {stats.recent_orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{order.order_number || order.id}</p>
                      <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(order.total_fcfa)} FCFA</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Aucune commande récente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Offers Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Offres reçues
            </CardTitle>
            <CardDescription>Gérez les offres de négociation sur vos produits</CardDescription>
          </CardHeader>
          <CardContent>
            {offers.length > 0 ? (
              <div className="space-y-4">
                {offers.map((offer) => (
                  <div key={offer._id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                        {offer.product?.image ? (
                          <img 
                            src={toAbsoluteMediaUrl(offer.product.image)} 
                            alt={offer.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Offer Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 truncate">{offer.product?.name}</h3>
                            <p className="text-sm text-gray-500">Offre de {offer.buyer?.name}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            offer.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            offer.status === 'counter_offer' ? 'bg-blue-100 text-blue-700' :
                            offer.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            offer.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {offer.status === 'pending' ? 'En attente' :
                             offer.status === 'counter_offer' ? 'Contre-offre' :
                             offer.status === 'accepted' ? 'Acceptée' :
                             offer.status === 'rejected' ? 'Refusée' : offer.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mb-2">
                          <div>
                            <p className="text-xs text-gray-500">Prix original</p>
                            <p className="text-sm text-gray-600 line-through">{formatPrice(offer.original_price_fcfa)} FCFA</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Offre proposée</p>
                            <p className="text-lg font-bold text-green-600">{formatPrice(offer.offered_price_fcfa)} FCFA</p>
                          </div>
                          {offer.counter_price_fcfa && (
                            <div>
                              <p className="text-xs text-gray-500">Votre contre-offre</p>
                              <p className="text-lg font-bold text-blue-600">{formatPrice(offer.counter_price_fcfa)} FCFA</p>
                            </div>
                          )}
                        </div>

                        {offer.message && (
                          <p className="text-sm text-gray-600 mb-2 bg-white p-2 rounded">
                            "{offer.message}"
                          </p>
                        )}

                        {/* Actions */}
                        {offer.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleAcceptOffer(offer._id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" /> Accepter
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50"
                              onClick={() => handleRejectOffer(offer._id)}
                            >
                              <XCircle className="w-4 h-4 mr-1" /> Refuser
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              onClick={() => handleCounterOffer(offer._id)}
                            >
                              <Edit2 className="w-4 h-4 mr-1" /> Contre-offre
                            </Button>
                          </div>
                        )}

                        {offer.status === 'counter_offer' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-300 text-gray-700 hover:bg-gray-50"
                              onClick={() => handleWithdrawOffer(offer._id)}
                            >
                              <X className="w-4 h-4 mr-1" /> Annuler
                            </Button>
                          </div>
                        )}

                        {offer.status === 'accepted' && offer.negotiated_link_token && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => copyNegotiatedLink(offer.negotiated_link_token)}
                          >
                            <Copy className="w-4 h-4 mr-1" /> Copier le lien de paiement
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Aucune offre reçue</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
              <CardDescription>Gérez rapidement votre entreprise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/vendeur/ajouter-produit')}>
                <Package className="w-4 h-4 mr-2" />
                Ajouter un produit
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/vendeur/produits')}>
                <Eye className="w-4 h-4 mr-2" />
                Gérer mes produits
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Paramètres de l'entreprise
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
              <CardDescription>Aperçu des performances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Taux de livraison</span>
                  <span className="font-semibold">
                    {stats.total_orders > 0 ? `${Math.round((stats.completed_orders / stats.total_orders) * 100)}%` : '0%'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Panier moyen</span>
                  <span className="font-semibold">
                    {stats.total_orders > 0 ? `${formatPrice(stats.total_revenue / stats.total_orders)} FCFA` : '0 FCFA'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Produits actifs</span>
                  <span className="font-semibold">{stats.active_products}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseDashboard;
