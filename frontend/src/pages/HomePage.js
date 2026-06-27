import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import AdSection from '../components/AdSection';
import ProductBlock from '../components/ProductBlock';
import ProductCarousel from '../components/ProductCarousel';

import { API_URL, API_BASE } from '../config/api';

const API = API_URL;

const DEFAULT_HOME_AD_STRIPS = [
  { id: 'offers', title: 'Espace Publicitaire - Offres du Jour', subtitle: 'Mettez ici vos promos, annonces flash et nouveautés sponsorisées.', tone: 'orange', enabled: true, media_type: 'none', media_url: '', link: '' },
  { id: 'partners', title: 'Espace Publicitaire - Marques Partenaires', subtitle: 'Zone dédiée aux campagnes partenaires, bannières saisonnières et bons plans.', tone: 'blue', enabled: true, media_type: 'none', media_url: '', link: '' },
  { id: 'premium', title: 'Espace Publicitaire - Sélection Premium', subtitle: 'Emplacements premium pour opérations spéciales, événements et mises en avant.', tone: 'green', enabled: true, media_type: 'none', media_url: '', link: '' },
  { id: 'flash', title: 'Espace Publicitaire - Ventes Flash', subtitle: 'Offres limitées dans le temps, ne manquez pas ces bonnes affaires !', tone: 'red', enabled: true, media_type: 'none', media_url: '', link: '' },
];

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
    <div style={{ ...baseStyle, backgroundColor: color }} />
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [conditionFilters, setConditionFilters] = useState({
    neuf: false,
    occasion: false,
    presque_neuf: false,
  });
  const [layoutSettings, setLayoutSettings] = useState(null);
  const [adStrips, setAdStrips] = useState(DEFAULT_HOME_AD_STRIPS);

  // === FETCH SETTINGS ===
  useEffect(() => {
    axios.get(`${API}/layout-settings`)
      .then(res => setLayoutSettings(res.data))
      .catch(() => setLayoutSettings({ sidebar_type: 'color', sidebar_color_left: '#f97316', sidebar_color_right: '#f97316', sidebar_width: 160 }));

    axios.get(`${API}/ad-strip-settings`)
      .then(res => {
        const strips = Array.isArray(res.data?.strips) ? res.data.strips : DEFAULT_HOME_AD_STRIPS;
        setAdStrips(DEFAULT_HOME_AD_STRIPS.map(fallback => ({
          ...fallback,
          ...(strips.find(s => s.id === fallback.id) || {}),
        })));
      })
      .catch(() => setAdStrips(DEFAULT_HOME_AD_STRIPS));
  }, []);

  // === FETCH DATA ===
  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchFeatured = async () => {
          try {
            const res = await axios.get(`${API}/products/featured?limit=12`);
            return Array.isArray(res.data) ? res.data : (res.data?.products || []);
          } catch {
            const res = await axios.get(`${API}/products?limit=100`);
            const prods = Array.isArray(res.data) ? res.data : (res.data?.products || []);
            return prods.filter(p => p.is_featured === true);
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
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleConditionFilter = (key) => {
    setConditionFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeConditions = Object.entries(conditionFilters)
    .filter(([, checked]) => checked)
    .map(([k]) => k);

  const applyProductFilters = (products) =>
    products.filter((product) => {
      const byCategory = selectedCategory === 'all' || product.category_slug === selectedCategory;
      const productCondition = (product.condition || '').toLowerCase();
      const byCondition = activeConditions.length === 0 ||
        activeConditions.some(c => c === 'presque_neuf' ? productCondition.includes('presque') : productCondition === c);
      return byCategory && byCondition;
    });

  const allVisibleProducts = useMemo(() => applyProductFilters([...featuredProducts, ...trendingProducts, ...newProducts]),
    [featuredProducts, trendingProducts, newProducts, selectedCategory, conditionFilters]
  );

  const productByCategorySlug = useMemo(() => {
    const map = {};
    allVisibleProducts.forEach(product => {
      if (!map[product.category_slug]) map[product.category_slug] = [];
      map[product.category_slug].push(product);
    });
    return map;
  }, [allVisibleProducts]);

  const activeCategories = categories.filter(c => c.is_active !== false);
  const parentCategories = activeCategories.filter(c => !c.parent_slug);
  const subCategories = activeCategories.filter(c => c.parent_slug);


  const topRatedProducts = useMemo(() => {
    const merged = allProducts.length ? allProducts : [...featuredProducts, ...newProducts, ...trendingProducts];
    const deduped = merged.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
    return applyProductFilters(deduped)
      .filter(p => {
        const img = p.images?.[0] || p.main_image || p.image;
        return img && !brokenTopProductImages[p.id];
      })
      .slice(0, 30);
  }, [allProducts, featuredProducts, newProducts, trendingProducts, selectedCategory, conditionFilters, brokenTopProductImages]);


  const allProductsMerged = useMemo(() => 
    allProducts.length ? allProducts : [...featuredProducts, ...newProducts, ...trendingProducts],
    [allProducts, featuredProducts, newProducts, trendingProducts]
  );

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
  }, [loading]);

  const activeAdStrips = adStrips.filter(strip => strip.enabled !== false);

  return (
    <div className="min-h-screen overflow-hidden bg-transparent" data-testid="home-page">
      <ScrollProgress />
      <FloatingBadges />
      <PromoBanner />

      {/* Hero Section */}
      <div className="w-full home-page-hero-wrapper">
        <div className="site-container pt-2 pb-3">
          <div className="hero-zone-grid grid grid-cols-1 lg:grid-cols-[minmax(200px,240px)_1fr] gap-2 w-full">
            <div className="hidden lg:block overflow-hidden shrink-0" style={heroSidebarHeight ? { height: `${heroSidebarHeight}px` } : undefined}>
              <CategorySidebar />
            </div>
            <div ref={heroContentRef} className="hero-zone-content min-w-0">
              <HeroSection
                bottomBlocks={activeAdStrips.length > 0 ? activeAdStrips.map((strip, idx) => (
                  <AdHorizontalStrip key={strip.id} strip={strip} index={idx} />
                )) : null}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-white">
        <div className="site-container pt-1">
          <CategoriesGrid />
        </div>
      </div>

      <SubCategorySpotlight />

      <HomeTopRatedProducts
        loading={loading}
        topRatedProducts={topRatedProducts}
        onImageMissing={(productId) => setBrokenTopProductImages(prev => ({ ...prev, [productId]: true }))}
      />

      <CategoryProductsCarousel categories={categories} products={allProductsMerged} />

      {/* Section Nouveautés */}
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
          ) : !newProducts?.length ? (
            <div className="py-14 text-center text-slate-400">
              <Sparkles className="mx-auto mb-3 h-12 w-12 opacity-20" />
              <p className="font-semibold">Aucun nouveau produit disponible</p>
              <p className="text-sm mt-2">Les derniers produits apparaîtront ici</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
              {newProducts.slice(0, 20).map(product => (
                <ProductCard key={product.id} product={product} className="scale-[0.94]" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== OUTLET CAROUSEL - Protégé ===== */}
      {!loading && allProductsMerged.length > 0 && (
        <OutletCarousel
          categories={categories}
          products={allProductsMerged}
        />
      )}

      {/* ===== NOUVELLES SECTIONS PUBLICITAIRES ===== */}
      
      {/* Section 1 - 3 colonnes */}
      <AdSection 
        layout="row-3"
        items={[
          {
            title: "Écouteurs Premium",
            brand: "Audio",
            badge: "Nouveau",
            cta: "Découvrir",
            link: "/produits?search=ecouteurs",
            bgColor: "bg-gradient-to-br from-blue-100 to-blue-200"
          },
          {
            title: "Ordinateurs Portables",
            brand: "Informatique",
            badge: "-15%",
            cta: "Voir les offres",
            link: "/produits?search=ordinateur",
            bgColor: "bg-gradient-to-br from-purple-100 to-purple-200"
          },
          {
            title: "Écrans 4K",
            brand: "Display",
            badge: "Offre",
            cta: "En savoir plus",
            link: "/produits?search=ecran",
            bgColor: "bg-gradient-to-br from-indigo-100 to-indigo-200"
          }
        ]}
      />

      {/* Bloc de produits aléatoires 1 - Carrousel animé */}
      <ProductCarousel allProducts={allProductsMerged} limit={12} keywords={["smartphone", "laptop", "ecouteurs"]} interval={1000} />

      {/* Section 2 - 5 colonnes */}
      <AdSection 
        layout="row-5"
        items={[
          {
            title: "Jouets & Jeux",
            brand: "Enfants",
            cta: "Explorer",
            link: "/produits?search=jouets",
            bgColor: "bg-gradient-to-br from-pink-100 to-pink-200"
          },
          {
            title: "Caméras & Vidéo",
            brand: "Photographie",
            badge: "-10%",
            cta: "Découvrir",
            link: "/produits?search=camera",
            bgColor: "bg-gradient-to-br from-orange-100 to-orange-200"
          },
          {
            title: "Accessoires PC",
            brand: "Bureau",
            cta: "Acheter",
            link: "/produits?search=accessoires",
            bgColor: "bg-gradient-to-br from-yellow-100 to-yellow-200"
          },
          {
            title: "Enceintes Bluetooth",
            brand: "Audio",
            cta: "Voir",
            link: "/produits?search=enceinte",
            bgColor: "bg-gradient-to-br from-cyan-100 to-cyan-200"
          },
          {
            title: "Reprise iPhone",
            brand: "Service",
            badge: "Éco-responsable",
            cta: "En savoir plus",
            link: "/produits?search=iphone",
            bgColor: "bg-gradient-to-br from-green-100 to-green-200"
          }
        ]}
      />

      {/* Bloc de produits aléatoires 2 - Carrousel animé */}
      <ProductCarousel allProducts={allProductsMerged} limit={12} keywords={["mode", "chaussures", "vetements"]} interval={1000} />

      {/* Section 3 - 3 colonnes */}
      <AdSection 
        layout="row-3"
        items={[
          {
            title: "Montres Connectées",
            brand: "Wearable",
            badge: "Tendance",
            cta: "Découvrir",
            link: "/produits?search=montre",
            bgColor: "bg-gradient-to-br from-teal-100 to-teal-200"
          },
          {
            title: "Consoles de Jeu",
            brand: "Gaming",
            badge: "Stock limité",
            cta: "Commander",
            link: "/produits?search=console",
            bgColor: "bg-gradient-to-br from-red-100 to-red-200"
          },
          {
            title: "Tablettes",
            brand: "Mobile",
            cta: "Explorer",
            link: "/produits?search=tablette",
            bgColor: "bg-gradient-to-br from-amber-100 to-amber-200"
          }
        ]}
      />

      {/* Bloc de produits aléatoires 3 - Carrousel animé */}
      <ProductCarousel allProducts={allProductsMerged} limit={12} keywords={["tv", "audio", "video"]} interval={1000} />

      {/* Section 4 - 5 colonnes */}
      <AdSection 
        layout="row-5"
        items={[
          {
            title: "Sacs à Main",
            brand: "Mode",
            cta: "Voir",
            link: "/produits?search=sac",
            bgColor: "bg-gradient-to-br from-rose-100 to-rose-200"
          },
          {
            title: "Lunettes",
            brand: "Accessoires",
            badge: "-20%",
            cta: "Découvrir",
            link: "/produits?search=lunettes",
            bgColor: "bg-gradient-to-br from-violet-100 to-violet-200"
          },
          {
            title: "Montres",
            brand: "Luxe",
            cta: "Explorer",
            link: "/produits?search=montre-luxe",
            bgColor: "bg-gradient-to-br from-fuchsia-100 to-fuchsia-200"
          },
          {
            title: "Bijoux",
            brand: "Parure",
            cta: "Acheter",
            link: "/produits?search=bijoux",
            bgColor: "bg-gradient-to-br from-pink-100 to-pink-200"
          },
          {
            title: "Ceintures",
            brand: "Mode",
            badge: "Nouveau",
            cta: "Voir",
            link: "/produits?search=ceinture",
            bgColor: "bg-gradient-to-br from-orange-100 to-orange-200"
          }
        ]}
      />

      {/* Bloc de produits aléatoires 4 - Carrousel animé */}
      <ProductCarousel allProducts={allProductsMerged} limit={12} keywords={["maison", "decoration", "mobilier"]} interval={1000} />

      {/* Section 5 - 3 colonnes */}
      <AdSection 
        layout="row-3"
        items={[
          {
            title: "Cuisine",
            brand: "Maison",
            badge: "Promo",
            cta: "Découvrir",
            link: "/produits?search=cuisine",
            bgColor: "bg-gradient-to-br from-emerald-100 to-emerald-200"
          },
          {
            title: "Salle de Bain",
            brand: "Maison",
            cta: "Explorer",
            link: "/produits?search=salle-de-bain",
            bgColor: "bg-gradient-to-br from-cyan-100 to-cyan-200"
          },
          {
            title: "Jardin",
            brand: "Extérieur",
            badge: "Saison",
            cta: "Voir",
            link: "/produits?search=jardin",
            bgColor: "bg-gradient-to-br from-green-100 to-green-200"
          }
        ]}
      />

      {/* Bloc de produits aléatoires 5 - Carrousel animé */}
      <ProductCarousel allProducts={allProductsMerged} limit={12} keywords={["sport", "fitness", "exercice"]} interval={1000} />

      {/* Section 6 - 5 colonnes */}
      <AdSection 
        layout="row-5"
        items={[
          {
            title: "Livres",
            brand: "Culture",
            cta: "Explorer",
            link: "/produits?search=livres",
            bgColor: "bg-gradient-to-br from-amber-100 to-amber-200"
          },
          {
            title: "Musique",
            brand: "Divertissement",
            badge: "-15%",
            cta: "Découvrir",
            link: "/produits?search=musique",
            bgColor: "bg-gradient-to-br from-yellow-100 to-yellow-200"
          },
          {
            title: "Films",
            brand: "Cinéma",
            cta: "Voir",
            link: "/produits?search=films",
            bgColor: "bg-gradient-to-br from-orange-100 to-orange-200"
          },
          {
            title: "Jeux Vidéo",
            brand: "Gaming",
            badge: "Nouveauté",
            cta: "Acheter",
            link: "/produits?search=jeux-video",
            bgColor: "bg-gradient-to-br from-red-100 to-red-200"
          },
          {
            title: "Instruments",
            brand: "Musique",
            cta: "Explorer",
            link: "/produits?search=instruments",
            bgColor: "bg-gradient-to-br from-purple-100 to-purple-200"
          }
        ]}
      />

      {/* Bloc de produits aléatoires 6 - Carrousel animé */}
      <ProductCarousel allProducts={allProductsMerged} limit={12} keywords={["beaute", "cosmetique", "soin"]} interval={1000} />

      {/* Section 7 - 3 colonnes */}
      <AdSection 
        layout="row-3"
        items={[
          {
            title: "Bébé",
            brand: "Famille",
            badge: "-25%",
            cta: "Découvrir",
            link: "/produits?search=bebe",
            bgColor: "bg-gradient-to-br from-sky-100 to-sky-200"
          },
          {
            title: "Enfants",
            brand: "Famille",
            cta: "Explorer",
            link: "/produits?search=enfants",
            bgColor: "bg-gradient-to-br from-blue-100 to-blue-200"
          },
          {
            title: "Ados",
            brand: "Famille",
            badge: "Tendance",
            cta: "Voir",
            link: "/produits?search=ados",
            bgColor: "bg-gradient-to-br from-indigo-100 to-indigo-200"
          }
        ]}
      />

      {/* Bloc de produits aléatoires 7 - Carrousel animé */}
      <ProductCarousel allProducts={allProductsMerged} limit={12} keywords={["auto", "moto", "accessoires-auto"]} interval={1000} />

      {/* Section 8 - 5 colonnes */}
      <AdSection 
        layout="row-5"
        items={[
          {
            title: "Alimentation",
            brand: "Épicerie",
            cta: "Explorer",
            link: "/produits?search=alimentation",
            bgColor: "bg-gradient-to-br from-lime-100 to-lime-200"
          },
          {
            title: "Boissons",
            brand: "Épicerie",
            badge: "-10%",
            cta: "Découvrir",
            link: "/produits?search=boissons",
            bgColor: "bg-gradient-to-br from-green-100 to-green-200"
          },
          {
            title: "Snacks",
            brand: "Gourmandise",
            cta: "Voir",
            link: "/produits?search=snacks",
            bgColor: "bg-gradient-to-br from-yellow-100 to-yellow-200"
          },
          {
            title: "Bio",
            brand: "Santé",
            badge: "Bio",
            cta: "Acheter",
            link: "/produits?search=bio",
            bgColor: "bg-gradient-to-br from-emerald-100 to-emerald-200"
          },
          {
            title: "Frais",
            brand: "Épicerie",
            cta: "Explorer",
            link: "/produits?search=frais",
            bgColor: "bg-gradient-to-br from-teal-100 to-teal-200"
          }
        ]}
      />

      {/* Bloc de produits aléatoires 8 - Carrousel animé */}
      <ProductCarousel allProducts={allProductsMerged} limit={12} keywords={["electronique", "gadget", "tech"]} interval={1000} />

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-20px) rotate(5deg); } }
        .animate-float { animation: float 4s ease-in-out infinite; }
        @keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 30s linear infinite; }
        @keyframes marquee-cats { 0% { transform: translateX(0); } 100% { transform: translateX(calc(-100% - 1.25rem)); } }
        .continuous-marquee { display: flex; width: max-content; gap: 1.25rem; padding: 0 1rem; }
        .continuous-marquee-track { display: flex; gap: 1.25rem; flex-shrink: 0; will-change: transform; }
        .continuous-marquee-track-cats { animation: marquee-cats 150s linear infinite; }
        @keyframes selection-products-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(calc(-50% - 0.5rem)); } }
        .selection-products-marquee { overflow: hidden; width: 100%; }
        .selection-products-track { display: flex; width: max-content; gap: 1rem; will-change: transform; animation: selection-products-scroll 56s linear infinite; }
        .selection-products-marquee:hover .selection-products-track { animation-play-state: paused; }
        @media (min-width: 768px) { .continuous-marquee:hover .continuous-marquee-track { animation-play-state: paused; } }
        @media (max-width: 767px) {
          .continuous-marquee { width: max-content; }
          .continuous-marquee-track { animation: none; }
          .selection-products-track { animation-duration: 38s; }
        }
      `}</style>
    </div>
  );
};

export default HomePage;