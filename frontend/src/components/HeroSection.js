import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, ShoppingBag, Truck, Shield, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

const HERO_SLIDES = [
  {
    id: 1,
    title: "Découvrez l'artisanat africain",
    subtitle: "Des créations uniques directement des artisans",
    cta: "Explorer",
    link: "/categories/artisanat-decoration",
    gradient: "from-orange-600 via-amber-500 to-yellow-500",
    image: "https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=800&q=80",
  },
  {
    id: 2,
    title: "Mode Africaine Authentique",
    subtitle: "Tissus wax, bogolan et créations contemporaines",
    cta: "Voir la collection",
    link: "/categories/mode-textile",
    gradient: "from-purple-600 via-pink-500 to-rose-500",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80",
  },
  {
    id: 3,
    title: "Bijoux & Accessoires",
    subtitle: "Pièces uniques faites main avec passion",
    cta: "Découvrir",
    link: "/categories/bijoux-accessoires",
    gradient: "from-emerald-600 via-teal-500 to-cyan-500",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80",
  }
];

const FEATURES = [
  { icon: Truck, text: "Livraison rapide", subtext: "Partout en Afrique" },
  { icon: Shield, text: "Paiement sécurisé", subtext: "100% protégé" },
  { icon: Star, text: "Qualité garantie", subtext: "Artisans vérifiés" },
];

const HeroSection = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      goToSlide((currentSlide + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [currentSlide]);

  const goToSlide = (index) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide(index);
    setTimeout(() => setIsAnimating(false), 800);
  };

  const nextSlide = () => goToSlide((currentSlide + 1) % HERO_SLIDES.length);
  const prevSlide = () => goToSlide((currentSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  const slide = HERO_SLIDES[currentSlide];

  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-slate-900">
      {/* Animated Background Gradients */}
      <div className="absolute inset-0">
        {HERO_SLIDES.map((s, index) => (
          <div
            key={s.id}
            className={`absolute inset-0 bg-gradient-to-br ${s.gradient} transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        {/* Overlay pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.4),transparent_70%)]" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Floating Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl animate-spin-slow" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 h-full min-h-[85vh] flex items-center">
        <div className="grid lg:grid-cols-2 gap-12 items-center w-full py-16">
          {/* Left: Text Content */}
          <div className="text-white space-y-8">
            {/* Badge */}
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span className="text-sm font-medium">Marketplace Africaine #1</span>
            </div>

            {/* Title */}
            <h1 
              key={slide.id}
              className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight animate-slide-up"
            >
              {slide.title.split(' ').map((word, i) => (
                <span 
                  key={i} 
                  className="inline-block mr-4"
                  style={{ animationDelay: `${0.1 * i}s` }}
                >
                  {word}
                </span>
              ))}
            </h1>

            {/* Subtitle */}
            <p 
              className="text-xl md:text-2xl text-white/80 max-w-lg animate-fade-in"
              style={{ animationDelay: '0.4s' }}
            >
              {slide.subtitle}
            </p>

            {/* CTAs */}
            <div 
              className="flex flex-wrap gap-4 animate-fade-in"
              style={{ animationDelay: '0.6s' }}
            >
              <Button
                asChild
                size="lg"
                className="bg-white text-slate-900 hover:bg-white/90 text-lg px-8 py-6 rounded-full shadow-2xl shadow-black/20 group"
              >
                <Link to={slide.link}>
                  <ShoppingBag className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  {slide.cta}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-2 border-white/30 text-white hover:bg-white/10 text-lg px-8 py-6 rounded-full backdrop-blur-sm"
              >
                <Link to="/devenir-livreur">
                  Devenir Vendeur
                </Link>
              </Button>
            </div>

            {/* Features */}
            <div 
              className="flex flex-wrap gap-6 pt-8 animate-fade-in"
              style={{ animationDelay: '0.8s' }}
            >
              {FEATURES.map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-3 text-white/70"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{feature.text}</p>
                    <p className="text-xs text-white/50">{feature.subtext}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Image */}
          <div className="relative hidden lg:block">
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Decorative rings */}
              <div className="absolute inset-0 border-2 border-white/10 rounded-full animate-spin-slow" />
              <div className="absolute inset-4 border-2 border-white/10 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '20s' }} />
              <div className="absolute inset-8 border-2 border-white/10 rounded-full animate-spin-slow" style={{ animationDuration: '25s' }} />
              
              {/* Main image */}
              <div className="absolute inset-12 rounded-full overflow-hidden shadow-2xl">
                {HERO_SLIDES.map((s, index) => (
                  <img
                    key={s.id}
                    src={s.image}
                    alt={s.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${
                      index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
                    }`}
                  />
                ))}
              </div>
              
              {/* Floating badges */}
              <div className="absolute -top-4 right-12 bg-white rounded-2xl shadow-xl p-4 animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">4.9/5</p>
                    <p className="text-xs text-slate-500">2000+ avis</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 left-12 bg-white rounded-2xl shadow-xl p-4 animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">300+</p>
                    <p className="text-xs text-slate-500">Vendeurs actifs</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide Navigation */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
        <button
          onClick={prevSlide}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex gap-2">
          {HERO_SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-500 ${
                index === currentSlide 
                  ? 'w-8 bg-white' 
                  : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
        
        <button
          onClick={nextSlide}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 30s linear infinite;
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out forwards;
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
