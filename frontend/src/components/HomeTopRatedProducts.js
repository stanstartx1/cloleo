import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { toAbsoluteMediaUrl } from '../utils/media';

const getHomeProductDisplayPrice = (product) => {
  const promoFcfa = Number(product.promo_price_fcfa || 0);
  const priceFcfa = Number(product.price_fcfa || 0);
  const discountPrice = Number(product.discount_price || 0);
  const legacyPrice = Number(product.price || 0);

  if (promoFcfa > 0 && priceFcfa > 0 && promoFcfa < priceFcfa) return promoFcfa;
  if (priceFcfa > 0) return priceFcfa;
  if (discountPrice > 0) return discountPrice;
  if (legacyPrice > 0) return legacyPrice;
  return 0;
};

const getHomeProductBasePrice = (product) => {
  const priceFcfa = Number(product.price_fcfa || 0);
  const legacyPrice = Number(product.price || 0);
  return priceFcfa > 0 ? priceFcfa : legacyPrice;
};

const getHomeProductDiscount = (product) => {
  const base = getHomeProductBasePrice(product);
  const display = getHomeProductDisplayPrice(product);
  if (!base || !display || display >= base) return null;
  return Math.round((1 - display / base) * 100);
};

const getHomeProductImage = (product) =>
  toAbsoluteMediaUrl(product.images?.[0] || product.main_image || product.image || '');

const HomeTopProductCard = ({ product, index, onImageMissing }) => {
  const price = getHomeProductDisplayPrice(product);
  const basePrice = getHomeProductBasePrice(product);
  const discount = getHomeProductDiscount(product);
  const badgeText = discount ? `-${discount}%` : product.is_featured ? 'Top' : index < 4 ? 'Hot' : null;

  return (
    <Link
      to={`/produit/${product.id}`}
      className="group relative block bg-white p-1 transition-all duration-200 hover:z-10 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative overflow-hidden rounded-lg bg-slate-50">
        <img
          src={getHomeProductImage(product)}
          alt={product.name}
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={() => onImageMissing(product.id)}
        />
        {badgeText && (
          <span className="absolute right-1 top-1 rounded-full bg-orange-500 px-1 py-0.5 text-[9px] font-bold text-white shadow-sm">
            {badgeText}
          </span>
        )}
        {product.is_featured && (
          <span className="absolute left-1 top-1 rounded bg-red-600 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            Choix
          </span>
        )}
      </div>
      <div className="pt-1">
        <p className="line-clamp-2 min-h-[2rem] text-[10px] font-medium leading-tight text-slate-700 group-hover:text-red-600 md:text-[11px]">
          {product.name}
        </p>
        <p className="mt-1 text-[13px] font-black text-slate-950 md:text-[14px]">
          {price.toLocaleString()} FCFA
        </p>
        {basePrice > price && (
          <p className="text-[9px] text-slate-400 line-through">
            {basePrice.toLocaleString()} FCFA
          </p>
        )}
      </div>
    </Link>
  );
};

const HomeTopRatedProducts = ({ loading, topRatedProducts, onImageMissing }) => {
  return (
    <div className="w-full bg-white">
      <div className="site-container">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
            {[...Array(14)].map((_, i) => (
              <div key={`top-skeleton-${i}`} className="bg-white p-2">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="mt-2 h-3 w-11/12" />
                <Skeleton className="mt-2 h-4 w-20" />
              </div>
            ))}
          </div>
        ) : topRatedProducts.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <Star className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p className="font-semibold">Aucun produit disponible pour le moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
            {topRatedProducts.map((product, index) => (
              <HomeTopProductCard
                key={`top-rated-${product.id}`}
                product={product}
                index={index}
                onImageMissing={onImageMissing}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeTopRatedProducts;
