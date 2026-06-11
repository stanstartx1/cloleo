import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Sparkles, Zap, TrendingUp, Star } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import HeroSection from '../components/HeroSection';
import CategorySidebar from '../components/CategorySidebar';
import CategoriesGrid from '../components/CategoriesGrid';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollProgress } from '../components/InfiniteScroll';
import { PromoBanner, TrustBanner, NotificationFeed, FloatingBadges, TestimonialsBanner } from '../components/ScrollingBanners';
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

// ===== COMPOSANT POUR LES 4 BLOCS PUBLICITAIRES HORIZONTAUX - FORMAT RECTANGLE (COMME CATÉGORIES) =====
const AdHorizontalStrip = ({ strip, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const getToneStyles = (tone) => {
    const tones = {
      orange: 'from-orange-500 via-amber-500 to-orange-600',
      blue: 'from-blue-500 via-cyan-500 to-blue-600',
      green: 'from-emerald-500 via-teal-500 to-green-600',
      red: 'from-red-500 via-rose-500 to-red-600',
    };
    return tones[tone] || tones.orange;
  };

  const getImageUrl = (url) => {
    if (!url) return '';
    if (typeof url === 'object') url = url.url || '';
    if (url.startsWith('/')) return `${API_BASE}${url}`;
    return url;
  };

  const mediaUrl = getImageUrl(strip.media_url);
  const toneGradient = getToneStyles(strip.tone);
  
  const isTitleCustom = strip.title && strip.title !== DEFAULT_TITLES[index];
  const isSubtitleCustom = strip.subtitle && strip.subtitle !== DEFAULT_SUBTITLES[index];

  const content = (
    <div 
      className={`relative overflow-hidden rounded-xl shadow-md transition-all duration-300 ${isHovered ? 'shadow-xl -translate-y-1' : ''} h-full`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Format rectangulaire comme les catégories (h-40) */}
      {strip.media_type === 'image' && mediaUrl ? (
        <div className="relative h-40 w-full">
          <img 
            src={mediaUrl} 
            alt={strip.title}
            className="w-full h-full object-cover transition-transform duration-500"
            style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
        </div>
      ) : strip.media_type === 'video' && mediaUrl ? (
        <div className="relative h-40 w-full">
          <video 
            src={mediaUrl} 
            className="w-full h-full object-cover"
            autoPlay={isHovered}
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
        </div>
      ) : (
        <div className={`h-40 w-full bg-gradient-to-r ${toneGradient} flex items-center justify-center`}>
          <span className="text-white text-3xl md:text-4xl font-black opacity-30">
            {strip.title?.charAt(0) || 'A'}
          </span>
        </div>
      )}
      
      {/* Texte superposé - AFFICHÉ UNIQUEMENT SI PERSONNALISÉ */}
      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
        {isTitleCustom && (
          <h3 className="text-sm md:text-base font-bold line-clamp-1">{strip.title}</h3>
        )}
        {isSubtitleCustom && (
          <p className="text-xs opacity-90 line-clamp-1 mt-0.5">{strip.subtitle}</p>
        )}
        <span className={`inline-block mt-1.5 text-[10px] font-bold bg-white/20 rounded-full px-2.5 py-1 backdrop-blur-sm transition-all duration-300 ${isHovered ? 'bg-white/30 px-3.5' : ''}`}>
          Découvrir →
        </span>
      </div>
    </div>
  );

  if (strip.link) {
    return (
      <Link to={strip.link} className="block h-full">
        {content}
      </Link>
    );
  }
  return content;
};

const getHomeProductDisplayPrice = (product) => {
  const promoFcfa = Number(product.promo_price_fcfa || 0);
  const priceFcfa = Number(product.price_fcfa || 0);
  const discountPrice = Number(product.discount_price || 0);
  const legacyPrice = Number(product.price || 0);
  if (promoFcfa > 0 && priceFcfa > 0 && promoFcfa < priceFcfa) return promoFcfa;
  if (priceFcfa > 0) return priceFcfa;
  if (discountPrice > 0) return discountPrice;
  if (legacyPrice > 0) return legacyPrice;
  return 0;
};

const getHomeProductBasePrice = (product) => {
  const priceFcfa = Number(product.price_fcfa || 0);
  const legacyPrice = Number(product.price || 0);
  return priceFcfa > 0 ? priceFcfa : legacyPrice;
};

const getHomeProductDiscount = (product) => {
  const base = getHomeProductBasePrice(product);
  const display = getHomeProductDisplayPrice(product);
  if (!base || !display || display >= base) return null;
  return Math.round((1 - display / base) * 100);
};

const getHomeProductImage = (product) =>
  toAbsoluteMediaUrl(product.images?.[0] || product.main_image || product.image || '');

const HomeTopProductCard = ({ product, index, onImageMissing }) => {
  const price = getHomeProductDisplayPrice(product);
  const basePrice = getHomeProductBasePrice(product);
  const discount = getHomeProductDiscount(product);
  const badgeText = discount ? `-${discount}%` : product.is_featured ? 'Top' : index < 4 ? 'Hot' : null;

  return (
    <Link
      to={`/produit/${product.id}`}
      className="group relative block bg-white p-1 transition-all duration-200 hover:z-10 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative overflow-hidden rounded-lg bg-slate-50">
        <img
          src={getHomeProductImage(product)}
          alt={product.name}
          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={() => onImageMissing(product.id)}
        />
        {badgeText && (
          <span className="absolute right-1 top-1 rounded-full bg-orange-500 px-1 py-0.5 text-[9px] font-bold text-white shadow-sm">
            {badgeText}
          </span>
        )}
        {product.is_featured && (
          <span className="absolute left-1 top-1 rounded bg-red-600 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            Choix
          </span>
        )}
      </div>
      <div className="pt-1">
        <p className="line-clamp-2 min-h-[2rem] text-[10px] font-medium leading-tight text-slate-700 group-hover:text-red-600 md:text-[11px]">
          {product.name}
        </p>
        <p className="mt-1 text-[13px] font-black text-slate-950 md:text-[14px]">
          {price.toLocaleString()} FCFA
        </p>
        {basePrice > price && (
          <p className="text-[9px] text-slate-400 line-through">
            {basePrice.toLocaleString()} FCFA
          </p>
        )}
      </div>
    </Link>
  );
};

const MarketplaceStripProductCard = ({ product, index, onImageMissing }) => {
  const price = getHomeProductDisplayPrice(product);
  const basePrice = getHomeProductBasePrice(product);
  const discount = getHomeProductDiscount(product);
  const badgeText = discount ? `-${discount}%` : index < 2 ? 'Smart' : null;

  return (
    <Link
      to={`/produit/${product.id}`}
      className="group relative min-w-[142px] max-w-[142px] bg-white p-1.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:min-w-[158px] sm:max-w-[158px] md:min-w-0 md:max-w-none"
    >
      <div className="relative aspect-[1.08] overflow-hidden rounded-md bg-slate-50">
        <img
          src={getHomeProductImage(product)}
          alt={product.name}
          className="h-full w-full object-contain object-center p-1.5 transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={() => onImageMissing(product.id)}
        />
        {badgeText && (
          <span className="absolute left-1 top-1 rounded-sm bg-red-600 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">
            {badgeText}
          </span>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 min-h-[1.9rem] text-[10px] font-semibold leading-tight text-slate-800 group-hover:text-orange-600">
        {product.name}
      </p>
      <p className="mt-0.5 text-[11px] font-black leading-tight text-slate-950">
        {price.toLocaleString()} FCFA
      </p>
      {basePrice > price && (
        <p className="text-[9px] leading-tight text-slate-400 line-through">
          {basePrice.toLocaleString()} FCFA
        </p>
      )}
    </Link>
  );
};

const MarketplaceProductStrip = ({ title, href, products, tone = 'orange', onImageMissing }) => {
  const tones = {
    red: 'bg-red-600 text-white',
    orange: 'bg-amber-400 text-slate-950',
    green: 'bg-emerald-500 text-white',
    cyan: 'bg-cyan-500 text-white',
  };

  if (!products.length) return null;

  return (
    <section className="border-b-4 border-cyan-500 bg-white">
      <div className={`flex items-center justify-between px-3 py-2 text-xs font-black md:px-4 ${tones[tone] || tones.orange}`}>
        <h2 className="truncate">{title}</h2>
        <Link to={href} className="ml-3 shrink-0 text-[10px] font-bold hover:underline">
          Voir plus <ArrowRight className="ml-1 inline h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-flow-col auto-cols-[142px] gap-2 overflow-x-auto px-2 py-2 no-scrollbar sm:auto-cols-[158px] md:grid-flow-row md:grid-cols-6 lg:grid-cols-7">
        {products.map((product, index) => (
          <MarketplaceStripProductCard
            key={`${title}-${product.id}`}
            product={product}
            index={index}
            onImageMissing={onImageMissing}
          />
        ))}
      </div>
    </section>
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

  const renderCategoryItems = (keyPrefix = 'cat') => (
    <>
      {parentLoopItems.map((category, index) => {
        const banners = category.banner_images || [];
        const img = banners.length > 0
          ? banners[(categorySlideTick + index) % banners.length]
          : (category.image || `https://source.unsplash.com/200x200/?africa,${encodeURIComponent(category.name)}`);
        return (
          <Link
            key={`${keyPrefix}-${index}`}
            to={`/categories/${category.slug}`}
            className="flex-shrink-0 w-64 md:w-72 group snap-start"
          >
            <div className="w-full h-40 md:h-44 rounded-2xl overflow-hidden border-2 border-orange-100 group-hover:border-orange-400 transition-all duration-300 shadow-md group-hover:scale-[1.03]">
              <img src={img} alt={category.name} className="w-full h-full object-cover" />
            </div>
            <span className="mt-2 block text-sm font-semibold text-slate-700 group-hover:text-orange-600 transition-colors truncate">
              {category.name}
            </span>
          </Link>
        );
      })}
    </>
  );

  const AdStrip = ({ stripId, tone = 'orange', title, subtitle }) => {
    const configuredStrip = adStrips.find((strip) => strip.id === stripId);
    const strip = {
      title,
      subtitle,
      tone,
      enabled: true,
      media_type: 'none',
      media_url: '',
      link: '',
      ...(configuredStrip || {}),
    };
    const tones = {
      orange: 'from-orange-50 via-amber-50 to-orange-100 border-orange-200',
      blue: 'from-sky-50 via-cyan-50 to-blue-100 border-sky-200',
      green: 'from-emerald-50 via-teal-50 to-green-100 border-emerald-200',
    };
    if (!strip.enabled) return null;

    const mediaUrl = strip.media_url ? toAbsoluteMediaUrl(strip.media_url) : '';
    const content = (
      <div className={`relative min-h-[150px] overflow-hidden rounded-2xl border bg-gradient-to-r ${tones[strip.tone] || tones[tone]} px-5 py-6 md:min-h-[210px] md:px-8 md:py-8`}>
        {strip.media_type === 'image' && mediaUrl && (
          <img src={mediaUrl} alt={strip.title} className="absolute inset-0 h-full w-full object-cover" />
        )}
        {strip.media_type === 'video' && mediaUrl && (
          <video src={mediaUrl} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline />
        )}
        {(strip.media_type === 'image' || strip.media_type === 'video') && mediaUrl && (
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />
        )}
        <div className="relative z-10 flex h-full min-h-[102px] flex-col justify-center md:min-h-[150px]">
          <p className={`text-base font-black md:text-2xl ${(strip.media_type !== 'none' && mediaUrl) ? 'text-white drop-shadow' : 'text-slate-800'}`}>
            {strip.title}
          </p>
          <p className={`mt-2 max-w-2xl text-sm md:text-base ${(strip.media_type !== 'none' && mediaUrl) ? 'text-white/90' : 'text-slate-600'}`}>
            {strip.subtitle}
          </p>
        </div>
      </div>
    );

    return (
      <section className="py-5 bg-white">
        <div className="max-w-screen-xl mx-auto px-4">
          {strip.link ? (
            strip.link.startsWith('http') ? (
              <a href={strip.link} target="_blank" rel="noopener noreferrer" className="block">{content}</a>
            ) : (
              <Link to={strip.link} className="block">{content}</Link>
            )
          ) : content}
        </div>
      </section>
    );
  };

  const SectionBand = ({ title, tone = 'orange' }) => {
    const tones = {
      orange: 'from-orange-500 via-amber-500 to-orange-600',
      purple: 'from-fuchsia-500 via-purple-500 to-indigo-600',
      green: 'from-emerald-500 via-teal-500 to-green-600',
      blue: 'from-sky-500 via-cyan-500 to-blue-600',
    };
    return (
      <div className={`w-full flex items-center px-4 py-3 md:px-5 md:py-3 text-white font-bold text-sm md:text-base bg-gradient-to-r ${tones[tone]} shadow-md rounded-xl`}>
        {title}
      </div>
    );
  };

  const sidebarW = layoutSettings?.sidebar_width || 0;
  const showSidebars = layoutSettings !== null && sidebarW > 0;

  const centeredZoneRef = useRef(null);
  const [sidebarTop, setSidebarTop] = React.useState(0);
  useEffect(() => {
    const updateTop = () => {
      if (!centeredZoneRef.current) return;
      const rect = centeredZoneRef.current.getBoundingClientRect();
      setSidebarTop(rect.top + window.scrollY);
    };
    const t = setTimeout(updateTop, 100);
    window.addEventListener('resize', updateTop);
    return () => { clearTimeout(t); window.removeEventListener('resize', updateTop); };
  }, [layoutSettings, loading]);

  // Filtrer les strips actifs
  const activeAdStrips = adStrips.filter(strip => strip.enabled !== false);

  return (
    <div className="min-h-screen overflow-hidden home-premium-gradient" data-testid="home-page">
      <ScrollProgress />
      <FloatingBadges />
      <PromoBanner />

      {/* Hero Section avec sidebar catégories - PLEINE LARGEUR SANS FOND GRIS */}
      <div className="w-full bg-transparent">
        <div className="w-full px-4 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 max-w-[1600px] mx-auto">
            {/* Sidebar Catégories - À gauche */}
            <div className="hidden lg:block">
              <CategorySidebar />
            </div>
            
            {/* Colonne droite : Hero + Bannières publicitaires horizontales */}
            <div className="flex flex-col gap-4">
              {/* Hero Section - Diaporama + blocs pub à droite */}
              <HeroSection categories={categories} />
              
              {/* 4 Bannières publicitaires horizontales - FORMAT RECTANGLE (h-40) */}
              {activeAdStrips.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {activeAdStrips.map((strip, idx) => (
                    <AdHorizontalStrip key={strip.id} strip={strip} index={idx} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== SECTION CATÉGORIES - 6 PAR LIGNE ===== */}
      <div className="w-full bg-white py-12">
        <div className="max-w-[1600px] mx-auto px-4">
          <CategoriesGrid />
        </div>
      </div>

      <section className="py-5 bg-white border-b border-slate-100 overflow-hidden hidden md:block">
        <div className="relative overflow-x-auto touch-scroll-x no-scrollbar md:overflow-hidden">
          <div className="continuous-marquee">
            <div className="continuous-marquee-track continuous-marquee-track-cats">{renderCategoryItems('cat-main-a')}</div>
            <div className="continuous-marquee-track continuous-marquee-track-cats hidden md:flex" aria-hidden="true">{renderCategoryItems('cat-main-b')}</div>
          </div>
        </div>
      </section>

      {/* ===== BLOC TENDANCES DU MOMENT - DÉPLACÉ ICI ===== */}
      <motion.section
        ref={trendingRef}
        className="py-20 relative overflow-hidden"
        style={{
          background: trendingBlockSettings.background_image
            ? `linear-gradient(135deg, ${trendingBlockSettings.gradient_from}, ${trendingBlockSettings.gradient_to}), url(${trendingBlockSettings.background_image})`
            : `linear-gradient(135deg, ${trendingBlockSettings.gradient_from}, ${trendingBlockSettings.gradient_to})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay',
        }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionMotion}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {trendingBlockSettings.enable_blurs && (
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
        )}
        <div className="max-w-screen-xl mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div className="w-full">
                <div className={`transition-all duration-700 ${trendingInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                  <SectionBand title="Tendances du moment" tone="purple" />
                </div>
                <p className={`text-slate-400 mt-1 transition-all duration-700 delay-100 ${trendingInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                  Les produits les plus populaires
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="hidden md:flex border-white/30 text-white hover:bg-white/10">
              <Link to="/produits?sort_by=sales_count">Voir tout <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl bg-slate-700" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredTrendingProducts.slice(0, 10).map((product, index) => (
                <div key={product.id}
                  className={`transition-all duration-700 ${trendingInView ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}>
                  <ProductCard product={product} className="scale-[0.94]" />
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      <div className="w-full">
        <div className="w-full">
          <div className="max-w-screen-xl mx-auto px-4">
            {/* SECTION SUPPRIMÉE : Les 4 blocs de catégories (themeSections) ont été retirés */}
          </div>

          <motion.section
            className="py-8 bg-[#f5f5f5] border-y border-red-100"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={sectionMotion}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <div className="max-w-screen-xl mx-auto overflow-hidden border-x border-slate-100">
              <div className="max-w-screen-xl mx-auto px-3 md:px-4">
                <div className="overflow-hidden rounded-[1.4rem] border border-red-200 bg-white shadow-[0_20px_70px_-35px_rgba(220,38,38,0.55)]">
                  <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 px-4 py-3 text-white md:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/30 sm:flex">
                        <Star className="h-5 w-5 fill-white text-white" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-black tracking-tight md:text-xl">Les mieux notés ! 14 ans avec vous</h2>
                        <p className="hidden text-xs font-medium text-white/85 sm:block">Promos, nouveautés et coups de coeur sélectionnés pour vous</p>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="shrink-0 rounded-full bg-white/15 px-3 text-xs font-bold text-white hover:bg-white hover:text-red-600">
                      <Link to="/produits?sort_by=sales_count">
                        Voir plus <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>

                  {loading ? (
                    <div className="grid grid-cols-2 gap-px bg-slate-100 p-px sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
                      {[...Array(21)].map((_, i) => (
                        <div key={`top-skeleton-${i}`} className="bg-white p-2">
                          <Skeleton className="aspect-square rounded-xl" />
                          <Skeleton className="mt-2 h-3 w-11/12" />
                          <Skeleton className="mt-2 h-4 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : topRatedProducts.length === 0 ? (
                    <div className="py-14 text-center text-slate-400">
                      <Star className="mx-auto mb-3 h-12 w-12 opacity-20" />
                      <p className="font-semibold">Aucun produit disponible pour le moment</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-px bg-slate-100 p-px sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
                      {topRatedProducts.map((product, index) => (
                        <HomeTopProductCard
                          key={`top-rated-${product.id}`}
                          product={product}
                          index={index}
                          onImageMissing={(productId) => {
                            setBrokenTopProductImages((prev) => ({ ...prev, [productId]: true }));
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.section>

          <NotificationFeed notifications={[
            { user: 'Marie D.', action: "vient d'acheter", product: 'Robe Africaine', time: 'il y a 2 min' },
            { user: 'Kofi A.', action: 'a ajouté aux favoris', product: 'Montre Casio', time: 'il y a 5 min' },
            { user: 'Awa S.', action: 'vient de commander', product: 'iPhone 14', time: 'il y a 8 min' },
            { user: 'Jean P.', action: 'a laissé un avis 5★ sur', product: 'Sac à main', time: 'il y a 12 min' },
          ]} />

          <section className="bg-white hidden md:block">
            <div className="max-w-screen-xl mx-auto overflow-hidden border-x border-slate-100">
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
                marketplaceProductStrips.map((strip) => (
                  <MarketplaceProductStrip
                    key={strip.title}
                    title={strip.title}
                    href={strip.href}
                    tone={strip.tone}
                    products={strip.products}
                    onImageMissing={(productId) => setBrokenTopProductImages((prev) => ({ ...prev, [productId]: true }))}
                  />
                ))
              )}
            </div>
          </section>

          <section className="py-5 bg-white border-y border-slate-100 overflow-hidden hidden md:block">
            <div className="relative overflow-x-auto touch-scroll-x no-scrollbar md:overflow-hidden">
              <div className="continuous-marquee">
                <div className="continuous-marquee-track continuous-marquee-track-cats">{renderCategoryItems('cat-mid-a')}</div>
                <div className="continuous-marquee-track continuous-marquee-track-cats hidden md:flex" aria-hidden="true">{renderCategoryItems('cat-mid-b')}</div>
              </div>
            </div>
          </section>

          <AdStrip stripId="partners" tone="blue" title="Espace Publicitaire - Marques Partenaires" subtitle="Zone dédiée aux campagnes partenaires, bannières saisonnières et bons plans." />

          <section className="py-5 bg-white border-y border-slate-100 overflow-hidden">
            <div className="relative overflow-x-auto touch-scroll-x no-scrollbar md:overflow-hidden">
              <div className="continuous-marquee">
                <div className="continuous-marquee-track continuous-marquee-track-cats">{renderCategoryItems('cat-bottom-a')}</div>
                <div className="continuous-marquee-track continuous-marquee-track-cats hidden md:flex" aria-hidden="true">{renderCategoryItems('cat-bottom-b')}</div>
              </div>
            </div>
          </section>

          <AdStrip stripId="premium" tone="green" title="Espace Publicitaire - Sélection Premium" subtitle="Emplacements premium pour opérations spéciales, événements et mises en avant." />

          <motion.section
            ref={newProductsRef}
            className="py-20 bg-gradient-to-b from-white via-emerald-50/30 to-white"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionMotion}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="max-w-screen-xl mx-auto px-4">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <div className="w-full">
                    <div className={`transition-all duration-700 ${newProductsInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                      <SectionBand title="Nouveautés" tone="green" />
                    </div>
                    <p className={`text-muted-foreground mt-1 transition-all duration-700 delay-100 ${newProductsInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                      Les dernières créations de nos artisans
                    </p>
                  </div>
                </div>
                <Button asChild variant="ghost" className="hidden md:flex text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                  <Link to="/produits?sort_by=created_at">Voir tout <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
              </div>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredNewProducts.slice(0, 20).map((product, index) => (
                    <div key={product.id}
                      className={`transition-all duration-700 ${newProductsInView ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
                      style={{ transitionDelay: `${index * 75}ms` }}>
                      <ProductCard product={product} className="scale-[0.94]" />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-10 text-center">
                <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full px-10 shadow-lg shadow-emerald-500/30">
                  <Link to="/produits">Voir tous les produits <ArrowRight className="ml-2 w-5 h-5" /></Link>
                </Button>
              </div>
            </div>
          </motion.section>

          <motion.section
            className="py-24 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={sectionMotion}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            <div className="absolute inset-0">
              <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>
            <div className="max-w-screen-xl mx-auto px-4 relative z-10 text-center text-white">
              <h2 className="text-4xl md:text-6xl font-bold mb-6">Rejoignez notre communauté</h2>
              <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto">
                Vendez vos créations à des milliers d'acheteurs passionnés ou découvrez des produits uniques du continent africain.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild size="lg" className="bg-white text-orange-600 hover:bg-white/90 rounded-full px-10 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <Link to="/connexion"><Zap className="w-5 h-5 mr-2" />Commencer à vendre</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 rounded-full px-10 py-6 text-lg font-semibold transition-all duration-300 hover:-translate-y-1">
                  <Link to="/devenir-revendeur">Devenir Revendeur</Link>
                </Button>
              </div>
            </div>
          </motion.section>

          <section className="py-4 bg-gradient-to-r from-slate-900 to-slate-800 overflow-hidden">
            <div className="relative flex overflow-hidden">
              <div className="animate-marquee flex items-center whitespace-nowrap">
                {[...Array(2)].map((_, setIndex) => (
                  <div key={setIndex} className="flex items-center">
                    {[
                      { text: "Livraison rapide", icon: "🚀" },
                      { text: "Paiement sécurisé", icon: "🔒" },
                      { text: "Artisans vérifiés", icon: "✨" },
                      { text: "Support 24/7", icon: "💬" },
                      { text: "Retours gratuits", icon: "↩️" },
                      { text: "Qualité garantie", icon: "⭐" },
                      { text: "Made in Africa", icon: "🌍" },
                      { text: "Prix justes", icon: "💰" },
                    ].map((item, index) => (
                      <span key={index} className="flex items-center gap-2 mx-8 text-white/80 text-sm font-medium">
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.text}</span>
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full ml-8" />
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="py-16 bg-gradient-to-b from-orange-50 to-white overflow-hidden">
            <div className="max-w-screen-xl mx-auto px-4 mb-8">
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
          .continuous-marquee {
            width: max-content;
          }
          .continuous-marquee-track {
            animation: none;
          }
          .selection-products-track {
            animation-duration: 38s;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;