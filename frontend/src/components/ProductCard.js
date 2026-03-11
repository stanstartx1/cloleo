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
      className={cn("product-card group block bg-card rounded-xl overflow-hidden border border-border hover:border-primary/30", className)}
      data-testid={`product-card-${product.id}`}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.images?.[0] || 'https://via.placeholder.com/400'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {hasPromo && (
            <span className="promo-badge">
              -{Math.round((1 - product.promo_price_fcfa / product.price_fcfa) * 100)}%
            </span>
          )}
          {product.condition === 'neuf' && (
            <span className="new-badge">Neuf</span>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={handleToggleFavorite}
          className={cn(
            "absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all",
            favorite ? "bg-red-500 text-white" : "bg-white/90 text-gray-600 hover:bg-white hover:text-red-500"
          )}
          data-testid={`favorite-btn-${product.id}`}
        >
          <Heart className={cn("w-4 h-4", favorite && "fill-current")} />
        </button>

        {/* Quick add to cart */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            onClick={handleAddToCart}
            disabled={loading}
            className="w-full bg-white text-gray-900 hover:bg-orange-500 hover:text-white"
            size="sm"
            data-testid={`add-to-cart-btn-${product.id}`}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Ajouter au panier
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
          {product.category_slug?.replace(/-/g, ' ')}
        </p>

        {/* Name */}
        <h3 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Rating & Sales */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium">{product.rating}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            ({product.reviews_count} avis)
          </span>
          <span className="text-xs text-muted-foreground">
            • {product.sales_count} vendus
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <MapPin className="w-3 h-3" />
          {product.city}, {product.location}
        </div>

        {/* Price */}
        <div className="flex items-end gap-2">
          <span className="text-lg font-bold text-primary">
            {formatPrice(displayPrice)}
          </span>
          {hasPromo && (
            <span className="price-original">
              {formatPrice(product.price_fcfa)}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          ≈ ${displayPriceUsd}
        </p>
      </div>
    </Link>
  );
};

export default ProductCard;
