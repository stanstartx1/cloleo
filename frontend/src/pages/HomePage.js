import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Sparkles, Zap, TrendingUp, Star, ChevronLeft, ChevronRight, Package, Users, Truck, Shield, Heart, Clock, Gift, Award, BadgeCheck, CheckCircle, Download, MapPin, HelpCircle } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import HeroSection from '../components/HeroSection';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollProgress } from '../components/InfiniteScroll';
import { PromoBanner, TrustBanner, NotificationFeed, FloatingBadges, TestimonialsBanner } from '../components/ScrollingBanners';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const sectionMotion = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

const cardMotion = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

const useInView = (options) => {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsInView(true);
    }, { threshold: 0.1, ...options });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, isInView];
};

const AnimatedCounter = ({ end, duration = 2000, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const [ref, isInView] = useInView();
  useEffect(() => {
    if (!isInView) return;
    let startTime;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, end, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

// Catégories défilantes horizontalement
const CategoriesScroller = ({ categories, categorySlideTick }) => {
  const active = categories.filter(c => c.is_active !== false);
  return (
    <section className="py-6 bg-white border-b border-slate-100 overflow-hidden">
      <div className="container mx-auto px-4 mb-4">
        <h2 className="text-lg font-bold text-slate-800">Parcourir par catégorie</h2>
      </div>
      <div className="relative flex overflow-hidden">
        <div className="animate-marquee-slow flex gap-4 px-4">
          {[...active, ...active].map((category, index) => {
            const banners = category.banner_images || [];
            const img = banners.length > 0
              ? banners[(categorySlideTick + index) % banners.length]
              : (category.image || `https://source.unsplash.com/200x200/?${category.name}`);
            return (
              <Link
                key={`${category.slug}-${index}`}
                to={`/categories/${category.slug}`}
                className="flex-shrink-0 group flex flex-col items-center gap-2"
              >
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-orange-100 group-hover:border-orange-400 transition-all duration-300 shadow-md group-hover:shadow-orange-200 group-hover:scale-110">
                  <img src={img} alt={category.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-xs font-semibold text-slate-700 group-hover:text-orange-600 text-center max-w-[80px] truncate transition-colors">
                  {category.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// Section "Comment ça marche"
const HowItWorks = () => (
  <section className="py-16 bg-gradient-to-b from-orange-50 to-white">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">Comment ça marche ?</h2>
        <p className="text-slate-500 text-lg">Simple, rapide et sécurisé</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-0.5 bg-gradient-to-r from-orange-300 to-amber-300" />
        {[
          { step: '01', icon: '🔍', title: 'Cherchez', desc: 'Parcourez des milliers de produits authentiques africains par catégorie ou recherche.' },
          { step: '02', icon: '🛒', title: 'Commandez', desc: 'Ajoutez au panier et payez en toute sécurité. Plusieurs modes de paiement disponibles.' },
          { step: '03', icon: '📦', title: 'Recevez', desc: 'Votre commande est livrée rapidement partout en Afrique par nos livreurs partenaires.' },
        ].map((item, i) => (
          <motion.div
            key={item.step}
            className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-white shadow-lg border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.15 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-2xl mb-4 shadow-lg shadow-orange-200">
              {item.icon}
            </div>
            <span className="absolute top-4 right-4 text-xs font-black text-orange-200">{item.step}</span>
            <h3 className="text-xl font-bold mb-2">{item.title}</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

// Section "Vendeurs vedettes"
const FeaturedVendors = () => (
  <section className="py-16 bg-white">
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Vendeurs vedettes</h2>
          <p className="text-slate-500">Les meilleurs artisans et vendeurs de la plateforme</p>
        </div>
        <Button asChild variant="outline" className="hidden md:flex rounded-full border-orange-300 text-orange-600 hover:bg-orange-50">
          <Link to="/vendeurs">Voir tous <ArrowRight className="ml-2 w-4 h-4" /></Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: 'Ama Créations', location: 'Abidjan', rating: 4.9, products: 48, tag: 'Artisanat', color: 'from-orange-400 to-amber-400' },
          { name: 'Koffi Mode', location: 'Dakar', rating: 4.8, products: 62, tag: 'Mode', color: 'from-pink-400 to-rose-400' },
          { name: 'Bijoux Fatou', location: 'Bamako', rating: 4.9, products: 35, tag: 'Bijoux', color: 'from-purple-400 to-violet-400' },
          { name: 'Tech Afrique', location: 'Douala', rating: 4.7, products: 91, tag: 'Électronique', color: 'from-blue-400 to-cyan-400' },
        ].map((vendor, i) => (
          <motion.div
            key={vendor.name}
            className="rounded-2xl border border-slate-100 bg-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <div className={`h-20 bg-gradient-to-br ${vendor.color}`} />
            <div className="p-4 -mt-8">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-lg flex items-center justify-center text-2xl font-black text-slate-700 border-2 border-white mb-3">
                {vendor.name[0]}
              </div>
              <h3 className="font-bold text-slate-800 text-sm">{vendor.name}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> {vendor.location}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{vendor.tag}</span>
                <span className="text-xs text-slate-500">⭐ {vendor.rating}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">{vendor.products} produits</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

// Section "Application mobile"
const AppSection = () => (
  <section className="py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
    <div className="absolute inset-0">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
    </div>
    <div className="container mx-auto px-4 relative z-10">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <motion.div
          className="text-white space-y-6"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/20 border border-orange-500/30">
            <Download className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-300 font-medium">Application mobile</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black leading-tight">
            Cloléo dans<br />votre poche
          </h2>
          <p className="text-slate-400 text-lg">
            Achetez, vendez et suivez vos commandes depuis votre téléphone. Disponible bientôt sur iOS et Android.
          </p>
          <div className="space-y-3">
            {['Notifications en temps réel', 'Suivi de commande GPS', 'Paiement mobile sécurisé', 'Chat avec les vendeurs'].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <span className="text-slate-300">{feat}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-3 px-5 py-3 bg-white text-slate-900 rounded-2xl font-semibold hover:bg-orange-50 transition-colors">
              <span className="text-2xl">🍎</span>
              <div className="text-left">
                <p className="text-xs text-slate-500">Bientôt sur</p>
                <p className="font-bold">App Store</p>
              </div>
            </button>
            <button className="flex items-center gap-3 px-5 py-3 bg-white text-slate-900 rounded-2xl font-semibold hover:bg-orange-50 transition-colors">
              <span className="text-2xl">🤖</span>
              <div className="text-left">
                <p className="text-xs text-slate-500">Bientôt sur</p>
                <p className="font-bold">Google Play</p>
              </div>
            </button>
          </div>
        </motion.div>
        <motion.div
          className="hidden md:flex justify-center"
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-64 h-[500px] bg-gradient-to-b from-orange-500 to-amber-500 rounded-[3rem] border-8 border-white/20 shadow-2xl flex items-center justify-center">
            <div className="text-center text-white">
              <div className="text-6xl mb-4">📱</div>
              <p className="font-black text-xl">Cloléo App</p>
              <p className="text-white/70 text-sm mt-2">Bientôt disponible</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

// Section FAQ
const FAQSection = () => {
  const [open, setOpen] = useState(null);
  const faqs = [
    { q: 'Comment passer une commande ?', a: 'Parcourez les produits, ajoutez au panier et suivez les étapes de paiement sécurisé. Vous recevrez une confirmation par email.' },
    { q: 'Quels sont les modes de paiement acceptés ?', a: 'Nous acceptons les paiements mobile money (Orange Money, MTN Mobile Money), carte bancaire et paiement à la livraison selon votre zone.' },
    { q: 'Comment devenir vendeur sur Cloléo ?', a: "Inscrivez-vous, créez votre boutique en quelques minutes et commencez à vendre vos produits à des milliers d'acheteurs." },
    { q: 'Quelle est la politique de retour ?', a: 'Vous avez 7 jours après réception pour retourner un produit non conforme. Les frais de retour sont pris en charge par Cloléo.' },
    { q: 'Comment suivre ma commande ?', a: 'Suivez votre commande en temps réel depuis votre espace client ou via le lien de suivi envoyé par SMS et email.' },
  ];
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Questions fréquentes</h2>
          <p className="text-slate-500">Tout ce que vous devez savoir sur Cloléo</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              className="rounded-2xl border border-slate-200 overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left font-semibold text-slate-800 hover:bg-orange-50 transition-colors"
              >
                <span>{faq.q}</span>
                <span className={`text-orange-500 text-xl transition-transform duration-300 ${open === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {open === i && (
                <div className="px-6 pb-4 text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Section Newsletter
const NewsletterSection = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <section className="py-16 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_60%)]" />
      <div className="container mx-auto px-4 relative z-10 text-center text-white max-w-2xl">
        <Gift className="w-12 h-12 mx-auto mb-4 text-white/80" />
        <h2 className="text-3xl md:text-4xl font-black mb-3">Restez informé</h2>
        <p className="text-white/85 text-lg mb-8">Recevez les meilleures offres, nouveautés et bons plans directement dans votre boîte mail.</p>
        {sent ? (
          <div className="flex items-center justify-center gap-3 text-white font-semibold text-lg">
            <CheckCircle className="w-6 h-6" /> Merci ! Vous êtes inscrit.
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="flex-1 px-5 py-3 rounded-full text-slate-800 outline-none text-sm shadow-lg"
            />
            <button
              onClick={() => { if (email) setSent(true); }}
              className="px-6 py-3 bg-slate-900 text-white rounded-full font-semibold hover:bg-slate-800 transition-colors shadow-lg whitespace-nowrap"
            >
              S'inscrire
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [categorySlideTick, setCategorySlideTick] = useState(0);
  const [stats, setStats] = useState({ products: 0, vendors: 0, drivers: 0 });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [conditionFilters, setConditionFilters] = useState({
    neuf: false,
    occasion: false,
    presque_neuf: false,
  });
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [hoveredCategorySlug, setHoveredCategorySlug] = useState(null);

  const [statsRef, statsInView] = useInView();
  const [newProductsRef, newProductsInView] = useInView();
  const [trendingRef, trendingInView] = useInView();

  const particles = useMemo(() => [...Array(20)].map((_, i) => ({
    left: `${(i * 17 + 5) % 100}%`,
    top: `${(i * 13 + 7) % 100}%`,
    delay: `${(i * 0.3) % 3}s`,
    duration: `${3 + (i % 3)}s`,
  })), []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, featuredRes, newRes, trendingRes, statsRes] = await Promise.all([
          axios.get(`${API}/categories`),
          axios.get(`${API}/products/featured?limit=12`),
          axios.get(`${API}/products?sort_by=created_at&sort_order=desc&limit=16`),
          axios.get(`${API}/products?sort_by=sales_count&sort_order=desc&limit=12`),
          axios.get(`${API}/stats/public`).catch(() => ({ data: { products: 0, vendors: 0, drivers: 0 } }))
        ]);
        setCategories(catRes.data);
        setFeaturedProducts(featuredRes.data.products || []);
        setNewProducts(newRes.data.products || []);
        setTrendingProducts(trendingRes.data.products || []);
        setStats(statsRes.data || { products: 0, vendors: 0, drivers: 0 });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (featuredProducts.length <= 4) return;
    const interval = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % Math.max(1, featuredProducts.length - 3));
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredProducts.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCategorySlideTick((prev) => prev + 1);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const nextSlide = () => setCarouselIndex(prev => Math.min(prev + 1, Math.max(0, featuredProducts.length - 4)));
  const prevSlide = () => setCarouselIndex(prev => Math.max(prev - 1, 0));

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

  const filteredFeaturedProducts = applyProductFilters(featuredProducts);
  const filteredTrendingProducts = applyProductFilters(trendingProducts);
  const filteredNewProducts = applyProductFilters(newProducts);

  return (
    <div className="min-h-screen overflow-hidden home-premium-gradient" data-testid="home-page">
      <ScrollProgress />
      <FloatingBadges />
      <PromoBanner />
      <HeroSection />

      {/* Catégories défilantes — remplace la bande noire */}
      <CategoriesScroller categories={categories} categorySlideTick={categorySlideTick} />

      {/* Notification Feed */}
      <NotificationFeed notifications={[
        { user: 'Marie D.', action: "vient d'acheter", product: 'Robe Africaine', time: 'il y a 2 min' },
        { user: 'Kofi A.', action: 'a ajouté aux favoris', product: 'Montre Casio', time: 'il y a 5 min' },
        { user: 'Awa S.', action: 'vient de commander', product: 'iPhone 14', time: 'il y a 8 min' },
        { user: 'Jean P.', action: 'a laissé un avis 5★ sur', product: 'Sac à main', time: 'il y a 12 min' },
      ]} />

      {/* Stats Bar */}
      <motion.section
        ref={statsRef}
        className="py-8 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 relative overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionMotion}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((p, i) => (
            <div key={i} className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
              style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.duration }} />
          ))}
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: Package, value: stats.products || 0, suffix: '', label: 'Produits', },
              { icon: Users, value: stats.vendors || 0, suffix: '', label: 'Vendeurs actifs' },
              { icon: Truck, value: stats.drivers || 0, suffix: '', label: 'Livreurs' },
              { icon: Shield, value: 99, suffix: '%', label: 'Satisfaction' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                variants={cardMotion}
                initial="hidden"
                animate={statsInView ? 'visible' : 'hidden'}
                transition={{ duration: 0.7, delay: index * 0.1 }}
                whileHover={{ y: -6 }}
              >
                <div className="w-12 h-12 md:w-14 md:h-14 mx-auto mb-3 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                  <stat.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <p className="text-2xl md:text-4xl font-bold text-white mb-1">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-white/80 text-xs md:text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Comment ça marche */}
      <HowItWorks />

      {/* Featured Products Carousel */}
      <motion.section className="py-16 md:py-20 bg-gradient-to-b from-white via-orange-50/30 to-white relative"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionMotion}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="absolute top-20 left-0 w-72 h-72 bg-gradient-to-br from-orange-200/40 to-amber-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-96 h-96 bg-gradient-to-br from-purple-200/30 to-pink-200/20 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-11 h-11 md:w-14 md:h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 animate-pulse">
                <Star className="w-5 h-5 md:w-7 md:h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Produits en Vedette
                </h2>
                <p className="text-muted-foreground text-sm mt-0.5">Les meilleures sélections de nos vendeurs</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={prevSlide} disabled={carouselIndex === 0}
                className="rounded-full w-12 h-12 border-2 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 disabled:opacity-50">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextSlide} disabled={carouselIndex >= featuredProducts.length - 4}
                className="rounded-full w-12 h-12 border-2 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 disabled:opacity-50">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
            </div>
          ) : (
            <div className="relative overflow-hidden">
              <div className="flex gap-4 md:gap-6 transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${carouselIndex * (100 / 4 + 1.5)}%)` }}>
                {filteredFeaturedProducts.map((product, index) => (
                  <motion.div key={product.id}
                    className="w-[45vw] md:w-[calc(25%-18px)] lg:w-[calc(20%-18px)] flex-shrink-0"
                    variants={cardMotion} initial="hidden" animate="visible"
                    transition={{ duration: 0.7, delay: index * 0.08 }}
                    whileHover={{ y: -8, scale: 1.03 }}
                  >
                    <div className="transform transition-all duration-500"
                      style={{
                        opacity: index >= carouselIndex && index < carouselIndex + 4 ? 1 : 0.3,
                        transform: index >= carouselIndex && index < carouselIndex + 4 ? 'scale(1)' : 'scale(0.95)'
                      }}>
                      <ProductCard product={product} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-center gap-2 mt-6 md:mt-8">
            {[...Array(Math.max(1, filteredFeaturedProducts.length - 3))].map((_, i) => (
              <button key={i} onClick={() => setCarouselIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === carouselIndex ? 'w-8 bg-gradient-to-r from-orange-500 to-amber-500' : 'w-2 bg-gray-300 hover:bg-gray-400'}`} />
            ))}
          </div>
        </div>
      </motion.section>

      {/* Vendeurs vedettes */}
      <FeaturedVendors />

      {/* Trending Products */}
      <motion.section
        ref={trendingRef}
        className="py-16 md:py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden"
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
        variants={sectionMotion} transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-11 h-11 md:w-14 md:h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <TrendingUp className="w-5 h-5 md:w-7 md:h-7 text-white" />
              </div>
              <div>
                <h2 className={`text-2xl md:text-4xl font-bold text-white transition-all duration-700 ${trendingInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                  Tendances du moment
                </h2>
                <p className={`text-slate-400 text-sm mt-0.5 transition-all duration-700 delay-100 ${trendingInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                  Les produits les plus populaires
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="hidden md:flex border-white/30 text-white hover:bg-white/10">
              <Link to="/produits?sort_by=sales_count">Voir tout <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl bg-slate-700" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {filteredTrendingProducts.slice(0, 10).map((product, index) => (
                <div key={product.id}
                  className={`transition-all duration-700 ${trendingInView ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* New Products */}
      <motion.section
        ref={newProductsRef}
        className="py-16 md:py-20 bg-gradient-to-b from-white via-emerald-50/30 to-white"
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
        variants={sectionMotion} transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-11 h-11 md:w-14 md:h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Sparkles className="w-5 h-5 md:w-7 md:h-7 text-white" />
              </div>
              <div>
                <h2 className={`text-2xl md:text-4xl font-bold transition-all duration-700 ${newProductsInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                  Nouveautés
                </h2>
                <p className={`text-muted-foreground text-sm mt-0.5 transition-all duration-700 delay-100 ${newProductsInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                  Les dernières créations de nos artisans
                </p>
              </div>
            </div>
            <Button asChild variant="ghost" className="hidden md:flex text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
              <Link to="/produits?sort_by=created_at">Voir tout <ArrowRight className="ml-2 w-4 h-4" /></Link>
            </Button>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {filteredNewProducts.slice(0, 20).map((product, index) => (
                <div key={product.id}
                  className={`transition-all duration-700 ${newProductsInView ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
                  style={{ transitionDelay: `${index * 75}ms` }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
          <div className="mt-8 md:mt-10 text-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full px-8 md:px-10 shadow-lg shadow-emerald-500/30">
              <Link to="/produits">Voir tous les produits <ArrowRight className="ml-2 w-5 h-5" /></Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* App Mobile */}
      <AppSection />

      {/* CTA Section */}
      <motion.section className="py-16 md:py-24 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 relative overflow-hidden"
        initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}
        variants={sectionMotion} transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center text-white">
          <h2 className="text-3xl md:text-6xl font-bold mb-6 animate-fade-in">
            Rejoignez notre communauté
          </h2>
          <p className="text-lg md:text-2xl text-white/90 mb-8 md:mb-10 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Vendez vos créations à des milliers d'acheteurs passionnés ou découvrez des produits uniques du continent africain.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button asChild size="lg" className="bg-white text-orange-600 hover:bg-white/90 rounded-full px-8 md:px-10 py-5 md:py-6 text-base md:text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <Link to="/connexion">
                <Zap className="w-5 h-5 mr-2" />
                Commencer à vendre
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 rounded-full px-8 md:px-10 py-5 md:py-6 text-base md:text-lg font-semibold transition-all duration-300 hover:-translate-y-1">
              <Link to="/devenir-revendeur">Devenir Revendeur</Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Marquee Banner */}
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

      {/* FAQ */}
      <FAQSection />

      {/* Newsletter */}
      <NewsletterSection />

      {/* Testimonials */}
      <section className="py-12 md:py-16 bg-gradient-to-b from-orange-50 to-white overflow-hidden">
        <div className="container mx-auto px-4 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Ce que disent nos clients</h2>
          <p className="text-muted-foreground text-center">Des milliers de clients satisfaits chaque jour</p>
        </div>
        <TestimonialsBanner testimonials={[
          { name: 'Marie Dupont', location: 'Abidjan', rating: 5, comment: 'Service excellent ! Ma commande est arrivée en 2 jours. Produit conforme à la description.' },
          { name: 'Kofi Mensah', location: 'Dakar', rating: 5, comment: 'Je recommande vivement ! Les vendeurs sont très professionnels et les prix sont imbattables.' },
          { name: 'Awa Diallo', location: 'Bamako', rating: 4, comment: 'Très satisfaite de mon achat. Le suivi de commande en temps réel est vraiment pratique.' },
          { name: 'Jean-Pierre K.', location: 'Douala', rating: 5, comment: "Cloléo a changé ma façon de faire du shopping. Qualité au rendez-vous !" },
          { name: 'Fatou Ndiaye', location: 'Conakry', rating: 5, comment: 'Les produits artisanaux sont magnifiques. Je suis devenue une cliente fidèle.' },
        ]} />
      </section>

      <TrustBanner />

      {/* Floating Categories (desktop only) */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 hidden lg:block"
        onMouseEnter={() => setIsCategoryMenuOpen(true)}
        onMouseLeave={() => setIsCategoryMenuOpen(false)}
      >
        <button className="ml-3 rounded-r-2xl rounded-l-full bg-gradient-to-b from-orange-500 to-amber-500 text-white px-4 py-4 shadow-2xl animate-bounce">
          <span className="font-extrabold tracking-wide [writing-mode:vertical-rl] rotate-180">CATEGORIES</span>
        </button>
        <div className={`absolute left-16 top-1/2 -translate-y-1/2 w-[360px] max-h-[78vh] overflow-y-auto rounded-2xl border border-orange-200 bg-white p-4 shadow-2xl transition-all duration-300 ${isCategoryMenuOpen ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
          <h3 className="text-lg font-black text-slate-800 mb-3">Catégories</h3>
          <div className="space-y-2 mb-4">
            <button onMouseEnter={() => setHoveredCategorySlug(null)} onClick={() => setSelectedCategory('all')}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition ${selectedCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
              Toutes les catégories
            </button>
            {categories.filter(c => c.is_active !== false).map((category) => (
              <div key={category.slug} className="flex items-center gap-2">
                <Link to={`/categories/${category.slug}`} onMouseEnter={() => setHoveredCategorySlug(category.slug)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-orange-100 hover:text-orange-700 transition">
                  {category.name}
                </Link>
                <button onClick={() => setSelectedCategory(category.slug)}
                  className={`text-xs px-2 py-2 rounded-lg transition ${selectedCategory === category.slug ? 'bg-orange-500 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}>
                  Filtrer
                </button>
              </div>
            ))}
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-2">Filtres rapides</h4>
          <div className="space-y-2">
            {[['neuf', 'Neuf'], ['presque_neuf', 'Presque neuf'], ['occasion', 'Occasion']].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={conditionFilters[key]} onChange={() => toggleConditionFilter(key)} />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.8s ease-out forwards; }
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { animation: marquee 30s linear infinite; }
        @keyframes marquee-slow {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-slow { animation: marquee-slow 20s linear infinite; }
      `}</style>
    </div>
  );
};

export default HomePage;