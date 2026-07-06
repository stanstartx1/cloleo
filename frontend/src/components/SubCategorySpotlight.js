import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Clock } from 'lucide-react';
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

const formatPrice = (value) => {
  if (!value) return '';
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
};

const ProductPrice = ({ product, size = 'sm' }) => {
  const display = getDisplayPrice(product);
  const base = getBasePrice(product);
  const hasDiscount = base && display && display < base;

  return (
    <div className={`flex flex-wrap items-baseline gap-1.5 ${size === 'lg' ? 'gap-2' : ''}`}>
      <span className={`font-bold text-red-600 ${size === 'lg' ? 'text-base' : 'text-sm'}`}>
        {formatPrice(display)}
      </span>
      {hasDiscount && (
        <span className={`text-slate-400 line-through ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
          {formatPrice(base)}
        </span>
      )}
    </div>
  );
};

const BlockFooter = ({ slug }) => (
  <div className="border-t border-gray-200 py-3 text-center">
    <Link
      to={`/categories/${slug}`}
      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline md:text-[13px]"
    >
      Voir tous les articles
    </Link>
  </div>
);

/* ─── Bloc grille 2×2 (style ARIETE) ─────────────────────────────────────── */
const GridSpotlightBlock = ({ subCategory, products }) => {
  const gridProducts = products.slice(0, 4);
  const placeholders = Math.max(0, 4 - gridProducts.length);

  return (
    <div className="flex min-w-0 flex-1 flex-col border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900 md:text-base">{subCategory.name}</h3>
        <span className="flex shrink-0 items-center gap-1 rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white md:text-[11px]">
          <Clock className="h-3 w-3" />
          Fin demain
        </span>
      </div>

      <div className="grid flex-1 grid-cols-2">
        {gridProducts.map((product, index) => (
          <Link
            key={product.id}
            to={`/produit/${product.id}`}
            className={`group flex flex-col border-gray-200 p-3 transition hover:bg-slate-50 ${
              index % 2 === 0 ? 'border-r' : ''
            } ${index < 2 ? 'border-b' : ''}`}
          >
            <div className="flex h-[110px] items-center justify-center md:h-[130px]">
              <img
                src={getProductImage(product)}
                alt={product.name}
                className="max-h-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <p className="mt-2 line-clamp-2 min-h-[2rem] text-[11px] font-medium leading-snug text-slate-800 md:text-xs">
              {product.name}
            </p>
            <div className="mt-auto pt-2">
              <ProductPrice product={product} />
            </div>
          </Link>
        ))}
        {placeholders > 0 &&
          [...Array(placeholders)].map((_, i) => (
            <div
              key={`empty-${i}`}
              className={`flex items-center justify-center border-gray-200 p-3 text-xs text-slate-300 ${
                (gridProducts.length + i) % 2 === 0 ? 'border-r' : ''
              } ${gridProducts.length + i < 2 ? 'border-b' : ''}`}
            >
              —
            </div>
          ))}
      </div>

      <BlockFooter slug={subCategory.slug} />
    </div>
  );
};

/* ─── Bloc vedette + sidebar (style Lenovo Legion) ─────────────────────────── */
const FeaturedSpotlightBlock = ({ subCategory, products }) => {
  const featuredProduct = products[0] || null;
  const sideProducts = products.slice(1, 3);
  const mainImage = getSubCategoryImage(subCategory);

  return (
    <div className="flex min-w-0 flex-1 flex-col border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900 md:text-base">{subCategory.name}</h3>
      </div>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        {/* Produit vedette */}
        <div className="flex w-full flex-col border-gray-200 sm:w-[62%] sm:border-r">
          {featuredProduct ? (
            <Link
              to={`/produit/${featuredProduct.id}`}
              className="group flex flex-1 flex-col hover:bg-slate-50/50"
            >
              <div className="relative flex items-center justify-center bg-white p-4 md:p-5" style={{ minHeight: '200px' }}>
                <img
                  src={getProductImage(featuredProduct)}
                  alt={featuredProduct.name}
                  className="max-h-[180px] w-full max-w-full object-contain transition-transform duration-200 group-hover:scale-105 md:max-h-[220px]"
                />
              </div>
              <div className="border-t border-gray-100 px-4 py-3">
                <p className="line-clamp-2 text-xs font-medium leading-snug text-slate-800 md:text-sm">
                  {featuredProduct.name}
                </p>
                <div className="mt-2">
                  <ProductPrice product={featuredProduct} size="lg" />
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex flex-1 flex-col">
              <Link
                to={`/categories/${subCategory.slug}`}
                className="flex flex-1 items-center justify-center p-4"
                style={{ minHeight: '200px' }}
              >
                {mainImage ? (
                  <img src={mainImage} alt={subCategory.name} className="max-h-[200px] object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">Aucun produit</span>
                )}
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar — 2 petits produits */}
        <div className="flex w-full flex-col sm:w-[38%]">
          {sideProducts.length > 0 ? (
            sideProducts.map((product, index) => (
              <Link
                key={product.id}
                to={`/produit/${product.id}`}
                className={`group flex flex-1 flex-col hover:bg-slate-50/50 ${
                  index === 0 ? 'border-b border-gray-200' : ''
                }`}
              >
                <div className="flex flex-1 items-center justify-center p-3 md:p-4">
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="max-h-[90px] max-w-full object-contain transition-transform duration-200 group-hover:scale-105 md:max-h-[110px]"
                  />
                </div>
                <div className="border-t border-gray-100 px-3 py-2.5 md:px-4">
                  <p className="line-clamp-2 text-[10px] font-medium leading-snug text-slate-800 md:text-[11px]">
                    {product.name}
                  </p>
                  <div className="mt-1.5">
                    <ProductPrice product={product} />
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="flex flex-1 items-center justify-center p-4 text-xs text-slate-400">
              Aucun produit disponible
            </div>
          )}
        </div>
      </div>

      <BlockFooter slug={subCategory.slug} />
    </div>
  );
};

const loadSpotlightBlock = async (subs, usedSlugs = new Set(), minProducts = 1) => {
  const available = subs.filter(s => !usedSlugs.has(s.slug));
  const shuffled = [...available].sort(() => Math.random() - 0.5);

  // Try to fetch products in parallel for better performance
  const fetchPromises = shuffled.map(async (sub) => {
    try {
      const prodRes = await axios.get(`${API}/products?category=${sub.slug}&limit=4`);
      const list = prodRes.data?.products || prodRes.data || [];
      return { subCategory: sub, products: list, success: true };
    } catch {
      return { subCategory: sub, products: [], success: false };
    }
  });

  const results = await Promise.all(fetchPromises);

  // First try to find a block with enough products
  const validBlock = results.find(r => r.success && r.products.length >= minProducts);
  if (validBlock) {
    return { subCategory: validBlock.subCategory, products: validBlock.products };
  }

  // Fallback to any block with products
  const anyBlock = results.find(r => r.success && r.products.length > 0);
  if (anyBlock) {
    return { subCategory: anyBlock.subCategory, products: anyBlock.products };
  }

  // Last resort: return first subcategory with empty products
  if (shuffled.length > 0) {
    return { subCategory: shuffled[0], products: [] };
  }
  return null;
};

const SubCategorySpotlight = ({ gridBlock, featuredBlock, loading }) => {
  if (loading) {
    return (
      <section className="w-full bg-white">
        <div className="site-container py-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <Skeleton className="h-[380px] flex-1 rounded-sm" />
            <Skeleton className="h-[380px] flex-1 rounded-sm" />
          </div>
        </div>
      </section>
    );
  }

  if (!gridBlock && !featuredBlock) return null;

  return (
    <section className="w-full bg-white" data-testid="subcategory-spotlight">
      <div className="site-container py-4">
        <div className="flex flex-col gap-4 md:flex-row md:gap-5">
          {gridBlock && (
            <GridSpotlightBlock
              subCategory={gridBlock.subCategory}
              products={gridBlock.products}
            />
          )}
          {featuredBlock && (
            <FeaturedSpotlightBlock
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
