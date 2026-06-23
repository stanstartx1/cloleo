import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Skeleton } from './ui/skeleton';
import { API_URL, API_BASE } from '../config/api';
import { toAbsoluteMediaUrl } from '../utils/media';

const API = API_URL;

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

const formatPrice = (value) => {
  if (!value) return '';
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
};

// ─── BLOC GAUCHE : grille 2x2 de produits ───────────────────────────────────
const GridBlock = ({ subCategory, products }) => {
  const gridProducts = products.slice(0, 4);

  return (
    <div className="flex-1 min-w-0 border border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="grid grid-cols-2 flex-1">
        {gridProducts.map((product, idx) => {
          const displayPrice = getDisplayPrice(product);
          const basePrice = getBasePrice(product);
          return (
            <Link
              key={product.id}
              to={`/produit/${product.id}`}
              className={`flex flex-col items-center p-4 hover:bg-slate-50 transition-colors
                ${idx % 2 === 0 ? 'border-r border-gray-200' : ''}
                ${idx < 2 ? 'border-b border-gray-200' : ''}
              `}
            >
              <div className="w-full flex items-center justify-center" style={{ height: '160px' }}>
                <img
                  src={getProductImage(product)}
                  alt={product.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="w-full mt-3">
                <p className="text-xs text-slate-700 line-clamp-2 leading-snug">
                  {product.name}
                </p>
                <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900">
                    {formatPrice(displayPrice)}
                  </span>
                  {basePrice > displayPrice && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatPrice(basePrice)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="border-t border-gray-200 py-3 text-center">
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

// ─── BLOC DROIT : grande image gauche + 2 produits empilés à droite ──────────
const FeaturedBlock = ({ subCategory, products }) => {
  const featured = products[0] || null;
  const sideProducts = products.slice(1, 3);

  const featuredDisplayPrice = featured ? getDisplayPrice(featured) : null;
  const featuredBasePrice = featured ? getBasePrice(featured) : null;

  return (
    <div className="flex-1 min-w-0 border border-gray-200 bg-white flex flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0">
        {/* Grande image à gauche */}
        <div className="flex flex-col w-[55%] border-r border-gray-200 p-4">
          {featured ? (
            <>
              <Link
                to={`/produit/${featured.id}`}
                className="flex items-center justify-center flex-1"
                style={{ minHeight: '260px' }}
              >
                <img
                  src={getProductImage(featured)}
                  alt={featured.name}
                  className="max-w-full max-h-[260px] object-contain"
                />
              </Link>
              <Link
                to={`/produit/${featured.id}`}
                className="mt-3 pt-3 border-t border-gray-100 hover:opacity-80 transition-opacity"
              >
                <p className="text-xs text-slate-700 line-clamp-2 leading-snug">
                  {featured.name}
                </p>
                <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-900">
                    {formatPrice(featuredDisplayPrice)}
                  </span>
                  {featuredBasePrice > featuredDisplayPrice && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatPrice(featuredBasePrice)}
                    </span>
                  )}
                </div>
              </Link>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-xs text-slate-400">
              Aucun produit
            </div>
          )}
        </div>

        {/* 2 produits empilés à droite */}
        <div className="flex flex-col flex-1 min-w-0 divide-y divide-gray-200">
          {sideProducts.length > 0 ? (
            sideProducts.map((product) => {
              const displayPrice = getDisplayPrice(product);
              const basePrice = getBasePrice(product);
              return (
                <Link
                  key={product.id}
                  to={`/produit/${product.id}`}
                  className="flex flex-col items-start p-4 hover:bg-slate-50 transition-colors flex-1"
                >
                  <div className="w-full flex items-center justify-center" style={{ height: '130px' }}>
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="w-full mt-2">
                    <p className="text-xs text-slate-700 line-clamp-2 leading-snug">
                      {product.name}
                    </p>
                    <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">
                        {formatPrice(displayPrice)}
                      </span>
                      {basePrice > displayPrice && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatPrice(basePrice)}
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

      <div className="border-t border-gray-200 py-3 text-center">
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

// ─── Loader ──────────────────────────────────────────────────────────────────
const loadBlock = async (subs, usedSlugs = new Set(), minProducts = 3) => {
  const available = subs.filter((s) => !usedSlugs.has(s.slug));
  const shuffled = [...available].sort(() => Math.random() - 0.5);

  for (const sub of shuffled) {
    try {
      const prodRes = await axios.get(`${API}/products?category=${sub.slug}&limit=4`);
      const list = prodRes.data?.products || prodRes.data || [];
      if (list.length >= minProducts) {
        return { subCategory: sub, products: list };
      }
    } catch {
      /* essayer la suivante */
    }
  }

  // fallback sans contrainte de nombre
  for (const sub of shuffled) {
    try {
      const prodRes = await axios.get(`${API}/products?category=${sub.slug}&limit=4`);
      const list = prodRes.data?.products || prodRes.data || [];
      if (list.length > 0) return { subCategory: sub, products: list };
    } catch { /* skip */ }
  }

  return shuffled.length > 0 ? { subCategory: shuffled[0], products: [] } : null;
};

// ─── Composant principal ─────────────────────────────────────────────────────
const SubCategorySpotlight = () => {
  const [loading, setLoading] = useState(true);
  const [gridBlock, setGridBlock] = useState(null);
  const [featuredBlock, setFeaturedBlock] = useState(null);

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

        // Bloc gauche : besoin de 4 produits pour la grille 2x2
        const b1 = await loadBlock(subs, usedSlugs, 4);
        if (b1) usedSlugs.add(b1.subCategory.slug);

        // Bloc droit : besoin de 3 produits (1 grand + 2 côté)
        const b2 = await loadBlock(subs, usedSlugs, 3);

        if (!cancelled) {
          setGridBlock(b1);
          setFeaturedBlock(b2);
        }
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
            <Skeleton className="flex-1 h-[420px] rounded-sm" />
            <Skeleton className="flex-1 h-[420px] rounded-sm" />
          </div>
        </div>
      </section>
    );
  }

  if (!gridBlock && !featuredBlock) return null;

  return (
    <section className="w-full bg-white py-4" data-testid="subcategory-spotlight">
      <div className="site-container">
        <div className="flex flex-col md:flex-row gap-4">
          {gridBlock && (
            <GridBlock
              subCategory={gridBlock.subCategory}
              products={gridBlock.products}
            />
          )}
          {featuredBlock && (
            <FeaturedBlock
              subCategory={featuredBlock.subCategory}
              products={featuredBlock.products}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default SubCategorySpotlight;
