import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import { Button } from './ui/button';

const CategoryProductsCarousel = ({ categories, products }) => {
  const activeCategories = useMemo(
    () => categories.filter((category) => category && category.is_active !== false),
    [categories]
  );

  const carouselCategory = useMemo(() => {
    if (!activeCategories.length) return null;
    return activeCategories[Math.floor(Math.random() * activeCategories.length)];
  }, [activeCategories]);

  const categoryProducts = useMemo(() => {
    if (!carouselCategory || !Array.isArray(products)) return [];
    const filtered = products.filter((product) => {
      return (
        product.category_slug === carouselCategory.slug ||
        product.category_slug === carouselCategory.category_slug ||
        product.category_id === carouselCategory.id
      );
    });
    return filtered.length ? filtered : products.slice(0, 8);
  }, [carouselCategory, products]);

  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    setCarouselIndex(0);
  }, [carouselCategory?.id]);

  useEffect(() => {
    if (!categoryProducts.length) return undefined;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % categoryProducts.length);
    }, 1000);
    return () => clearInterval(interval);
  }, [categoryProducts]);

  const visibleProducts = useMemo(() => {
    if (!categoryProducts.length) return [];
    const length = Math.min(6, categoryProducts.length);
    return Array.from({ length }, (_, idx) => categoryProducts[(carouselIndex + idx) % categoryProducts.length]);
  }, [categoryProducts, carouselIndex]);

  if (!carouselCategory || !categoryProducts.length) return null;

  return (
    <section className="w-full bg-slate-900 text-white overflow-hidden py-10">
      <div className="site-container grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/95 p-6 shadow-2xl shadow-black/20 lg:p-8">
          <span className="inline-flex items-center rounded-full bg-amber-400/10 px-3 py-1 text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">
            DROPS
          </span>
          <h2 className="mt-6 text-3xl font-black leading-tight text-white">
            {carouselCategory.name || 'Sélection exclusive'}
          </h2>
          <p className="mt-4 text-sm text-slate-300 sm:text-base">
            Profitez de sorties de produits en édition limitée et de réductions supplémentaires — chaque actualisation charge une autre catégorie.
          </p>
          <div className="mt-6">
            <Link to={carouselCategory.slug ? `/categories/${carouselCategory.slug}` : '/produits'}>
              <Button variant="secondary" className="w-full justify-center text-base">
                Voir plus
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-amber-300">Lâcher en direct</p>
              <p className="mt-2 text-xl font-semibold text-white">{carouselCategory.name || 'Catégorie du moment'}</p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              Mise à jour toutes les secondes
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            {visibleProducts.map((product) => (
              <div key={product.id} className="rounded-3xl border border-white/10 bg-white/5 p-3 shadow-lg shadow-black/5">
                <ProductCard product={product} className="h-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CategoryProductsCarousel;
