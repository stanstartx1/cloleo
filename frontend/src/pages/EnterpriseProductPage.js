import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Heart, Share2, Truck, Shield, MapPin, Star, Minus, Plus, MessageCircle, Store, BadgeCheck, ChevronRight, CreditCard, Tag, X, Send, Loader2, Zap, Copy, Check, Building2, Briefcase, Calendar, Award, Globe, Factory, Users, Package, CheckCircle, Clock, ArrowRight, Play, Info } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../components/FloatingChat';
import ProductCard from '../components/ProductCard';
import ReviewSection from '../components/ReviewSection';
import QuickCheckoutModal from '../components/QuickCheckoutModal';
import ProductLocationMap from '../components/ProductLocationMap';
import UserAvatar from '../components/UserAvatar';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { copyToClipboard, shareOrCopy } from '../utils/share';
import { cn } from '../lib/utils';
import { getCountryByCode, getCountryFlagUrl } from '../utils/countries';

const API = API_URL;

const formatPrice = (price, currency = 'FCFA') => {
  if (currency === 'FCFA') {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  }
  return '$' + price.toFixed(2);
};

const EnterpriseProductPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart, loading: cartLoading } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isAuthenticated, token } = useAuth();
  const { startConversation } = useChat();
  
  const chatRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [enterprise, setEnterprise] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [alsoBought, setAlsoBought] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [autoOpenChat, setAutoOpenChat] = useState(searchParams.get('chat') === 'open');
  const [isSlideshowPaused, setIsSlideshowPaused] = useState(false);
  
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);
  
  const [showQuickCheckout, setShowQuickCheckout] = useState(false);
  
  const [addToCartSuccess, setAddToCartSuccess] = useState(false);
  const [buyNowSuccess, setBuyNowSuccess] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState([]);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const [productRes, similarRes, alsoBoughtRes] = await Promise.all([
        axios.get(`${API}/products/${id}`),
        axios.get(`${API}/products/${id}/similar?limit=6`),
        axios.get(`${API}/products/${id}/also-bought?limit=6`)
      ]);
      setProduct(productRes.data);
      setSimilarProducts(similarRes.data || []);
      setAlsoBought(alsoBoughtRes.data || []);
      
      if (productRes.data?.seller_id) {
        try {
          const sellerRes = await axios.get(`${API}/products/seller/${productRes.data.seller_id}?limit=6`);
          setSellerProducts((sellerRes.data || []).filter(p => p.id !== id));
          
          // Fetch enterprise details
          const enterpriseRes = await axios.get(`${API}/enterprises/${productRes.data.seller_id}`);
          setEnterprise(enterpriseRes.data);
        } catch (error) {
          console.error('Error fetching seller products:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (autoOpenChat && product) {
      setAutoOpenChat(false);
      handleContactSeller();
    }
  }, [autoOpenChat, product]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour ajouter au panier');
      navigate('/connexion');
      return;
    }
    try {
      await addToCart(product, quantity, selectedAttributes);
      setAddToCartSuccess(true);
      setTimeout(() => setAddToCartSuccess(false), 2000);
      toast.success('Produit ajouté au panier');
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
      await addToCart(product, quantity, selectedAttributes);
      setBuyNowSuccess(true);
      setConfettiParticles(Array.from({ length: 50 }, () => ({
        id: Math.random(),
        x: (Math.random() - 0.5) * 500,
        y: (Math.random() - 0.5) * 500,
        scale: Math.random() * 0.5 + 0.5,
        rotation: Math.random() * 360,
        color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][Math.floor(Math.random() * 5)]
      })));
      setTimeout(() => {
        setBuyNowSuccess(false);
        setConfettiParticles([]);
        navigate('/panier');
      }, 1500);
    } catch (error) {
      console.error('Error buying now:', error);
      toast.error('Erreur lors de l\'achat');
    }
  };

  const handleMakeOffer = () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour faire une offre');
      navigate('/connexion');
      return;
    }
    setShowOfferModal(true);
  };

  const submitOffer = async () => {
    if (!offerPrice || parseInt(offerPrice) <= 0) {
      toast.error('Veuillez entrer un prix valide');
      return;
    }
    setSendingOffer(true);
    try {
      await axios.post(`${API}/offers`, {
        product_id: product.id,
        seller_id: product.seller_id,
        offered_price: parseInt(offerPrice),
        message: offerMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Offre envoyée avec succès');
      setShowOfferModal(false);
      setOfferPrice('');
      setOfferMessage('');
    } catch (error) {
      console.error('Error submitting offer:', error);
      toast.error('Erreur lors de l\'envoi de l\'offre');
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
    startConversation(product.seller_id, product.id, product.name);
  };

  const handleShare = async () => {
    const productUrl = window.location.href;
    const res = await shareOrCopy({
      title: product.name,
      text: `Découvrez ce produit sur Cloleo: ${product.name}`,
      url: productUrl
    });
    if (res === 'copied') {
      toast.success('Lien copié dans le presse-papiers');
    }
  };

  const favorite = isFavorite(product?.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Skeleton className="h-96" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Produit non trouvé</h2>
          <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  const images = product.images || [product.image];
  const currentPrice = product.promo_price_fcfa || product.price_fcfa;
  const hasPromo = product.promo_price_fcfa && product.promo_price_fcfa < product.price_fcfa;
  const wholesaleApplies = product.wholesale_enabled && quantity >= product.wholesale_min_quantity;
  const wholesalePrice = wholesaleApplies ? product.wholesale_price_fcfa : currentPrice;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Link to="/" className="hover:text-amber-600">Accueil</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/categories" className="hover:text-amber-600">Catégories</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900 font-medium">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-white rounded-2xl overflow-hidden shadow-lg">
              {images[selectedImage] ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100">
                  <Package className="w-24 h-24 text-slate-400" />
                </div>
              )}
              {hasPromo && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  -{Math.round((1 - product.promo_price_fcfa / product.price_fcfa) * 100)}%
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={cn(
                      "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                      selectedImage === idx ? "border-amber-500 scale-105" : "border-slate-200"
                    )}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{product.name}</h1>
              <p className="text-lg text-slate-600">{product.short_description || product.description?.substring(0, 150)}...</p>
            </div>

            {/* Enterprise Info Card */}
            {enterprise && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <UserAvatar
                    photo={enterprise.profile_photo}
                    name={enterprise.company_name}
                    size="w-16 h-16"
                    textSize="text-xl"
                    className="shadow-md"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-slate-900">{enterprise.company_name}</h3>
                      <BadgeCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <p className="text-sm text-slate-600">{enterprise.business_type || 'Entreprise'}</p>
                    {enterprise.year_founded && (
                      <p className="text-sm text-slate-500">Depuis {enterprise.year_founded}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/enterprise/shop/${product.seller_id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-sm font-medium hover:from-orange-600 hover:to-amber-600 transition-all shadow-md"
                    >
                      <Store className="w-4 h-4" />
                      Boutique
                    </Link>
                    <Link
                      to={`/enterprise/profile/${product.seller_id}`}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-md"
                    >
                      <Building2 className="w-4 h-4" />
                      Profil
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Price */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-baseline gap-3 mb-2">
                {hasPromo && (
                  <span className="text-2xl text-slate-400 line-through">{formatPrice(product.price_fcfa)}</span>
                )}
                <span className="text-4xl font-bold text-amber-600">{formatPrice(currentPrice)}</span>
              </div>
              {product.wholesale_enabled && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Prix de gros:</span> {formatPrice(product.wholesale_price_fcfa)} 
                  (min. {product.wholesale_min_quantity} unités)
                </div>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{product.rating || '4.5'}</span>
                  <span>({product.review_count || '0'} avis)</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  <span>{product.stock} en stock</span>
                </div>
                <div className="flex items-center gap-1">
                  <Truck className="w-4 h-4" />
                  <span>Livraison disponible</span>
                </div>
              </div>
            </div>

            {/* Quantity */}
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <label className="block text-sm font-medium mb-2">Quantité</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-2 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    disabled={quantity >= product.stock}
                    className="px-3 py-2 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-slate-600">{product.stock} disponibles</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-lg shadow-lg"
                onClick={handleAddToCart}
                disabled={cartLoading || addToCartSuccess}
              >
                {addToCartSuccess ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Ajouté !
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Ajouter au panier
                  </span>
                )}
              </Button>
              
              <Button
                size="lg"
                variant="outline"
                className="h-14 border-2 border-amber-500 text-amber-600 hover:bg-amber-50 font-semibold text-lg"
                onClick={handleBuyNow}
                disabled={buyNowSuccess}
              >
                {buyNowSuccess ? (
                  <span className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Commandé !
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Achat Direct
                  </span>
                )}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={handleMakeOffer}
                >
                  <Tag className="w-4 h-4 mr-2" />
                  Faire une offre
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={handleContactSeller}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contacter
                </Button>
              </div>

              {/* Enterprise Buttons */}
              {product.seller_id && (
                <div className="flex flex-col gap-2">
                  <Link
                    to={`/enterprise/shop/${product.seller_id}`}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg"
                  >
                    <Building2 className="w-4 h-4" />
                    Voir la boutique
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to={`/enterprise/profile/${product.seller_id}`}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-md hover:shadow-lg"
                  >
                    <Building2 className="w-4 h-4" />
                    En savoir plus sur {enterprise?.company_name || "l'entreprise"}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-slate-200">
                <Shield className="w-8 h-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-slate-900">Paiement sécurisé</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-slate-200">
                <Truck className="w-8 h-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-slate-900">Livraison rapide</span>
              </div>
              <div className="flex flex-col items-center p-4 bg-white rounded-lg border border-slate-200">
                <Award className="w-8 h-8 text-amber-600 mb-2" />
                <span className="text-sm font-medium text-slate-900">Entreprise vérifiée</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Details Section */}
        {enterprise && (
          <section className="mb-12 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
              <h2 className="text-2xl font-bold text-white">À propos de {enterprise.company_name}</h2>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Company Info */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <UserAvatar
                      photo={enterprise.profile_photo}
                      name={enterprise.company_name}
                      size="w-20 h-20"
                      textSize="text-2xl"
                      className="shadow-xl"
                    />
                    <div>
                      <h3 className="font-bold text-xl text-slate-900">{enterprise.company_name}</h3>
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <BadgeCheck className="w-4 h-4" />
                        Entreprise vérifiée
                      </div>
                    </div>
                  </div>
                  {enterprise.company_description && (
                    <p className="text-slate-600">{enterprise.company_description}</p>
                  )}
                  <div className="space-y-2">
                    {enterprise.business_type && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Briefcase className="w-4 h-4" />
                        {enterprise.business_type}
                      </div>
                    )}
                    {enterprise.year_founded && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4" />
                        Depuis {enterprise.year_founded}
                      </div>
                    )}
                    {enterprise.city && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4" />
                        {enterprise.city}, {enterprise.country || "Côte d'Ivoire"}
                      </div>
                    )}
                    {enterprise.website && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Globe className="w-4 h-4" />
                        <a href={enterprise.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {enterprise.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Statistiques</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="text-2xl font-bold text-amber-600">{enterprise.product_count || product.stock || 0}</div>
                      <div className="text-sm text-slate-600">Produits</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="text-2xl font-bold text-amber-600">98%</div>
                      <div className="text-sm text-slate-600">Taux de réponse</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="text-2xl font-bold text-amber-600">&lt; 24h</div>
                      <div className="text-sm text-slate-600">Délai de livraison</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <div className="text-2xl font-bold text-amber-600">4.8★</div>
                      <div className="text-sm text-slate-600">Note moyenne</div>
                    </div>
                  </div>
                </div>

                {/* Certifications & Trust */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Certifications & Confiance</h4>
                  <div className="flex flex-wrap gap-2">
                    {enterprise.certifications?.length > 0 ? (
                      enterprise.certifications.map((cert, idx) => (
                        <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          {cert}
                        </span>
                      ))
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                        Certifications non spécifiées
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span>Commerce sécurisé</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Award className="w-4 h-4 text-amber-600" />
                      <span>Entreprise certifiée</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Factory className="w-4 h-4 text-blue-600" />
                      <span>Fabricant vérifié</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-8 pt-6 border-t border-slate-200">
                <Link
                  to={`/enterprise/shop/${product.seller_id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:from-orange-600 hover:to-amber-600 transition-all shadow-md"
                >
                  <Store className="w-5 h-5" />
                  Voir la boutique
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <Link
                  to={`/enterprise/profile/${product.seller_id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 transition-all shadow-md"
                >
                  <Building2 className="w-5 h-5" />
                  En savoir plus sur {enterprise.company_name}
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Product Details Tabs */}
        <Tabs defaultValue="description" className="mb-12">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specifications">Spécifications</TabsTrigger>
            <TabsTrigger value="shipping">Livraison</TabsTrigger>
            <TabsTrigger value="reviews">Avis</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="prose max-w-none">
                <p className="text-slate-700 whitespace-pre-line">{product.description}</p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="specifications" className="mt-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.specifications && (
                  <div>
                    <h4 className="font-semibold mb-2">Spécifications</h4>
                    <p className="text-slate-600">{product.specifications}</p>
                  </div>
                )}
                {product.warranty && (
                  <div>
                    <h4 className="font-semibold mb-2">Garantie</h4>
                    <p className="text-slate-600">{product.warranty}</p>
                  </div>
                )}
                {product.brand && (
                  <div>
                    <h4 className="font-semibold mb-2">Marque</h4>
                    <p className="text-slate-600">{product.brand}</p>
                  </div>
                )}
                {product.material && (
                  <div>
                    <h4 className="font-semibold mb-2">Matériau</h4>
                    <p className="text-slate-600">{product.material}</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="shipping" className="mt-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h4 className="font-semibold">Livraison disponible</h4>
                    <p className="text-slate-600">Livraison dans toute la Côte d'Ivoire</p>
                  </div>
                </div>
                {product.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-red-600 mt-1" />
                    <div>
                      <h4 className="font-semibold">Lieu d'expédition</h4>
                      <p className="text-slate-600">{product.location}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="reviews">
            <ReviewSection productId={product.id} />
          </TabsContent>
        </Tabs>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Produits similaires</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {similarProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Also Bought */}
        {alsoBought.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Les clients ont aussi acheté</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {alsoBought.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Offer Modal */}
      {showOfferModal && product && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Faire une offre</h3>
                  <p className="text-sm text-slate-600">Proposez votre prix</p>
                </div>
              </div>
              <button onClick={() => setShowOfferModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Votre offre (FCFA)</label>
                <Input
                  type="number"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  placeholder="Ex: 8000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Message (optionnel)</label>
                <Input
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  placeholder="Ajoutez un message..."
                />
              </div>
              <Button
                className="w-full"
                onClick={submitOffer}
                disabled={sendingOffer}
              >
                {sendingOffer ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi...
                  </span>
                ) : (
                  'Envoyer l\'offre'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Checkout Modal */}
      {showQuickCheckout && product && (
        <QuickCheckoutModal
          product={product}
          quantity={quantity}
          onClose={() => setShowQuickCheckout(false)}
        />
      )}
    </div>
  );
};

export default EnterpriseProductPage;
