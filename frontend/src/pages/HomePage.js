import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Sparkles, Zap, Star } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import HeroSection from '../components/HeroSection';
import CategorySidebar from '../components/CategorySidebar';
import CategoriesGrid from '../components/CategoriesGrid';
import SubCategorySpotlight from '../components/SubCategorySpotlight';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollProgress } from '../components/InfiniteScroll';
import { PromoBanner, TrustBanner, NotificationFeed, FloatingBadges, TestimonialsBanner } from '../components/ScrollingBanners';
import AdHorizontalStrip from '../components/AdHorizontalStrip';
import HomeTopRatedProducts from '../components/HomeTopRatedProducts';
import MarketplaceProductStrips from '../components/MarketplaceProductStrips';
import CategoryMarquee from '../components/CategoryMarquee';
import AdStrip from '../components/AdStrip';
import CategoryProductsCarousel from '../components/CategoryProductsCarousel';
import OutletCarousel from '../components/OutletCarousel';
import { toAbsoluteMediaUrl } from '../utils/media';
import { HOME_LAYOUT_VARIANTS, getRandomLayoutVariant } from '../config/homeLayoutVariants';
import { API_URL, API_BASE } from '../config/api';

const API = API_URL;

const DEFAULT_HOME_AD_STRIPS = [
  { id: 'offers', title: 'Espace Publicitaire - Offres du Jour', subtitle: 'Mettez ici vos promos, annonces flash et nouveautés sponsorisées.', tone: 'orange', enabled: true, media_type: 'none', media_url: '', link: '' },
  { id: 'partners', title: 'Espace Publicitaire - Marques Partenaires', subtitle: 'Zone dédiée aux campagnes partenaires, bannières saisonnières et bons plans.', tone: 'blue', enabled: true, media_type: 'none', media_url: '', link: '' },
  { id: 'premium', title: 'Espace Publicitaire - Sélection Premium', subtitle: 'Emplacements premium pour opérations spéciales, événements et mises en avant.', tone: 'green', enabled: true, media_type: 'none', media_url: '', link: '' },
  { id: 'flash', title: 'Espace Publicitaire - Ventes Flash', subtitle: 'Offres limitées dans le temps, ne manquez pas ces bonnes affaires !', tone: 'red', enabled: true, media_type: 'none', media_url: '', link: '' },
];

const DEFAULT_TITLES = [
  'Espace Publicitaire - Offres du Jour',
  'Espace Publicitaire - Marques Partenaires',
  'Espace Publicitaire - Sélection Premium',
  'Espace Publicitaire - Ventes Flash'
];

const DEFAULT_SUBTITLES = [
  'Mettez ici vos promos, annonces flash et nouveautés sponsorisées.',
  'Zone dédiée aux campagnes partenaires, bannières saisonnières et bons plans.',
  'Emplacements premium pour opérations spéciales, événements et mises en avant.',
  'Offres limitées dans le temps, ne manquez pas ces bonnes affaires !'
];

const sectionMotion = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const useInView = () => {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsInView(true);
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, isInView];
};

