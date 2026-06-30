import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toAbsoluteMediaUrl } from '../utils/media';

const GRADIENTS = [
  'linear-gradient(135deg, #0f172a 0%, #312e81 55%, #581c87 100%)',
  'linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #701a75 100%)',
  'linear-gradient(135deg, #0c4a6e 0%, #1d4ed8 55%, #4338ca 100%)',
  'linear-gradient(135deg, #14532d 0%, #065f46 55%, #134e4a 100%)',
  'linear-gradient(135deg, #431407 0%, #9a3412 55%, #7c2d12 100%)',
];

const getCategoryImage = (category) => {
  const banner = category?.banner_images?.[0];
  if (banner) return toAbsoluteMediaUrl(banner);
  if (category?.image) return toAbsoluteMediaUrl(category.image);
  return null;
};

const getProductImage = (product) =>
  toAbsoluteMediaUrl(product?.images?.[0] || product?.main_image || product?.image || '');

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

  const categoryProducts = useMemo(() => {
    if (!activeCategory || !products.length) return [];
    const subSlugs = new Set(
      categories.filter(c => c.parent_slug === activeCategory.slug).map(c => c.slug)
    );
    return products
      .filter(p =>
        p.category_slug === activeCategory.slug ||
        p.category_id === activeCategory.id ||
        subSlugs.has(p.category_slug) ||
        subSlugs.has(p.subcategory_slug)
      )
      .slice(0, 3);
  }, [activeCategory, products, categories]);

  if (!activeCategory) return null;

  const categoryImage = getCategoryImage(activeCategory);
  const heroProduct = categoryProducts[0] || null;
  const sideProduct = categoryProducts[1] || null;
  const categoryLink = `/categories/${activeCategory.slug}`;
  const gradient = GRADIENTS[activeIndex % GRADIENTS.length];
  const subCount = activeCategory.subcategories_count || 0;

  const goPrev = () => {
    setActiveIndex(i => (i - 1 + parentCategories.length) % parentCategories.length);
  };

  const goNext = () => {
    setActiveIndex(i => (i + 1) % parentCategories.length);
  };

  return (
    <section className="w-full bg-white py-5" data-testid="category-split-promo-banner">
      <div className="site-container">
        <div className="relative">
          {/* Flèche gauche */}
          {parentCategories.length > 1 && (
            <button
              type="button"
              onClick={goPrev}
              aria-label="Catégorie précédente"
              className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {/* Flèche droite */}
          {parentCategories.length > 1 && (
            <button
              type="button"
              onClick={goNext}
              aria-label="Catégorie suivante"
              className="absolute right-0 top-1/2 z-20 flex h-10 w-10 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md transition hover:bg-slate-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <div className="flex h-[168px] overflow-hidden rounded-sm shadow-sm md:h-[190px] lg:h-[210px]">
            {/* Panneau gauche — catégorie */}
            <Link
              to={categoryLink}
              className="group relative flex w-[30%] min-w-[120px] max-w-[280px] shrink-0 flex-col items-center justify-center bg-[#f3f3f3] px-4 transition hover:bg-[#ececec]"
            >
              {categoryImage ? (
                <img
                  src={categoryImage}
                  alt={activeCategory.name}
                  className="mb-2 max-h-[72px] max-w-[85%] object-contain transition-transform duration-300 group-hover:scale-105 md:max-h-[88px]"
                />
              ) : heroProduct ? (
                <img
                  src={getProductImage(heroProduct)}
                  alt={activeCategory.name}
                  className="mb-2 max-h-[72px] max-w-[85%] object-contain md:max-h-[88px]"
                />
              ) : (
                <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-black text-slate-300">
                  {activeCategory.name?.charAt(0) || 'C'}
                </div>
              )}
              <p className="text-center text-base font-bold tracking-tight text-slate-900 md:text-lg">
                {activeCategory.name}
              </p>
            </Link>

            {/* Panneau droit — promo */}
            <div
              className="relative flex flex-1 items-center overflow-hidden"
              style={{ background: gradient }}
            >
              <div className="relative z-10 flex h-full w-full items-center justify-between gap-4 px-5 md:px-8 lg:px-10">
                {/* Texte + CTA */}
                <div className="flex min-w-0 flex-col justify-center gap-3 py-4">
                  <Link
                    to={categoryLink}
                    className="inline-flex w-fit items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 md:px-5 md:py-2.5 md:text-[15px]"
                  >
                    Voir les détails
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                  <p className="max-w-[220px] text-[11px] font-medium uppercase tracking-[0.12em] text-white/70 md:text-xs">
                    {subCount > 0
                      ? `${subCount} sous-catégorie${subCount > 1 ? 's' : ''} · Cloléo`
                      : 'Sélection Cloléo'}
                  </p>
                </div>

                {/* Visuels produits */}
                <div className="relative hidden shrink-0 items-end justify-center sm:flex md:mr-4">
                  {sideProduct && (
                    <div className="relative z-10 -mr-6 mb-2">
                      <img
                        src={getProductImage(sideProduct)}
                        alt={sideProduct.name}
                        className="h-[88px] w-auto max-w-[100px] object-contain drop-shadow-lg md:h-[110px] md:max-w-[120px]"
                      />
                    </div>
                  )}
                  {heroProduct && (
                    <div className="relative z-20">
                      <img
                        src={getProductImage(heroProduct)}
                        alt={heroProduct.name}
                        className="h-[110px] w-auto max-w-[130px] object-contain drop-shadow-2xl md:h-[140px] md:max-w-[160px]"
                      />
                      <span className="absolute -right-2 top-2 flex h-14 w-14 flex-col items-center justify-center rounded-full bg-violet-200/90 text-center text-[9px] font-bold leading-tight text-violet-900 shadow-md md:h-16 md:w-16 md:text-[10px]">
                        Promo !
                        <span className="mt-0.5 text-[8px] font-semibold opacity-80 md:text-[9px]">
                          {activeCategory.name?.split(' ')[0]}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Titre principal */}
                <div className="hidden max-w-[280px] shrink-0 text-right lg:block">
                  <p className="text-[28px] font-black leading-[1.1] tracking-tight text-white xl:text-[34px]">
                    {activeCategory.name}
                  </p>
                  {activeCategory.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-white/75">
                      {activeCategory.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Décor léger */}
              <div
                className="pointer-events-none absolute inset-0 opacity-20"
                style={{
                  background:
                    'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.35) 0%, transparent 55%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategorySplitPromoBanner;
