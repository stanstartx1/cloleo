import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Sparkles } from 'lucide-react';

import ProductCard from '../components/ProductCard';
import HeroSection from '../components/HeroSection';
import CategorySidebar from '../components/CategorySidebar';
import CategoriesGrid from '../components/CategoriesGrid';
import SubCategorySpotlight from '../components/SubCategorySpotlight';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollProgress } from '../components/InfiniteScroll';
import { PromoBanner, FloatingBadges } from '../components/ScrollingBanners';
import AdHorizontalStrip from '../components/AdHorizontalStrip';
import HomeTopRatedProducts from '../components/HomeTopRatedProducts';
import CategoryProductsCarousel from '../components/CategoryProductsCarousel';
import OutletCarousel from '../components/OutletCarousel';
import InspirationBanner from '../components/InspirationBanner';
import PopularProductsStrip from '../components/PopularProductsStrip';
import PromoBannerGrid from '../components/PromoBannerGrid';

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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [conditionFilters, setConditionFilters] = useState({ neuf: false, occasion: false, presque_neuf: false });
  const [layoutSettings,   setLayoutSettings]   = useState(null);
  const [adStrips,         setAdStrips]         = useState(DEFAULT_HOME_AD_STRIPS);

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
        setCategories(catRes.data || []);
        setFeaturedProducts(featured);
        setAllProducts(allRes.data?.products || allRes.data || []);
        setNewProducts(newRes.data?.products || newRes.data || []);
        setTrendingProducts(trendingRes.data?.products || trendingRes.data || []);
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

  /* Filtre par mots-clés */
  const filterByKeywords = useCallback((products, keywords) => {
    if (!keywords?.length) return products;
    const kw = keywords.map(k => k.toLowerCase());
    return products.filter(p => {
      const hay = [p.name, p.category_name, p.category_slug, p.subcategory_name, p.subcategory_slug, ...(p.tags || [])]
        .filter(Boolean).join(' ').toLowerCase();
      return kw.some(k => hay.includes(k));
    });
  }, []);

  /* Mélange déterministe par seed */
  const sliceShuffled = useCallback((products, seed, limit = 12) => {
    if (!products.length) return [];
    const arr = [...products];
    let s = seed;
    for (let i = arr.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      const j = Math.abs(s) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, limit);
  }, []);

  const topRatedProducts = useMemo(() => {
    const deduped = allProductsMerged.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
    return applyProductFilters(deduped)
      .filter(p => {
        const img = p.images?.[0] || p.main_image || p.image;
        return img && !brokenTopProductImages[p.id];
      })
      .slice(0, 30);
  }, [allProductsMerged, applyProductFilters, brokenTopProductImages]);

  /* Strips par thème */
  const fallback = useMemo(() => sliceShuffled(allProductsMerged, 99, 14), [allProductsMerged, sliceShuffled]);

  const stripSmartphones = useMemo(() => {
    const r = filterByKeywords(allProductsMerged, ['smartphone', 'telephone', 'iphone', 'samsung', 'mobile']);
    return sliceShuffled(r.length ? r : allProductsMerged, 1, 14);
  }, [allProductsMerged, filterByKeywords, sliceShuffled]);

  const stripMode = useMemo(() => {
    const r = filterByKeywords(allProductsMerged, ['mode', 'chaussure', 'vetement', 'fashion', 'sac']);
    return sliceShuffled(r.length ? r : allProductsMerged, 2, 14);
  }, [allProductsMerged, filterByKeywords, sliceShuffled]);

  const stripTV = useMemo(() => {
    const r = filterByKeywords(allProductsMerged, ['tv', 'television', 'ecran', 'audio', 'son']);
    return sliceShuffled(r.length ? r : allProductsMerged, 3, 14);
  }, [allProductsMerged, filterByKeywords, sliceShuffled]);

  const stripInfo = useMemo(() => {
    const r = filterByKeywords(allProductsMerged, ['informatique', 'ordinateur', 'laptop', 'pc', 'bureau']);
    return sliceShuffled(r.length ? r : allProductsMerged, 4, 14);
  }, [allProductsMerged, filterByKeywords, sliceShuffled]);

  const stripSport = useMemo(() => {
    const r = filterByKeywords(allProductsMerged, ['sport', 'fitness', 'maison', 'cuisine', 'jardin']);
    return sliceShuffled(r.length ? r : allProductsMerged, 5, 14);
  }, [allProductsMerged, filterByKeywords, sliceShuffled]);

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
        <div className="site-container pt-2 pb-3">
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

      {/* ── Catégories ── */}
      <div className="w-full bg-white">
        <div className="site-container pt-1"><CategoriesGrid /></div>
      </div>

      <SubCategorySpotlight />

      {/* ── Top produits ── */}
      <HomeTopRatedProducts
        loading={loading}
        topRatedProducts={topRatedProducts}
        onImageMissing={id => setBrokenTopProductImages(p => ({ ...p, [id]: true }))}
      />

      {/* ── DROPS Carousel ── */}
      <CategoryProductsCarousel categories={categories} products={allProductsMerged} />

      {/* ── Nouveautés ── */}
      <div className="w-full bg-white">
        <div className="site-container pb-12">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
              {[...Array(14)].map((_, i) => (
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
              {newProducts.slice(0, 20).map(p => <ProductCard key={p.id} product={p} className="scale-[0.94]" />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Outlet Carousel ── */}
      {!loading && allProductsMerged.length > 0 && (
        <OutletCarousel categories={categories} products={allProductsMerged} />
      )}

      {/* ════════════════════════════════════════════════
          BLOCS INTERMÉDIAIRES — 3 nouveaux composants
          ════════════════════════════════════════════════ */}

      {/* 1 — Bannière inspiration violette (Capture 1) */}
      {!loading && (
        <InspirationBanner
          products={allProductsMerged}
          title="des idées et de l'inspiration pour votre prochaine aventure."
          ctaLabel="Commencez à explorer"
          ctaLink="/produits"
        />
      )}

      {/* 2 — Populaires Smartphones (Capture 2) */}
      <PopularProductsStrip
        title="Populaires · Smartphones & Téléphones"
        products={stripSmartphones}
        link="/produits?search=smartphone"
      />

      {/* 3 — Grille bannières promo (Capture 3) */}
      <PromoBannerGrid
        topBanners={[
          { title: 'AirPods & Écouteurs',    brand: 'Audio Premium',    badge: 'Nouveau',       cta: 'Découvrir',      link: '/produits?search=ecouteurs',  gradient: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', imageUrl: '' },
          { title: 'Lenovo Yoga & IdeaCentre',brand: 'Informatique',    badge: 'Offre spéciale',cta: 'Voir les détails',link: '/produits?search=ordinateur', gradient: 'linear-gradient(135deg,#1e1b4b,#4338ca)' },
          { title: 'Écrans 4K Ultra HD',      brand: 'Display & Video', badge: '-15%',          cta: 'Comparer',       link: '/produits?search=ecran',      gradient: 'linear-gradient(135deg,#701a75,#a21caf)' },
        ]}
        bottomBanners={[
          { title: 'LEGO Friends',     brand: 'Jouets',      badge: 'Enfants',    cta: 'Explorer',   link: '/produits?search=lego',    gradient: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
          { title: 'Stabilisateurs',   brand: 'Vidéo Pro',   badge: '-10%',       cta: 'Voir',       link: '/produits?search=camera',  gradient: 'linear-gradient(135deg,#f97316,#ea580c)' },
          { title: 'Claviers & Souris',brand: 'Bureau',                           cta: 'Acheter',    link: '/produits?search=clavier', gradient: 'linear-gradient(135deg,#e2e8f0,#cbd5e1)' },
          { title: 'Ultimate Ears',    brand: 'Audio',       badge: 'Tendance',   cta: 'Découvrir',  link: '/produits?search=enceinte',gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)' },
          { title: 'iPhone Reprise',   brand: 'Service',     badge: 'Trade-in',   cta: 'En savoir +',link: '/produits?search=iphone',  gradient: 'linear-gradient(135deg,#1c1917,#44403c)' },
        ]}
      />

      {/* 4 — Populaires Mode (Capture 2) */}
      <PopularProductsStrip
        title="Populaires · Mode & Vêtements"
        products={stripMode}
        link="/produits?search=mode"
      />

      {/* 5 — Bannière inspiration 2 */}
      {!loading && (
        <InspirationBanner
          products={allProductsMerged}
          title="des tendances et des nouveautés qui vont vous surprendre."
          ctaLabel="Voir les tendances"
          ctaLink="/produits?sort_by=sales_count"
        />
      )}

      {/* 6 — Populaires TV & Audio (Capture 2) */}
      <PopularProductsStrip
        title="Populaires · TV & Audio"
        products={stripTV}
        link="/produits?search=tv"
      />

      {/* 7 — Grille bannières promo 2 */}
      <PromoBannerGrid
        topBanners={[
          { title: 'Montres Connectées',  brand: 'Wearable',     badge: 'Tendance',     cta: 'Découvrir',  link: '/produits?search=montre',   gradient: 'linear-gradient(135deg,#064e3b,#10b981)' },
          { title: 'Consoles de Jeu',     brand: 'Gaming',       badge: 'Stock limité', cta: 'Commander',  link: '/produits?search=console',  gradient: 'linear-gradient(135deg,#1e3a5f,#3b82f6)' },
          { title: 'Tablettes & iPad',    brand: 'Mobile',       badge: '-20%',         cta: 'Explorer',   link: '/produits?search=tablette', gradient: 'linear-gradient(135deg,#7f1d1d,#ef4444)' },
        ]}
        bottomBanners={[
          { title: 'Sacs à Main',  brand: 'Mode',       cta: 'Voir',       link: '/produits?search=sac',      gradient: 'linear-gradient(135deg,#fce7f3,#fbcfe8)' },
          { title: 'Lunettes',     brand: 'Accessoires',badge: '-20%',     cta: 'Découvrir', link: '/produits?search=lunettes',  gradient: 'linear-gradient(135deg,#ede9fe,#ddd6fe)' },
          { title: 'Bijoux',       brand: 'Parure',     cta: 'Acheter',    link: '/produits?search=bijoux',   gradient: 'linear-gradient(135deg,#fef9c3,#fde68a)' },
          { title: 'Sport & Fitness',brand:'Sport',     badge:'Nouveauté', cta: 'Explorer',  link: '/produits?search=sport',    gradient: 'linear-gradient(135deg,#dcfce7,#bbf7d0)' },
          { title: 'Maison & Déco',brand: 'Maison',     cta: 'Voir',       link: '/produits?search=maison',   gradient: 'linear-gradient(135deg,#fff7ed,#fed7aa)' },
        ]}
      />

      {/* 8 — Populaires Informatique (Capture 2) */}
      <PopularProductsStrip
        title="Populaires · Informatique & Bureautique"
        products={stripInfo}
        link="/produits?search=ordinateur"
      />

      {/* 9 — Populaires Sport & Maison (Capture 2) */}
      <PopularProductsStrip
        title="Populaires · Sport, Maison & Bien-être"
        products={stripSport}
        link="/produits?search=sport"
      />

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-20px) rotate(5deg)} }
        .animate-float{animation:float 4s ease-in-out infinite}
      `}</style>
    </div>
  );
};

export default HomePage;