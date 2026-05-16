import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const FavoritesPage = () => {
  const { favorites, loading, removeFromFavorites } = useFavorites();
  const { addToCart } = useCart();

  const handleAddAllToCart = async () => {
    let added = 0;
    for (const product of favorites) {
      const success = await addToCart(product.id);
      if (success) added++;
    }
    if (added > 0) {
      toast.success(`${added} produit${added > 1 ? 's' : ''} ajouté${added > 1 ? 's' : ''} au panier`);
    }
  };

  return (
    <div className="min-h-screen py-8" data-testid="favorites-page">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Favoris</span>
        </nav>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500" />
            Mes favoris
            {favorites.length > 0 && (
              <span className="text-lg font-normal text-muted-foreground">
                ({favorites.length})
              </span>
            )}
          </h1>
          
          {favorites.length > 0 && (
            <Button onClick={handleAddAllToCart} disabled={loading}>
              <ShoppingBag className="w-4 h-4 mr-2" /> Tout ajouter au panier
            </Button>
          )}
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Aucun favori</h2>
            <p className="text-muted-foreground mb-8">
              Ajoutez des produits à vos favoris pour les retrouver facilement
            </p>
            <Button asChild size="lg">
              <Link to="/categories">
                Explorer les produits
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {favorites.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
