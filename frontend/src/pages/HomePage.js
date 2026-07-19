import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Sparkles } from 'lucide-react';

import ProductCard from '../components/ProductCard';
import HeroSection from '../components/HeroSection';
import CategorySidebar from '../components/CategorySidebar';
import CategoriesGrid from '../components/CategoriesGrid';
import SubCategorySpotlight, { loadSpotlightBlock } from '../components/SubCategorySpotlight';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollProgress } from '../components/InfiniteScroll';
import { PromoBanner, FloatingBadges } from '../components/ScrollingBanners';
import AdHorizontalStrip from '../components/AdHorizontalStrip';
import HomeTopRatedProducts from '../components/HomeTopRatedProducts';
import CategoryProductsCarousel from '../components/CategoryProductsCarousel';
import OutletCarousel from '../components/OutletCarousel';
import HomeRandomLayoutProducts from '../components/HomeRandomLayoutProducts';
import EnterprisesSection from '../components/EnterprisesSection';
import AdminFeaturedProducts from '../components/AdminFeaturedProducts';
import EnterpriseProductsSection from '../components/EnterpriseProductsSection';

import { API_URL, API_BASE } from '../config/api';

const API = API_URL;

const DEFAULT_HOME_AD_STRIPS = [
  { id: 'offers',   title: 'Espace Publicitaire - Offres du Jour',       subtitle: 'Mettez ici vos promos, annonces flash et nouveautés sponsorisées.',            tone: 'orange', enabled: true, media_type: 'none', media_url: '', link: '' },
  { id: 'partners', title: 'Espace Publicitaire - Marques Partenaires',  subtitle: 'Zone dédiée aux campagnes partenaires, bannières saisonnières et bons plans.', tone: 'blue',   enabled: true, media_type: 'none', media_url: '', link: '' },
  { id: 'premium',  title: 'Espace Publicitaire - Sélection Premium',    subtitle: 'Emplacements premium pour opérations spéciales, événements et mises en avant.',tone: 'green',  enabled: true, media_type: 'none', media_url: '', link: '' },
  { id: 'flash',    title: 'Espace Publicitaire - Ventes Flash',          subtitle: 'Offres limitées dans le temps, ne manquez pas ces bonnes affaires !',          tone: 'red',    enabled: true, media_type: 'none', media_url: '', link: '' },
];

