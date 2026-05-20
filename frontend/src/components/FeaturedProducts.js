import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Star, Heart, ShoppingCart, Sparkles, Crown, ArrowRight, ChevronLeft, ChevronRight, Zap, Tag } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const FeaturedProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const carouselRef = useRef(null);
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  // Auto-scroll effect
  useEffect(() => {
    if (products.length <= 4 || isHovered) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % Math.max(1, products.length - 3));
    }, 4000);
    
    return () => clearInterval(interval);
  }, [products.length, isHovered]);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await axios.get(`${API}/products/featured?limit=12`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => Math.min(products.length - 4, prev + 1));
  };

  const handleAddToCart = async (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await addToCart(product.id);
    if (success) {
      toast.success('Ajouté au panier !');
    } else {
      toast.error('Erreur lors de l\'ajout au panier');
    }
  };

  const handleBuyNow = async (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await addToCart(product.id);
    if (success) {
      toast.success('Redirection vers le paiement...');
      navigate('/checkout');
    } else {
      toast.error('Erreur lors de l\'achat');
    }
  };

  const handleToggleFavorite = (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product);
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-amber-50/50 to-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-gray-200 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section 
      className="py-16 bg-gradient-to-b from-amber-50/50 via-orange-50/30 to-white overflow-hidden relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-orange-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-orange-100/30 to-transparent rounded-full" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Sparkles className="w-8 h-8 text-amber-500 animate-pulse" />
              <div className="absolute inset-0 w-8 h-8 bg-amber-400/30 rounded-full blur-md animate-ping" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-transparent">
                Produits en Vedette
              </h2>
              <p className="text-muted-foreground text-sm">Sélection exclusive de nos meilleurs vendeurs</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrev}
              disabled={activeIndex === 0}
              className="rounded-full border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              disabled={activeIndex >= products.length - 4}
              className="rounded-full border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            <Button asChild variant="ghost" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 ml-2">
              <Link to="/produits?featured=true">
                Voir tout <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Products Carousel */}
        <div className="relative overflow-x-auto touch-scroll-x" ref={carouselRef}>
          <div 
            className="flex gap-6 transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${activeIndex * (100 / 4 + 1.5)}%)` }}
          >
            {products.map((product, index) => (
              <FeaturedProductCard
                key={product.id}
                product={product}
                index={index}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                onToggleFavorite={handleToggleFavorite}
                isFavorite={isFavorite(product.id)}
                isActive={index >= activeIndex && index < activeIndex + 4}
              />
            ))}
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: Math.max(1, products.length - 3) }).map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-2 rounded-full transition-all duration-500 ${
                i === activeIndex 
                  ? 'w-8 bg-gradient-to-r from-orange-500 to-amber-500' 
                  : 'w-2 bg-orange-200 hover:bg-orange-300'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeaturedProductCard = ({ product, index, onAddToCart, onBuyNow, onToggleFavorite, isFavorite, isActive }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const planBadge = {
    entreprise: { text: 'Premium', color: 'from-purple-500 to-violet-600', icon: Crown },
    commercant: { text: 'Pro', color: 'from-amber-500 to-orange-500', icon: Star },
    artisan: { text: 'Artisan', color: 'from-blue-500 to-cyan-500', icon: Sparkles },
  };
  
  const badge = planBadge[product.seller?.subscription_plan];
  const isPromo = !!product.promo_price_fcfa;

  return (
    <Link
      to={`/produit/${product.slug || product.id}`}
      className={`group flex-shrink-0 w-[calc(25%-18px)] transition-all duration-700 ${
        isActive ? 'opacity-100 scale-100' : 'opacity-40 scale-95'
      }`}
      style={{ 
        animationDelay: `${index * 100}ms`,
        transform: isHovered ? 'translateY(-8px)' : 'translateY(0)'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-orange-100/50">
        {/* Glow effect on hover */}
        <div className={`absolute inset-0 bg-gradient-to-r from-orange-400/0 via-amber-400/0 to-orange-400/0 transition-all duration-500 ${isHovered ? 'from-orange-400/10 via-amber-400/20 to-orange-400/10' : ''}`} />
        
        {/* Image container */}
        <div className="relative aspect-square overflow-hidden">
          <img
            src={product.images?.[0] || 'https://via.placeholder.com/300'}
            alt={product.name}
            className={`w-full h-full object-cover transition-all duration-700 ${isHovered ? 'scale-110' : 'scale-100'}`}
          />
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent" />
          
          {/* Badge EN PROMO — toujours visible */}
          {isPromo && (
            <div className="absolute top-3 left-3 z-10">
              <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                <Tag className="w-3 h-3" />
                En Promo
              </div>
            </div>
          )}

          {/* Featured badge — si pas de promo */}
          {product.is_featured && !isPromo && (
            <div className="absolute top-3 left-3 z-10">
              <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                <Sparkles className="w-3 h-3" />
                Vedette
              </div>
            </div>
          )}
          
          {/* Seller badge */}
          {badge && (
            <div className="absolute top-3 right-3 z-10">
              <div className={`flex items-center gap-1 px-2 py-1 bg-gradient-to-r ${badge.color} text-white text-xs font-bold rounded-full shadow-lg`}>
                <badge.icon className="w-3 h-3" />
                {badge.text}
              </div>
            </div>
          )}

          {/* Favori — toujours visible */}
          <button
            className={`absolute bottom-3 right-3 z-10 p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg transition-all duration-300 ${isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
            onClick={(e) => onToggleFavorite(product, e)}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500' : ''}`} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors duration-300">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {product.seller?.shop_name || product.seller?.name}
          </p>
          
          <div className="flex items-center justify-between mt-3">
            <div>
              {isPromo ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-red-600">
                    {formatPrice(product.promo_price_fcfa)} <span className="text-xs">FCFA</span>
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(product.price_fcfa)}
                  </span>
                </div>
              ) : (
                <span className="text-lg font-bold text-orange-600">
                  {formatPrice(product.price_fcfa)} <span className="text-xs">FCFA</span>
                </span>
              )}
            </div>
            
            {/* Rating */}
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-sm font-medium">{(Math.random() * 2 + 3).toFixed(1)}</span>
            </div>
          </div>

          {/* Boutons — toujours visibles */}
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md text-xs"
              onClick={(e) => onBuyNow(product, e)}
            >
              <Zap className="w-3 h-3 mr-1" />
              Acheter
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-orange-200 hover:bg-orange-50 text-orange-600 text-xs"
              onClick={(e) => onAddToCart(product, e)}
            >
              <ShoppingCart className="w-3 h-3 mr-1" />
              Panier
            </Button>
          </div>
        </div>

        {/* Bottom animated border */}
        <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 transition-all duration-500 ${isHovered ? 'w-full' : 'w-0'}`} />
      </div>
    </Link>
  );
};

export default FeaturedProducts;
