import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
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

const MarketplaceStripProductCard = ({ product, index, onImageMissing }) => {
  const price = getHomeProductDisplayPrice(product);
  const basePrice = getHomeProductBasePrice(product);
  const discount = getHomeProductDiscount(product);
  const badgeText = discount ? `-${discount}%` : index < 2 ? 'Smart' : null;

  return (
    <Link
      to={`/produit/${product.id}`}
      className="group relative min-w-[142px] max-w-[142px] bg-white p-1.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:min-w-[158px] sm:max-w-[158px] md:min-w-0 md:max-w-none"
    >
      <div className="relative aspect-[1.08] overflow-hidden rounded-md bg-slate-50">
        <img
          src={getHomeProductImage(product)}
          alt={product.name}
          className="h-full w-full object-contain object-center p-1.5 transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={() => onImageMissing(product.id)}
        />
        {badgeText && (
          <span className="absolute left-1 top-1 rounded-sm bg-red-600 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
            {badgeText}
          </span>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 min-h-[1.9rem] text-[10px] font-semibold leading-tight text-slate-800 group-hover:text-orange-600">
        {product.name}
      </p>
      <p className="mt-0.5 text-[11px] font-black leading-tight text-slate-950">
        {price.toLocaleString()} FCFA
      </p>
      {basePrice > price && (
        <p className="text-[9px] leading-tight text-slate-400 line-through">
          {basePrice.toLocaleString()} FCFA
        </p>
      )}
    </Link>
  );
};

const MarketplaceProductStrip = ({ title, href, products, tone = 'orange', onImageMissing }) => {
  const tones = {
    red: 'bg-red-600 text-white',
    orange: 'bg-amber-400 text-slate-950',
    green: 'bg-emerald-500 text-white',
    cyan: 'bg-cyan-500 text-white',
  };

  if (!products.length) return null;

  return (
    <section className="border-b-4 border-cyan-500 bg-white">
      <div className={`flex items-center justify-between px-3 py-2 text-xs font-black md:px-4 ${tones[tone] || tones.orange}`}>
        <h2 className="truncate">{title}</h2>
        <Link to={href} className="ml-3 shrink-0 text-[10px] font-bold hover:underline">
          Voir plus <ArrowRight className="ml-1 inline h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-flow-col auto-cols-[142px] gap-2 overflow-x-auto px-2 py-2 no-scrollbar sm:auto-cols-[158px] md:grid-flow-row md:grid-cols-6 lg:grid-cols-7">
        {products.map((product, index) => (
          <MarketplaceStripProductCard
            key={`${title}-${product.id}`}
            product={product}
            index={index}
            onImageMissing={onImageMissing}
          />
        ))}
      </div>
    </section>
  );
};

const MarketplaceProductStrips = ({ marketplaceProductStrips, onImageMissing }) => (
  <>
    {marketplaceProductStrips.map((strip) => (
      <MarketplaceProductStrip
        key={strip.title}
        title={strip.title}
        href={strip.href}
        tone={strip.tone}
        products={strip.products}
        onImageMissing={onImageMissing}
      />
    ))}
  </>
);

export default MarketplaceProductStrips;
