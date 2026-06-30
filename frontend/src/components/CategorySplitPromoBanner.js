import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toAbsoluteMediaUrl } from '../utils/media';

const RIGHT_GRADIENTS = [
  'linear-gradient(90deg, #121830 0%, #1e2a5a 35%, #3b1d78 70%, #6d28d9 100%)',
  'linear-gradient(90deg, #0f172a 0%, #1e3a5f 40%, #4338ca 75%, #7c3aed 100%)',
  'linear-gradient(90deg, #1a1033 0%, #312e81 45%, #581c87 80%, #9333ea 100%)',
];

const TILE_BACKGROUNDS = [
  'linear-gradient(145deg, #7c3aed, #db2777)',
  'linear-gradient(145deg, #0f172a, #334155)',
  'linear-gradient(145deg, #fef3c7, #fde68a)',
  'linear-gradient(180deg, #0284c7 0%, #0284c7 50%, #84cc16 50%, #a3e635 100%)',
  'linear-gradient(145deg, #ffffff, #e2e8f0)',
  'linear-gradient(145deg, #ea580c, #c2410c)',
  'linear-gradient(145deg, #ec4899, #f43f5e)',
  'linear-gradient(145deg, #059669, #047857)',
];

const NavArrow = ({ direction, onClick, label, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={`absolute top-1/2 z-30 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50 md:h-10 md:w-10 ${className}`}
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
    .filter(p => getProductImage(p))
    .slice(0, limit);
};

const pickRandomItems = (items, count) =>
  [...items].sort(() => Math.random() - 0.5).slice(0, count);

/* ─── Rangée de 5 tuiles (capture KSP — bas) ─────────────────────────────── */
const PromoTilesRow = ({ categories, products }) => {
  const containerRef = useRef(null);
  const tilesRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [metrics, setMetrics] = useState({ tileWidth: 200, visible: 5, gap: 6 });

  const tiles = useMemo(() => {
    const subs = categories.filter(c => c.parent_slug && c.is_active !== false && c.slug);
    const parents = categories.filter(c => !c.parent_slug && c.is_active !== false && c.slug);
    const pool = subs.length >= 5 ? subs : [...subs, ...parents];
    if (!pool.length) return [];
    if (tilesRef.current !== null) return tilesRef.current;

    const picked = pickRandomItems(pool, Math.min(12, pool.length));
    tilesRef.current = picked.map((cat, i) => {
      const catProducts = getProductsForCategory(cat, categories, products, 1);
      return {
        id: cat.slug,
        name: cat.name,
        link: `/categories/${cat.slug}`,
        image: getCategoryImage(cat) || (catProducts[0] ? getProductImage(catProducts[0]) : null),
        bg: TILE_BACKGROUNDS[i % TILE_BACKGROUNDS.length],
        light: i % 5 === 2 || i % 5 === 4,
      };
    });
    return tilesRef.current;
  }, [categories, products]);

  const updateMetrics = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    let visible = 5;
    if (width < 480) visible = 1;
    else if (width < 640) visible = 2;
    else if (width < 900) visible = 3;
    else if (width < 1200) visible = 4;

    const gap = 6;
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
    }, 2500);
    return () => clearInterval(timer);
  }, [tiles.length, paused, maxIndex]);

  if (!tiles.length) return null;

  const tileHeight = Math.round(metrics.tileWidth * 0.72);

  return (
    <div
      className="relative mt-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {tiles.length > metrics.visible && (
        <>
          <NavArrow
            direction="left"
            onClick={() => setCurrentIndex(i => (i <= 0 ? maxIndex : i - 1))}
            label="Tuiles précédentes"
            className="left-0 -translate-x-1/2"
          />
          <NavArrow
            direction="right"
            onClick={() => setCurrentIndex(i => (i >= maxIndex ? 0 : i + 1))}
            label="Tuiles suivantes"
            className="right-0 translate-x-1/2"
          />
        </>
      )}

      <div ref={containerRef} className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{
            gap: `${metrics.gap}px`,
            transform: `translateX(-${currentIndex * step}px)`,
          }}
        >
          {tiles.map(tile => (
            <Link
              key={tile.id}
              to={tile.link}
              className="group relative shrink-0 overflow-hidden"
              style={{
                width: `${metrics.tileWidth}px`,
                height: `${tileHeight}px`,
                background: tile.bg,
              }}
            >
              {tile.image && (
                <img
                  src={tile.image}
                  alt={tile.name}
                  className="absolute inset-0 h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03] md:p-3"
                  loading="lazy"
                />
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Bannière split KSP : marque gauche + promo droite ──────────────────── */
const CategorySplitPromoBanner = ({ categories = [], products = [] }) => {
  const parentCategories = useMemo(
    () => categories.filter(c => c && c.is_active !== false && !c.parent_slug && c.slug),
    [categories]
  );

  const randomStartRef = useRef(null);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (!parentCategories.length || randomStartRef.current !== null) return;
    randomStartRef.current = Math.floor(Math.random() * parentCategories.length);
    setSlideIndex(randomStartRef.current);
  }, [parentCategories]);

  const count = parentCategories.length;
  const leftCategory = count ? parentCategories[slideIndex] : null;
  const rightCategory = count ? parentCategories[(slideIndex + 1) % count] : null;

  const rightProducts = useMemo(
    () => getProductsForCategory(rightCategory, categories, products, 3),
    [rightCategory, categories, products]
  );

  const leftProducts = useMemo(
    () => getProductsForCategory(leftCategory, categories, products, 1),
    [leftCategory, categories, products]
  );

  if (!leftCategory || !rightCategory) return null;

  const leftImage = getCategoryImage(leftCategory) || (leftProducts[0] ? getProductImage(leftProducts[0]) : null);

  const heroProduct = rightProducts[0] || null;
  const sideProduct = rightProducts[1] || null;
  const rightLink = `/categories/${rightCategory.slug}`;
  const leftLink = `/categories/${leftCategory.slug}`;
  const gradient = RIGHT_GRADIENTS[slideIndex % RIGHT_GRADIENTS.length];

  const goPrev = () => setSlideIndex(i => (i - 1 + count) % count);
  const goNext = () => setSlideIndex(i => (i + 1) % count);

  return (
    <section className="w-full bg-white pb-3 pt-2 md:pb-4 md:pt-3" data-testid="category-split-promo-banner">
      <div className="site-container">
        <div className="relative">
          {count > 1 && (
            <>
              <NavArrow direction="left" onClick={goPrev} label="Slide précédent" className="left-0 -translate-x-1/2" />
              <NavArrow direction="right" onClick={goNext} label="Slide suivant" className="right-0 translate-x-1/2" />
            </>
          )}

          {/* ── Bannière principale ── */}
          <div className="flex h-[130px] overflow-hidden sm:h-[145px] md:h-[160px] lg:h-[175px]">
            {/* Panneau gauche — marque / catégorie (style AirPods) */}
            <Link
              to={leftLink}
              className="group flex w-[22%] min-w-[88px] max-w-[220px] shrink-0 flex-col items-center justify-center bg-white px-2 sm:w-[20%] sm:px-3"
            >
              {leftImage ? (
                <img
                  src={leftImage}
                  alt={leftCategory.name}
                  className="mb-1 max-h-[52px] w-full max-w-[95%] object-contain sm:max-h-[62px] md:max-h-[72px] lg:max-h-[82px]"
                />
              ) : (
                <div className="mb-1 flex h-12 w-12 items-center justify-center text-2xl font-black text-slate-200 md:h-14 md:w-14">
                  {leftCategory.name?.charAt(0)}
                </div>
              )}
              <p className="line-clamp-2 text-center text-[11px] font-bold leading-tight text-slate-900 sm:text-xs md:text-sm lg:text-base">
                {leftCategory.name}
              </p>
            </Link>

            {/* Panneau droit — promo (style Lenovo) */}
            <div className="relative flex flex-1 overflow-hidden" style={{ background: gradient }}>
              <div className="relative z-10 grid h-full w-full grid-cols-[auto_1fr] items-center gap-2 px-3 sm:grid-cols-[auto_1fr_auto] sm:gap-3 sm:px-5 md:px-8 lg:px-10">
                {/* CTA */}
                <div className="flex shrink-0 flex-col items-start justify-center gap-1.5 md:gap-2">
                  <Link
                    to={rightLink}
                    className="inline-flex items-center gap-1 rounded-sm bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 sm:gap-1.5 sm:px-4 sm:py-2 sm:text-[13px] md:px-5 md:text-[14px]"
                  >
                    Voir les détails
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Link>
                  <p className="text-[8px] font-medium uppercase tracking-[0.16em] text-white/55 sm:text-[9px] md:text-[10px]">
                    Sélection Cloléo
                  </p>
                </div>

                {/* Produits — centrés, chevauchés */}
                <div className="relative flex h-full items-center justify-center">
                  {sideProduct && (
                    <img
                      src={getProductImage(sideProduct)}
                      alt={sideProduct.name}
                      className="relative z-10 h-[60px] w-auto max-w-[70px] -translate-y-1 object-contain drop-shadow-lg sm:h-[75px] sm:max-w-[90px] md:h-[95px] md:max-w-[110px] lg:h-[115px] lg:max-w-[130px]"
                      style={{ marginRight: '-18px' }}
                    />
                  )}
                  {heroProduct && (
                    <div className="relative z-20">
                      <img
                        src={getProductImage(heroProduct)}
                        alt={heroProduct.name}
                        className="h-[72px] w-auto max-w-[80px] object-contain drop-shadow-2xl sm:h-[90px] sm:max-w-[100px] md:h-[115px] md:max-w-[125px] lg:h-[140px] lg:max-w-[150px]"
                      />
                      <span className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full bg-violet-200/95 text-[7px] font-bold leading-none text-violet-900 shadow sm:-right-2 sm:-top-2 sm:h-11 sm:w-11 sm:text-[8px] md:text-[9px]">
                        Promo !
                      </span>
                    </div>
                  )}
                </div>

                {/* Grand titre — masqué sur très petit écran */}
                <div className="hidden shrink-0 pr-1 text-right sm:block md:pr-2">
                  <p className="text-lg font-black leading-none tracking-tight text-white md:text-2xl lg:text-[28px] xl:text-[32px]">
                    {rightCategory.name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── 5 tuiles promo en dessous ── */}
          <PromoTilesRow categories={categories} products={products} />
        </div>
      </div>
    </section>
  );
};

export default CategorySplitPromoBanner;
