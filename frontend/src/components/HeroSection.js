import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ChevronLeft, ChevronRight, ShoppingBag, Store,
  ArrowRight, Shield, Truck, Star, Zap
} from 'lucide-react';
import { Button } from './ui/button';
import { API_BASE, API_URL } from '../config/api';

const API = API_URL;

// ─── Badges de confiance ────────────────────────────────────────────
const TRUST_ITEMS = [
  { icon: Truck,  label: 'Livraison rapide',    sub: 'Partout en Afrique' },
  { icon: Shield, label: 'Paiement sécurisé',   sub: 'Transactions protégées' },
  { icon: Star,   label: 'Qualité vérifiée',    sub: 'Vendeurs sélectionnés' },
  { icon: Zap,    label: 'Support 24/7',         sub: 'Toujours disponible' },
];

// ─── Stats à la SuperBuyer ───────────────────────────────────────────
const STATS = [
  { value: '5M+',  label: 'Produits disponibles' },
  { value: '12',   label: 'Pays desservis' },
  { value: '50K+', label: 'Clients satisfaits' },
  { value: '24H',  label: 'Service client' },
];

// ─── Carousel générique ──────────────────────────────────────────────
const MiniCarousel = ({ items, renderItem, title, viewAllLink, icon: Icon, color }) => {
  const [idx, setIdx] = useState(0);
  const perPage = 3;
  const maxIdx = Math.max(0, items.length - perPage);
  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => setIdx(i => Math.min(maxIdx, i + 1));

  // Auto-scroll
  useEffect(() => {
    if (items.length <= perPage) return;
    const t = setInterval(() => setIdx(i => (i >= maxIdx ? 0 : i + 1)), 3500);
    return () => clearInterval(t);
  }, [items.length, maxIdx]);

  const visible = items.slice(idx, idx + perPage);

  return (
    <div className="flex flex-col h-full">
      {/* Header card */}
      <div className={`flex items-center justify-between mb-3 px-1`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-slate-800 text-base tracking-tight">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prev} disabled={idx === 0}
            className="w-7 h-7 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button onClick={next} disabled={idx >= maxIdx}
            className="w-7 h-7 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Items */}
      <div className="grid grid-cols-3 gap-2 flex-1">
        <AnimatePresence mode="wait">
          {visible.map((item, i) => (
            <motion.div key={`${item.id || item.slug}-${idx}-${i}`}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, delay: i * 0.05 }}>
              {renderItem(item)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer link */}
      <Link to={viewAllLink}
        className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition">
        Voir tout <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
};

// ─── Composant principal ─────────────────────────────────────────────
const HeroSection = ({ categories = [] }) => {
  const [heroImages, setHeroImages] = useState([]);
  const [bgIdx, setBgIdx] = useState(0);
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);

  // Chargement des settings hero
  useEffect(() => {
    axios.get(`${API}/hero-settings`)
      .then(res => {
        const imgs = res.data?.images || [];
        setHeroImages(imgs.length > 0 ? imgs : [
          'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=1400&q=80',
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80',
          'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&q=80',
        ]);
      })
      .catch(() => setHeroImages([
        'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=1400&q=80',
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80',
        'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1400&q=80',
      ]));
  }, []);

  // Diaporama fond
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const t = setInterval(() => setBgIdx(i => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, [heroImages.length]);

  // Chargement boutiques + produits vedettes
  useEffect(() => {
    axios.get(`${API}/products/featured?limit=12`)
      .catch(() => axios.get(`${API}/products?limit=12`))
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.products || []);
        setProducts(list.slice(0, 9));
      }).catch(() => {});

    // Vendeurs actifs (on utilise les catégories avec des vendeurs)
    axios.get(`${API}/products?limit=50`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.products || []);
        const sellerMap = {};
        list.forEach(p => {
          if (p.seller_id && !sellerMap[p.seller_id]) {
            sellerMap[p.seller_id] = {
              id: p.seller_id,
              slug: p.seller_id,
              name: p.seller_name || 'Boutique',
              image: p.images?.[0] || null,
              count: 0,
            };
          }
          if (sellerMap[p.seller_id]) sellerMap[p.seller_id].count++;
        });
        setShops(Object.values(sellerMap).slice(0, 9));
      }).catch(() => {});
  }, []);

  const activeCategories = categories.filter(c => c.is_active !== false);
  const bgUrl = heroImages[bgIdx]
    ? (heroImages[bgIdx].startsWith('/') ? `${API_BASE}${heroImages[bgIdx]}` : heroImages[bgIdx])
    : '';

  // Render item catégorie
  const renderCategory = (cat) => {
    const banners = cat.banner_images || [];
    const img = banners[0] || cat.image
      || `https://source.unsplash.com/200x200/?africa,${encodeURIComponent(cat.name)}`;
    const imgUrl = img.startsWith('/') ? `${API_BASE}${img}` : img;
    return (
      <Link to={`/categories/${cat.slug}`}
        className="group flex flex-col items-center gap-1">
        <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-white shadow-md group-hover:border-orange-400 group-hover:scale-105 transition-all duration-200">
          <img src={imgUrl} alt={cat.name} className="w-full h-full object-cover" />
        </div>
        <span className="text-[10px] font-semibold text-slate-700 text-center leading-tight line-clamp-2 group-hover:text-orange-600 transition-colors">
          {cat.name}
        </span>
      </Link>
    );
  };

  // Render item boutique
  const renderShop = (shop) => {
    const imgUrl = shop.image
      ? (shop.image.startsWith('/') ? `${API_BASE}${shop.image}` : shop.image)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.name)}&background=f97316&color=fff&size=80`;
    return (
      <Link to={`/vendor-shop/${shop.id}`}
        className="group flex flex-col items-center gap-1">
        <div className="w-full aspect-square rounded-xl overflow-hidden border-2 border-white shadow-md group-hover:border-amber-400 group-hover:scale-105 transition-all duration-200">
          <img src={imgUrl} alt={shop.name} className="w-full h-full object-cover" />
        </div>
        <span className="text-[10px] font-semibold text-slate-700 text-center leading-tight line-clamp-2 group-hover:text-amber-600 transition-colors">
          {shop.name}
        </span>
        {shop.count > 0 && (
          <span className="text-[9px] text-slate-400">{shop.count} produit{shop.count > 1 ? 's' : ''}</span>
        )}
      </Link>
    );
  };

  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: 420 }}>

      {/* ── Fond diaporama ── */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence>
          <motion.div key={bgIdx}
            className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}>
            {bgUrl && (
              <img src={bgUrl} alt="hero" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
          </motion.div>
        </AnimatePresence>
        {/* Points de navigation fond */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {heroImages.map((_, i) => (
              <button key={i} onClick={() => setBgIdx(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === bgIdx ? 'w-6 bg-orange-400' : 'w-1.5 bg-white/40 hover:bg-white/70'}`} />
            ))}
          </div>
        )}
      </div>

      {/* ── Contenu principal ── */}
      <div className="relative z-10 w-full max-w-screen-xl mx-auto px-4 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px_320px] gap-4 items-start">

          {/* Colonne gauche : texte + stats + CTA */}
          <motion.div className="text-white space-y-5"
            initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-400/40 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-xs font-semibold text-orange-200">Cloleo Marketplace Premium</span>
            </div>

            {/* Titre */}
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight">
                L'Afrique à portée<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                  de clic
                </span>
              </h1>
              <p className="mt-3 text-sm md:text-base text-white/80 max-w-sm">
                Des milliers de produits africains authentiques. Achetez, vendez, revendez — partout dans le monde.
              </p>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm"
                className="rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/40 font-bold px-5">
                <Link to="/produits">
                  <ShoppingBag className="w-4 h-4 mr-1.5" /> Explorer
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline"
                className="rounded-full border-white/40 text-white hover:bg-white/10 font-semibold px-5">
                <Link to="/connexion">Devenir vendeur</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {STATS.map(s => (
                <div key={s.label} className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-2">
                  <p className="text-lg font-black text-orange-300">{s.value}</p>
                  <p className="text-[11px] text-white/70 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="hidden md:grid grid-cols-2 gap-2 pt-1">
              {TRUST_ITEMS.map(f => (
                <div key={f.label} className="flex items-center gap-2 rounded-lg bg-white/8 border border-white/10 px-2.5 py-2">
                  <f.icon className="w-4 h-4 text-amber-300 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-white leading-none">{f.label}</p>
                    <p className="text-[10px] text-white/60">{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Card 1 : Catégories */}
          {activeCategories.length > 0 && (
            <motion.div
              className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-4 border border-white/60"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}>
              <MiniCarousel
                items={activeCategories}
                renderItem={renderCategory}
                title="Catégories"
                viewAllLink="/categories"
                icon={ShoppingBag}
                color="bg-gradient-to-br from-orange-500 to-amber-500"
              />
            </motion.div>
          )}

          {/* Card 2 : Meilleures boutiques */}
          {shops.length > 0 && (
            <motion.div
              className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-4 border border-white/60"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}>
              <MiniCarousel
                items={shops}
                renderItem={renderShop}
                title="Meilleures boutiques"
                viewAllLink="/produits"
                icon={Store}
                color="bg-gradient-to-br from-amber-500 to-orange-600"
              />
            </motion.div>
          )}

        </div>
      </div>
    </section>
  );
};

export default HeroSection;