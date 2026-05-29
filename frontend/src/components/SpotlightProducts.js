import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Star, Heart, ShoppingCart, Zap, Crown, TrendingUp, Award } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '../context/CartContext';
import { useFavorites } from '../context/FavoritesContext';
import { toast } from 'sonner';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const SpotlightProducts = () => {
  const [products, setProducts] = useState([]);
  const [activeProduct, setActiveProduct] = useState(0);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    fetchProducts();
  }, []);

  // Auto-rotate spotlight
  useEffect(() => {
    if (products.length <= 1) return;
    
    const interval = setInterval(() => {
      setActiveProduct((prev) => (prev + 1) % Math.min(products.length, 5));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [products.length]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products/featured?limit=5`);
      setProducts(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product, e) => {
    e.preventDefault();
    addToCart(product);
    toast.success('Ajouté au panier !');
  };

  if (loading || products.length === 0) return null;

  const mainProduct = products[activeProduct];

  return (
    <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-amber-400/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full mb-4">
            <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
            <span className="text-amber-400 font-semibold text-sm">TOP VENDEURS</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-2">
            Coup de <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Projecteur</span>
          </h2>
          <p className="text-slate-400">Les produits stars de notre marketplace</p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Main Product Display */}
          <div className="relative">
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Glow ring */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl blur-2xl opacity-30 animate-pulse" />
              
              {/* Image container */}
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl overflow-hidden border border-amber-500/20 shadow-2xl">
                <img
                  src={mainProduct?.images?.[0] || 'https://via.placeholder.com/500'}
                  alt={mainProduct?.name}
                  className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
                
                {/* Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full">
                  <Award className="w-4 h-4 text-white" />
                  <span className="text-white text-sm font-bold">Spotlight #{activeProduct + 1}</span>
                </div>
                
                {/* Product info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{mainProduct?.name}</h3>
                  <p className="text-slate-300 text-sm mb-4 line-clamp-2">{mainProduct?.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-bold text-amber-400">
                        {formatPrice(mainProduct?.promo_price_fcfa || mainProduct?.price_fcfa)}
                      </span>
                      <span className="text-amber-400 text-sm ml-1">FCFA</span>
                      {mainProduct?.promo_price_fcfa && (
                        <span className="text-slate-500 line-through ml-2 text-lg">
                          {formatPrice(mainProduct?.price_fcfa)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="lg"
                        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-orange-500/25"
                        onClick={(e) => handleAddToCart(mainProduct, e)}
                      >
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Acheter
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        className={`border-amber-500/50 hover:bg-amber-500/10 ${isFavorite(mainProduct?.id) ? 'text-red-500 border-red-500/50' : 'text-amber-400'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          toggleFavorite(mainProduct);
                        }}
                      >
                        <Heart className={`w-5 h-5 ${isFavorite(mainProduct?.id) ? 'fill-red-500' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product List */}
          <div className="space-y-4">
            {products.slice(0, 5).map((product, index) => (
              <SpotlightListItem
                key={product.id}
                product={product}
                index={index}
                isActive={index === activeProduct}
                onClick={() => setActiveProduct(index)}
              />
            ))}
            
            {/* CTA */}
            <Link
              to="/produits"
              className="flex items-center justify-center gap-2 mt-6 py-4 border border-dashed border-amber-500/30 rounded-xl text-amber-400 hover:bg-amber-500/10 transition-all duration-300 group"
            >
              <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-semibold">Découvrir tous les produits</span>
            </Link>
          </div>
        </div>
      </div>

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
        }
        .animate-float {
          animation: float 5s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
};

const SpotlightListItem = ({ product, index, isActive, onClick }) => {
  const planBadge = {
    entreprise: { icon: Crown, color: 'text-purple-400' },
    commercant: { icon: Star, color: 'text-amber-400' },
    artisan: { icon: Award, color: 'text-blue-400' },
  };
  
  const badge = planBadge[product.seller?.subscription_plan];

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${
        isActive 
          ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 shadow-lg shadow-amber-500/10' 
          : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'
      }`}
    >
      {/* Number */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${
        isActive ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'bg-slate-700 text-slate-400'
      }`}>
        {index + 1}
      </div>
      
      {/* Image */}
      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={product.images?.[0] || 'https://via.placeholder.com/64'}
          alt={product.name}
          className={`w-full h-full object-cover transition-all duration-500 ${isActive ? 'scale-110' : ''}`}
        />
      </div>
      
      {/* Info */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <h4 className={`font-semibold truncate transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-300'}`}>
            {product.name}
          </h4>
          {badge && <badge.icon className={`w-4 h-4 ${badge.color}`} />}
        </div>
        <p className="text-sm text-slate-500 truncate">{product.seller?.shop_name || product.seller?.name}</p>
      </div>
      
      {/* Price */}
      <div className="text-right">
        <p className={`font-bold transition-colors duration-300 ${isActive ? 'text-amber-400' : 'text-slate-400'}`}>
          {formatPrice(product.promo_price_fcfa || product.price_fcfa)}
        </p>
        <p className="text-xs text-slate-500">FCFA</p>
      </div>
      
      {/* Active indicator */}
      <div className={`w-1 h-12 rounded-full transition-all duration-500 ${isActive ? 'bg-gradient-to-b from-amber-500 to-orange-500' : 'bg-transparent'}`} />
    </button>
  );
};

export default SpotlightProducts;
