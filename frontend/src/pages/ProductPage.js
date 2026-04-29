import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShoppingCart, Heart, Share2, Truck, Shield, MapPin, Star, Minus, Plus, MessageCircle, Store, BadgeCheck, ChevronRight, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import ProductCard from '../components/ProductCard';
import ProductChat from '../components/ProductChat';
import ReviewSection from '../components/ReviewSection';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  
  // Ref for chat component to auto-open
  const chatRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [alsoBought, setAlsoBought] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [autoOpenChat, setAutoOpenChat] = useState(searchParams.get('chat') === 'open');

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
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
    window.scrollTo(0, 0);
  }, [fetchProduct]);

  const handleAddToCart = async () => {
    const success = await addToCart(product.id, quantity);
    if (success) {
      toast.success('Produit ajouté au panier', {
        description: `${quantity}x ${product.name}`,
      });
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
    try {
      await navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien copié dans le presse-papier');
    }
  };

  const handleBuyNow = async () => {
    // Add to cart then redirect to checkout
    const success = await addToCart(product.id, quantity);
    if (success) {
      navigate('/checkout');
    } else {
      toast.error('Erreur lors de l\'ajout au panier');
    }
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
  const displayPriceUsd = hasPromo ? product.promo_price_usd : product.price_usd;
  const favorite = isFavorite(product.id);

  return (
    <div className="min-h-screen py-8" data-testid="product-page">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground mb-6 flex-wrap">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <Link to="/categories" className="hover:text-primary">Catégories</Link>
          <span className="mx-2">/</span>
          <Link to={`/categories/${product.category_slug}`} className="hover:text-primary">
            {product.category_slug?.replace(/-/g, ' ')}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </nav>

        {/* Product Details */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
          {/* Images */}
          <div>
            <div className="product-gallery-main mb-4 bg-muted rounded-2xl">
              <img
                src={product.images?.[selectedImage] || 'https://via.placeholder.com/600'}
                alt={product.name}
                className="w-full h-full object-cover rounded-2xl"
                data-testid="product-main-image"
              />
            </div>
            <div className="product-gallery-thumbnails">
              {product.images?.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "product-gallery-thumb flex-shrink-0",
                    index === selectedImage && "active"
                  )}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div>
            {/* Badges */}
            <div className="flex items-center gap-2 mb-4">
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
                  {formatPrice(displayPrice)}
                </span>
                {hasPromo && (
                  <span className="text-lg line-through text-muted-foreground">
                    {formatPrice(product.price_fcfa)}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">≈ ${displayPriceUsd} USD</p>
            </div>

            {/* Seller Card - Enhanced */}
            <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Seller Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md">
                    <span className="text-lg font-bold">{product.seller_name?.[0]?.toUpperCase() || 'V'}</span>
                  </div>
                  
                  {/* Seller Info */}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-gray-900">{product.seller_name}</p>
                      {product.seller_id && product.seller_id !== 'system' && (
                        <BadgeCheck className="w-4 h-4 text-orange-500" />
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
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mb-4">
              <Button
                size="lg"
                className="flex-1 min-w-[200px]"
                onClick={handleAddToCart}
                disabled={cartLoading}
                data-testid="add-to-cart-btn"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Ajouter au panier
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={handleToggleFavorite}
                className={cn(favorite && "text-red-500 border-red-500")}
                data-testid="favorite-btn"
              >
                <Heart className={cn("w-5 h-5", favorite && "fill-current")} />
              </Button>
              <Button size="lg" variant="outline" onClick={handleShare}>
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Buy Now Button */}
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 mb-6"
              onClick={handleBuyNow}
              disabled={cartLoading}
              data-testid="buy-now-btn"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Acheter maintenant
            </Button>

            {/* Secondary actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Button variant="secondary" className="flex-1">
                <MessageCircle className="w-4 h-4 mr-2" /> Faire une offre
              </Button>
              <Button variant="secondary" className="flex-1">
                Contacter le vendeur
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-primary" />
                <div className="text-sm">
                  <p className="font-medium">Livraison rapide</p>
                  <p className="text-muted-foreground">2-5 jours</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                <div className="text-sm">
                  <p className="font-medium">Paiement sécurisé</p>
                  <p className="text-muted-foreground">100% protégé</p>
                </div>
              </div>
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
      
      {/* Chat Button */}
      {product && (
        <ProductChat
          productId={product.id}
          sellerId={product.seller_id}
          sellerName={product.seller_name}
          productName={product.name}
          productImage={product.images?.[0]}
          autoOpen={autoOpenChat}
        />
      )}
    </div>
  );
};

export default ProductPage;
