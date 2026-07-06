import React, { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { toAbsoluteMediaUrl } from '../utils/media';

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

const DISPOSITIONS = [
  {
    id: 'uniform',
    grid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7',
    gap: 'gap-4',
    imageClass: 'aspect-square object-cover',
    rounding: 'rounded-lg',
    padding: 'p-1',
    imageBg: 'bg-slate-50',
  },
  {
    id: 'compact',
    grid: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8',
    gap: 'gap-2.5',
    imageClass: 'aspect-square object-contain p-2',
    rounding: 'rounded-xl',
    padding: 'p-0.5',
    imageBg: 'bg-white border border-slate-100',
  },
  {
    id: 'large',
    grid: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
    gap: 'gap-5',
    imageClass: 'aspect-[4/5] object-cover',
    rounding: 'rounded-2xl',
    padding: 'p-2',
    imageBg: 'bg-slate-100',
  },
  {
    id: 'showcase',
    grid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
    gap: 'gap-3',
    imageClass: 'aspect-square object-cover',
    rounding: 'rounded-xl',
    padding: 'p-1',
    imageBg: 'bg-slate-50',
    featuredSpan: 'col-span-2 row-span-2',
    featuredImageClass: 'aspect-square object-cover min-h-[180px] sm:min-h-[220px]',
  },
  {
    id: 'editorial',
    grid: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    gap: 'gap-4',
    imageClass: 'aspect-[3/4] object-cover',
    rounding: 'rounded-2xl',
    padding: 'p-2',
    imageBg: 'bg-neutral-100',
  },
  {
    id: 'dense',
    grid: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8',
    gap: 'gap-2',
    imageClass: 'aspect-square object-contain p-1',
    rounding: 'rounded-md',
    padding: 'p-0.5',
    imageBg: 'bg-white',
  },
];

const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const ProductCard = ({ product, index, disposition, isFeatured, onImageMissing }) => {
  const price = getDisplayPrice(product);
  const base = getBasePrice(product);
  const discount = getDiscount(product);
  const imgClass = isFeatured && disposition.featuredImageClass
    ? disposition.featuredImageClass
    : disposition.imageClass;

  return (
    <Link
      to={`/produit/${product.id}`}
      className={`group relative block bg-white transition-all duration-200 hover:z-10 hover:-translate-y-0.5 hover:shadow-md ${disposition.padding} ${
        isFeatured && disposition.featuredSpan ? disposition.featuredSpan : ''
      }`}
    >
      <div className={`relative overflow-hidden ${disposition.rounding} ${disposition.imageBg}`}>
        <img
          src={getImage(product)}
          alt={product.name}
          className={`w-full transition-transform duration-300 group-hover:scale-105 ${imgClass}`}
          loading="lazy"
          onError={() => onImageMissing?.(product.id)}
        />
        {discount && (
          <span className="absolute right-1 top-1 rounded-full bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            -{discount}%
          </span>
        )}
        {!discount && index < 3 && (
          <span className="absolute left-1 top-1 rounded bg-red-600 px-1 py-0.5 text-[9px] font-bold uppercase text-white">
            Hot
          </span>
        )}
      </div>
      <div className="pt-1.5">
        <p className="line-clamp-2 min-h-[2rem] text-[10px] font-medium leading-tight text-slate-700 group-hover:text-red-600 md:text-[11px]">
          {product.name}
        </p>
        <p className="mt-1 text-[13px] font-black text-slate-950 md:text-[14px]">
          {price.toLocaleString('fr-FR')} FCFA
        </p>
        {base && base > price && (
          <p className="text-[9px] text-slate-400 line-through">
            {base.toLocaleString('fr-FR')} FCFA
          </p>
        )}
      </div>
    </Link>
  );
};

const HomeRandomLayoutProducts = ({ loading, products = [], onImageMissing }) => {
  const sessionRef = useRef(null);

  const session = useMemo(() => {
    if (sessionRef.current) return sessionRef.current;
    const disposition = DISPOSITIONS[Math.floor(Math.random() * DISPOSITIONS.length)];
    sessionRef.current = { disposition };
    return sessionRef.current;
  }, []);

  const displayProducts = useMemo(() => {
    const withImage = products.filter(p => getImage(p));
    const shuffled = shuffleArray(withImage);
    const count = session.disposition.id === 'showcase' ? 11 : session.disposition.id === 'large' ? 10 : 14;
    return shuffled.slice(0, count);
  }, [products, session.disposition.id]);

  const { disposition } = session;

  return (
    <section className="w-full bg-white py-6 md:py-8" data-testid="home-random-layout-products">
      <div className="site-container">
        {loading ? (
          <div className={`grid ${disposition.grid} ${disposition.gap}`}>
            {[...Array(14)].map((_, i) => (
              <div key={i} className="p-2">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="mt-2 h-3 w-11/12" />
                <Skeleton className="mt-2 h-4 w-20" />
              </div>
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="py-14 text-center text-slate-400">
            <Sparkles className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p className="font-semibold">Aucun produit disponible</p>
          </div>
        ) : (
          <div className={`grid ${disposition.grid} ${disposition.gap}`}>
            {displayProducts.map((product, index) => (
              <ProductCard
                key={`random-layout-${product.id}`}
                product={product}
                index={index}
                disposition={disposition}
                isFeatured={disposition.id === 'showcase' && index === 0}
                onImageMissing={onImageMissing}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeRandomLayoutProducts;
