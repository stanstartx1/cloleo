import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ChevronLeft, ChevronRight, ShoppingBag, Store,
  ArrowRight, ChevronDown, 
  Shirt, Sparkles, Home, Phone, Tv, Laptop, 
  Sofa, Dumbbell, Baby, Apple, Gem, Car, 
  Book, Music, Gamepad, Watch, Camera, Gift
} from 'lucide-react';
import { Button } from './ui/button';
import { API_BASE, API_URL } from '../config/api';

const API = API_URL;

// Mapping des icônes par catégorie
const getCategoryIcon = (categoryName) => {
  const name = categoryName.toLowerCase();
  if (name.includes('mode') || name.includes('textile') || name.includes('vetement') || name.includes('shirt')) return Shirt;
  if (name.includes('beauté') || name.includes('cosmétique') || name.includes('parfum')) return Sparkles;
  if (name.includes('maison') || name.includes('déco') || name.includes('meuble')) return Sofa;
  if (name.includes('téléphone') || name.includes('portable') || name.includes('smartphone')) return Phone;
  if (name.includes('tv') || name.includes('television') || name.includes('electronique')) return Tv;
  if (name.includes('informatique') || name.includes('ordinateur') || name.includes('pc')) return Laptop;
  if (name.includes('electroménager') || name.includes('frigo') || name.includes('machine')) return Home;
  if (name.includes('sport') || name.includes('fitness')) return Dumbbell;
  if (name.includes('bébé') || name.includes('puériculture')) return Baby;
  if (name.includes('supermarché') || name.includes('alimentaire') || name.includes('épicerie')) return Apple;
  if (name.includes('bijou') || name.includes('montre') || name.includes('accessoire')) return Gem;
  if (name.includes('auto') || name.includes('moto') || name.includes('véhicule')) return Car;
  if (name.includes('livre') || name.includes('librairie')) return Book;
  if (name.includes('musique') || name.includes('instrument')) return Music;
  if (name.includes('jeu') || name.includes('gaming') || name.includes('console')) return Gamepad;
  if (name.includes('montre') || name.includes('horloge')) return Watch;
  if (name.includes('photo') || name.includes('appareil')) return Camera;
  return Gift;
};

