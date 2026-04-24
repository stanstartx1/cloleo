import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Star, MapPin } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const formatPrice = (price, currency = 'FCFA') => {
  if (currency === 'FCFA') {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  }
  return '$' + price.toFixed(2);
};

const ProductCard = ({ product, className }) => {
  const { addToCart, loading } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.id);

  const hasPromo = product.promo_price_fcfa && product.promo_price_fcfa < product.price_fcfa;
  const displayPrice = hasPromo ? product.promo_price_fcfa : product.price_fcfa;
  const displayPriceUsd = hasPromo ? product.promo_price_usd : product.price_usd;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await addToCart(product.id);
    if (success) {
      toast.success('Produit ajouté au panier', {
        description: product.name,
      });
    } else {
      toast.error('Erreur lors de l\'ajout au panier');
    }
  };

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await toggleFavorite(product.id);
    if (success) {
      toast.success(favorite ? 'Retiré des favoris' : 'Ajouté aux favoris');
    }
  };

  return (
    <Link 
      to={`/produit/${product.id}`}
      className={cn(
        "group block bg-card rounded-xl overflow-hidden border border-border",
        "transition-all duration-500 ease-out",
        "hover:-translate-y-2 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30",
        className
      )}
      data-testid={`product-card-${product.id}`}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.images?.[0] || 'https://via.placeholder.com/400'}
          alt={product.name}
          className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Hover overlay with gradient animation */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
        
        {/* Badges with animation */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {hasPromo && (
            <span className="promo-badge transform transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3">
              -{Math.round((1 - product.promo_price_fcfa / product.price_fcfa) * 100)}%
            </span>
          )}
          {product.condition === 'neuf' && (
            <span className="new-badge transform transition-all duration-300 delay-75 group-hover:scale-110 group-hover:rotate-3">Neuf</span>
          )}
          {product.is_featured && (
            <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
              ⭐ Vedette
            </span>
          )}
        </div>

        {/* Favorite button with bounce animation */}
        <button
          onClick={handleToggleFavorite}
          className={cn(
            "absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center",
            "transition-all duration-300 transform",
            "hover:scale-110 active:scale-95",
            favorite 
              ? "bg-red-500 text-white shadow-lg shadow-red-500/30" 
              : "bg-white/90 text-gray-600 hover:bg-white hover:text-red-500 hover:shadow-lg"
          )}
          data-testid={`favorite-btn-${product.id}`}
        >
          <Heart className={cn(
            "w-4 h-4 transition-transform duration-300",
            favorite && "fill-current animate-heartbeat"
          )} />
        </button>

        {/* Quick add to cart with slide up animation */}
        <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
          <Button
            onClick={handleAddToCart}
            disabled={loading}
            className="w-full bg-white text-gray-900 hover:bg-primary hover:text-white transition-all duration-300 shadow-lg"
            size="sm"
            data-testid={`add-to-cart-btn-${product.id}`}
          >
            <ShoppingCart className="w-4 h-4 mr-2 group-hover:animate-bounce" />
            Ajouter au panier
          </Button>
        </div>
      </div>

      {/* Content with staggered animations */}
      <div className="p-4">
        {/* Category with reveal animation */}
        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide transform transition-all duration-300 group-hover:text-primary/70 group-hover:translate-x-1">
          {product.category_slug?.replace(/-/g, ' ')}
        </p>

        {/* Name with color transition */}
        <h3 className="font-medium text-sm line-clamp-2 mb-2 transition-colors duration-300 group-hover:text-primary">
          {product.name}
        </h3>

        {/* Rating & Sales */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1 transition-transform duration-300 group-hover:scale-105">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium">{product.rating || '4.5'}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            ({product.reviews_count || 0} avis)
          </span>
          <span className="text-xs text-muted-foreground">
            • {product.sales_count || 0} vendus
          </span>
        </div>

        {/* Location */}
        {(product.city || product.location) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3 transition-all duration-300 group-hover:text-primary/60">
            <MapPin className="w-3 h-3" />
            {product.city || 'Abidjan'}, {product.location || 'Côte d\'Ivoire'}
          </div>
        )}

        {/* Price with scale animation */}
        <div className="flex items-end gap-2 transition-transform duration-300 group-hover:scale-105 origin-left">
          <span className="text-lg font-bold text-primary">
            {formatPrice(displayPrice)}
          </span>
          {hasPromo && (
            <span className="price-original line-through text-muted-foreground text-sm">
              {formatPrice(product.price_fcfa)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 transition-opacity duration-300 group-hover:opacity-70">
          ≈ ${displayPriceUsd || (displayPrice * 0.00165).toFixed(2)}
        </p>
      </div>
    </Link>
  );
};

export default ProductCard;
