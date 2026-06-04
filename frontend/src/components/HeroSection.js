import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ChevronLeft, ChevronRight, ShoppingBag, Store,
  ArrowRight, Shield, Truck, Star, Zap, Menu as MenuIcon
} from 'lucide-react';
import { Button } from './ui/button';
import { API_BASE, API_URL } from '../config/api';

const API = API_URL;

// Trust badges (pour le bas du menu ou ailleurs)
const TRUST_ITEMS = [
  { icon: Truck, label: 'Livraison rapide', sub: 'Partout en Afrique' },
  { icon: Shield, label: 'Paiement sécurisé', sub: 'Transactions protégées' },
  { icon: Star, label: 'Qualité vérifiée', sub: 'Vendeurs sélectionnés' },
  { icon: Zap, label: 'Support 24/7', sub: 'Toujours disponible' },
];

// Composant Catégorie avec sous-catégories au survol
const CategoryMenuItem = ({ category, subcategories }) => {
  const [showSub, setShowSub] = useState(false);
  const hasSub = subcategories && subcategories.length > 0;

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowSub(true)}
      onMouseLeave={() => setShowSub(false)}
    >
      <Link 
        to={`/categories/${category.slug}`}
        className="flex items-center justify-between py-2 px-3 rounded-lg text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
      >
        <span className="truncate">{category.name}</span>
        {hasSub && <ChevronRight className="w-3 h-3 flex-shrink-0 ml-2" />}
      </Link>
      
      {/* Sous-catégories */}
      {hasSub && showSub && (
        <div className="absolute left-full top-0 ml-1 w-64 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-50">
          {subcategories.map(sub => (
            <Link
              key={sub.id}
              to={`/categories/${sub.slug}`}
              className="block py-2 px-3 text-sm text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

// Mini carrousel pour les boutiques
const ShopCarousel = ({ shops }) => {
  const [idx, setIdx] = useState(0);
  const perPage = 3;
  const maxIdx = Math.max(0, shops.length - perPage);

  useEffect(() => {
    if (shops.length <= perPage) return;
    const t = setInterval(() => setIdx(i => (i >= maxIdx ? 0 : i + 1)), 4000);
    return () => clearInterval(t);
  }, [shops.length, maxIdx]);

  const visible = shops.slice(idx, idx + perPage);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1">
          <Store className="w-4 h-4 text-amber-500" /> Boutiques Officielles
        </h3>
        <div className="flex gap-1">
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
            className="w-6 h-6 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center disabled:opacity-30">
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button onClick={() => setIdx(i => Math.min(maxIdx, i + 1))} disabled={idx >= maxIdx}
            className="w-6 h-6 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center disabled:opacity-30">
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {visible.map((shop, i) => (
          <Link key={shop.id} to={`/vendor-shop/${shop.id}`} className="group">
            <div className="bg-slate-50 rounded-xl p-2 text-center hover:shadow-md transition">
              <img 
                src={shop.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.name)}&background=f97316&color=fff&size=60`} 
                alt={shop.name}
                className="w-12 h-12 rounded-full mx-auto object-cover mb-1"
              />
              <p className="text-[10px] font-semibold text-slate-700 line-clamp-1">{shop.name}</p>
              <p className="text-[9px] text-slate-400">{shop.count || 0} produits</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

// Composant principal HeroSection
const HeroSection = ({ categories = [] }) => {
  const [heroImages, setHeroImages] = useState([]);
  const [bgIdx, setBgIdx] = useState(0);
  const [shops, setShops] = useState([]);
  const [rightBlockImage, setRightBlockImage] = useState('');
  const [rightBlockVideo, setRightBlockVideo] = useState('');
  const [rightBlockType, setRightBlockType] = useState('image'); // 'image' ou 'video'

  // Chargement des settings hero
  useEffect(() => {
    axios.get(`${API}/hero-settings`)
      .then(res => {
        const imgs = res.data?.images || [];
        setHeroImages(imgs.length > 0 ? imgs : [
          'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=1400&q=80',
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80',
        ]);
      })
      .catch(() => setHeroImages([
        'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=1400&q=80',
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80',
      ]));
  }, []);

  // Chargement du bloc droit (image/vidéo)
  useEffect(() => {
    axios.get(`${API}/admin/settings/right-block`)
      .then(res => {
        setRightBlockImage(res.data?.image || '');
        setRightBlockVideo(res.data?.video || '');
        setRightBlockType(res.data?.type || 'image');
      })
      .catch(() => {});
  }, []);

  // Diaporama fond
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const t = setInterval(() => setBgIdx(i => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, [heroImages.length]);

  // Chargement boutiques
  useEffect(() => {
    axios.get(`${API}/products?limit=100`)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.products || []);
        const sellerMap = {};
        list.forEach(p => {
          if (p.seller_id && !sellerMap[p.seller_id]) {
            sellerMap[p.seller_id] = {
              id: p.seller_id,
              name: p.seller_name || p.shop_name || 'Boutique',
              image: p.images?.[0] || null,
              count: 0,
            };
          }
          if (sellerMap[p.seller_id]) sellerMap[p.seller_id].count++;
        });
        setShops(Object.values(sellerMap).slice(0, 12));
      }).catch(() => {});
  }, []);

  const activeCategories = categories.filter(c => c.is_active !== false);
  const parentCategories = activeCategories.filter(c => !c.parent_slug);
  
  const getSubCategories = (parentSlug) => {
    return activeCategories.filter(c => c.parent_slug === parentSlug);
  };

  const getImageUrl = (img) => {
    if (!img) return '';
    if (img.startsWith('/')) return `${API_BASE}${img}`;
    return img;
  };
  
  const currentBgUrl = getImageUrl(heroImages[bgIdx]);

  return (
    <section className="relative w-full overflow-hidden bg-slate-50" style={{ minHeight: 480 }}>
      
      {/* Fond diaporama */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence>
          <motion.div key={bgIdx}
            className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}>
            {currentBgUrl && (
              <div 
                className="w-full h-full bg-black"
                style={{
                  backgroundImage: `url(${currentBgUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/20" />
          </motion.div>
        </AnimatePresence>
        
        {/* Points de navigation */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {heroImages.map((_, i) => (
              <button key={i} onClick={() => setBgIdx(i)}
                className={`h-2 rounded-full transition-all duration-300 ${i === bgIdx ? 'w-8 bg-orange-500' : 'w-2 bg-white/50 hover:bg-white/80'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 w-full max-w-screen-xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] gap-5">
          
          {/* ===== COLONNE GAUCHE : MENU CATÉGORIES ===== */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 flex items-center gap-2">
              <MenuIcon className="w-5 h-5 text-white" />
              <span className="font-bold text-white text-sm">Toutes les catégories</span>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto">
              {parentCategories.map(cat => {
                const subCats = getSubCategories(cat.slug);
                return (
                  <CategoryMenuItem 
                    key={cat.id} 
                    category={cat} 
                    subcategories={subCats}
                  />
                );
              })}
              {parentCategories.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4">Chargement...</p>
              )}
            </div>
            
            {/* Trust badges en bas du menu */}
            <div className="border-t border-slate-100 p-3 grid grid-cols-2 gap-2">
              {TRUST_ITEMS.slice(0, 4).map(f => (
                <div key={f.label} className="flex items-center gap-2">
                  <f.icon className="w-3 h-3 text-amber-500" />
                  <span className="text-[9px] text-slate-500">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ===== COLONNE CENTRALE : DIAPORAMA HERO ===== */}
          <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-[16/9] bg-black/20">
            {currentBgUrl && (
              <img 
                src={currentBgUrl} 
                alt="Hero" 
                className="w-full h-full object-cover"
              />
            )}
            {/* Texte overlay sur le hero */}
            <div className="absolute inset-0 flex flex-col justify-center px-8 bg-gradient-to-r from-black/50 to-transparent">
              <h1 className="text-white text-2xl md:text-3xl lg:text-4xl font-black leading-tight max-w-xs">
                L'Afrique à portée<br />
                <span className="text-orange-400">de clic</span>
              </h1>
              <p className="text-white/80 text-sm mt-2 max-w-xs">
                Des milliers de produits africains authentiques
              </p>
              <Button asChild size="sm" className="mt-4 w-fit rounded-full bg-orange-500 hover:bg-orange-600">
                <Link to="/produits">Explorer <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </div>
          </div>

          {/* ===== COLONNE DROITE : BOUTIQUES + BLOC IMAGE/VIDÉO ===== */}
          <div className="space-y-4">
            {/* Bloc Boutiques */}
            <div className="bg-white rounded-2xl shadow-lg p-4 border border-slate-100">
              {shops.length > 0 ? (
                <ShopCarousel shops={shops} />
              ) : (
                <div className="text-center py-4 text-slate-400 text-sm">Chargement des boutiques...</div>
              )}
              <Link to="/produits" className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition">
                Voir tout <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Bloc Image/Vidéo (configurable par l'admin) */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
              {rightBlockType === 'video' && rightBlockVideo ? (
                <div className="aspect-video">
                  <iframe 
                    src={rightBlockVideo}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : rightBlockImage ? (
                <img 
                  src={getImageUrl(rightBlockImage)} 
                  alt="Promotion" 
                  className="w-full h-auto object-cover"
                />
              ) : (
                <div className="aspect-video bg-gradient-to-br from-orange-100 to-amber-100 flex flex-col items-center justify-center p-4 text-center">
                  <ShoppingBag className="w-8 h-8 text-orange-400 mb-2" />
                  <p className="text-xs text-slate-500">Espace publicitaire</p>
                  <p className="text-[10px] text-slate-400">Configurable depuis l'admin</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;