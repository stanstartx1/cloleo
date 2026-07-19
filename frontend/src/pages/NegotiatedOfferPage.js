import { API_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Package, CheckCircle, Clock, AlertCircle, 
  ShoppingCart, ArrowRight, Loader2, XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { toAbsoluteMediaUrl } from '../utils/media';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';

const NegotiatedOfferPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, token: authToken } = useAuth();
  
  const [offerData, setOfferData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchNegotiatedOffer();
  }, [token]);

  const fetchNegotiatedOffer = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/offers/link/${token}`);
      setOfferData(response.data);
    } catch (err) {
      console.error('Error fetching negotiated offer:', err);
      setError(err.response?.data?.detail || 'Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour ajouter au panier');
      navigate('/connexion');
      return;
    }

    try {
      await axios.post(`${API}/cart/add`, {
        product_id: offerData.product.id,
        quantity: quantity,
        session_id: 'negotiated-offer',
        negotiated_price_fcfa: offerData.product.negotiated_price_fcfa,
        offer_id: offerData.offer_id
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      toast.success('Produit ajouté au panier avec le prix négocié !');
      navigate('/panier');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Erreur lors de l\'ajout au panier');
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour acheter');
      navigate('/connexion');
      return;
    }

    try {
      await axios.post(`${API}/cart/add`, {
        product_id: offerData.product.id,
        quantity: quantity,
        session_id: 'negotiated-offer',
        negotiated_price_fcfa: offerData.product.negotiated_price_fcfa,
        offer_id: offerData.offer_id
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      navigate('/checkout');
    } catch (error) {
      console.error('Error processing purchase:', error);
      toast.error('Erreur lors du traitement de l\'achat');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Chargement de l'offre...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Lien invalide
            </h2>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <Button onClick={() => navigate('/')} className="bg-orange-600 hover:bg-orange-700">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!offerData) {
    return null;
  }

  const { product } = offerData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-4">
            <CheckCircle className="w-5 h-5" />
            Offre acceptée
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Prix négocié exclusif
          </h1>
          <p className="text-gray-600">
            Ce produit vous est proposé à un prix spécial grâce à votre négociation
          </p>
        </div>

        {/* Product Card */}
        <Card className="overflow-hidden shadow-xl">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Product Image */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-8 flex items-center justify-center">
                {product.image ? (
                  <img 
                    src={toAbsoluteMediaUrl(product.image)} 
                    alt={product.name}
                    className="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
                  />
                ) : (
                  <Package className="w-32 h-32 text-orange-300" />
                )}
              </div>

              {/* Product Details */}
              <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {product.name}
                </h2>

                {/* Price Comparison */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Prix original</span>
                    <span className="text-gray-500 line-through text-lg">
                      {formatPrice(product.original_price_fcfa)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Prix négocié</span>
                    <span className="text-3xl font-bold text-green-600">
                      {formatPrice(product.negotiated_price_fcfa)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Vous économisez</span>
                    <span className="text-xl font-bold text-orange-600">
                      {product.discount_percent}%
                    </span>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantité
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      -
                    </button>
                    <span className="text-xl font-semibold w-12 text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Expiration Notice */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">
                        Offre limitée
                      </p>
                      <p className="text-sm text-amber-700">
                        Ce lien expire le {new Date(product.expires_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleBuyNow}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white py-6 text-lg"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Acheter maintenant
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    onClick={handleAddToCart}
                    variant="outline"
                    className="w-full border-2 border-orange-500 text-orange-600 hover:bg-orange-50 py-6 text-lg"
                  >
                    Ajouter au panier
                  </Button>
                </div>

                {/* Info */}
                <div className="mt-6 text-center text-sm text-gray-500">
                  <p>
                    En achetant ce produit, vous acceptez le prix négocié.
                    <br />
                    Cette offre est unique et non transférable.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NegotiatedOfferPage;
