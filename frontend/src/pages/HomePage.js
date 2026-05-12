import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Sparkles, Zap, TrendingUp, Star, ChevronLeft, ChevronRight, Package, Users, Truck, Shield, Heart, Clock, Gift, Award, BadgeCheck } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import HeroSection from '../components/HeroSection';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollProgress } from '../components/InfiniteScroll';
import { PromoBanner, TrustBanner, NotificationFeed, FloatingBadges, TestimonialsBanner } from '../components/ScrollingBanners';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Intersection Observer hook for scroll animations
const useInView = (options) => {
  const ref = useRef(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    }, { threshold: 0.1, ...options });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [options]);

  return [ref, isInView];
};

// Animated counter component
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

const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [categorySlideTick, setCategorySlideTick] = useState(0);
  const [stats, setStats] = useState({ products: 0, vendors: 0, drivers: 0 });

  // Refs for scroll animations
  const [statsRef, statsInView] = useInView();
  const [categoriesRef, categoriesInView] = useInView();
  const [newProductsRef, newProductsInView] = useInView();
  const [trendingRef, trendingInView] = useInView();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, featuredRes, newRes, trendingRes, statsRes] = await Promise.all([
          axios.get(`${API}/categories`),
          axios.get(`${API}/products?is_featured=true&limit=12`),
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

  // Auto-scroll carousel
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

  const nextSlide = () => {
    setCarouselIndex(prev => Math.min(prev + 1, Math.max(0, featuredProducts.length - 4)));
  };

  const prevSlide = () => {
    setCarouselIndex(prev => Math.max(prev - 1, 0));
  };

  return (
    <div className="min-h-screen overflow-hidden home-premium-gradient" data-testid="home-page">
      {/* Scroll Progress Indicator */}
      <ScrollProgress />
      
      {/* Floating Action Badges */}
      <FloatingBadges />
      
      {/* Promo Banner - Scrolling */}
      <PromoBanner />
      
      {/* Animated Hero Section */}
      <HeroSection />
      
      {/* Live Activity Feed */}
      <NotificationFeed notifications={[
        { user: 'Marie D.', action: 'vient d\'acheter', product: 'Robe Africaine', time: 'il y a 2 min' },
        { user: 'Kofi A.', action: 'a ajouté aux favoris', product: 'Montre Casio', time: 'il y a 5 min' },
        { user: 'Awa S.', action: 'vient de commander', product: 'iPhone 14', time: 'il y a 8 min' },
        { user: 'Jean P.', action: 'a laissé un avis 5★ sur', product: 'Sac à main', time: 'il y a 12 min' },
      ]} />

      {/* Stats Bar with Animated Counters */}
      <section 
        ref={statsRef}
        className="py-8 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden animate-fade-in-up"
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-orange-500/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Package, value: stats.products || 0, suffix: '', label: 'Produits', color: 'from-orange-500 to-amber-500' },
              { icon: Users, value: stats.vendors || 0, suffix: '', label: 'Vendeurs actifs', color: 'from-purple-500 to-pink-500' },
              { icon: Truck, value: stats.drivers || 0, suffix: '', label: 'Livreurs', color: 'from-blue-500 to-cyan-500' },
              { icon: Shield, value: 99, suffix: '%', label: 'Satisfaction', color: 'from-emerald-500 to-green-500' },
            ].map((stat, index) => (
              <div 
                key={stat.label}
                className={`text-center transform transition-all duration-700 ${
                  statsInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-slate-400 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Carousel with Enhanced Animations */}
      <section className="py-20 bg-gradient-to-b from-white via-orange-50/30 to-white relative animate-fade-in-up">
        {/* Decorative elements */}
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
            
            <div className="hidden md:flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={prevSlide}
                disabled={carouselIndex === 0}
                className="rounded-full w-12 h-12 border-2 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={nextSlide}
                disabled={carouselIndex >= featuredProducts.length - 4}
                className="rounded-full w-12 h-12 border-2 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="relative overflow-hidden">
              <div 
                className="flex gap-6 transition-transform duration-700 ease-out"
                style={{ transform: `translateX(-${carouselIndex * (100 / 4 + 1.5)}%)` }}
              >
                {featuredProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="w-full md:w-[calc(25%-18px)] flex-shrink-0"
                  >
                    <div
                      className="transform transition-all duration-500 hover-lift"
                      style={{ 
                        opacity: index >= carouselIndex && index < carouselIndex + 4 ? 1 : 0.3,
                        transform: index >= carouselIndex && index < carouselIndex + 4 ? 'scale(1)' : 'scale(0.9)'
                      }}
                    >
                      <ProductCard product={product} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Carousel indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {[...Array(Math.max(1, featuredProducts.length - 3))].map((_, i) => (
              <button
                key={i}
                onClick={() => setCarouselIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === carouselIndex ? 'w-8 bg-gradient-to-r from-orange-500 to-amber-500' : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Categories Grid with Staggered Entrance */}
      <section 
        ref={categoriesRef}
        className="py-20 bg-white relative overflow-hidden animate-fade-in-up"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-100/50 to-pink-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 transition-all duration-700 ${
              categoriesInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}>
              Parcourir par catégorie
            </h2>
            <p className={`text-muted-foreground text-lg transition-all duration-700 delay-100 ${
              categoriesInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
            }`}>
              Découvrez notre sélection de produits authentiques
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {categories.filter(category => category.is_active !== false).map((category, index) => (
                <Link
                  key={category.slug}
                  to={`/categories/${category.slug}`}
                  className={`group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg transition-all duration-700 ${
                    categoriesInView 
                      ? 'translate-y-0 opacity-100 hover:-translate-y-2 hover:shadow-2xl' 
                      : 'translate-y-20 opacity-0'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                  data-testid={`category-${category.slug}`}
                >
                  {(() => {
                    const banners = category.banner_images || [];
                    const hasBanners = banners.length > 0;
                    const currentBanner = hasBanners
                      ? banners[(categorySlideTick + index) % banners.length]
                      : (category.image || `https://source.unsplash.com/400x300/?${category.name}`);
                    return (
                      <img
                        src={currentBanner}
                        alt={category.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    );
                  })()}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 to-amber-500/0 group-hover:from-orange-500/30 group-hover:to-amber-500/30 transition-all duration-500" />
                  
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-white font-bold text-lg md:text-xl group-hover:translate-x-2 transition-transform duration-300">
                      {category.name}
                    </h3>
                    <p className="text-white/0 group-hover:text-white/80 text-sm flex items-center gap-2 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                      Explorer la collection <ArrowRight className="w-4 h-4" />
                    </p>
                  </div>
                  
                  <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/40 rounded-2xl transition-all duration-500" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trending Products - Dark Section */}
      <section 
        ref={trendingRef}
        className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden animate-fade-in-up"
      >
        {/* Animated background */}
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
                <h2 className={`text-3xl md:text-4xl font-bold text-white transition-all duration-700 ${
                  trendingInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
                }`}>
                  Tendances du moment
                </h2>
                <p className={`text-slate-400 mt-1 transition-all duration-700 delay-100 ${
                  trendingInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
                }`}>
                  Les produits les plus populaires
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="hidden md:flex border-white/30 text-white hover:bg-white/10">
              <Link to="/produits?sort_by=sales_count">
                Voir tout <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl bg-slate-700" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {trendingProducts.slice(0, 8).map((product, index) => (
                <div
                  key={product.id}
                  className={`transition-all duration-700 ${
                    trendingInView ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New Products with Entrance Animations */}
      <section 
        ref={newProductsRef}
        className="py-20 bg-gradient-to-b from-white via-emerald-50/30 to-white animate-fade-in-up"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className={`text-3xl md:text-4xl font-bold transition-all duration-700 ${
                  newProductsInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
                }`}>
                  Nouveautés
                </h2>
                <p className={`text-muted-foreground mt-1 transition-all duration-700 delay-100 ${
                  newProductsInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
                }`}>
                  Les dernières créations de nos artisans
                </p>
              </div>
            </div>
            <Button asChild variant="ghost" className="hidden md:flex text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
              <Link to="/produits?sort_by=created_at">
                Voir tout <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {newProducts.slice(0, 16).map((product, index) => (
                <div
                  key={product.id}
                  className={`transition-all duration-700 ${
                    newProductsInView ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
                  }`}
                  style={{ transitionDelay: `${index * 75}ms` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 text-center">
            <Button asChild size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full px-10 shadow-lg shadow-emerald-500/30">
              <Link to="/produits">
                Voir tous les produits <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section with Enhanced Animations */}
      <section className="py-24 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 relative overflow-hidden animate-fade-in-up">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          {/* Floating icons */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute text-white/10 animate-float"
              style={{
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${4 + i * 0.5}s`
              }}
            >
              <Package className="w-12 h-12" />
            </div>
          ))}
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-center text-white">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            Rejoignez notre communauté
          </h2>
          <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Vendez vos créations à des milliers d'acheteurs passionnés ou découvrez des produits uniques du continent africain.
          </p>
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button asChild size="lg" className="bg-white text-orange-600 hover:bg-white/90 rounded-full px-10 py-6 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <Link to="/connexion">
                <Zap className="w-5 h-5 mr-2" />
                Commencer à vendre
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 rounded-full px-10 py-6 text-lg font-semibold transition-all duration-300 hover:-translate-y-1">
              <Link to="/devenir-revendeur">
                Devenir Revendeur
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Animated Marquee Banner */}
      <section className="py-4 bg-gradient-to-r from-slate-900 to-slate-800 overflow-hidden animate-fade-in-up">
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
      
      {/* Testimonials Section */}
      <section className="py-16 bg-gradient-to-b from-orange-50 to-white overflow-hidden animate-fade-in-up">
        <div className="container mx-auto px-4 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Ce que disent nos clients</h2>
          <p className="text-muted-foreground text-center">Des milliers de clients satisfaits chaque jour</p>
        </div>
        <TestimonialsBanner testimonials={[
          { name: 'Marie Dupont', location: 'Abidjan', rating: 5, comment: 'Service excellent ! Ma commande est arrivée en 2 jours. Produit conforme à la description.' },
          { name: 'Kofi Mensah', location: 'Dakar', rating: 5, comment: 'Je recommande vivement ! Les vendeurs sont très professionnels et les prix sont imbattables.' },
          { name: 'Awa Diallo', location: 'Bamako', rating: 4, comment: 'Très satisfaite de mon achat. Le suivi de commande en temps réel est vraiment pratique.' },
          { name: 'Jean-Pierre K.', location: 'Douala', rating: 5, comment: 'Cloléo a changé ma façon de faire du shopping. Qualité au rendez-vous !' },
          { name: 'Fatou Ndiaye', location: 'Conakry', rating: 5, comment: 'Les produits artisanaux sont magnifiques. Je suis devenue une cliente fidèle.' },
        ]} />
      </section>
      
      {/* Trust Banner at bottom */}
      <TrustBanner />

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default HomePage;
