import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Skeleton } from './ui/skeleton';
import { API_URL, API_BASE } from '../config/api';
import { toAbsoluteMediaUrl } from '../utils/media';

const API = API_URL;

const getSubCategoryImage = (category) => {
  const banners = category?.banner_images || [];
  if (banners.length > 0) {
    const img = banners[0];
    return img?.startsWith('/') ? `${API_BASE}${img}` : img;
  }
  if (category?.image) {
    return category.image.startsWith('/') ? `${API_BASE}${category.image}` : category.image;
  }
  return null;
};

const getProductImage = (product) =>
  toAbsoluteMediaUrl(product.images?.[0] || product.main_image || product.image || '');

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

const formatPrice = (value) => {
  if (!value) return '';
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
};

// ─── Bloc individuel (une sous-catégorie) ───────────────────────────────────
const SpotlightBlock = ({ subCategory, parentCategory, products }) => {
  const mainImage = getSubCategoryImage(subCategory);
  const featuredProduct = products[0] || null;
  const sideProducts = products.slice(1, 3);

  const featuredDiscount = featuredProduct ? getDiscount(featuredProduct) : null;
  const featuredDisplayPrice = featuredProduct ? getDisplayPrice(featuredProduct) : null;
  const featuredBasePrice = featuredProduct ? getBasePrice(featuredProduct) : null;

  return (
    <div className="flex-1 min-w-0 border border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900 truncate">
          {subCategory.name}
          {parentCategory && (
            <span className="ml-1 font-normal text-slate-400 text-xs">
              — {parentCategory.name}
            </span>
          )}
        </h2>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Grande image / produit vedette à gauche */}
        <div className="flex flex-col w-[52%] border-r border-gray-200 p-3">
          <Link
            to={`/categories/${subCategory.slug}`}
            className="relative flex items-center justify-center bg-white flex-1 min-h-[160px]"
          >
            {/* Badge "Ends tomorrow" */}
            <span className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
              Ends tomorrow
            </span>
            {mainImage ? (
              <img
                src={mainImage}
                alt={subCategory.name}
                className="max-w-full max-h-[180px] object-contain mt-6"
              />
            ) : featuredProduct ? (
              <img
                src={getProductImage(featuredProduct)}
                alt={subCategory.name}
                className="max-w-full max-h-[180px] object-contain mt-6"
              />
            ) : (
              <div className="text-xs text-slate-400 mt-6">Aucune image</div>
            )}
          </Link>

          {featuredProduct && (
            <Link
              to={`/produit/${featuredProduct.id}`}
              className="mt-2 pt-2 border-t border-gray-100 hover:opacity-80 transition-opacity"
            >
              <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug">
                {featuredProduct.name}
              </p>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-bold text-red-600">
                  {formatPrice(featuredDisplayPrice)}
                </span>
                {featuredBasePrice > featuredDisplayPrice && (
                  <span className="text-xs text-slate-400 line-through">
                    {formatPrice(featuredBasePrice)}
                  </span>
                )}
                {featuredDiscount && (
                  <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
                    -{featuredDiscount}%
                  </span>
                )}
              </div>
            </Link>
          )}
        </div>

        {/* Petits produits à droite */}
        <div className="flex flex-col flex-1 min-w-0 divide-y divide-gray-100">
          {sideProducts.length > 0 ? (
            sideProducts.map((product) => {
              const displayPrice = getDisplayPrice(product);
              const basePrice = getBasePrice(product);
              const discount = getDiscount(product);
              return (
                <Link
                  key={product.id}
                  to={`/produit/${product.id}`}
                  className="flex gap-2 p-3 hover:bg-slate-50 transition-colors flex-1 min-h-0 items-center"
                >
                  <div className="w-[70px] h-[70px] shrink-0 border border-gray-100 bg-white flex items-center justify-center p-1">
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug">
                      {product.name}
                    </p>
                    <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-red-600">
                        {formatPrice(displayPrice)}
                      </span>
                      {basePrice > displayPrice && (
                        <span className="text-[10px] text-slate-400 line-through">
                          {formatPrice(basePrice)}
                        </span>
                      )}
                      {discount && (
                        <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1 rounded">
                          -{discount}%
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="flex flex-1 items-center justify-center p-4 text-xs text-slate-400">
              Aucun produit disponible
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 py-2.5 text-center">
        <Link
          to={`/categories/${subCategory.slug}`}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          Show all items
        </Link>
      </div>
    </div>
  );
};

// ─── Loader pour un bloc ─────────────────────────────────────────────────────
const loadSpotlightBlock = async (subs, usedSlugs = new Set()) => {
  const available = subs.filter((s) => !usedSlugs.has(s.slug));
  const shuffled = [...available].sort(() => Math.random() - 0.5);

  for (const sub of shuffled) {
    try {
      const prodRes = await axios.get(`${API}/products?category=${sub.slug}&limit=4`);
      const list = prodRes.data?.products || prodRes.data || [];
      if (list.length > 0) {
        return { subCategory: sub, products: list };
      }
    } catch {
      /* essayer la suivante */
    }
  }

  // fallback : premier disponible même sans produits
  if (shuffled.length > 0) {
    return { subCategory: shuffled[0], products: [] };
  }
  return null;
};

// ─── Composant principal ─────────────────────────────────────────────────────
const SubCategorySpotlight = () => {
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState([]); // [{ subCategory, parentCategory, products }]

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const catRes = await axios.get(`${API}/categories`);
        const all = catRes.data || [];
        const subs = all.filter((c) => c.parent_slug && c.is_active !== false);

        if (subs.length === 0) {
          if (!cancelled) setLoading(false);
          return;
        }

        const usedSlugs = new Set();

        const block1 = await loadSpotlightBlock(subs, usedSlugs);
        if (block1) usedSlugs.add(block1.subCategory.slug);

        const block2 = await loadSpotlightBlock(subs, usedSlugs);

        const result = [block1, block2]
          .filter(Boolean)
          .map((b) => ({
            ...b,
            parentCategory: all.find((c) => c.slug === b.subCategory.parent_slug) || null,
          }));

        if (!cancelled) setBlocks(result);
      } catch (error) {
        console.error('Erreur chargement sous-catégorie spotlight:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <section className="w-full bg-white py-4">
        <div className="site-container">
          <div className="flex gap-4">
            <Skeleton className="flex-1 h-[300px] rounded-sm" />
            <Skeleton className="flex-1 h-[300px] rounded-sm" />
          </div>
        </div>
      </section>
    );
  }

  if (blocks.length === 0) return null;

  return (
    <section className="w-full bg-white py-4" data-testid="subcategory-spotlight">
      <div className="site-container">
        <div className="flex flex-col md:flex-row gap-4">
          {blocks.map(({ subCategory, parentCategory, products }) => (
            <SpotlightBlock
              key={subCategory.slug}
              subCategory={subCategory}
              parentCategory={parentCategory}
              products={products}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SubCategorySpotlight;