const HomePage = () => {
  const [categories,       setCategories]       = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [allProducts,      setAllProducts]      = useState([]);
  const [newProducts,      setNewProducts]      = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [brokenTopProductImages, setBrokenTopProductImages] = useState({});
  const [brokenRandomLayoutImages, setBrokenRandomLayoutImages] = useState({});
  const [upperOutletSlug, setUpperOutletSlug] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [conditionFilters, setConditionFilters] = useState({ neuf: false, occasion: false, presque_neuf: false });
  const [layoutSettings,   setLayoutSettings]   = useState(null);
  const [adStrips,         setAdStrips]         = useState(DEFAULT_HOME_AD_STRIPS);
  const [gridBlock,        setGridBlock]        = useState(null);
  const [featuredBlock,    setFeaturedBlock]    = useState(null);

  /* ── Fetch settings ── */
  useEffect(() => {
    axios.get(`${API}/layout-settings`)
      .then(res => setLayoutSettings(res.data))
      .catch(() => setLayoutSettings({ sidebar_type: 'color', sidebar_color_left: '#f97316', sidebar_color_right: '#f97316', sidebar_width: 160 }));

    axios.get(`${API}/ad-strip-settings`)
      .then(res => {
        const strips = Array.isArray(res.data?.strips) ? res.data.strips : DEFAULT_HOME_AD_STRIPS;
        setAdStrips(DEFAULT_HOME_AD_STRIPS.map(fb => ({ ...fb, ...(strips.find(s => s.id === fb.id) || {}) })));
      })
      .catch(() => setAdStrips(DEFAULT_HOME_AD_STRIPS));
  }, []);

  /* ── Fetch data ── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchFeatured = async () => {
          try {
            const res = await axios.get(`${API}/products/featured?limit=12`);
            return Array.isArray(res.data) ? res.data : (res.data?.products || []);
          } catch {
            const res = await axios.get(`${API}/products?limit=100`);
            const p = Array.isArray(res.data) ? res.data : (res.data?.products || []);
            return p.filter(x => x.is_featured === true);
          }
        };

        const [catRes, featured, allRes, newRes, trendingRes] = await Promise.all([
          axios.get(`${API}/categories`),
          fetchFeatured(),
          axios.get(`${API}/products?limit=100`),
          axios.get(`${API}/products?sort_by=created_at&sort_order=desc&limit=16`),
          axios.get(`${API}/products?sort_by=sales_count&sort_order=desc&limit=12`),
        ]);

        const allProducts = allRes.data?.products || allRes.data || [];
        const all = catRes.data || [];
        const subs = all.filter(c => c.parent_slug && c.is_active !== false);

        setCategories(all);
        setFeaturedProducts(featured);
        setAllProducts(allProducts);
        setNewProducts(newRes.data?.products || newRes.data || []);
        setTrendingProducts(trendingRes.data?.products || trendingRes.data || []);

        // Process spotlight blocks using already loaded products (synchronous, no API calls)
        if (subs.length > 0) {
          const usedSlugs = new Set();
          const block1 = loadSpotlightBlock(subs, usedSlugs, 4, allProducts);
          if (block1) usedSlugs.add(block1.subCategory.slug);
          const block2 = loadSpotlightBlock(subs, usedSlugs, 3, allProducts);
          setGridBlock(block1);
          setFeaturedBlock(block2);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const activeConditions = Object.entries(conditionFilters).filter(([, v]) => v).map(([k]) => k);

  const applyProductFilters = useCallback((products) =>
    products.filter(product => {
      const byCategory = selectedCategory === 'all' || product.category_slug === selectedCategory;
      const cond = (product.condition || '').toLowerCase();
      const byCondition = activeConditions.length === 0 ||
        activeConditions.some(c => c === 'presque_neuf' ? cond.includes('presque') : cond === c);
      return byCategory && byCondition;
    }),
    [selectedCategory, activeConditions]
  );

  const allProductsMerged = useMemo(() =>
    allProducts.length ? allProducts : [...featuredProducts, ...newProducts, ...trendingProducts],
    [allProducts, featuredProducts, newProducts, trendingProducts]
  );

  // Keep the "Nouveautés" grid visually complete without repeating products
  // when the dedicated endpoint returns fewer than 18 items.
  const displayedNewProducts = useMemo(() => {
    const uniqueNewProducts = newProducts.filter(
      (product, index, products) => products.findIndex((item) => item.id === product.id) === index
    );
    const displayedIds = new Set(uniqueNewProducts.map((product) => product.id));
    const catalogFallback = allProductsMerged.filter((product) => !displayedIds.has(product.id));

    return [...uniqueNewProducts, ...catalogFallback].slice(0, 18);
  }, [newProducts, allProductsMerged]);

  const topRatedProducts = useMemo(() => {
    const deduped = allProductsMerged.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
    return applyProductFilters(deduped)
      .filter(p => {
        const img = p.images?.[0] || p.main_image || p.image;
        return img && !brokenTopProductImages[p.id];
      })
      .slice(0, 30);
  }, [allProductsMerged, applyProductFilters, brokenTopProductImages]);

  const randomLayoutProducts = useMemo(() => {
    const deduped = allProductsMerged.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
    return deduped
      .filter(p => {
        const img = p.images?.[0] || p.main_image || p.image;
        return img && !brokenRandomLayoutImages[p.id];
      });
  }, [allProductsMerged, brokenRandomLayoutImages]);

  const heroContentRef = useRef(null);
  const [heroSidebarHeight, setHeroSidebarHeight] = useState(null);
  useEffect(() => {
    const el = heroContentRef.current;
    if (!el) return;
    const update = () => setHeroSidebarHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, [loading]);

  const activeAdStrips = adStrips.filter(s => s.enabled !== false);

  return (
    <div className="min-h-screen overflow-hidden bg-transparent" data-testid="home-page">
      <ScrollProgress />
      <FloatingBadges />
      <PromoBanner />

      {/* ── Hero ── */}
      <div className="w-full home-page-hero-wrapper">
        <div className="site-container py-4">
          <div className="hero-zone-grid grid grid-cols-1 lg:grid-cols-[minmax(200px,240px)_1fr] gap-2 w-full">
            <div className="hidden lg:block overflow-hidden shrink-0" style={heroSidebarHeight ? { height: `${heroSidebarHeight}px` } : undefined}>
              <CategorySidebar />
            </div>
            <div ref={heroContentRef} className="hero-zone-content min-w-0">
              <HeroSection
                bottomBlocks={activeAdStrips.length > 0
                  ? activeAdStrips.map((strip, idx) => <AdHorizontalStrip key={strip.id} strip={strip} index={idx} />)
                  : null}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Enterprises Section ── */}
      <EnterprisesSection />

      {/* ── Admin Featured Products ── */}
      <AdminFeaturedProducts />

      {/* ── Enterprise Products ── */}
      <EnterpriseProductsSection />

      {/* ── Catégories ── */}
      <div className="w-full bg-white">
        <div className="site-container py-4"><CategoriesGrid /></div>
      </div>

      <SubCategorySpotlight gridBlock={gridBlock} featuredBlock={featuredBlock} loading={loading} />

      {/* ── Top produits ── */}
      <div className="w-full bg-white">
        <div className="site-container py-4">
          <HomeTopRatedProducts
            loading={loading}
            topRatedProducts={topRatedProducts}
            onImageMissing={id => setBrokenTopProductImages(p => ({ ...p, [id]: true }))}
          />
        </div>
      </div>

      {/* ── DROPS Carousel ── */}
      <div className="w-full bg-white">
        <div className="site-container py-4">
          <CategoryProductsCarousel categories={categories} products={allProductsMerged} />
        </div>
      </div>

      {/* ── Nouveautés ── */}
      <div className="w-full bg-white">
        <div className="site-container py-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {[...Array(18)].map((_, i) => (
                <div key={i} className="bg-white p-2">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="mt-2 h-3 w-11/12" />
                  <Skeleton className="mt-2 h-4 w-20" />
                </div>
              ))}
            </div>
          ) : !newProducts?.length ? (
            <div className="py-14 text-center text-slate-400">
              <Sparkles className="mx-auto mb-3 h-12 w-12 opacity-20" />
              <p className="font-semibold">Aucun nouveau produit disponible</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {displayedNewProducts.map(p => <ProductCard key={p.id} product={p} className="scale-[0.94]" />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Carrousel catégorie (style Outlet) ── */}
      {!loading && allProductsMerged.length > 0 && (
        <div className="w-full bg-white">
          <div className="site-container py-4">
            <OutletCarousel
              categories={categories}
              products={allProductsMerged}
              onCategoryPick={setUpperOutletSlug}
            />
          </div>
        </div>
      )}

      {/* ── Produits disposition aléatoire (entre carrousels) ── */}
      <div className="w-full bg-white">
        <div className="site-container py-4">
          <HomeRandomLayoutProducts
            loading={loading}
            products={randomLayoutProducts}
            onImageMissing={id => setBrokenRandomLayoutImages(p => ({ ...p, [id]: true }))}
          />
        </div>
      </div>

      {/* ── Outlet Carousel ── */}
      {!loading && allProductsMerged.length > 0 && (
        <div className="w-full bg-white">
          <div className="site-container py-4">
            <OutletCarousel
              categories={categories}
              products={allProductsMerged}
              excludeSlug={upperOutletSlug}
            />
          </div>
        </div>
      )}

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-20px) rotate(5deg)} }
        .animate-float{animation:float 4s ease-in-out infinite}
      `}</style>
    </div>
  );
};

export default HomePage;
