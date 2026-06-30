import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toAbsoluteMediaUrl } from '../utils/media';

const GRADIENTS = [
  'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #581c87 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #4338ca 55%, #701a75 100%)',
  'linear-gradient(135deg, #0c4a6e 0%, #1d4ed8 55%, #4338ca 100%)',
  'linear-gradient(135deg, #14532d 0%, #065f46 55%, #134e4a 100%)',
  'linear-gradient(135deg, #431407 0%, #9a3412 55%, #7c2d12 100%)',
];

const TILE_GRADIENTS = [
  { bg: 'linear-gradient(145deg, #7c3aed 0%, #a855f7 45%, #ec4899 100%)', light: false },
  { bg: 'linear-gradient(145deg, #0f172a 0%, #1e293b 55%, #334155 100%)', light: false },
  { bg: 'linear-gradient(145deg, #fef9c3 0%, #fde68a 55%, #fcd34d 100%)', light: true },
  { bg: 'linear-gradient(180deg, #0ea5e9 0%, #0ea5e9 48%, #84cc16 48%, #a3e635 100%)', light: false },
  { bg: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 55%, #e2e8f0 100%)', light: true },
  { bg: 'linear-gradient(145deg, #f97316 0%, #ea580c 55%, #c2410c 100%)', light: false },
  { bg: 'linear-gradient(145deg, #ec4899 0%, #f43f5e 55%, #fb7185 100%)', light: false },
];

const NavArrow = ({ direction, onClick, label, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={`absolute top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-md transition hover:bg-slate-50 md:h-10 md:w-10 ${className}`}
  >
    {direction === 'left' ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
  </button>
);

const getCategoryImage = (category) => {
  const banner = category?.banner_images?.[0];
  if (banner) return toAbsoluteMediaUrl(banner);
  if (category?.image) return toAbsoluteMediaUrl(category.image);
  return null;
};

const getProductImage = (product) =>
  toAbsoluteMediaUrl(product?.images?.[0] || product?.main_image || product?.image || '');

const getProductsForCategory = (category, categories, products, limit = 3) => {
  if (!category) return [];
  const subSlugs = new Set(
    categories.filter(c => c.parent_slug === category.slug).map(c => c.slug)
  );
  return products
    .filter(p =>
      p.category_slug === category.slug ||
      p.category_id === category.id ||
      subSlugs.has(p.category_slug) ||
      subSlugs.has(p.subcategory_slug)
    )
    .slice(0, limit);
};

const pickRandomItems = (items, count) =>
  [...items].sort(() => Math.random() - 0.5).slice(0, count);

/* ─── Rangée de 5 tuiles promo (capture KSP) ─────────────────────────────── */
const PromoTilesRow = ({ categories, products }) => {
  const containerRef = useRef(null);
  const tilesRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [metrics, setMetrics] = useState({ tileWidth: 200, visible: 5, gap: 10 });

  const tiles = useMemo(() => {
    const subs = categories.filter(c => c.parent_slug && c.is_active !== false && c.slug);
    const parents = categories.filter(c => !c.parent_slug && c.is_active !== false && c.slug);
    const pool = subs.length >= 5 ? subs : [...subs, ...parents];
    if (!pool.length) return [];
    if (tilesRef.current !== null) return tilesRef.current;

    const picked = pickRandomItems(pool, Math.min(10, pool.length));
    tilesRef.current = picked.map((cat, i) => {
      const catProducts = getProductsForCategory(cat, categories, products, 1);
      const productImg = catProducts[0] ? getProductImage(catProducts[0]) : null;
      const style = TILE_GRADIENTS[i % TILE_GRADIENTS.length];
      return {
        id: cat.slug,
        name: cat.name,
        link: `/categories/${cat.slug}`,
        image: getCategoryImage(cat) || productImg,
        ...style,
      };
    });
    return tilesRef.current;
  }, [categories, products]);

  const updateMetrics = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    let visible = 5;
    if (width < 640) visible = 1;
    else if (width < 768) visible = 2;
    else if (width < 1024) visible = 3;
    else if (width < 1280) visible = 4;

    const gap = width < 640 ? 8 : 10;
    const tileWidth = Math.floor((width - gap * (visible - 1)) / visible);
    setMetrics({ tileWidth, visible, gap });
  }, []);

  useEffect(() => {
    updateMetrics();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateMetrics);
    ro.observe(el);
    window.addEventListener('resize', updateMetrics);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateMetrics);
    };
  }, [updateMetrics]);

  const maxIndex = Math.max(0, tiles.length - metrics.visible);
  const step = metrics.tileWidth + metrics.gap;

  useEffect(() => {
    if (!tiles.length || paused || maxIndex === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex(i => (i >= maxIndex ? 0 : i + 1));
    }, 2000);
    return () => clearInterval(timer);
  }, [tiles.length, paused, maxIndex]);

  const goPrev = () => setCurrentIndex(i => (i <= 0 ? maxIndex : i - 1));
  const goNext = () => setCurrentIndex(i => (i >= maxIndex ? 0 : i + 1));

  if (!tiles.length) return null;

  return (
    <div
      className="relative mt-2.5 md:mt-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {tiles.length > metrics.visible && (
        <>
          <NavArrow
            direction="left"
            onClick={goPrev}
            label="Tuiles précédentes"
            className="left-0 -translate-x-1/2"
          />
          <NavArrow
            direction="right"
            onClick={goNext}
            label="Tuiles suivantes"
            className="right-0 translate-x-1/2"
          />
        </>
      )}

      <div ref={containerRef} className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out will-change-transform"
          style={{
            gap: `${metrics.gap}px`,
            transform: `translateX(-${currentIndex * step}px)`,
          }}
        >
          {tiles.map(tile => (
            <Link
              key={tile.id}
              to={tile.link}
              className="group relative shrink-0 overflow-hidden rounded-md"
              style={{
                width: `${metrics.tileWidth}px`,
                height: `${Math.round(metrics.tileWidth * 0.62)}px`,
                background: tile.bg,
              }}
            >
              {tile.image && (
                <img
                  src={tile.image}
                  alt={tile.name}
                  className="absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              <div
                className={`absolute inset-x-0 bottom-0 z-10 px-3 py-2 ${
                  tile.light
                    ? 'bg-gradient-to-t from-white/95 via-white/70 to-transparent'
                    : 'bg-gradient-to-t from-black/55 via-black/20 to-transparent'
                }`}
              >
                <p
                  className={`truncate text-xs font-bold md:text-sm ${
                    tile.light ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {tile.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Bloc complet : bannière split + tuiles ─────────────────────────────── */
const CategorySplitPromoBanner = ({ categories = [], products = [] }) => {
  const parentCategories = useMemo(
    () => categories.filter(c => c && c.is_active !== false && !c.parent_slug && c.slug),
    [categories]
  );

  const randomStartRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!parentCategories.length || randomStartRef.current !== null) return;
    randomStartRef.current = Math.floor(Math.random() * parentCategories.length);
    setActiveIndex(randomStartRef.current);
  }, [parentCategories]);

  const activeCategory = parentCategories[activeIndex] || null;

  const categoryProducts = useMemo(
    () => getProductsForCategory(activeCategory, categories, products, 3),
    [activeCategory, products, categories]
  );

  if (!activeCategory) return null;

  const categoryImage = getCategoryImage(activeCategory);
  const heroProduct = categoryProducts[0] || null;
  const sideProduct = categoryProducts[1] || null;
  const categoryLink = `/categories/${activeCategory.slug}`;
  const gradient = GRADIENTS[activeIndex % GRADIENTS.length];
  const subCount = activeCategory.subcategories_count || 0;

  const goPrev = () => setActiveIndex(i => (i - 1 + parentCategories.length) % parentCategories.length);
  const goNext = () => setActiveIndex(i => (i + 1) % parentCategories.length);

  return (
    <section className="w-full bg-white pb-4 pt-3 md:pb-5 md:pt-4" data-testid="category-split-promo-banner">
      <div className="site-container">
        {/* ── Bannière principale split ── */}
        <div className="relative">
          {parentCategories.length > 1 && (
            <>
              <NavArrow
                direction="left"
                onClick={goPrev}
                label="Catégorie précédente"
                className="left-0 -translate-x-1/2"
              />
              <NavArrow
                direction="right"
                onClick={goNext}
                label="Catégorie suivante"
                className="right-0 translate-x-1/2"
              />
            </>
          )}

          <div className="flex h-[150px] overflow-hidden md:h-[175px] lg:h-[190px]">
            {/* Panneau gauche */}
            <Link
              to={categoryLink}
              className="group relative flex w-[26%] min-w-[100px] max-w-[260px] shrink-0 flex-col items-center justify-center bg-[#f2f2f2] px-3 transition hover:bg-[#eaeaea] md:px-5"
            >
              {categoryImage ? (
                <img
                  src={categoryImage}
                  alt={activeCategory.name}
                  className="mb-1.5 max-h-[60px] max-w-[90%] object-contain transition-transform duration-300 group-hover:scale-105 md:mb-2 md:max-h-[78px]"
                />
              ) : heroProduct ? (
                <img
                  src={getProductImage(heroProduct)}
                  alt={activeCategory.name}
                  className="mb-1.5 max-h-[60px] max-w-[90%] object-contain md:mb-2 md:max-h-[78px]"
                />
              ) : (
                <div className="mb-1.5 flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl font-black text-slate-300 md:mb-2 md:h-16 md:w-16 md:text-2xl">
                  {activeCategory.name?.charAt(0) || 'C'}
                </div>
              )}
              <p className="text-center text-sm font-bold tracking-tight text-slate-900 md:text-base lg:text-lg">
                {activeCategory.name}
              </p>
            </Link>

            {/* Panneau droit */}
            <div className="relative flex flex-1 items-stretch overflow-hidden" style={{ background: gradient }}>
              <div className="relative z-10 flex h-full w-full items-center">
                {/* CTA + sous-titre */}
                <div className="flex shrink-0 flex-col justify-center gap-2.5 px-4 py-3 md:gap-3 md:px-7 lg:px-9">
                  <Link
                    to={categoryLink}
                    className="inline-flex w-fit items-center gap-1.5 rounded bg-white px-3.5 py-2 text-[13px] font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 md:gap-2 md:px-5 md:py-2.5 md:text-[15px]"
                  >
                    Voir les détails
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <p className="max-w-[180px] text-[10px] font-medium uppercase tracking-[0.14em] text-white/65 md:text-[11px]">
                    {subCount > 0
                      ? `${subCount} sous-catégorie${subCount > 1 ? 's' : ''}`
                      : 'Sélection Cloléo'}
                  </p>
                </div>

                {/* Visuels produits centrés */}
                <div className="relative flex flex-1 items-end justify-center pb-2 pt-4">
                  {sideProduct && (
                    <img
                      src={getProductImage(sideProduct)}
                      alt={sideProduct.name}
                      className="relative z-10 -mr-4 h-[70px] w-auto max-w-[80px] object-contain drop-shadow-lg md:-mr-6 md:h-[95px] md:max-w-[110px] lg:h-[110px]"
                    />
                  )}
                  {heroProduct && (
                    <div className="relative z-20">
                      <img
                        src={getProductImage(heroProduct)}
                        alt={heroProduct.name}
                        className="h-[85px] w-auto max-w-[100px] object-contain drop-shadow-2xl md:h-[115px] md:max-w-[130px] lg:h-[135px] lg:max-w-[150px]"
                      />
                      <span className="absolute -right-1 top-0 flex h-12 w-12 flex-col items-center justify-center rounded-full bg-violet-200/95 text-center text-[8px] font-bold leading-tight text-violet-900 shadow md:-right-2 md:h-14 md:w-14 md:text-[9px]">
                        Promo !
                      </span>
                    </div>
                  )}
                </div>

                {/* Titre à droite */}
                <div className="hidden shrink-0 px-6 text-right lg:block xl:px-10">
                  <p className="text-[26px] font-black leading-[1.08] tracking-tight text-white xl:text-[32px]">
                    {activeCategory.name}
                  </p>
                  {activeCategory.description && (
                    <p className="mt-1.5 line-clamp-2 max-w-[240px] text-sm text-white/70">
                      {activeCategory.description}
                    </p>
                  )}
                </div>
              </div>

              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse at 70% 50%, rgba(255,255,255,0.12) 0%, transparent 60%)',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Rangée de tuiles promo ── */}
        <PromoTilesRow categories={categories} products={products} />
      </div>
    </section>
  );
};

export default CategorySplitPromoBanner;
