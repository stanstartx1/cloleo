import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Sparkles, Zap, TrendingUp, Star, ChevronLeft, ChevronRight } from 'lucide-react';
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

const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [categorySlideTick, setCategorySlideTick] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [conditionFilters, setConditionFilters] = useState({
    neuf: false,
    occasion: false,
    presque_neuf: false,
  });
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [hoveredCategorySlug, setHoveredCategorySlug] = useState(null);

  const [categoriesRef, categoriesInView] = useInView();
  const [newProductsRef, newProductsInView] = useInView();
  const [trendingRef, trendingInView] = useInView();

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

        const [catRes, featured, newRes, trendingRes] = await Promise.all([
          axios.get(`${API}/categories`),
          fetchFeatured(),
          axios.get(`${API}/products?sort_by=created_at&sort_order=desc&limit=16`),
          axios.get(`${API}/products?sort_by=sales_count&sort_order=desc&limit=12`),
        ]);

        setCategories(catRes.data);
        setFeaturedProducts(featured);
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
  const activeCategories = categories.filter(c => c.is_active !== false);

  return (
    <div className="min-h-screen overflow-hidden home-premium-gradient" data-testid="home-page">
      <ScrollProgress />
      <FloatingBadges />
      <PromoBanner />

      {/* Hero avec vraies catégories */}
      <HeroSection categories={categories} />

      {/* Catégories défilantes */}
      <section className="py-5 bg-white border-b border-slate-100 overflow-hidden">
        <div className="container mx-auto px-4 mb-3">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Parcourir par catégorie</p>
        </div>
        <div className="relative flex overflow-hidden">
          <div className="flex gap-5 px-4 animate-marquee-cats whitespace-nowrap">
            {[...activeCategories, ...activeCategories].map((category, index) => {
              const banners = category.banner_images || [];
              const img = banners.length > 0
                ? banners[(categorySlideTick + index) % banners.length]
                : (category.image || `https://source.unsplash.com/200x200/?africa,${encodeURIComponent(category.name)}`);
              return (
                <Link
                  key={`cat-${index}`}
                  to={`/categories/${category.slug}`}
                  className="flex-shrink-0 flex flex-col items-center gap-2 group"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-orange-100 group-hover:border-orange-400 transition-all duration-300 shadow-md group-hover:scale-110">
                    <img src={img} alt={category.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-orange-600 transition-colors text-center w-20 truncate">
                    {category.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Notification Feed */}
      <NotificationFeed notifications={[
        { user: 'Marie D.', action: "vient d'acheter", product: 'Robe Africaine', time: 'il y a 2 min' },
        { user: 'Kofi A.', action: 'a ajouté aux favoris', product: 'Montre Casio', time: 'il y a 5 min' },
        { user: 'Awa S.', action: 'vient de commander', product: 'iPhone 14', time: 'il y a 8 min' },
        { user: 'Jean P.', action: 'a laissé un avis 5★ sur', product: 'Sac à main', time: 'il y a 12 min' },
      ]} />

      {/* Featured Products */}
      <motion.section
        className="py-20 bg-gradient-to-b from-white via-orange-50/30 to-white relative"
        initial="hidden" whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionMotion} transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="absolute top-20 left-0 w-72 h-72 bg-gradient-to-br from-orange-200/40 to-amber-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-96 h-96 bg-gradient-to-br from-purple-200/30 to-pink-200/20 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 animate-pulse">
                <Star className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  Produits en Vedette
                </h2>
                <p className="text-muted-foreground mt-1">Les meilleures sélections de nos vendeurs</p>
              </div>
            </div>
            {filteredFeaturedProducts.length > 4 && (
              <div className="hidden md:flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={prevSlide} disabled={carouselIndex === 0}
                  className="rounded-full w-12 h-12 border-2 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 disabled:opacity-50">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextSlide} disabled={carouselIndex >= filteredFeaturedProducts.length - 4}
                  className="rounded-full w-12 h-12 border-2 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 disabled:opacity-50">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
            </div>
          ) : filteredFeaturedProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Star className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Aucun produit en vedette pour le moment</p>
            </div>
          ) : (
            <div className="relative overflow-hidden">
              <div className="flex gap-6 transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${carouselIndex * (100 / 4 + 1.5)}%)` }}>
                {filteredFeaturedProducts.map((product, index) => (
                  <motion.div key={product.id}
                    className="w-full md:w-[calc(25%-18px)] lg:w-[calc(20%-18px)] flex-shrink-0"
                    variants={cardMotion} initial="hidden" animate="visible"
                    transition={{ duration: 0.7, delay: index * 0.08 }}
                    whileHover={{ y: -8, scale: 1.03 }}
                  >
                    <div className="transform transition-all duration-500"
                      style={{
                        opacity: index >= carouselIndex && index < carouselIndex + 4 ? 1 : 0.3,
                        transform: index >= carouselIndex && index < carouselIndex + 4 ? 'scale(1)' : 'scale(0.95)'
                      }}>
                      <ProductCard product={product} className="scale-[0.94]" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {filteredFeaturedProducts.length > 4 && (
            <div className="flex justify-center gap-2 mt-8">
              {[...Array(Math.max(1, filteredFeaturedProducts.length - 3))].map((_, i) => (
                <button key={i} onClick={() => setCarouselIndex(i)}
                  className={`h-2 rounded-full transition-all duration-300 ${i === carouselIndex ? 'w-8 bg-gradient-to-r from-orange-500 to-amber-500' : 'w-2 bg-gray-300 hover:bg-gray-400'}`} />
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {/* Categories Grid */}
      <motion.section
        ref={categoriesRef}
        className="py-20 bg-white relative overflow-hidden"
        initial="hidden" whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionMotion} transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-100/50 to-pink-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 transition-all duration-700 ${categoriesInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              Parcourir par catégorie
            </h2>
            <p className={`text-muted-foreground text-lg transition-all duration-700 delay-100 ${categoriesInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              Découvrez notre sélection de produits authentiques
            </p>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeCategories.map((category, index) => {
                const currentBanner = (() => {
                  const banners = category.banner_images || [];
                  return banners.length > 0
                    ? banners[(categorySlideTick + index) % banners.length]
                    : (category.image || `https://source.unsplash.com/400x300/?${category.name}`);
                })();
                return (
                  <motion.div key={category.slug} variants={cardMotion} initial="hidden"
                    animate={categoriesInView ? 'visible' : 'hidden'}
                    transition={{ duration: 0.6, delay: index * 0.08 }}
                    whileHover={{ y: -6 }} className="relative"
                  >
                    <Link to={`/categories/${category.slug}`}
                      className={`group relative aspect-[5/3] rounded-xl overflow-hidden shadow-lg transition-all duration-700 flex ${categoriesInView ? 'translate-y-0 opacity-100 hover:-translate-y-2 hover:shadow-2xl' : 'translate-y-20 opacity-0'}`}
                      style={{ transitionDelay: `${index * 100}ms` }}
                      data-testid={`category-${category.slug}`}
                    >
                      <img src={currentBanner} alt={category.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 to-amber-500/0 group-hover:from-orange-500/30 group-hover:to-amber-500/30 transition-all duration-500" />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h3 className="text-white font-bold text-base md:text-lg group-hover:translate-x-2 transition-transform duration-300">{category.name}</h3>
                        <p className="text-white/0 group-hover:text-white/80 text-sm flex items-center gap-2 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                          Explorer la collection <ArrowRight className="w-4 h-4" />
                        </p>
                      </div>
                      <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/40 rounded-2xl transition-all duration-500" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.section>

      {/* Trending Products */}
      <motion.section
        ref={trendingRef}
        className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden"
        initial="hidden" whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionMotion} transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className={`text-3xl md:text-4xl font-bold text-white transition-all duration-700 ${trendingInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                  Tendances du moment
                </h2>
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

      {/* New Products */}
      <motion.section
        ref={newProductsRef}
        className="py-20 bg-gradient-to-b from-white via-emerald-50/30 to-white"
        initial="hidden" whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionMotion} transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className={`text-3xl md:text-4xl font-bold transition-all duration-700 ${newProductsInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                  Nouveautés
                </h2>
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

      {/* CTA */}
      <motion.section
        className="py-24 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 relative overflow-hidden"
        initial="hidden" whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={sectionMotion} transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center text-white">
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

      {/* Marquee */}
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

      {/* Testimonials */}
      <section className="py-16 bg-gradient-to-b from-orange-50 to-white overflow-hidden">
        <div className="container mx-auto px-4 mb-8">
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

      {/* Floating Categories desktop */}
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
            {activeCategories.map((category) => (
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
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 mb-4">
            {(() => {
              const category = categories.find((c) => c.slug === hoveredCategorySlug) || categories[0];
              if (!category) return <div className="p-4 text-sm text-slate-500">Aucune catégorie</div>;
              const index = categories.findIndex((c) => c.slug === category.slug);
              const banners = category.banner_images || [];
              const banner = banners.length > 0
                ? banners[(categorySlideTick + Math.max(0, index)) % banners.length]
                : (category.image || `https://source.unsplash.com/400x300/?${category.name}`);
              return (
                <div>
                  <img src={banner} alt={category.name} className="h-28 w-full object-cover" />
                  <div className="p-3">
                    <p className="text-sm font-bold text-slate-800">{category.name}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{category.description || 'Explore cette catégorie'}</p>
                  </div>
                </div>
              );
            })()}
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-2">Filtres rapides</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={conditionFilters.neuf} onChange={() => toggleConditionFilter('neuf')} />Neuf
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={conditionFilters.presque_neuf} onChange={() => toggleConditionFilter('presque_neuf')} />Presque neuf
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={conditionFilters.occasion} onChange={() => toggleConditionFilter('occasion')} />Occasion
            </label>
          </div>
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
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-cats { animation: marquee-cats 25s linear infinite; }
      `}</style>
    </div>
  );
};

export default HomePage;