const PageSidebar = ({ side = 'left', layoutSettings, topOffset = 0 }) => {
  const width = layoutSettings?.sidebar_width || 160;
  const type = layoutSettings?.sidebar_type || 'color';
  const color = side === 'left'
    ? (layoutSettings?.sidebar_color_left || '#f97316')
    : (layoutSettings?.sidebar_color_right || '#f97316');
  const imageRaw = side === 'left'
    ? (layoutSettings?.sidebar_image_left || '')
    : (layoutSettings?.sidebar_image_right || '');

  const image = imageRaw && imageRaw.startsWith('/')
    ? `${API_BASE}${imageRaw}`
    : imageRaw;
  const baseStyle = {
    position: 'fixed',
    top: topOffset,
    bottom: 0,
    [side]: 0,
    width,
    zIndex: 20,
    pointerEvents: 'none',
  };

  if (type === 'image' && image) {
    return (
      <div style={{
        ...baseStyle,
        backgroundImage: `url(${image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }} />
    );
  }

  return (
    <div style={{
      ...baseStyle,
      backgroundColor: color,
    }} />
  );
};

const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brokenTopProductImages, setBrokenTopProductImages] = useState({});
  const [categorySlideTick, setCategorySlideTick] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [conditionFilters, setConditionFilters] = useState({
    neuf: false,
    occasion: false,
    presque_neuf: false,
  });
  const [layoutSettings, setLayoutSettings] = useState(null);
  const [adStrips, setAdStrips] = useState(DEFAULT_HOME_AD_STRIPS);
  const [trendingBlockSettings, setTrendingBlockSettings] = useState({
    gradient_from: '#1e293b',
    gradient_to: '#0f172a',
    background_image: '',
    enable_blurs: true,
  });
  const [layoutVariant, setLayoutVariant] = useState(getRandomLayoutVariant());

  const [newProductsRef, newProductsInView] = useInView();
  const [trendingRef, trendingInView] = useInView();

  useEffect(() => {
    axios.get(`${API}/layout-settings`)
      .then(res => setLayoutSettings(res.data))
      .catch(() => setLayoutSettings({
        sidebar_type: 'color',
        sidebar_color_left: '#f97316',
        sidebar_color_right: '#f97316',
        sidebar_image_left: '',
        sidebar_image_right: '',
        sidebar_width: 160,
      }));
  }, []);

  useEffect(() => {
    axios.get(`${API}/ad-strip-settings`)
      .then(res => {
        const strips = Array.isArray(res.data?.strips) ? res.data.strips : DEFAULT_HOME_AD_STRIPS;
        setAdStrips(DEFAULT_HOME_AD_STRIPS.map((fallback) => ({
          ...fallback,
          ...(strips.find((strip) => strip.id === fallback.id) || {}),
        })));
      })
      .catch(() => setAdStrips(DEFAULT_HOME_AD_STRIPS));
  }, []);

  useEffect(() => {
    axios.get(`${API}/trending-block-settings`)
      .then(res => setTrendingBlockSettings(res.data || {
        gradient_from: '#1e293b',
        gradient_to: '#0f172a',
        background_image: '',
        enable_blurs: true,
      }))
      .catch(() => setTrendingBlockSettings({
        gradient_from: '#1e293b',
        gradient_to: '#0f172a',
        background_image: '',
        enable_blurs: true,
      }));
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchFeatured = async () => {
          try {
            const res = await axios.get(`${API}/products/featured?limit=12`);
            const products = Array.isArray(res.data) ? res.data : (res.data?.products || []);
            return products;
          } catch (err) {
            const res = await axios.get(`${API}/products?limit=100`);
            const allProducts = Array.isArray(res.data) ? res.data : (res.data?.products || []);
            return allProducts.filter(p => p.is_featured === true);
          }
        };

        const [catRes, featured, allRes, newRes, trendingRes] = await Promise.all([
          axios.get(`${API}/categories`),
          fetchFeatured(),
          axios.get(`${API}/products?limit=100`),
          axios.get(`${API}/products?sort_by=created_at&sort_order=desc&limit=16`),
          axios.get(`${API}/products?sort_by=sales_count&sort_order=desc&limit=12`),
        ]);

        setCategories(catRes.data);
        setFeaturedProducts(featured);
        setAllProducts(allRes.data?.products || allRes.data || []);
        setNewProducts(newRes.data?.products || newRes.data || []);
        setTrendingProducts(trendingRes.data?.products || trendingRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCategorySlideTick((prev) => prev + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLayoutVariant(getRandomLayoutVariant());
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const toggleConditionFilter = (key) => {
    setConditionFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeConditions = Object.entries(conditionFilters)
    .filter(([, checked]) => checked)
    .map(([k]) => k);

  const applyProductFilters = (products) =>
    products.filter((product) => {
      const byCategory = selectedCategory === 'all' || product.category_slug === selectedCategory;
      const productCondition = (product.condition || '').toLowerCase();
      const byCondition =
        activeConditions.length === 0 ||
        activeConditions.some((c) => {
          if (c === 'presque_neuf') return productCondition.includes('presque');
          return productCondition === c;
        });
      return byCategory && byCondition;
    });

  const filteredTrendingProducts = applyProductFilters(trendingProducts);
  const filteredNewProducts = applyProductFilters(newProducts);
  const activeCategories = categories.filter(c => c.is_active !== false);
  const parentCategories = activeCategories.filter((c) => !c.parent_slug);
  const subCategories = activeCategories.filter((c) => c.parent_slug);

  const subCategoriesByParent = useMemo(() => {
    const grouped = {};
    subCategories.forEach((sub) => {
      if (!grouped[sub.parent_slug]) grouped[sub.parent_slug] = [];
      grouped[sub.parent_slug].push(sub);
    });
    return grouped;
  }, [subCategories]);

  const buildLoopItems = useCallback((items, minBaseCount = 12) => {
    if (!items || items.length === 0) return [];
    const repeats = Math.max(2, Math.ceil(minBaseCount / items.length));
    const base = Array.from({ length: repeats }).flatMap(() => items);
    return [...base, ...base];
  }, []);

  const allVisibleProducts = useMemo(
    () => applyProductFilters([...featuredProducts, ...trendingProducts, ...newProducts]),
    [featuredProducts, trendingProducts, newProducts, selectedCategory, conditionFilters]
  );

  const productByCategorySlug = useMemo(() => {
    const map = {};
    allVisibleProducts.forEach((product) => {
      if (!map[product.category_slug]) map[product.category_slug] = [];
      map[product.category_slug].push(product);
    });
    return map;
  }, [allVisibleProducts]);

  const parentLoopItems = useMemo(
    () => buildLoopItems(parentCategories, 14),
    [parentCategories, buildLoopItems]
  );

  const topRatedProducts = useMemo(() => {
    const merged = allProducts.length
      ? allProducts
      : [...featuredProducts, ...newProducts, ...trendingProducts];
    const deduped = merged.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
    return applyProductFilters(deduped)
      .filter((product) => {
        const image = product.images?.[0] || product.main_image || product.image;
        return image && !brokenTopProductImages[product.id];
      })
      .slice(0, 30);
  }, [allProducts, featuredProducts, newProducts, trendingProducts, selectedCategory, conditionFilters, brokenTopProductImages]);

  const marketplaceStripSourceProducts = useMemo(() => {
    const merged = allProducts.length
      ? allProducts
      : [...featuredProducts, ...newProducts, ...trendingProducts];
    const deduped = merged.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
    return applyProductFilters(deduped).filter((product) => {
      const image = product.images?.[0] || product.main_image || product.image;
      return image && !brokenTopProductImages[product.id];
    });
  }, [allProducts, featuredProducts, newProducts, trendingProducts, selectedCategory, conditionFilters, brokenTopProductImages]);

  const pickMarketplaceProducts = useCallback((keywords) => {
    const keywordList = keywords.map((keyword) => keyword.toLowerCase());
    const matches = marketplaceStripSourceProducts.filter((product) => {
      const haystack = [
        product.name,
        product.category_name,
        product.category_slug,
        product.subcategory_name,
        product.subcategory_slug,
        ...(product.tags || []),
      ].filter(Boolean).join(' ').toLowerCase();
      return keywordList.some((keyword) => haystack.includes(keyword));
    });
    return [...matches]
      .filter((product, index, arr) => arr.findIndex((item) => item.id === product.id) === index)
      .slice(0, 7);
  }, [marketplaceStripSourceProducts]);

  const marketplaceProductStrips = useMemo(() => ([
    {
      title: 'Sponsor officiel | Smart Technology',
      href: '/produits?search=smart',
      tone: 'red',
      products: pickMarketplaceProducts(['smart', 'tech', 'ordinateur', 'pc', 'laptop'], 0),
    },
    {
      title: 'Les vrais kiens du moment | 14 ans avec vous',
      href: '/produits?sort_by=sales_count',
      tone: 'orange',
      products: pickMarketplaceProducts(['mode', 'chaussure', 'vetement', 'fashion', 'accessoire'], 7),
    },
    {
      title: 'Smartphones | 14 ans avec vous',
      href: '/produits?search=smartphone',
      tone: 'green',
      products: pickMarketplaceProducts(['phone', 'iphone', 'samsung', 'smartphone', 'xiaomi', 'redmi'], 14),
    },
    {
      title: 'TVs & Audio | 14 ans avec vous',
      href: '/produits?search=audio',
      tone: 'orange',
      products: pickMarketplaceProducts(['tv', 'audio', 'speaker', 'casque', 'ecouteur', 'sound'], 21),
    },
  ]), [pickMarketplaceProducts]);

  const sidebarW = layoutSettings?.sidebar_width || 0;
  const showSidebars = layoutSettings !== null && sidebarW > 0;

  const heroContentRef = useRef(null);
  const [heroSidebarHeight, setHeroSidebarHeight] = useState(null);

  useEffect(() => {
    const el = heroContentRef.current;
    if (!el) return;

    const updateHeight = () => setHeroSidebarHeight(el.offsetHeight);

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    window.addEventListener('resize', updateHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [adStrips.length, loading]);

  const activeAdStrips = adStrips.filter(strip => strip.enabled !== false);

  const allProductsMerged = allProducts.length
    ? allProducts
    : [...featuredProducts, ...newProducts, ...trendingProducts];

  return (
    <div className="min-h-screen overflow-hidden bg-transparent" data-testid="home-page">
      <ScrollProgress />
      <FloatingBadges />
      <PromoBanner />

      {/* Hero Section */}
      <div className="w-full home-page-hero-wrapper">
        <div className="site-container pt-2 pb-3">
          <div className="hero-zone-grid grid grid-cols-1 lg:grid-cols-[minmax(200px,240px)_1fr] gap-2 w-full">
            <div
              className="hidden lg:block overflow-hidden shrink-0"
              style={heroSidebarHeight ? { height: `${heroSidebarHeight}px` } : undefined}
            >
              <CategorySidebar />
            </div>
            <div ref={heroContentRef} className="hero-zone-content min-w-0">
              <HeroSection
                bottomBlocks={
                  activeAdStrips.length > 0
                    ? activeAdStrips.map((strip, idx) => (
                        <AdHorizontalStrip key={strip.id} strip={strip} index={idx} />
                      ))
                    : null
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== CATÉGORIES ===== */}
      <div className="w-full bg-white">
        <div className="site-container pt-1">
          <CategoriesGrid />
        </div>
      </div>

      {/* ===== SOUS-CATÉGORIE ALÉATOIRE ===== */}
      <SubCategorySpotlight />

      {/* ===== TOP PRODUITS ===== */}
      <HomeTopRatedProducts
        loading={loading}
        topRatedProducts={topRatedProducts}
        onImageMissing={(productId) => setBrokenTopProductImages((prev) => ({ ...prev, [productId]: true }))}
      />

      {/* ===== DROPS CAROUSEL (fond sombre) ===== */}
      <CategoryProductsCarousel
        categories={categories}
        products={allProductsMerged}
      />

      {/* ===== SECTION NOUVEAUTÉS ===== */}
      <div className="w-full bg-white">
        <div className="site-container pb-12">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
              {[...Array(20)].map((_, i) => (
                <div key={`new-skeleton-${i}`} className="bg-white p-2">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="mt-2 h-3 w-11/12" />
                  <Skeleton className="mt-2 h-4 w-20" />
                </div>
              ))}
            </div>
          ) : !newProducts || newProducts.length === 0 ? (
            <div className="py-14 text-center text-slate-400">
              <Sparkles className="mx-auto mb-3 h-12 w-12 opacity-20" />
              <p className="font-semibold">Aucun nouveau produit disponible</p>
              <p className="text-sm mt-2">Les derniers produits apparaîtront ici</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
              {newProducts.slice(0, 20).map((product) => (
                <ProductCard key={product.id} product={product} className="scale-[0.94]" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== OUTLET CAROUSEL (fond blanc, filtres condition) ===== */}
      <OutletCarousel
        categories={categories}
        products={allProductsMerged}
      />

      {/* ===== RESTE DE LA PAGE ===== */}
      <div className="w-full">
        <div className="w-full">
          <div className="site-container" />

          <NotificationFeed notifications={[
            { user: 'Marie D.', action: "vient d'acheter", product: 'Robe Africaine', time: 'il y a 2 min' },
            { user: 'Kofi A.', action: 'a ajouté aux favoris', product: 'Montre Casio', time: 'il y a 5 min' },
            { user: 'Awa S.', action: 'vient de commander', product: 'iPhone 14', time: 'il y a 8 min' },
            { user: 'Jean P.', action: 'a laissé un avis 5★ sur', product: 'Sac à main', time: 'il y a 12 min' },
          ]} />

          <section className="bg-white hidden md:block">
            <div className="site-container overflow-hidden border-x border-slate-100">
              {loading ? (
                <div className="space-y-1 py-2">
                  {[...Array(4)].map((_, blockIndex) => (
                    <div key={`market-strip-skeleton-${blockIndex}`} className="border-b-4 border-cyan-500 bg-white">
                      <Skeleton className="h-8 w-full rounded-none" />
                      <div className="grid grid-cols-3 gap-2 p-2 md:grid-cols-7">
                        {[...Array(7)].map((_, itemIndex) => (
                          <Skeleton key={`market-strip-item-${blockIndex}-${itemIndex}`} className="h-36 rounded-md" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <MarketplaceProductStrips
                  marketplaceProductStrips={marketplaceProductStrips}
                  onImageMissing={(productId) => setBrokenTopProductImages((prev) => ({ ...prev, [productId]: true }))}
                />
              )}
            </div>
          </section>

          <section className="py-5 bg-white border-y border-slate-100 overflow-hidden hidden md:block">
            <CategoryMarquee
              parentLoopItems={parentLoopItems}
              categorySlideTick={categorySlideTick}
              prefix="mid"
              sectionClassName="py-5 bg-white border-y border-slate-100 overflow-hidden hidden md:block"
            />
          </section>

          <AdStrip
            adStrips={adStrips}
            stripId="partners"
            tone="blue"
            title="Espace Publicitaire - Marques Partenaires"
            subtitle="Zone dédiée aux campagnes partenaires, bannières saisonnières et bons plans."
          />

          <CategoryMarquee
            parentLoopItems={parentLoopItems}
            categorySlideTick={categorySlideTick}
            prefix="bottom"
            sectionClassName="py-5 bg-white border-y border-slate-100 overflow-hidden"
          />

          <AdStrip stripId="premium" tone="green" title="Espace Publicitaire - Sélection Premium" subtitle="Emplacements premium pour opérations spéciales, événements et mises en avant." />

          <section className="py-16 bg-gradient-to-b from-orange-50 to-white overflow-hidden">
            <div className="site-container mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Ce que disent nos clients</h2>
              <p className="text-muted-foreground text-center">Des milliers de clients satisfaits chaque jour</p>
            </div>
            <TestimonialsBanner testimonials={[
              { name: 'Marie Dupont', location: 'Abidjan', rating: 5, comment: 'Service excellent ! Ma commande est arrivée en 2 jours.' },
              { name: 'Kofi Mensah', location: 'Dakar', rating: 5, comment: 'Je recommande vivement ! Les vendeurs sont très professionnels.' },
              { name: 'Awa Diallo', location: 'Bamako', rating: 4, comment: 'Très satisfaite de mon achat. Le suivi en temps réel est pratique.' },
              { name: 'Jean-Pierre K.', location: 'Douala', rating: 5, comment: "Cloléo a changé ma façon de faire du shopping !" },
              { name: 'Fatou Ndiaye', location: 'Conakry', rating: 5, comment: 'Les produits artisanaux sont magnifiques.' },
            ]} />
          </section>

          <TrustBanner />
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { animation: marquee 30s linear infinite; }
        @keyframes marquee-cats {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-100% - 1.25rem)); }
        }
        .continuous-marquee {
          display: flex;
          width: max-content;
          gap: 1.25rem;
          padding: 0 1rem;
        }
        .continuous-marquee-track {
          display: flex;
          gap: 1.25rem;
          flex-shrink: 0;
          will-change: transform;
        }
        .continuous-marquee-track-cats {
          animation: marquee-cats 150s linear infinite;
        }
        @keyframes selection-products-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 0.5rem)); }
        }
        .selection-products-marquee {
          overflow: hidden;
          width: 100%;
        }
        .selection-products-track {
          display: flex;
          width: max-content;
          gap: 1rem;
          will-change: transform;
          animation: selection-products-scroll 56s linear infinite;
        }
        .selection-products-marquee:hover .selection-products-track {
          animation-play-state: paused;
        }
        @media (min-width: 768px) {
          .continuous-marquee:hover .continuous-marquee-track {
            animation-play-state: paused;
          }
        }
        @media (max-width: 767px) {
          .continuous-marquee { width: max-content; }
          .continuous-marquee-track { animation: none; }
          .selection-products-track { animation-duration: 38s; }
        }
      `}</style>
    </div>
  );
};

export default HomePage;s