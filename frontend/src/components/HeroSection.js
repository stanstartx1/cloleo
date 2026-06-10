import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ChevronLeft, ChevronRight, ShoppingBag, Store,
  ArrowRight
} from 'lucide-react';
import { Button } from './ui/button';
import { API_BASE, API_URL } from '../config/api';

const API = API_URL;

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
        {visible.map((shop) => (
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

// Composant HeroSection simplifié (sans menu)
const HeroSection = ({ categories = [] }) => {
  const [heroImages, setHeroImages] = useState([]);
  const [bgIdx, setBgIdx] = useState(0);
  const [shops, setShops] = useState([]);
  const [rightBlockImage, setRightBlockImage] = useState('');
  const [rightBlockVideo, setRightBlockVideo] = useState('');
  const [rightBlockType, setRightBlockType] = useState('image');
  const [rightBlockTitle, setRightBlockTitle] = useState('');

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

  const getImageUrl = (img) => {
    if (!img) return '';
    if (typeof img === 'object') img = img.url || '';
    if (typeof img === 'string' && img.startsWith('/')) return `${API_BASE}${img}`;
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

  return (
    <section className="relative w-full bg-slate-50 rounded-2xl overflow-hidden">
      {/* Contenu - 2 colonnes : Diaporama + Bloc droite */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">
        
        {/* COLONNE GAUCHE : DIAPORAMA HERO */}
        <div className="relative bg-black/20 min-h-[380px] lg:min-h-[400px]">
          {currentBgUrl && (
            currentBgLink ? (
              <a 
                href={currentBgLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block w-full h-full"
              >
                <img 
                  src={currentBgUrl} 
                  alt={currentBgTitle}
                  className="w-full h-[380px] lg:h-[400px] object-cover"
                />
              </a>
            ) : (
              <img 
                src={currentBgUrl} 
                alt={currentBgTitle}
                className="w-full h-[380px] lg:h-[400px] object-cover"
              />
            )
          )}
          <div className="absolute inset-0 flex flex-col justify-center px-6 bg-gradient-to-r from-black/50 to-transparent">
            <h1 className="text-white text-xl md:text-2xl lg:text-3xl font-black leading-tight max-w-[250px]">
              L'Afrique à portée<br />
              <span className="text-orange-400">de clic</span>
            </h1>
            <Button asChild size="sm" className="mt-3 w-fit rounded-full bg-orange-500 hover:bg-orange-600 text-xs">
              <Link to="/produits">Explorer <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </div>
        </div>

        {/* COLONNE DROITE : BOUTIQUES + PUB */}
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

      {/* Version Mobile simplifiée */}
      <div className="lg:hidden space-y-3 p-3">
        <div className="relative rounded-2xl overflow-hidden bg-black/20 min-h-[280px]">
          {currentBgUrl && (
            <img src={currentBgUrl} alt={currentBgTitle} className="w-full h-[280px] object-cover" />
          )}
          <div className="absolute inset-0 flex flex-col justify-center px-5 bg-gradient-to-r from-black/50 to-transparent">
            <h1 className="text-white text-xl font-black leading-tight max-w-[200px]">
              L'Afrique à portée de clic
            </h1>
            <Button asChild size="sm" className="mt-3 w-fit rounded-full bg-orange-500">
              <Link to="/produits">Explorer <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </div>
        </div>
        
        {/* Boutiques mobile simplifiées */}
        <div className="bg-white rounded-xl p-3 shadow">
          <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1">
            <Store className="w-4 h-4 text-amber-500" /> Boutiques
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {shops.slice(0, 6).map((shop) => (
              <Link key={shop.id} to={`/vendor-shop/${shop.id}`} className="text-center">
                <img 
                  src={shop.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(shop.name)}&background=f97316&color=fff&size=50`} 
                  alt={shop.name}
                  className="w-12 h-12 rounded-full mx-auto object-cover mb-1"
                />
                <p className="text-[10px] font-semibold text-slate-700 truncate">{shop.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;