import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Star, MapPin, Eye, Store, BadgeCheck } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const formatPrice = (price, currency = 'FCFA') => {
  if (currency === 'FCFA') {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  }
  return '$' + price.toFixed(2);
};

const ProductCard = ({ product, className, showContactButton = true, showSellerInfo = true }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.id);
  const [isHovered, setIsHovered] = useState(false);

  const hasPromo = product.promo_price_fcfa && product.promo_price_fcfa < product.price_fcfa;
  const displayPrice = hasPromo ? product.promo_price_fcfa : product.price_fcfa;
  const displayPriceUsd = hasPromo ? product.promo_price_usd : product.price_usd;

  const handleContactVendor = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour contacter le vendeur');
      navigate('/connexion');
      return;
    }
    
    // Navigate to product page and open chat
    navigate(`/produit/${product.id}?chat=open`);
  };

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await toggleFavorite(product.id);
    if (success) {
      toast.success(favorite ? 'Retiré des favoris' : 'Ajouté aux favoris');
    }
  };

  const handleVisitShop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.seller_id && product.seller_id !== 'system') {
      navigate(`/vendeur-boutique/${product.seller_id}`);
    }
  };

  // Check if it's a real vendor (not system-generated)
  const isRealVendor = product.seller_id && product.seller_id !== 'system';

  return (
    <Link 
      to={`/produit/${product.id}`}
      className={cn(
        "group block bg-card rounded-2xl overflow-hidden border border-border/50",
        "transition-all duration-500 ease-out transform-gpu",
        "hover:-translate-y-3 hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/40",
        "relative",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`product-card-${product.id}`}
    >
      {/* Glow effect on hover */}
      <div className={cn(
        "absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl opacity-0 blur transition-opacity duration-500 -z-10",
        isHovered && "opacity-30"
      )} />
      
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
        {/* Image with zoom effect */}
        <img
          src={product.images?.[0] || 'https://via.placeholder.com/400'}
          alt={product.name}
          className={cn(
            "w-full h-full object-cover transition-all duration-700 ease-out",
            isHovered && "scale-110 brightness-105"
          )}
          loading="lazy"
        />
        
        {/* Animated gradient overlay */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-all duration-500",
          isHovered ? "opacity-100" : "opacity-0"
        )} />
        
        {/* Shine effect */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full transition-transform duration-1000",
          isHovered && "translate-x-full"
        )} />
        
        {/* Badges with staggered animation */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {hasPromo && (
            <span className={cn(
              "bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg",
              "transform transition-all duration-500",
              isHovered && "scale-110 -rotate-3 shadow-red-500/50"
            )}>
              -{Math.round((1 - product.promo_price_fcfa / product.price_fcfa) * 100)}%
            </span>
          )}
          {product.condition === 'neuf' && (
            <span className={cn(
              "bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg",
              "transform transition-all duration-500 delay-75",
              isHovered && "scale-110 rotate-3 shadow-emerald-500/50"
            )}>
              Neuf
            </span>
          )}
          {product.is_featured && (
            <span className={cn(
              "bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg",
              "transform transition-all duration-500 delay-100",
              isHovered ? "scale-110 animate-none" : "animate-pulse"
            )}>
              ⭐ Vedette
            </span>
          )}
        </div>

        {/* Favorite button with enhanced animation */}
        <button
          onClick={handleToggleFavorite}
          className={cn(
            "absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center",
            "transition-all duration-300 transform backdrop-blur-sm",
            "hover:scale-110 active:scale-95",
            favorite 
              ? "bg-red-500 text-white shadow-lg shadow-red-500/40" 
              : "bg-white/80 text-gray-600 hover:bg-white hover:text-red-500 hover:shadow-lg"
          )}
          data-testid={`favorite-btn-${product.id}`}
        >
          <Heart className={cn(
            "w-5 h-5 transition-all duration-300",
            favorite && "fill-current scale-110"
          )} />
        </button>

        {/* Contact Vendor Button - Slide up animation */}
        {showContactButton && (
          <div className={cn(
            "absolute bottom-0 left-0 right-0 p-4 transform transition-all duration-500 ease-out",
            isHovered ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          )}>
            <Button
              onClick={handleContactVendor}
              className={cn(
                "w-full bg-white/95 backdrop-blur-sm text-gray-900 font-semibold",
                "hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-500 hover:text-white",
                "transition-all duration-300 shadow-xl rounded-xl py-5",
                "border-2 border-white/50"
              )}
              size="lg"
              data-testid={`contact-vendor-btn-${product.id}`}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Contacter le vendeur
            </Button>
          </div>
        )}

        {/* Quick view icon */}
        <div className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-500",
          isHovered ? "opacity-100 scale-100" : "opacity-0 scale-75"
        )}>
          <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-xl">
            <Eye className="w-6 h-6 text-gray-700" />
          </div>
        </div>
      </div>

      {/* Content with enhanced animations */}
      <div className="p-4 relative">
        {/* Subtle gradient background on hover */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-orange-50/50 to-transparent transition-opacity duration-500",
          isHovered ? "opacity-100" : "opacity-0"
        )} />
        
        <div className="relative">
          {/* Category with slide animation */}
          <p className={cn(
            "text-xs text-muted-foreground mb-1.5 uppercase tracking-wider font-medium",
            "transform transition-all duration-300",
            isHovered && "text-primary/80 translate-x-1"
          )}>
            {product.category_slug?.replace(/-/g, ' ')}
          </p>

          {/* Name with color transition */}
          <h3 className={cn(
            "font-semibold text-sm line-clamp-2 mb-2 transition-all duration-300",
            isHovered && "text-primary"
          )}>
            {product.name}
          </h3>

          {/* Rating & Sales with scale animation */}
          <div className={cn(
            "flex items-center gap-2 mb-2 transition-all duration-300",
            isHovered && "scale-105 origin-left"
          )}>
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-semibold text-amber-700">{product.rating || '4.5'}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              ({product.reviews_count || 0} avis)
            </span>
            <span className="text-xs text-muted-foreground">
              • {product.sales_count || 0} vendus
            </span>
          </div>

          {/* Seller Info Section */}
          {showSellerInfo && (product.seller_name || product.city) && (
            <div className={cn(
              "mb-3 p-2 rounded-lg transition-all duration-300",
              isHovered ? "bg-orange-50/80" : "bg-gray-50/80"
            )}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Seller Avatar */}
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                    isRealVendor 
                      ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white" 
                      : "bg-gray-200 text-gray-500"
                  )}>
                    {isRealVendor ? (
                      <span className="text-xs font-bold">{product.seller_name?.charAt(0)?.toUpperCase() || 'V'}</span>
                    ) : (
                      <Store className="w-3.5 h-3.5" />
                    )}
                  </div>
                  
                  {/* Seller Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {product.seller_name || 'Boutique Cloléo'}
                      </p>
                      {isRealVendor && (
                        <BadgeCheck className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="w-2.5 h-2.5" />
                      <span className="truncate">{product.city || 'Abidjan'}</span>
                    </div>
                  </div>
                </div>
                
                {/* Visit Shop Button */}
                {isRealVendor && (
                  <button
                    onClick={handleVisitShop}
                    className={cn(
                      "text-[10px] font-medium px-2 py-1 rounded-full flex-shrink-0 transition-all duration-300",
                      "bg-gradient-to-r from-orange-500/10 to-amber-500/10 text-orange-600",
                      "hover:from-orange-500 hover:to-amber-500 hover:text-white hover:shadow-md"
                    )}
                    data-testid={`visit-shop-btn-${product.id}`}
                  >
                    <span className="flex items-center gap-1">
                      <Store className="w-3 h-3" />
                      Boutique
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Location (only shown if showSellerInfo is false) */}
          {!showSellerInfo && (product.city || product.location) && (
            <div className={cn(
              "flex items-center gap-1 text-xs text-muted-foreground mb-3 transition-all duration-300",
              isHovered && "text-primary/60"
            )}>
              <MapPin className="w-3 h-3" />
              {product.city || 'Abidjan'}
            </div>
          )}

          {/* Price with bounce animation */}
          <div className={cn(
            "flex items-end gap-2 transition-all duration-300",
            isHovered && "scale-105 origin-left"
          )}>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {formatPrice(displayPrice)}
            </span>
            {hasPromo && (
              <span className="line-through text-muted-foreground text-sm">
                {formatPrice(product.price_fcfa)}
              </span>
            )}
          </div>
          <p className={cn(
            "text-xs text-muted-foreground mt-0.5 transition-all duration-300",
            isHovered && "opacity-70"
          )}>
            ≈ ${displayPriceUsd || (displayPrice * 0.00165).toFixed(2)}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
