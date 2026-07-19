import { API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  DollarSign, Package, CheckCircle, XCircle, Clock, 
  RefreshCw, Copy, Calendar, MessageCircle, Edit, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { toAbsoluteMediaUrl } from '../utils/media';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';

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

const OFFER_STATUS_CONFIG = {
  pending: {
    label: 'En attente',
    icon: Clock,
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500'
  },
  accepted: {
    label: 'Acceptée',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 border-green-200',
    dotColor: 'bg-green-500'
  },
  rejected: {
    label: 'Refusée',
    icon: XCircle,
    color: 'bg-red-100 text-red-700 border-red-200',
    dotColor: 'bg-red-500'
  },
  counter_offer: {
    label: 'Contre-offre',
    icon: Edit,
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500'
  },
  expired: {
    label: 'Expirée',
    icon: XCircle,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    dotColor: 'bg-gray-500'
  },
  withdrawn: {
    label: 'Retirée',
    icon: X,
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    dotColor: 'bg-gray-500'
  }
};

const MyOffersPage = () => {
  const { token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/connexion');
      return;
    }
    fetchOffers();
  }, [isAuthenticated, navigate]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/offers/sent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOffers(response.data.offers || []);
    } catch (error) {
      console.error('Error fetching offers:', error);
      toast.error('Erreur lors du chargement des offres');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCounterOffer = async (offerId) => {
    try {
      await axios.post(`${API}/offers/${offerId}/accept-counter`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Contre-offre acceptée ! Un lien de paiement a été généré.');
      fetchOffers();
    } catch (error) {
      console.error('Error accepting counter offer:', error);
      toast.error('Erreur lors de l\'acceptation de la contre-offre');
    }
  };

  const handleWithdrawOffer = async (offerId) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer cette offre ?')) return;
    
    try {
      await axios.post(`${API}/offers/${offerId}/withdraw`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Offre retirée');
      fetchOffers();
    } catch (error) {
      console.error('Error withdrawing offer:', error);
      toast.error('Erreur lors du retrait de l\'offre');
    }
  };

  const copyNegotiatedLink = (token) => {
    const link = `${window.location.origin}/offer-link/${token}`;
    navigator.clipboard.writeText(link);
    toast.success('Lien copié dans le presse-papier');
  };

  const OfferCard = ({ offer }) => {
    const statusConfig = OFFER_STATUS_CONFIG[offer.status] || OFFER_STATUS_CONFIG.pending;
    const StatusIcon = statusConfig.icon;

    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">
                Offre sur {offer.product?.name || 'Produit'}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(offer.created_at)}</span>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium",
              statusConfig.color
            )}>
              <div className={cn("w-2 h-2 rounded-full", statusConfig.dotColor)} />
              <StatusIcon className="w-4 h-4" />
              {statusConfig.label}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex gap-4 mb-4">
            {/* Product Image */}
            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
              {offer.product?.image ? (
                <img 
                  src={toAbsoluteMediaUrl(offer.product.image)} 
                  alt={offer.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-8 h-8 text-slate-400" />
                </div>
              )}
            </div>

            {/* Offer Details */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <div>
                  <p className="text-xs text-slate-500">Prix original</p>
                  <p className="text-sm text-slate-600 line-through">{formatPrice(offer.original_price_fcfa)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Votre offre</p>
                  <p className="text-lg font-bold text-green-600">{formatPrice(offer.offered_price_fcfa)}</p>
                </div>
                {offer.counter_price_fcfa && (
                  <div>
                    <p className="text-xs text-slate-500">Contre-offre</p>
                    <p className="text-lg font-bold text-blue-600">{formatPrice(offer.counter_price_fcfa)}</p>
                  </div>
                )}
                {offer.final_price_fcfa && (
                  <div>
                    <p className="text-xs text-slate-500">Prix final</p>
                    <p className="text-lg font-bold text-purple-600">{formatPrice(offer.final_price_fcfa)}</p>
                  </div>
                )}
              </div>

              {offer.message && (
                <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded mb-2">
                  "{offer.message}"
                </p>
              )}

              {offer.response_message && (
                <p className="text-sm text-slate-600 bg-blue-50 p-2 rounded">
                  Réponse: "{offer.response_message}"
                </p>
              )}
            </div>
          </div>

          {/* Vendor Info */}
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4 pb-4 border-b">
            <span>Vendeur: {offer.vendor?.name}</span>
            {offer.vendor?.role === 'vendor' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Vendeur</span>}
            {offer.vendor?.role === 'dropshipper' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Revendeur</span>}
            {offer.vendor?.role === 'enterprise' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Entreprise</span>}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {offer.status === 'pending' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  onClick={() => handleWithdrawOffer(offer.id)}
                >
                  <X className="w-4 h-4 mr-1" /> Retirer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  asChild
                >
                  <Link to={`/produit/${offer.product_id}`}>
                    <MessageCircle className="w-4 h-4 mr-1" /> Contacter
                  </Link>
                </Button>
              </>
            )}

            {offer.status === 'counter_offer' && (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => handleAcceptCounterOffer(offer.id)}
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Accepter la contre-offre
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  onClick={() => handleWithdrawOffer(offer.id)}
                >
                  <X className="w-4 h-4 mr-1" /> Refuser
                </Button>
              </>
            )}

            {offer.status === 'accepted' && offer.negotiated_link_token && (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => copyNegotiatedLink(offer.negotiated_link_token)}
                >
                  <Copy className="w-4 h-4 mr-1" /> Copier le lien de paiement
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  asChild
                >
                  <Link to={`/offer-link/${offer.negotiated_link_token}`}>
                    Voir le produit
                  </Link>
                </Button>
              </>
            )}

            {offer.status === 'rejected' && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                asChild
              >
                <Link to={`/produit/${offer.product_id}`}>
                  Faire une nouvelle offre
                </Link>
              </Button>
            )}

            {offer.status === 'expired' && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                asChild
              >
                <Link to={`/produit/${offer.product_id}`}>
                  Faire une nouvelle offre
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-orange-500" />
            Mes offres
          </h1>
          <p className="text-slate-600 mt-2">Suivez vos offres de négociation</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchOffers}
          className="border-slate-300 text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {offers.length > 0 ? (
        <div className="space-y-4">
          {offers.map((offer) => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      ) : (
        <Card className="text-center py-16">
          <CardContent>
            <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              Aucune offre
            </h3>
            <p className="text-slate-500 mb-6">
              Vous n'avez pas encore fait d'offre sur des produits
            </p>
            <Button asChild className="bg-orange-600 hover:bg-orange-700">
              <Link to="/">Explorer les produits</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MyOffersPage;
