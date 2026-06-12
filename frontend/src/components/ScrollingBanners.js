import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Star, Shield, Truck, CreditCard, Smile, Heart, Clock } from 'lucide-react';

// ===== PROMO BANNER (sans barre de progression) =====
export const PromoBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const promotions = [
    { text: "🔥 LIVRAISON GRATUITE sur toutes les commandes > 50 000 FCFA", bg: "bg-gradient-to-r from-red-600 to-orange-600" },
    { text: "💳 PAIEMENT SÉCURISÉ - Payez à la livraison ou par carte", bg: "bg-gradient-to-r from-blue-600 to-indigo-600" },
    { text: "✨ NOUVEAUX PRODUITS CHAQUE SEMAINE - Découvrez les tendances", bg: "bg-gradient-to-r from-green-600 to-teal-600" },
    { text: "🚀 EXPEDITION RAPIDE - 24H/48H sur Abidjan", bg: "bg-gradient-to-r from-purple-600 to-pink-600" },
    { text: "🏆 Gagnez des POINTS FIDÉLITÉ à chaque achat", bg: "bg-gradient-to-r from-amber-600 to-yellow-600" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promotions.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [promotions.length]);

  const current = promotions[currentIndex];

  return (
    <div className={`${current.bg} text-white py-2.5 overflow-hidden relative`}>
      <div className="site-container">
        <div className="flex items-center justify-center gap-3">
          <div className="text-sm md:text-base font-semibold animate-pulse">
            {current.text}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== TRUST BANNER =====
export const TrustBanner = () => {
  const trustItems = [
    { icon: Shield, text: "Paiement sécurisé", sub: "Transactions protégées" },
    { icon: Truck, text: "Livraison rapide", sub: "Partout en Afrique" },
    { icon: CreditCard, text: "Sans frais cachés", sub: "Prix transparents" },
    { icon: Heart, text: "Satisfait ou remboursé", sub: "Garantie 14 jours" },
    { icon: Clock, text: "Support 24/7", sub: "Service client dédié" },
    { icon: Smile, text: "Des milliers de clients", sub: "Communauté grandissante" },
  ];

  return (
    <div className="bg-white py-6 border-y border-slate-100">
      <div className="site-container">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {trustItems.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-2">
                <item.icon className="w-6 h-6 text-orange-500" />
              </div>
              <p className="text-xs font-bold text-slate-800">{item.text}</p>
              <p className="text-[10px] text-slate-400">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ===== NOTIFICATION FEED =====
export const NotificationFeed = ({ notifications = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (notifications.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notifications.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [notifications.length]);

  if (notifications.length === 0) return null;

  const current = notifications[currentIndex];

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-y border-amber-100 py-2">
      <div className="site-container">
        <div className="flex items-center justify-center gap-2 text-sm">
          <Bell className="w-4 h-4 text-orange-500" />
          <span className="font-medium text-slate-700">{current.user}</span>
          <span className="text-slate-500">{current.action}</span>
          <span className="font-semibold text-orange-600">{current.product}</span>
          <span className="text-slate-400 text-xs">• {current.time}</span>
        </div>
      </div>
    </div>
  );
};

// ===== FLOATING BADGES =====
export const FloatingBadges = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const badges = [
    { icon: Shield, text: "Paiement sécurisé", color: "bg-green-500" },
    { icon: Truck, text: "Livraison 24h", color: "bg-blue-500" },
    { icon: Star, text: "Qualité garantie", color: "bg-amber-500" },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          className="fixed left-4 bottom-20 z-50 hidden lg:block"
        >
          <div className="space-y-2">
            {badges.map((badge, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-3 py-1.5 border border-slate-200">
                <div className={`${badge.color} w-6 h-6 rounded-full flex items-center justify-center`}>
                  <badge.icon className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-700">{badge.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ===== TESTIMONIALS BANNER =====
export const TestimonialsBanner = ({ testimonials = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (testimonials.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  if (testimonials.length === 0) return null;

  const current = testimonials[currentIndex];

  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 py-8">
      <div className="site-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto"
          >
            <div className="flex justify-center mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < current.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`} />
              ))}
            </div>
            <p className="text-slate-600 italic text-sm md:text-base">"{current.comment}"</p>
            <p className="font-bold text-slate-800 mt-3">{current.name}</p>
            <p className="text-xs text-slate-400">{current.location}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};