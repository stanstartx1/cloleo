import React from 'react';
import { Link } from 'react-router-dom';
import { toAbsoluteMediaUrl } from '../utils/media';
import { Sparkles, TrendingUp, ArrowRight } from 'lucide-react';

const getDisplayPrice = (product) => {
  const promo = Number(product.promo_price_fcfa || 0);
  const price = Number(product.price_fcfa || product.price || 0);
  if (promo > 0 && price > 0 && promo < price) return promo;
  return price;
};

const getBasePrice = (product) => {
  const price = Number(product.price_fcfa || product.price || 0);
  return price > 0 ? price : null;
};

const getDiscount = (product) => {
  const base = getBasePrice(product);
  const display = getDisplayPrice(product);
  if (!base || !display || display >= base) return null;
  return Math.round((1 - display / base) * 100);
};

const getImage = (product) =>
  toAbsoluteMediaUrl(product.images?.[0] || product.main_image || product.image || '');

const ProductCard = ({ product, index }) => {
  const price = getDisplayPrice(product);
  const base = getBasePrice(product);
  const discount = getDiscount(product);

  return (
    <Link
      to={`/produit/${product.id}`}
      className="group relative block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
        <img
          src={getImage(product)}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {discount && (
          <span className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            -{discount}%
          </span>
        )}
        {index < 3 && !discount && (
          <span className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            Hot
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium text-slate-700 group-hover:text-orange-600 transition-colors min-h-[2.5rem]">
          {product.name}
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-black text-slate-900">
            {price.toLocaleString('fr-FR')} FCFA
          </span>
          {base && base > price && (
            <span className="text-xs text-slate-400 line-through">
              {base.toLocaleString('fr-FR')}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

const FeaturedProductsSection = ({ products = [] }) => {
  const displayProducts = products.slice(0, 8);

  if (displayProducts.length === 0) return null;

  return (
    <section className="w-full bg-white">
      {/* Separator */}
      <div className="w-full bg-gradient-to-r from-transparent via-orange-200 to-transparent h-px" />
      
      <div className="site-container py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-xl shadow-lg">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900">
                Sélection <span className="text-orange-500">Premium</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Les meilleurs choix pour vous</p>
            </div>
          </div>
          <Link
            to="/produits?featured=true"
            className="hidden sm:flex items-center gap-2 text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors group"
          >
            Voir tout
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
          {displayProducts.map((product, index) => (
            <ProductCard key={`featured-${product.id}`} product={product} index={index} />
          ))}
        </div>

        {/* Mobile View All Button */}
        <div className="mt-6 sm:hidden">
          <Link
            to="/produits?featured=true"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all"
          >
            Voir tout <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Bottom Separator */}
      <div className="w-full bg-gradient-to-r from-transparent via-orange-200 to-transparent h-px" />
    </section>
  );
};

export default FeaturedProductsSection;
