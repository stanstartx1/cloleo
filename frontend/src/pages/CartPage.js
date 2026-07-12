import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Minus, Plus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';

const formatPrice = (price, currency = 'FCFA') => {
  if (currency === 'FCFA') {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  }
  return '$' + price.toFixed(2);
};

const CartPage = () => {
  const navigate = useNavigate();
  const { cart, loading, updateQuantity, removeFromCart, clearCart } = useCart();

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    await updateQuantity(itemId, newQuantity);
  };

  const handleRemoveItem = async (itemId, productName) => {
    await removeFromCart(itemId);
    toast.success('Article supprimé', {
      description: productName,
    });
  };

  const handleClearCart = async () => {
    await clearCart();
    toast.success('Panier vidé');
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  if (loading && cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8" data-testid="cart-page">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Panier</span>
        </nav>

        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <ShoppingCart className="w-8 h-8" />
          Mon panier
          {cart.item_count > 0 && (
            <span className="text-lg font-normal text-muted-foreground">
              ({cart.item_count} article{cart.item_count > 1 ? 's' : ''})
            </span>
          )}
        </h1>

        {cart.items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Votre panier est vide</h2>
            <p className="text-muted-foreground mb-8">
              Découvrez nos produits et commencez vos achats !
            </p>
            <Button asChild size="lg">
              <Link to="/categories" data-testid="continue-shopping-btn">
                Explorer les produits <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="cart-item bg-card rounded-xl border border-border"
                  data-testid={`cart-item-${item.product.id}`}
                >
                  {/* Product Image */}
                  <Link to={`/produit/${item.product.id}`} className="flex-shrink-0">
                    <img
                      src={item.product.images?.[0] || 'https://via.placeholder.com/120'}
                      alt={item.product.name}
                      className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg"
                    />
                  </Link>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/produit/${item.product.id}`}>
                      <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
                        {item.product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.product.seller_name} • {item.product.city}
                    </p>
                    
                    {Object.keys(item.selected_attributes || {}).length > 0 && (
                      <p className="mt-2 text-xs font-medium text-amber-700">
                        {Object.entries(item.selected_attributes).map(([key, value]) => `${key.replace(/_/g, ' ')} : ${value}`).join(' · ')}
                      </p>
                    )}

                    {/* Price */}
                    <div className="mt-2">
                      {item.unit_price_fcfa ? (
                        <div>
                          <span className="font-bold text-primary">{formatPrice(item.unit_price_fcfa)}</span>
                          {item.product.wholesale_enabled && item.unit_price_fcfa === item.product.wholesale_unit_price_fcfa && <span className="ml-2 text-xs font-semibold text-amber-700">Prix de gros</span>}
                        </div>
                      ) : item.product.promo_price_fcfa ? (
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">
                            {formatPrice(item.product.promo_price_fcfa)}
                          </span>
                          <span className="text-sm line-through text-muted-foreground">
                            {formatPrice(item.product.price_fcfa)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-primary">
                          {formatPrice(item.product.price_fcfa)}
                        </span>
                      )}
                    </div>

                    {/* Quantity & Actions */}
                    <div className="flex items-center justify-between mt-4">
                      <div className="quantity-selector">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || loading}
                          data-testid={`quantity-minus-${item.product.id}`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                          min="1"
                          readOnly
                        />
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={loading}
                          data-testid={`quantity-plus-${item.product.id}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveItem(item.id, item.product.name)}
                        data-testid={`remove-item-${item.product.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                      </Button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="hidden md:block text-right">
                    <p className="text-sm text-muted-foreground">Sous-total</p>
                    <p className="font-bold text-lg">{formatPrice(item.subtotal_fcfa)}</p>
                    <p className="text-xs text-muted-foreground">≈ ${item.subtotal_usd}</p>
                  </div>
                </div>
              ))}

              {/* Clear cart button */}
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleClearCart} disabled={loading}>
                  <Trash2 className="w-4 h-4 mr-2" /> Vider le panier
                </Button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-card rounded-xl border border-border p-6" data-testid="cart-summary">
                <h2 className="text-xl font-bold mb-6">Résumé de la commande</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span>{formatPrice(cart.total_fcfa)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Livraison</span>
                    <span className="text-green-600">Calculée à la caisse</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-end">
                      <span className="font-bold text-lg">Total</span>
                      <div className="text-right">
                        <p className="font-bold text-2xl text-primary" data-testid="cart-total">
                          {formatPrice(cart.total_fcfa)}
                        </p>
                        <p className="text-sm text-muted-foreground">≈ ${cart.total_usd} USD</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={loading}
                  data-testid="checkout-btn"
                >
                  Passer à la caisse <ArrowRight className="ml-2 w-5 h-5" />
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Paiement sécurisé • Satisfait ou remboursé
                </p>

                <div className="mt-6 pt-6 border-t">
                  <Link
                    to="/categories"
                    className="text-sm text-primary hover:underline flex items-center justify-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" /> Continuer mes achats
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
