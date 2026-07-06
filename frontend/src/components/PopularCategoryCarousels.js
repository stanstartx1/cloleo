import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toAbsoluteMediaUrl } from '../utils/media';

const getProductImage = (product) =>
  toAbsoluteMediaUrl(product?.images?.[0] || product?.main_image || product?.image || '');

const getVisibleCount = (width) => {
  if (width >= 1280) return 7;
  if (width >= 1024) return 6;
  if (width >= 768) return 4;
  if (width >= 480) return 3;
  return 2;
};

const getProductsForCategory = (category, categories, products, limit = 24) => {
  if (!category) return [];
  const subSlugs = new Set(
    categories.filter(c => c.parent_slug === category.slug).map(c => c.slug)
  );
  const filtered = products.filter(p =>
    p.category_slug === category.slug ||
    p.category_id === category.id ||
    subSlugs.has(p.category_slug) ||
    subSlugs.has(p.subcategory_slug)
  );
  const pool = filtered.length ? filtered : products;
  return pool
    .filter(p => getProductImage(p))
    .slice(0, limit);
};

const CarouselRow = ({ category, products }) => {
  const containerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [metrics, setMetrics] = useState({ itemWidth: 120, visible: 2, gap: 12 });

  const updateMetrics = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    const visible = getVisibleCount(width);
    const gap = width < 640 ? 10 : 16;
    const padding = width < 640 ? 72 : 96;
    const itemWidth = Math.max(90, Math.floor((width - padding - gap * (visible - 1)) / visible));
    setMetrics({ itemWidth, visible, gap });
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

  const maxIndex = Math.max(0, products.length - metrics.visible);
  const step = metrics.itemWidth + metrics.gap;

  useEffect(() => {
    setCurrentIndex(0);
  }, [category?.slug, products.length]);

  useEffect(() => {
    if (!products.length || paused || maxIndex === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex(i => (i >= maxIndex ? 0 : i + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [products.length, paused, maxIndex]);

  const goPrev = () => setCurrentIndex(i => (i <= 0 ? maxIndex : i - 1));
  const goNext = () => setCurrentIndex(i => (i >= maxIndex ? 0 : i + 1));

  if (!category || !products.length) return null;

  const categoryLink = `/categories/${category.slug}`;

  return (
    <section className="w-full border-t border-[#e4e7eb] bg-white" data-testid={`popular-carousel-${category.slug}`}>
      {/* Bandeau titre gris */}
      <div className="w-full bg-[#eef0f3] py-2.5 md:py-3">
        <div className="site-container">
          <Link
            to={categoryLink}
            className="block text-center text-[13px] font-semibold text-slate-800 transition hover:text-blue-600 md:text-[15px]"
          >
            Populaires · {category.name}
          </Link>
        </div>
      </div>

      {/* Carrousel produits */}
      <div
        className="relative py-3 md:py-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div ref={containerRef} className="site-container relative">
          {products.length > metrics.visible && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Produits précédents"
                className="absolute left-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-500 shadow-sm backdrop-blur-sm transition hover:bg-white md:h-9 md:w-9"
              >
                <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Produits suivants"
                className="absolute right-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-500 shadow-sm backdrop-blur-sm transition hover:bg-white md:h-9 md:w-9"
              >
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            </>
          )}

          <div className="overflow-hidden px-9 md:px-12">
            <div
              className="flex items-center transition-transform duration-500 ease-in-out will-change-transform"
              style={{
                gap: `${metrics.gap}px`,
                transform: `translateX(-${currentIndex * step}px)`,
              }}
            >
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`/produit/${product.id}`}
                  className="group flex shrink-0 flex-col items-center"
                  style={{ width: `${metrics.itemWidth}px` }}
                >
                  <div
                    className="flex w-full items-center justify-center bg-white"
                    style={{ height: `${Math.round(metrics.itemWidth * 0.95)}px` }}
                  >
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                      onError={e => { e.target.style.opacity = '0.3'; }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const pickRandomCategories = (categories, count = 2) => {
  const parents = categories.filter(c => c && c.is_active !== false && !c.parent_slug && c.slug);
  if (!parents.length) return [];
  const shuffled = [...parents].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
};

const PopularCategoryCarousels = ({ categories = [], products = [] }) => {
  const pickedRef = useRef(null);

  const pickedCategories = useMemo(() => {
    const parents = categories.filter(c => c && c.is_active !== false && !c.parent_slug && c.slug);
    if (!parents.length) return [];
    if (pickedRef.current === null) {
      pickedRef.current = pickRandomCategories(categories, 2);
    }
    return pickedRef.current;
  }, [categories]);

  const rows = useMemo(() =>
    pickedCategories
      .map(category => ({
        category,
        products: getProductsForCategory(category, categories, products),
      }))
      .filter(row => row.products.length > 0),
    [pickedCategories, categories, products]
  );

  if (!rows.length) return null;

  return (
    <div className="w-full bg-white" data-testid="popular-category-carousels">
      {rows.map(({ category, products: rowProducts }) => (
        <CarouselRow
          key={category.slug}
          category={category}
          products={rowProducts}
        />
      ))}
    </div>
  );
};

export default PopularCategoryCarousels;
