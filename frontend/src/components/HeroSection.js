import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Shield, ShoppingBag, Sparkles, Star, Truck } from 'lucide-react';
import { Button } from './ui/button';

const HERO_SLIDES = [
  {
    id: 1,
    title: "Decouvrez l'artisanat africain",
    subtitle: 'Des creations uniques directement des artisans.',
    cta: 'Explorer',
    link: '/categories/artisanat-decoration',
    gradient: 'from-orange-600 via-amber-500 to-yellow-500',
    image: 'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=900&q=80',
  },
  {
    id: 2,
    title: 'Mode africaine authentique',
    subtitle: 'Tissus wax, bogolan et creations contemporaines.',
    cta: 'Voir la collection',
    link: '/categories/mode-textile',
    gradient: 'from-fuchsia-600 via-pink-500 to-rose-500',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=900&q=80',
  },
  {
    id: 3,
    title: 'Bijoux et accessoires',
    subtitle: 'Pieces uniques faites main avec passion.',
    cta: 'Decouvrir',
    link: '/categories/bijoux-accessoires',
    gradient: 'from-emerald-600 via-teal-500 to-cyan-500',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=900&q=80',
  },
];

const FEATURES = [
  { icon: Truck, title: 'Livraison rapide', subtitle: 'Partout en Afrique' },
  { icon: Shield, title: 'Paiement securise', subtitle: 'Transactions protegees' },
  { icon: Star, title: 'Qualite verifiee', subtitle: 'Vendeurs selectionnes' },
];

const HeroSection = () => {
  const [current, setCurrent] = useState(0);
  const slide = HERO_SLIDES[current];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (idx) => setCurrent(idx);
  const next = () => setCurrent((prev) => (prev + 1) % HERO_SLIDES.length);
  const prev = () => setCurrent((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  return (
    <section className="relative min-h-[60vh] overflow-hidden">
      <div className="absolute inset-0">
        {HERO_SLIDES.map((s, idx) => (
          <div
            key={s.id}
            className={`absolute inset-0 bg-gradient-to-br ${s.gradient} transition-opacity duration-700 ${idx === current ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_30%,rgba(255,255,255,0.2),transparent_40%)]" />
      </div>

      <motion.div
        className="relative z-10 container mx-auto px-4 min-h-[60vh] flex items-center"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="grid lg:grid-cols-2 gap-10 items-center w-full py-8">
          <div className="text-white space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/25 bg-white/10 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-sm font-medium">Cloleo Marketplace Premium</span>
            </div>

            <motion.h1
              key={slide.id}
              className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              {slide.title}
            </motion.h1>

            <motion.p
              key={`${slide.id}-subtitle`}
              className="text-lg md:text-xl text-white/85 max-w-xl"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
            >
              {slide.subtitle}
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
            >
              <Button asChild size="lg" className="rounded-full px-7 bg-white text-slate-900 hover:bg-white/90">
                <Link to={slide.link}>
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  {slide.cta}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>

              <Button asChild size="lg" variant="outline" className="rounded-full px-7 border-white/40 text-white hover:bg-white/10">
                <Link to="/connexion">Devenir vendeur</Link>
              </Button>
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-3 pt-4">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm p-3">
                  <feature.icon className="w-5 h-5 mb-2 text-amber-300" />
                  <p className="text-sm font-semibold">{feature.title}</p>
                  <p className="text-xs text-white/75">{feature.subtitle}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="relative aspect-square max-w-[520px] mx-auto">
              <div className="absolute inset-0 rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur-sm shadow-2xl" />
              <div className="absolute inset-5 rounded-[1.6rem] overflow-hidden">
                {HERO_SLIDES.map((s, idx) => (
                  <img
                    key={s.id}
                    src={s.image}
                    alt={s.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${idx === current ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
        <button onClick={prev} className="w-10 h-10 rounded-full border border-white/30 text-white bg-white/10 hover:bg-white/20">
          <ChevronLeft className="w-5 h-5 mx-auto" />
        </button>
        <div className="flex gap-2">
          {HERO_SLIDES.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => goTo(idx)}
              className={`h-2 rounded-full transition-all ${idx === current ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
        <button onClick={next} className="w-10 h-10 rounded-full border border-white/30 text-white bg-white/10 hover:bg-white/20">
          <ChevronRight className="w-5 h-5 mx-auto" />
        </button>
      </div>
    </section>
  );
};

export default HeroSection;