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

const formatPrice = (value) => {
  if (!value) return '';
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
};

const ProductSideCard = ({ product }) => {
  const displayPrice = getDisplayPrice(product);
  const basePrice = getBasePrice(product);
  const hasDiscount = basePrice && displayPrice < basePrice;

  return (
    <Link
      to={`/produit/${product.id}`}
      className="flex flex-1 min-h-0 gap-3 p-3 hover:bg-slate-50 transition-colors border-b border-gray-200 last:border-b-0"
    >
      <div className="w-[88px] h-[88px] sm:w-[96px] sm:h-[96px] shrink-0 border border-gray-200 bg-white flex items-center justify-center p-1.5">
        <img
          src={getProductImage(product)}
          alt={product.name}
          className="max-w-full max-h-full object-contain"
        />
      </div>
      <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
        <p className="text-xs sm:text-sm font-medium text-slate-800 line-clamp-3 leading-snug">
          {product.name}
        </p>
        <div className="mt-2">
          <span className="text-sm sm:text-base font-bold text-red-600">
            {formatPrice(displayPrice)}
          </span>
          {hasDiscount && (
            <span className="ml-2 text-xs text-slate-400 line-through">
              {formatPrice(basePrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

const SubCategorySpotlight = () => {
  const [loading, setLoading] = useState(true);
  const [subCategory, setSubCategory] = useState(null);
  const [parentCategory, setParentCategory] = useState(null);
  const [products, setProducts] = useState([]);

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

        const shuffled = [...subs].sort(() => Math.random() - 0.5);
        let picked = null;
        let pickedProducts = [];

        for (const sub of shuffled) {
          try {
            const prodRes = await axios.get(`${API}/products?category=${sub.slug}&limit=3`);
            const list = prodRes.data?.products || [];
            if (list.length > 0) {
              picked = sub;
              pickedProducts = list;
              break;
            }
          } catch {
            /* essayer la suivante */
          }
        }

        if (!picked) {
          picked = shuffled[0];
          try {
            const prodRes = await axios.get(`${API}/products?category=${picked.slug}&limit=3`);
            pickedProducts = prodRes.data?.products || [];
          } catch {
            pickedProducts = [];
          }
        }

        if (!cancelled) {
          setSubCategory(picked);
          setProducts(pickedProducts);
          setParentCategory(all.find((c) => c.slug === picked.parent_slug) || null);
        }
      } catch (error) {
        console.error('Erreur chargement sous-catégorie spotlight:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="w-full bg-white py-6">
        <div className="site-container">
          <Skeleton className="h-[380px] w-full rounded-sm border border-gray-200" />
        </div>
      </section>
    );
  }

  if (!subCategory) return null;

  const mainImage = getSubCategoryImage(subCategory);
  const sideProducts = products.length > 1 ? products.slice(1, 3) : [];
  const featuredProduct = products[0] || null;

  return (
    <section className="w-full bg-white py-6" data-testid="subcategory-spotlight">
      <div className="site-container">
        <div className="border border-gray-200 rounded-sm bg-white overflow-hidden">
          <h2 className="px-4 pt-4 pb-3 text-base sm:text-lg font-bold text-slate-900 border-b border-gray-200">
            {subCategory.name}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-[1.65fr_1fr] min-h-[280px]">
            {/* Image principale + produit vedette */}
            <div className="border-b lg:border-b-0 lg:border-r border-gray-200 p-4 flex flex-col">
              <Link
                to={`/categories/${subCategory.slug}`}
                className="flex-1 flex items-center justify-center min-h-[180px] bg-white"
              >
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={subCategory.name}
                    className="max-w-full max-h-[240px] object-contain"
                  />
                ) : featuredProduct ? (
                  <img
                    src={getProductImage(featuredProduct)}
                    alt={subCategory.name}
                    className="max-w-full max-h-[240px] object-contain"
                  />
                ) : (
                  <div className="text-sm text-slate-400">Aucune image</div>
                )}
              </Link>

              {featuredProduct && (
                <Link
                  to={`/produit/${featuredProduct.id}`}
                  className="mt-3 pt-3 border-t border-gray-100 hover:opacity-90 transition-opacity"
                >
                  <p className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug">
                    {featuredProduct.name}
                  </p>
                  <div className="mt-2">
                    <span className="text-base font-bold text-red-600">
                      {formatPrice(getDisplayPrice(featuredProduct))}
                    </span>
                    {getBasePrice(featuredProduct) > getDisplayPrice(featuredProduct) && (
                      <span className="ml-2 text-sm text-slate-400 line-through">
                        {formatPrice(getBasePrice(featuredProduct))}
                      </span>
                    )}
                  </div>
                </Link>
              )}
            </div>

            {/* Produits latéraux */}
            <div className="flex flex-col min-h-[200px]">
              {sideProducts.length > 0 ? (
                sideProducts.map((product) => (
                  <ProductSideCard key={product.id} product={product} />
                ))
              ) : (
                <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-400">
                  Aucun produit disponible
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 py-3 text-center">
            <Link
              to={`/categories/${subCategory.slug}`}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Voir tous les articles
              {parentCategory ? ` — ${parentCategory.name}` : ''}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SubCategorySpotlight;
