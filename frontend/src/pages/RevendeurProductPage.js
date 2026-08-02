import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Heart, Share2, Truck, Shield, MapPin, Star, Minus, Plus, MessageCircle, Store, BadgeCheck, ChevronRight, Tag, X, ArrowLeft, Users, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../components/FloatingChat';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { copyToClipboard, shareOrCopy } from '../utils/share';
import { toAbsoluteMediaUrl } from '../utils/media';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const RevendeurProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuth();
  const { startConversation } = useChat();

  const [product, setProduct] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  
  // Offer modal state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);
  
  // Order modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  
  // Subscription state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/dropshipped-products/${productId}`);
      setProduct(response.data);
      
      // Fetch shop info
      if (response.data?.revendeur_id) {
        try {
          const shopRes = await axios.get(`${API}/revendeurs/${response.data.revendeur_id}`);
          setShop(shopRes.data);
          setSubscriberCount(shopRes.data?.subscriber_count || 0);
          
          // Check if user is subscribed
          if (isAuthenticated && token) {
            try {
              const subRes = await axios.get(`${API}/subscriptions/check/${response.data.revendeur_id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              setIsSubscribed(subRes.data.is_subscribed);
            } catch (e) {
              // Subscription check failed, ignore
            }
          }
        } catch (error) {
          console.error('Error fetching shop:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Produit non trouvé');
    } finally {
      setLoading(false);
    }
  }, [productId, isAuthenticated, token]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  const handleMakeOffer = () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour faire une offre');
      navigate('/connexion');
      return;
    }
    setShowOfferModal(true);
    // Pre-fill with a suggested offer (90% of current price)
    const currentPrice = product.selling_price_fcfa;
    setOfferPrice(Math.floor(currentPrice * 0.9).toString());
    setOfferMessage('');
  };

  const submitOffer = async () => {
    if (!offerPrice || parseInt(offerPrice) <= 0) {
      toast.error('Veuillez entrer un prix valide');
      return;
    }
    setSendingOffer(true);
    try {
      // Use the offers API - this will work with the dynamic vendor_role
      await axios.post(`${API}/offers/create`, {
        product_id: product.original_product_id || product.id,
        offered_price_fcfa: parseInt(offerPrice),
        message: offerMessage,
        quantity: quantity
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Offre envoyée au revendeur !', {
        description: `Vous serez notifié dès que le revendeur répondra.`
      });
      setShowOfferModal(false);
      setOfferPrice('');
      setOfferMessage('');
    } catch (error) {
      console.error('Error sending offer:', error);
      const errorMessage = error.response?.data?.detail || 'Erreur lors de l\'envoi de l\'offre';
      toast.error(errorMessage);
    } finally {
      setSendingOffer(false);
    }
  };

  const handleContactSeller = () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour contacter le vendeur');
      navigate('/connexion');
      return;
    }
    startConversation(product.revendeur_id, product.id, product.original_name);
  };

  const handleOrder = () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour commander');
      navigate('/connexion');
      return;
    }
    setShowOrderModal(true);
  };

  const submitOrder = async (formData) => {
    setOrderLoading(true);
    try {
      const response = await axios.post(`${API}/shop/order`, {
        dropshipped_product_id: product.id,
        quantity: quantity,
        delivery_address: {
          name: formData.name,
          phone: formData.phone,
          street: formData.street,
          city: formData.city,
          country: 'Côte d\'Ivoire'
        },
        payment_method: 'cash'
      });

      toast.success('Commande créée avec succès !');
      setShowOrderModal(false);
      
      // Redirect to tracking page
      window.location.href = `/suivi/${response.data.id}`;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la commande');
    } finally {
      setOrderLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour vous abonner');
      return;
    }
    
    if (!shop?.revendeur_id) {
      toast.error('Impossible de s\'abonner pour le moment');
      return;
    }
    
    try {
      if (isSubscribed) {
        await axios.delete(`${API}/subscriptions/${shop.revendeur_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsSubscribed(false);
        setSubscriberCount(prev => Math.max(0, prev - 1));
        toast.success('Désabonné avec succès');
      } else {
        await axios.post(`${API}/subscriptions/${shop.revendeur_id}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsSubscribed(true);
        setSubscriberCount(prev => prev + 1);
        toast.success('Abonné avec succès ! Vous recevrez des notifications.');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'opération');
    }
  };

  const handleShare = async () => {
    const productUrl = window.location.href;
    const res = await shareOrCopy({
      title: product.original_name,
      text: `Découvrez ${product.original_name} sur Cloléo`,
      url: productUrl,
    });
    if (res.copied) toast.success('Lien copié !');
  };

  // Priorité aux données customisées par le revendeur
  const displayName = product?.original_name || product?.name;
  const displayImages = (product?.custom_images?.length > 0 ? product.custom_images : null)
    || (product?.custom_image_url ? [product.custom_image_url] : null)
    || product?.original_images
    || product?.images
    || [];
  const displayDescription = product?.custom_description || product?.description;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <Store className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Produit non trouvé</h1>
        <Link to="/">
          <Button>Retour à l'accueil</Button>
        </Link>
      </div>
    );
  }

  const total = product.selling_price_fcfa * quantity;
  const deliveryFee = 1000;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to={`/boutique/${shop?.shop_slug}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Retour à la boutique</span>
            </Link>
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold">
                C
              </div>
              <span className="font-bold">
                <span className="text-orange-500">Clo</span>
                <span className="text-amber-600">léo</span>
              </span>
            </Link>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            <div className="aspect-square bg-white rounded-2xl overflow-hidden shadow-lg mb-4">
              <img
                src={displayImages[selectedImage] || '/placeholder.jpg'}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>
            {displayImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {displayImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 ${
                      selectedImage === idx ? 'border-purple-600' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt={`${displayName} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <Badge className="mb-3 bg-purple-100 text-purple-700">
              Boutique partenaire
            </Badge>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{displayName}</h1>
            
            {displayDescription && (
              <p className="text-gray-600 mb-4">{displayDescription}</p>
            )}

            <div className="flex items-center gap-4 mb-6">
              <div className="text-3xl font-bold text-purple-600">
                {formatPrice(product.selling_price_fcfa)} FCFA
              </div>
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-6">
              <span className="font-medium">Quantité:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-6">
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={handleOrder}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Commander
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-purple-200 text-purple-600 hover:bg-purple-50"
                onClick={handleMakeOffer}
              >
                <Tag className="w-4 h-4 mr-2" />
                Faire une offre
              </Button>
              <Button
                variant="outline"
                className="border-purple-200 text-purple-600 hover:bg-purple-50"
                onClick={handleContactSeller}
              >
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>

            {/* Shop Info */}
            {shop && (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 overflow-hidden">
                      {shop.profile_photo ? (
                        <img src={toAbsoluteMediaUrl(shop.profile_photo)} alt={shop.name} className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-purple-600 m-auto" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold">{shop.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        <span>{subscriberCount} abonné{subscriberCount > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSubscribe}
                      className={isSubscribed 
                        ? "border-purple-200 text-purple-600 hover:bg-purple-50" 
                        : "bg-purple-600 text-white hover:bg-purple-700"
                      }
                    >
                      {isSubscribed ? (
                        <>
                          <BellOff className="w-4 h-4 mr-2" />
                          Désabonner
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4 mr-2" />
                          S'abonner
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Share */}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager ce produit
            </Button>
          </div>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Faire une offre</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowOfferModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Votre offre (FCFA)</label>
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    placeholder="Entrez votre prix"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Message (optionnel)</label>
                  <textarea
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    rows={3}
                    placeholder="Ajoutez un message..."
                  />
                </div>
                
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowOfferModal(false)}>
                    Annuler
                  </Button>
                  <Button 
                    className="flex-1 bg-purple-600 hover:bg-purple-700" 
                    onClick={submitOffer}
                    disabled={sendingOffer}
                  >
                    {sendingOffer ? 'Envoi en cours...' : 'Envoyer l\'offre'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Order Modal */}
      {showOrderModal && (
        <OrderModal
          product={product}
          quantity={quantity}
          setQuantity={setQuantity}
          onClose={() => setShowOrderModal(false)}
          onSubmit={submitOrder}
          loading={orderLoading}
        />
      )}
    </div>
  );
};

// Order Modal Component
const OrderModal = ({ product, quantity, setQuantity, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    street: '',
    city: 'Abidjan'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const total = product.selling_price_fcfa * quantity;
  const deliveryFee = 1000;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-4">Commander ce produit</h2>
          
          {/* Product Summary */}
          <div className="flex gap-4 p-4 bg-gray-50 rounded-lg mb-6">
            <img
              src={product.original_images?.[0] || '/placeholder.jpg'}
              alt={product.original_name}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h3 className="font-medium">{product.original_name}</h3>
              <p className="text-purple-600 font-bold">{product.selling_price_fcfa?.toLocaleString()} FCFA</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300"
                >
                  -
                </button>
                <span className="w-8 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded bg-gray-200 hover:bg-gray-300"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nom complet</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Téléphone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                placeholder="+225 07 00 00 00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Adresse de livraison</label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                placeholder="Quartier, rue, repère..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ville</label>
              <select
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg"
                required
              >
                <option value="Abidjan">Abidjan</option>
                <option value="Yamoussoukro">Yamoussoukro</option>
                <option value="Bouaké">Bouaké</option>
              </select>
            </div>

            {/* Order Summary */}
            <div className="p-4 bg-purple-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sous-total ({quantity} article{quantity > 1 ? 's' : ''})</span>
                <span>{total.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Livraison</span>
                <span>{deliveryFee.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-purple-600">{(total + deliveryFee).toLocaleString()} FCFA</span>
              </div>
            </div>

            <p className="text-sm text-gray-500 text-center">
              Paiement à la livraison (Cash)
            </p>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={loading}>
                {loading ? 'Commande en cours...' : 'Confirmer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RevendeurProductPage;
