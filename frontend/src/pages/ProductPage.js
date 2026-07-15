import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Heart, Share2, Truck, Shield, MapPin, Star, Minus, Plus, MessageCircle, Store, BadgeCheck, ChevronRight, CreditCard, Tag, X, Send, Loader2, Zap, Copy, Check } from 'lucide-react';
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

const ProductPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart, loading: cartLoading } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isAuthenticated, token } = useAuth();
  const { startConversation } = useChat();
  
  // Ref for chat component to auto-open
  const chatRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [alsoBought, setAlsoBought] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [autoOpenChat, setAutoOpenChat] = useState(searchParams.get('chat') === 'open');
  const [isSlideshowPaused, setIsSlideshowPaused] = useState(false);
  
  // Offer modal state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);
  
  // Quick checkout modal state
  const [showQuickCheckout, setShowQuickCheckout] = useState(false);
  
  // Animation states for buttons
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
      
      // Fetch seller products
      if (productRes.data?.seller_id) {
        try {
          const sellerRes = await axios.get(`${API}/products?seller_id=${productRes.data.seller_id}&limit=6`);
          setSellerProducts((sellerRes.data?.products || sellerRes.data || []).filter(p => p.id !== id));
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
    if (!product?.custom_attributes) return;
    setSelectedAttributes(Object.entries(product.custom_attributes).reduce((selected, [key, value]) => {
      selected[key] = Array.isArray(value) ? value[0] : value;
      return selected;
    }, {}));
  }, [product]);

  useEffect(() => {
    fetchProduct();
    window.scrollTo(0, 0);
  }, [fetchProduct]);

  // Auto-open chat if ?chat=open is in URL
  useEffect(() => {
    if (autoOpenChat && product && isAuthenticated) {
      handleContactSeller();
      setAutoOpenChat(false); // Reset to prevent re-opening
    }
  }, [autoOpenChat, product, isAuthenticated]);

  // Slideshow effect - automatically cycle through images
  useEffect(() => {
    if (!product?.images || product.images.length <= 1 || isSlideshowPaused) return;

    const interval = setInterval(() => {
      setSelectedImage((prev) => (prev + 1) % product.images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [product?.images, isSlideshowPaused]);

  // Trigger confetti particles
  const triggerConfetti = () => {
    const particles = Array.from({ length: 15 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 120 - 60,
      y: Math.random() * -100 - 30,
      rotation: Math.random() * 360,
      scale: Math.random() * 0.5 + 0.5,
      color: ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 6)]
    }));
    setConfettiParticles(particles);
    setTimeout(() => setConfettiParticles([]), 1000);
  };

  const handleAddToCart = async () => {
    const success = await addToCart(product.id, quantity, selectedAttributes);
    if (success) {
      setAddToCartSuccess(true);
      toast.success('Produit ajouté au panier', {
        description: `${quantity}x ${product.name}`,
      });
      setTimeout(() => setAddToCartSuccess(false), 2000);
    } else {
      toast.error('Erreur lors de l\'ajout au panier');
    }
  };

  const handleToggleFavorite = async () => {
    const success = await toggleFavorite(product.id);
    if (success) {
      toast.success(isFavorite(product.id) ? 'Retiré des favoris' : 'Ajouté aux favoris');
    }
  };

  const handleShare = async () => {
    const res = await shareOrCopy({
      title: product.name,
      text: product.description,
      url: window.location.href,
    });
    if (res.copied) {
      toast.success('Lien copié dans le presse-papier');
    }
  };

  // Contact seller - opens floating chat
  const handleContactSeller = async () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour contacter le vendeur');
      navigate('/connexion');
      return;
    }
    
    try {
      const conversation = await startConversation(product.id, null, {
        seller_name: product.seller_name,
        seller_id: product.seller_id,
        product_name: product.name,
        product_image: product.images?.[0]
      });
      if (!conversation?.conversationId) {
        toast.error("Impossible d'ouvrir la conversation");
        return;
      }
      toast.success('Conversation ouverte !');
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Erreur lors de l\'ouverture du chat');
    }
  };

  // Make an offer
  const handleMakeOffer = async () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour faire une offre');
      navigate('/connexion');
      return;
    }
    setShowOfferModal(true);
    // Pre-fill with a suggested offer (90% of current price)
    const currentPrice = product.promo_price_fcfa || product.price_fcfa;
    setOfferPrice(Math.floor(currentPrice * 0.9).toString());
    setOfferMessage('');
  };

  const handleSubmitOffer = async () => {
    if (!offerPrice || parseInt(offerPrice) <= 0) {
      toast.error('Veuillez entrer un prix valide');
      return;
    }

    setSendingOffer(true);
    try {
      // Start a conversation with the offer message
      const offerText = `💰 Offre de prix: ${parseInt(offerPrice).toLocaleString('fr-FR')} FCFA\n\n${offerMessage || 'Je souhaite faire une offre pour ce produit.'}`;
      
      // Create conversation first
      const convResponse = await axios.post(`${API}/conversations/start`, {
        product_id: product.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Send the offer message
      await axios.post(`${API}/conversations/${convResponse.data.id}/messages`, {
        content: offerText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Offre envoyée au vendeur !');
      setShowOfferModal(false);
      setOfferPrice('');
      setOfferMessage('');
      
      // Open the chat to show the conversation
      startConversation(product.id, null, {
        seller_name: product.seller_name,
        seller_id: product.seller_id,
        product_name: product.name,
        product_image: product.images?.[0]
      });
    } catch (error) {
      console.error('Error sending offer:', error);
      toast.error('Erreur lors de l\'envoi de l\'offre');
    } finally {
      setSendingOffer(false);
    }
  };

  const handleBuyNow = async () => {
    // Open direct checkout modal
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour acheter');
      navigate('/connexion');
      return;
    }
    setShowQuickCheckout(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Produit non trouvé</h1>
        <Button asChild>
          <Link to="/">Retour à l'accueil</Link>
        </Button>
      </div>
    );
  }

  const hasPromo = product.promo_price_fcfa && product.promo_price_fcfa < product.price_fcfa;
  const displayPrice = hasPromo ? product.promo_price_fcfa : product.price_fcfa;
  const wholesaleApplies = Boolean(product.wholesale_enabled)
    && quantity >= Number(product.wholesale_min_quantity || 0)
    && Number(product.wholesale_unit_price_fcfa || 0) > 0;
  const effectiveUnitPrice = wholesaleApplies ? Number(product.wholesale_unit_price_fcfa) : displayPrice;
  const displayPriceUsd = hasPromo ? product.promo_price_usd : product.price_usd;
  const favorite = isFavorite(product.id);
  const originCountry = getCountryByCode(product.origin_country_code) || null;
  const originName = product.origin_country_name || originCountry?.name || null;
  const originFlagUrl = getCountryFlagUrl(product.origin_country_code);

  return (
    <div className="min-h-screen py-8 relative" data-testid="product-page">
      {/* Floating Trust Bubbles - Left Side */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40 hidden lg:flex">
        <div className="group relative">
          <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-white px-3 py-2 rounded-lg shadow-lg border border-green-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            <p className="text-xs font-semibold text-green-700">Livraison rapide</p>
            <p className="text-[10px] text-green-600">2-5 jours</p>
          </div>
        </div>
        <div className="group relative">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-white px-3 py-2 rounded-lg shadow-lg border border-blue-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            <p className="text-xs font-semibold text-blue-700">Paiement sécurisé</p>
            <p className="text-[10px] text-blue-600">100% protégé</p>
          </div>
        </div>
      </div>

      {/* Floating Trust Bubbles - Right Side */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40 hidden lg:flex">
        <div className="group relative">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
            <BadgeCheck className="w-7 h-7 text-white" />
          </div>
          <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-white px-3 py-2 rounded-lg shadow-lg border border-purple-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            <p className="text-xs font-semibold text-purple-700">Vendeur vérifié</p>
            <p className="text-[10px] text-purple-600">Certifié</p>
          </div>
        </div>
        <div className="group relative">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
            <Star className="w-7 h-7 text-white" />
          </div>
          <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-white px-3 py-2 rounded-lg shadow-lg border border-amber-200 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            <p className="text-xs font-semibold text-amber-700">Satisfait ou remboursé</p>
            <p className="text-[10px] text-amber-600">7 jours</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground mb-6 flex-wrap">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to="/categories" className="hover:text-primary">Catégories</Link>
          {product.subcategory_slug ? (
            <>
              <span className="mx-2">/</span>
              <Link to={`/categories/${product.subcategory_slug}`} className="hover:text-primary">
                {(() => {
                  const parts = product.subcategory_slug.split('-');
                  const uniqueParts = [...new Set(parts)];
                  return uniqueParts.join(' ');
                })()}
              </Link>
            </>
          ) : product.category_slug && (
            <>
              <span className="mx-2">/</span>
              <Link to={`/categories/${product.category_slug}`} className="hover:text-primary">
                {product.category_slug?.replace(/-/g, ' ')}
              </Link>
            </>
          )}
          <span className="mx-2">/</span>
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </nav>

        {/* Product Details */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
          {/* Images */}
          <div>
            <div className="product-gallery-main mb-4 bg-muted rounded-2xl relative overflow-hidden">
              <img
                src={product.images?.[selectedImage] || 'https://via.placeholder.com/600'}
                alt={product.name}
                className="w-full h-full object-cover rounded-2xl transition-opacity duration-300"
                data-testid="product-main-image"
              />
              {/* Pause/Resume indicator */}
              {product.images?.length > 1 && (
                <button
                  onClick={() => setIsSlideshowPaused(!isSlideshowPaused)}
                  className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                  title={isSlideshowPaused ? "Reprendre le diaporama" : "Pause le diaporama"}
                >
                  {isSlideshowPaused ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            <div className="product-gallery-thumbnails flex justify-center gap-2 overflow-x-auto py-2">
              {product.images?.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  onMouseEnter={() => setIsSlideshowPaused(true)}
                  onMouseLeave={() => setIsSlideshowPaused(false)}
                  className={cn(
                    "product-gallery-thumb flex-shrink-0 transition-all duration-200",
                    index === selectedImage && "active ring-2 ring-orange-500 scale-110"
                  )}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                </button>
              ))}
            </div>

            {/* Seller Products - Below images to use empty space */}
            {sellerProducts.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-800">Plus de produits de ce vendeur</h3>
                  {product?.seller_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/vendeur-boutique/${product.seller_id}`)}
                      className="flex items-center gap-2"
                    >
                      <Store className="w-4 h-4" />
                      Voir la boutique
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {sellerProducts.slice(0, 10).map((p) => (
                    <Link key={p.id} to={`/produit/${p.id}`} className="group">
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="aspect-square bg-slate-100">
                          <img
                            src={p.images?.[0] || 'https://via.placeholder.com/150'}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium text-slate-800 line-clamp-2 mb-1">{p.name}</p>
                          <p className="text-sm font-bold text-orange-600">{formatPrice(p.promo_price_fcfa || p.price_fcfa)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            {/* Badges */}
            <div className="flex items-center gap-2 mb-4">
              {product.wholesale_enabled && (
                <span className="rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-white">En gros dès {product.wholesale_min_quantity}</span>
              )}
              {hasPromo && (
                <span className="promo-badge">
                  -{Math.round((1 - product.promo_price_fcfa / product.price_fcfa) * 100)}% PROMO
                </span>
              )}
              {product.condition === 'neuf' && (
                <span className="new-badge">Neuf</span>
              )}
              {product.condition === 'quasi-neuf' && (
                <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">Quasi-neuf</span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold mb-4" data-testid="product-title">{product.name}</h1>

            {(originCountry || originName) && (
              <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-sm">
                {originFlagUrl ? (
                  <img src={originFlagUrl} alt="" className="w-4 h-3 rounded-sm object-cover" />
                ) : (
                  <span>🌍</span>
                )}
                <span className="font-medium text-slate-700">
                  {product.made_in_enabled ? `Made in ${originName}` : originName}
                </span>
              </div>
            )}

            {/* Payment Methods */}
            <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-orange-50 rounded-xl border border-orange-100">
              <p className="text-xs font-semibold text-slate-600 mb-3">Moyens de paiement acceptés</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-200 hover:border-orange-300 transition-colors">
                  <img src="/orange.png" alt="Orange Money" className="h-8 w-auto mb-1 object-contain" />
                  <span className="text-[10px] font-medium text-slate-700 text-center">Orange Money</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                  <img src="/moov.png" alt="Moov Money" className="h-8 w-auto mb-1 object-contain" />
                  <span className="text-[10px] font-medium text-slate-700 text-center">Moov Money</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-200 hover:border-yellow-300 transition-colors">
                  <img src="/mtn.png" alt="MTN Money" className="h-8 w-auto mb-1 object-contain" />
                  <span className="text-[10px] font-medium text-slate-700 text-center">MTN Money</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                  <img src="/wave.png" alt="Wave" className="h-8 w-auto mb-1 object-contain" />
                  <span className="text-[10px] font-medium text-slate-700 text-center">Wave</span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
                  <img src="/visa.png" alt="Visa" className="h-8 w-auto mb-1 object-contain" />
                  <span className="text-[10px] font-medium text-slate-700 text-center">Visa</span>
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-5 h-5",
                      i < Math.floor(product.rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-gray-300"
                    )}
                  />
                ))}
                <span className="ml-2 font-medium">{product.rating}</span>
              </div>
              <span className="text-muted-foreground">({product.reviews_count} avis)</span>
              <span className="text-muted-foreground">• {product.sales_count} vendus</span>
            </div>

            {/* Price */}
            <div className="mb-6 p-4 bg-muted/50 rounded-xl">
              <div className="flex items-end gap-3 mb-1">
                <span className="text-3xl md:text-4xl font-bold text-primary" data-testid="product-price">
                  {formatPrice(effectiveUnitPrice)}
                </span>
                {hasPromo && (
                  <span className="text-lg line-through text-muted-foreground">
                    {formatPrice(product.price_fcfa)}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">≈ ${displayPriceUsd} USD</p>
              {product.wholesale_enabled && (
                <p className="mt-2 text-sm font-medium text-amber-700">
                  {wholesaleApplies
                    ? `Prix de gros appliqué : ${formatPrice(effectiveUnitPrice)} / unité`
                    : `Prix de gros : ${formatPrice(product.wholesale_unit_price_fcfa)} / unité dès ${product.wholesale_min_quantity} unités`}
                </p>
              )}
            </div>

            {/* Seller Card - Enhanced */}
            <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Seller Avatar */}
                  <UserAvatar
                    photo={product.seller_profile_photo || product.seller?.profile_photo}
                    name={product.seller_name || product.seller?.name}
                    size="w-12 h-12"
                    textSize="text-lg"
                    className="shadow-md"
                  />
                  
                  {/* Seller Info */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900">{product.seller_name}</p>
                      {product.seller_id && product.seller_id !== 'system' && (
                        <BadgeCheck className="w-6 h-6 text-orange-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {product.city || 'Abidjan'}, {product.location || "Côte d'Ivoire"}
                    </p>
                  </div>
                </div>
                
                {/* Visit Shop Button */}
                {product.seller_id && product.seller_id !== 'system' && (
                  <Link 
                    to={`/vendeur-boutique/${product.seller_id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full text-sm font-medium hover:from-orange-600 hover:to-amber-600 transition-all shadow-md hover:shadow-lg"
                    data-testid="visit-vendor-shop-btn"
                  >
                    <Store className="w-4 h-4" />
                    Voir la boutique
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl">
              <span className="text-sm text-gray-600 font-medium">Partager :</span>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-colors shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span className="text-sm">Partager</span>
              </button>
              <button
                onClick={() => {
                  copyToClipboard(window.location.href);
                  toast.success('Lien copié !');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-colors shadow-sm"
              >
                <Copy className="w-4 h-4" />
                <span className="text-sm">Copier le lien</span>
              </button>
            </div>

            {/* Available product options */}
            {Object.entries(product.custom_attributes || {}).some(([, value]) => Array.isArray(value) && value.length > 0) && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-base font-bold text-slate-900">Choisissez vos options</h2>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(product.custom_attributes || {}).map(([key, value]) => {
                    const options = Array.isArray(value) ? value : [value];
                    if (!options.length) return null;
                    return (
                      <div key={key} className="min-w-[150px] flex-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-600">{key.replace(/_/g, ' ')}</p>
                        <select
                          value={selectedAttributes[key] ?? ''}
                          onChange={(event) => setSelectedAttributes((current) => ({ ...current, [key]: event.target.value }))}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        >
                          {options.map((option) => <option key={String(option)} value={String(option)}>{String(option)}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Quantité</label>
              <div className="quantity-selector inline-flex">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  data-testid="quantity-minus"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max={product.stock}
                  data-testid="quantity-input"
                />
                <button
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                  data-testid="quantity-plus"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {product.stock} en stock
              </p>
              {product.wholesale_enabled && !wholesaleApplies && (
                <p className="mt-1 text-sm text-amber-700">Ajoutez encore {Math.max(0, product.wholesale_min_quantity - quantity)} unité(s) pour obtenir le prix de gros.</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-4">
              {/* Add to Cart Button with Animation */}
              <motion.button
                className={cn(
                  "flex-1 min-w-[200px] h-11 px-6 rounded-md font-medium flex items-center justify-center gap-2 relative overflow-hidden",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-colors duration-200"
                )}
                onClick={handleAddToCart}
                disabled={cartLoading || addToCartSuccess}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                data-testid="add-to-cart-btn"
              >
                <AnimatePresence mode="wait">
                  {cartLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <motion.div
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                      Ajout...
                    </motion.div>
                  ) : addToCartSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      className="flex items-center gap-2 text-white"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.2, 1] }}
                        transition={{ duration: 0.3 }}
                      >
                        <Check className="w-5 h-5" />
                      </motion.div>
                      Ajouté !
                    </motion.div>
                  ) : (
                    <motion.div
                      key="default"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Ajouter au panier
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Success ripple effect */}
                {addToCartSuccess && (
                  <motion.div
                    className="absolute inset-0 bg-green-500"
                    initial={{ scale: 0, opacity: 0.3 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ borderRadius: '50%', transformOrigin: 'center' }}
                  />
                )}
              </motion.button>

              {/* Favorite Button with Animation */}
              <motion.button
                className={cn(
                  "h-11 w-11 rounded-md border flex items-center justify-center",
                  "hover:bg-accent hover:text-accent-foreground",
                  favorite && "text-red-500 border-red-500 bg-red-50"
                )}
                onClick={handleToggleFavorite}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                data-testid="favorite-btn"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={favorite ? 'filled' : 'empty'}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Heart className={cn("w-5 h-5", favorite && "fill-current")} />
                  </motion.div>
                </AnimatePresence>
              </motion.button>
              
              <motion.button
                className="h-11 w-11 rounded-md border flex items-center justify-center hover:bg-accent hover:text-accent-foreground"
                onClick={handleShare}
                whileHover={{ scale: 1.1, rotate: 15 }}
                whileTap={{ scale: 0.9 }}
              >
                <Share2 className="w-5 h-5" />
              </motion.button>
            </div>
            
            {/* Buy Now Button - Direct Purchase with Confetti */}
            <div className="relative">
              {/* Confetti Particles */}
              <AnimatePresence>
                {confettiParticles.map((particle) => (
                  <motion.div
                    key={particle.id}
                    className="absolute pointer-events-none z-10"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: 10,
                      height: 10,
                      borderRadius: '2px',
                      backgroundColor: particle.color,
                    }}
                    initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
                    animate={{ 
                      x: particle.x, 
                      y: particle.y, 
                      scale: particle.scale,
                      rotate: particle.rotation,
                      opacity: 0 
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                ))}
              </AnimatePresence>
              
              <motion.button
                className={cn(
                  "w-full h-14 rounded-md text-lg font-semibold flex items-center justify-center gap-2 relative overflow-hidden",
                  "bg-gradient-to-r from-orange-500 to-amber-500 text-white",
                  "shadow-lg shadow-orange-200 hover:shadow-orange-300",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                onClick={() => {
                  triggerConfetti();
                  handleBuyNow();
                }}
                disabled={cartLoading}
                whileHover={{ scale: 1.02, y: -3, boxShadow: "0 20px 40px -10px rgba(249, 115, 22, 0.4)" }}
                whileTap={{ scale: 0.98 }}
                data-testid="buy-now-btn"
              >
                <AnimatePresence mode="wait">
                  {buyNowSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2"
                    >
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.3, 1] }}
                        transition={{ duration: 0.4 }}
                      >
                        🎉
                      </motion.span>
                      Commandé !
                    </motion.div>
                  ) : (
                    <motion.div
                      key="default"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <Zap className="w-5 h-5" />
                      Achat Direct
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                />
              </motion.button>
            </div>
            
            <p className="text-center text-sm text-gray-500 mb-6 mt-4">
              Achetez immédiatement sans passer par le panier
            </p>

            {/* Secondary actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Button 
                variant="secondary" 
                className="flex-1 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                onClick={handleMakeOffer}
                data-testid="make-offer-btn"
              >
                <Tag className="w-4 h-4 mr-2" /> Faire une offre
              </Button>
              <Button 
                className="flex-1 text-white font-semibold bg-gradient-to-r from-fuchsia-600 via-orange-500 to-amber-500 hover:from-fuchsia-700 hover:via-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30"
                onClick={handleContactSeller}
                data-testid="contact-seller-btn"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contacter le vendeur
              </Button>
            </div>

            <div className="mb-6">
              <ProductLocationMap product={product} />
            </div>
          </div>
        </div>

        {/* Product tabs */}
        <Tabs defaultValue="description" className="mb-16">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 mb-6">
            <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              Description
            </TabsTrigger>
            <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              Détails
            </TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">
              Avis ({product.review_count || 0})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="prose max-w-none">
            <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          </TabsContent>
          <TabsContent value="details">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">État</p>
                <p className="font-medium capitalize">{product.condition}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Localisation</p>
                <p className="font-medium">{product.city}, {product.location}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Vendeur</p>
                <p className="font-medium">{product.seller_name}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {product.tags?.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              {Object.entries(product.custom_attributes || {}).map(([label, value]) => (
                <div key={label} className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground capitalize">{label.replace(/_/g, ' ')}</p>
                  <p className="font-medium">{Array.isArray(value) ? value.join(', ') : String(value)}</p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="reviews">
            <ReviewSection productId={product.id} />
          </TabsContent>
        </Tabs>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6" data-testid="similar-products-title">Produits similaires</h2>
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
            <h2 className="text-2xl font-bold mb-6" data-testid="also-bought-title">Les clients ont aussi acheté</h2>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="offer-modal">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Faire une offre</h3>
                  <p className="text-sm text-muted-foreground">Proposez votre prix au vendeur</p>
                </div>
              </div>
              <button 
                onClick={() => setShowOfferModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Info */}
            <div className="p-4 bg-gray-50 flex items-center gap-3">
              {product.images?.[0] && (
                <img 
                  src={product.images[0]} 
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  Prix actuel: <span className="font-semibold text-orange-600">{formatPrice(product.promo_price_fcfa || product.price_fcfa)}</span>
                </p>
              </div>
            </div>

            {/* Offer Form */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Votre offre (FCFA)</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="Ex: 8000"
                    className="text-lg font-semibold pr-16"
                    data-testid="offer-price-input"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">FCFA</span>
                </div>
                {offerPrice && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ≈ ${(parseInt(offerPrice) * 0.0016).toFixed(2)} USD
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Message (optionnel)</label>
                <textarea
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  placeholder="Expliquez pourquoi vous proposez ce prix..."
                  className="w-full p-3 border rounded-lg resize-none h-24 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  data-testid="offer-message-input"
                />
              </div>

              {/* Quick suggestions */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Suggestions rapides:</p>
                <div className="flex flex-wrap gap-2">
                  {[90, 85, 80, 75].map(percent => {
                    const currentPrice = product.promo_price_fcfa || product.price_fcfa;
                    const suggestedPrice = Math.floor(currentPrice * percent / 100);
                    return (
                      <button
                        key={percent}
                        onClick={() => setOfferPrice(suggestedPrice.toString())}
                        className="px-3 py-1.5 text-sm bg-orange-50 text-orange-700 rounded-full hover:bg-orange-100 transition-colors"
                      >
                        {percent}% ({suggestedPrice.toLocaleString('fr-FR')})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowOfferModal(false)}
              >
                Annuler
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                onClick={handleSubmitOffer}
                disabled={sendingOffer || !offerPrice}
                data-testid="submit-offer-btn"
              >
                {sendingOffer ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Envoyer l'offre
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
          onSuccess={(order) => {
            console.log('Direct purchase order:', order);
          }}
        />
      )}
    </div>
  );
};

export default ProductPage;
