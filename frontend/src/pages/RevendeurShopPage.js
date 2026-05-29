import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Store, Package, ShoppingCart, ArrowLeft, ArrowRight, Star, MessageCircle, Share2, Copy, Bell, BellOff, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import ProductChat from '../components/ProductChat';
import { useAuth } from '../context/AuthContext';
import { toAbsoluteMediaUrl } from '../utils/media';
import { copyToClipboard, shareOrCopy } from '../utils/share';

const API = API_URL;

const RevendeurShopPage = () => {
  const { shopSlug } = useParams();
  const { isAuthenticated, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [orderLoading, setOrderLoading] = useState(false);
  const [chatProduct, setChatProduct] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const response = await axios.get(`${API}/shop/${shopSlug}?page=${page}`);
        setShop(response.data.shop);
        setProducts(response.data.products);
        setTotalPages(response.data.total_pages);
        setSubscriberCount(response.data.shop?.subscriber_count || 0);
        
        // Check if user is subscribed
        if (isAuthenticated && token && response.data.shop?.revendeur_id) {
          try {
            const subRes = await axios.get(`${API}/subscriptions/check/${response.data.shop.revendeur_id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setIsSubscribed(subRes.data.is_subscribed);
          } catch (e) {
            // Subscription check failed, ignore
          }
        }
      } catch (error) {
        console.error('Error fetching shop:', error);
        toast.error('Boutique non trouvée');
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [shopSlug, page, isAuthenticated, token]);

  const handleShare = async () => {
    const shopUrl = window.location.href;
    const res = await shareOrCopy({
      title: `Boutique ${shop?.name}`,
      text: `Découvrez la boutique ${shop?.name} sur Cloléo`,
      url: shopUrl,
    });
    if (res.copied) toast.success('Lien de la boutique copié !');
  };

  const handleCopyLink = () => {
    copyToClipboard(window.location.href).then((ok) => {
      if (ok) toast.success('Lien copié dans le presse-papier');
      else toast.error('Impossible de copier le lien');
    });
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

  const handleOrder = async (product) => {
    setSelectedProduct(product);
  };

  const submitOrder = async (formData) => {
    setOrderLoading(true);
    try {
      const response = await axios.post(`${API}/shop/order`, {
        dropshipped_product_id: selectedProduct.id,
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
      setSelectedProduct(null);
      
      // Redirect to tracking page
      window.location.href = `/suivi/${response.data.id}`;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la commande');
    } finally {
      setOrderLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <Store className="w-16 h-16 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Boutique non trouvée</h1>
        <p className="text-gray-500 mb-6">Cette boutique n'existe pas ou n'est plus disponible.</p>
        <Link to="/">
          <Button>Retour à l'accueil</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="revendeur-shop-page">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Retour</span>
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

      {/* Shop Banner */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-700 to-purple-800 text-white py-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.3),transparent_45%)]" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/20 border-4 border-white/30 overflow-hidden flex items-center justify-center shadow-2xl">
            {shop.profile_photo ? (
              <img src={toAbsoluteMediaUrl(shop.profile_photo)} alt={shop.name} className="w-full h-full object-cover" />
            ) : (
              <Store className="w-10 h-10" />
            )}
          </div>
          <h1 className="text-3xl font-bold mb-2">{shop.name}</h1>
          {shop.description && (
            <p className="text-purple-100 max-w-lg mx-auto">{shop.description}</p>
          )}
          
          {/* Subscriber count */}
          <div className="flex items-center justify-center gap-2 mt-3 text-purple-200">
            <Users className="w-4 h-4" />
            <span>{subscriberCount} abonné{subscriberCount > 1 ? 's' : ''}</span>
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              data-testid="revendeur-share-btn"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Partager
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              data-testid="revendeur-copy-link-btn"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copier le lien
            </Button>
            
            <Button
              onClick={handleSubscribe}
              size="sm"
              className={isSubscribed 
                ? "bg-white/20 border-white/30 text-white hover:bg-white/30" 
                : "bg-white text-purple-700 hover:bg-purple-50"
              }
              data-testid="revendeur-subscribe-btn"
            >
              {isSubscribed ? (
                <>
                  <BellOff className="w-4 h-4 mr-2" />
                  Se désabonner
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  S'abonner
                </>
              )}
            </Button>
          </div>
          
          <Badge className="mt-4 bg-white/20 hover:bg-white/30">
            Boutique partenaire Cloléo
          </Badge>
        </div>
      </div>

      {/* Products */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Produits disponibles</h2>
        </div>

        {products.length > 0 ? (
          <>
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
                // Priorité aux données customisées par le revendeur
                const displayName = product.original_name || product.name;
                const displayImages = (product.custom_images?.length > 0 ? product.custom_images : null)
                  || (product.custom_image_url ? [product.custom_image_url] : null)
                  || product.original_images
                  || product.images
                  || [];
                const displayDescription = product.custom_description || product.description;

                return (
                  <Card key={product.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={displayImages[0] || '/placeholder.jpg'}
                        alt={displayName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">{displayName}</h3>
                      {displayDescription && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{displayDescription}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xl font-bold text-purple-600">{product.selling_price_fcfa?.toLocaleString()} FCFA</p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            variant="outline"
                            className="border-purple-200 text-purple-600 hover:bg-purple-50"
                            onClick={() => setChatProduct(product)}
                            data-testid={`chat-btn-${product.id}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700"
                            onClick={() => handleOrder(product)}
                          >
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            Commander
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <span className="flex items-center px-4">
                  Page {page} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun produit disponible</h3>
            <p className="text-gray-500">Cette boutique n'a pas encore de produits.</p>
          </div>
        )}
      </div>

      {/* Order Modal */}
      {selectedProduct && (
        <OrderModal
          product={selectedProduct}
          quantity={quantity}
          setQuantity={setQuantity}
          onClose={() => setSelectedProduct(null)}
          onSubmit={submitOrder}
          loading={orderLoading}
        />
      )}

      {/* Chat Component */}
      {chatProduct && (
        <ProductChat
          productId={null}
          dropshippedProductId={chatProduct.id}
          sellerId={shop?.revendeur_id}
          sellerName={shop?.name || 'Vendeur'}
          productName={chatProduct.original_name}
          productImage={chatProduct.original_images?.[0]}
          autoOpen={true}
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

export default RevendeurShopPage;