// Composant Catégorie avec sous-catégories au survol
const CategoryMenuItem = ({ category, subcategories }) => {
  const [showSub, setShowSub] = useState(false);
  const hasSub = subcategories && subcategories.length > 0;
  const Icon = getCategoryIcon(category.name);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setShowSub(true)}
      onMouseLeave={() => setShowSub(false)}
    >
      <Link 
        to={`/categories/${category.slug}`}
        className="flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center transition-colors">
            <Icon className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <span className="truncate">{category.name}</span>
        </div>
        {hasSub && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 ml-2 text-slate-400 group-hover:text-orange-500" />}
      </Link>
      
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
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
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
      <div className="grid grid-cols-3 gap-2 flex-1">
        {visible.map((shop, i) => (
          <Link key={shop.id} to={`/vendor-shop/${shop.id}`} className="group">
            <div className="bg-slate-50 rounded-xl p-3 text-center hover:shadow-md transition h-full flex flex-col items-center justify-center">
              <img 
                src={shop.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.name)}&background=f97316&color=fff&size=60`} 
                alt={shop.name}
                className="w-14 h-14 rounded-full mx-auto object-cover mb-2"
              />
              <p className="text-xs font-semibold text-slate-700 line-clamp-1">{shop.name}</p>
              <p className="text-[10px] text-slate-400">{shop.count || 0} produits</p>
            </div>
          </Link>
        ))}
      </div>
      <Link to="/produits" className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700 transition">
        Voir tout <ArrowRight className="w-3 h-3" />
      </Link>
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
  const [rightBlockType, setRightBlockType] = useState('image');
  const [rightBlockTitle, setRightBlockTitle] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  
  const MAX_VISIBLE_CATEGORIES = 10;

  useEffect(() => {
    axios.get(`${API}/hero-settings`)
      .then(res => {
        const imgs = res.data?.images || [];
        setHeroImages(imgs);
      })
      .catch(() => setHeroImages([]));
  }, []);

  useEffect(() => {
    axios.get(`${API}/right-block-settings`)
      .then(res => {
        setRightBlockImage(res.data?.image || '');
        setRightBlockVideo(res.data?.video || '');
        setRightBlockType(res.data?.type_content || 'image');
        setRightBlockTitle(res.data?.title || '');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const t = setInterval(() => setBgIdx(i => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, [heroImages.length]);

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
    if (typeof img === 'object') img = img.url || '';
    if (img.startsWith('/')) return `${API_BASE}${img}`;
    return img;
  };
  
  const getImageLink = (img) => {
    if (!img) return '';
    if (typeof img === 'object' && img.link) return img.link;
    return '';
  };
  
  const getImageTitle = (img) => {
    if (!img) return '';
    if (typeof img === 'object' && img.title) return img.title;
    return 'Hero image';
  };
  
  const currentImage = heroImages[bgIdx];
  const currentBgUrl = getImageUrl(currentImage);
  const currentBgLink = getImageLink(currentImage);
  const currentBgTitle = getImageTitle(currentImage);
  
  const visibleCategories = showAllCategories ? parentCategories : parentCategories.slice(0, MAX_VISIBLE_CATEGORIES);
  const hasMoreCategories = parentCategories.length > MAX_VISIBLE_CATEGORIES;

  return (
    <section className="relative w-full bg-slate-50">
      
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
      </div>

      {/* Contenu principal - Version responsive sans casser desktop */}
      <div className="relative z-10 w-full max-w-screen-xl mx-auto px-4 py-4 md:py-6">
        
        {/* Version Desktop : 3 colonnes côte à côte */}
        <div className="hidden lg:grid lg:grid-cols-[280px_minmax(0,1fr)_280px] gap-0 items-stretch">
          
          {/* COLONNE GAUCHE : CATÉGORIES (Desktop) */}
          <div className="bg-white rounded-l-2xl shadow-lg overflow-hidden border border-slate-100 flex flex-col h-full">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 flex items-center gap-2 flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
              <span className="font-bold text-white text-sm">Toutes les catégories</span>
            </div>
            
            <div className="flex-1 overflow-y-auto" style={{ maxHeight: '380px' }}>
              <div className="p-2">
                {visibleCategories.map(cat => {
                  const subCats = getSubCategories(cat.slug);
                  return (
                    <CategoryMenuItem 
                      key={cat.id} 
                      category={cat} 
                      subcategories={subCats}
                    />
                  );
                })}
              </div>
            </div>
            
            {hasMoreCategories && (
              <button
                onClick={() => setShowAllCategories(!showAllCategories)}
                className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors border-t border-slate-100 flex-shrink-0"
              >
                {showAllCategories ? (
                  <>Voir moins <ChevronDown className="w-4 h-4 rotate-180" /></>
                ) : (
                  <>Voir plus <ChevronDown className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>

          {/* COLONNE CENTRALE : DIAPORAMA HERO (Desktop) */}
          <div className="relative bg-black/20 h-full min-h-[400px]">
            {currentBgUrl && (
              currentBgLink ? (
                <a 
                  href={currentBgLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block w-full h-full cursor-pointer"
                >
                  <img 
                    src={currentBgUrl} 
                    alt={currentBgTitle}
                    className="w-full h-full object-cover"
                  />
                </a>
              ) : (
                <img 
                  src={currentBgUrl} 
                  alt={currentBgTitle}
                  className="w-full h-full object-cover"
                />
              )
            )}
            <div className="absolute inset-0 flex flex-col justify-center px-6 bg-gradient-to-r from-black/40 to-transparent pointer-events-none">
              <h1 className="text-white text-xl md:text-2xl lg:text-3xl font-black leading-tight max-w-[180px]">
                L'Afrique à portée<br />
                <span className="text-orange-400">de clic</span>
              </h1>
              <Button asChild size="sm" className="mt-3 w-fit rounded-full bg-orange-500 hover:bg-orange-600 text-xs pointer-events-auto">
                <Link to="/produits">Explorer <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
          </div>

          {/* COLONNE DROITE : BOUTIQUES + PUB (Desktop) */}
          <div className="bg-white rounded-r-2xl shadow-lg overflow-hidden border border-slate-100 flex flex-col h-full">
            <div className="p-4 flex-1 flex flex-col gap-4">
              <div className="flex-1">
                {shops.length > 0 ? (
                  <ShopCarousel shops={shops} />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Chargement des boutiques...</div>
                )}
              </div>

              <div>
                {rightBlockType === 'video' && rightBlockVideo ? (
                  <div className="aspect-video rounded-xl overflow-hidden">
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
                    alt={rightBlockTitle || "Publicité"}
                    className="w-full rounded-xl object-cover"
                  />
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex flex-col items-center justify-center p-4 text-center">
                    <ShoppingBag className="w-8 h-8 text-orange-400 mb-2" />
                    <p className="text-xs text-slate-500">Espace publicitaire</p>
                    <p className="text-[10px] text-slate-400">Configurable depuis l'admin</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Version Mobile : stack vertical avec carrousel simplifié */}
        <div className="lg:hidden space-y-4">
          
          {/* Hero en plein écran sur mobile */}
          <div className="relative rounded-2xl overflow-hidden bg-black/20 min-h-[300px]">
            {currentBgUrl && (
              currentBgLink ? (
                <a href={currentBgLink} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <img 
                    src={currentBgUrl} 
                    alt={currentBgTitle}
                    className="w-full h-[300px] object-cover"
                  />
                </a>
              ) : (
                <img 
                  src={currentBgUrl} 
                  alt={currentBgTitle}
                  className="w-full h-[300px] object-cover"
                />
              )
            )}
            <div className="absolute inset-0 flex flex-col justify-center px-5 bg-gradient-to-r from-black/50 to-transparent">
              <h1 className="text-white text-2xl font-black leading-tight max-w-[200px]">
                L'Afrique à portée<br />
                <span className="text-orange-400">de clic</span>
              </h1>
              <Button asChild size="sm" className="mt-3 w-fit rounded-full bg-orange-500 hover:bg-orange-600">
                <Link to="/produits">Explorer <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </div>
          </div>

          {/* Catégories mobile - version scroll horizontale */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-white" />
              <span className="font-bold text-white text-xs">Catégories</span>
            </div>
            <div className="overflow-x-auto touch-scroll-x py-2 px-2">
              <div className="flex gap-2 min-w-max">
                {visibleCategories.slice(0, 8).map(cat => {
                  const Icon = getCategoryIcon(cat.name);
                  return (
                    <Link
                      key={cat.id}
                      to={`/categories/${cat.slug}`}
                      className="flex flex-col items-center gap-1 px-3 py-2 bg-slate-50 rounded-xl min-w-[70px] hover:bg-orange-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-700 text-center truncate w-full">
                        {cat.name}
                      </span>
                    </Link>
                  );
                })}
                {hasMoreCategories && (
                  <button
                    onClick={() => setShowAllCategories(!showAllCategories)}
                    className="flex flex-col items-center justify-center gap-1 px-3 py-2 bg-slate-50 rounded-xl min-w-[70px]"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">
                      {showAllCategories ? 'Moins' : 'Plus'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Boutiques sur mobile */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1">
                <Store className="w-4 h-4 text-amber-500" /> Boutiques
              </h3>
              <Link to="/produits" className="text-xs text-orange-500">Voir tout</Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {shops.slice(0, 6).map((shop) => (
                <Link key={shop.id} to={`/vendor-shop/${shop.id}`} className="text-center">
                  <img 
                    src={shop.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.name)}&background=f97316&color=fff&size=50`} 
                    alt={shop.name}
                    className="w-12 h-12 rounded-full mx-auto object-cover mb-1"
                  />
                  <p className="text-[10px] font-semibold text-slate-700 truncate">{shop.name}</p>
                  <p className="text-[8px] text-slate-400">{shop.count || 0} produits</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Espace publicitaire mobile */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
            {rightBlockType === 'video' && rightBlockVideo ? (
              <div className="aspect-video">
                <iframe 
                  src={rightBlockVideo}
                  className="w-full h-full"
                  frameBorder="0"
                  allowFullScreen
                />
              </div>
            ) : rightBlockImage ? (
              <img 
                src={getImageUrl(rightBlockImage)} 
                alt={rightBlockTitle || "Publicité"}
                className="w-full h-auto"
              />
            ) : (
              <div className="aspect-video bg-gradient-to-br from-orange-100 to-amber-100 flex flex-col items-center justify-center p-4 text-center">
                <ShoppingBag className="w-8 h-8 text-orange-400 mb-2" />
                <p className="text-xs text-slate-500">Espace publicitaire</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;