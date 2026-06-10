import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';
import { API_BASE, API_URL } from '../config/api';

const API = API_URL;

// Composant HeroSection - Diaporama à gauche, 2 blocs pub à droite
const HeroSection = ({ categories = [] }) => {
  const [heroImages, setHeroImages] = useState([]);
  const [bgIdx, setBgIdx] = useState(0);
  const [rightBlockImageTop, setRightBlockImageTop] = useState('');
  const [rightBlockVideoTop, setRightBlockVideoTop] = useState('');
  const [rightBlockTypeTop, setRightBlockTypeTop] = useState('image');
  const [rightBlockTitleTop, setRightBlockTitleTop] = useState('');
  const [rightBlockImageBottom, setRightBlockImageBottom] = useState('');
  const [rightBlockVideoBottom, setRightBlockVideoBottom] = useState('');
  const [rightBlockTypeBottom, setRightBlockTypeBottom] = useState('image');
  const [rightBlockTitleBottom, setRightBlockTitleBottom] = useState('');

  useEffect(() => {
    axios.get(`${API}/hero-settings`)
      .then(res => {
        const imgs = res.data?.images || [];
        setHeroImages(imgs);
      })
      .catch(() => setHeroImages([]));
  }, []);

  // Charger les deux blocs pub
  useEffect(() => {
    // Bloc du haut
    axios.get(`${API}/right-block-settings`)
      .then(res => {
        setRightBlockImageTop(res.data?.image || '');
        setRightBlockVideoTop(res.data?.video || '');
        setRightBlockTypeTop(res.data?.type_content || 'image');
        setRightBlockTitleTop(res.data?.title || '');
      })
      .catch(() => {});
    
    // Bloc du bas - tu peux créer un nouvel endpoint ou utiliser le même avec un paramètre
    axios.get(`${API}/right-block-settings-bottom`)
      .then(res => {
        setRightBlockImageBottom(res.data?.image || '');
        setRightBlockVideoBottom(res.data?.video || '');
        setRightBlockTypeBottom(res.data?.type_content || 'image');
        setRightBlockTitleBottom(res.data?.title || '');
      })
      .catch(() => {
        // Fallback avec données par défaut si l'endpoint n'existe pas
        setRightBlockImageBottom('');
        setRightBlockTypeBottom('image');
        setRightBlockTitleBottom('Espace publicitaire');
      });
  }, []);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const t = setInterval(() => setBgIdx(i => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(t);
  }, [heroImages.length]);

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

  // Composant pour un bloc pub individuel
  const PubBlock = ({ image, video, type, title, size = 'normal' }) => {
    const imageUrl = getImageUrl(image);
    const heightClass = size === 'small' ? 'h-[180px] lg:h-[200px]' : 'h-[200px] lg:h-[250px]';
    
    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
        <div className={`${heightClass} p-3 flex flex-col`}>
          {type === 'video' && video ? (
            <div className="rounded-xl overflow-hidden flex-1">
              <iframe 
                src={video}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : imageUrl ? (
            <div className="flex-1 flex items-center justify-center">
              <img 
                src={imageUrl} 
                alt={title || "Publicité"}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          ) : (
            <div className="flex-1 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex flex-col items-center justify-center p-4 text-center">
              <ShoppingBag className="w-10 h-10 text-orange-400 mb-2" />
              <p className="text-sm font-semibold text-slate-600">{title || "Espace publicitaire"}</p>
              <p className="text-xs text-slate-400 mt-1">Configurable</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 h-full">
      {/* COLONNE GAUCHE : DIAPORAMA HERO */}
      <div className="relative bg-black/20 rounded-2xl overflow-hidden min-h-[380px] lg:min-h-[420px]">
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
                className="w-full h-[380px] lg:h-[420px] object-cover"
              />
            </a>
          ) : (
            <img 
              src={currentBgUrl} 
              alt={currentBgTitle}
              className="w-full h-[380px] lg:h-[420px] object-cover"
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

      {/* COLONNE DROITE : DEUX BLOCS PUB (HAUT ET BAS) */}
      <div className="flex flex-col gap-4">
        {/* Bloc pub HAUT */}
        <PubBlock 
          image={rightBlockImageTop}
          video={rightBlockVideoTop}
          type={rightBlockTypeTop}
          title={rightBlockTitleTop}
          size="normal"
        />
        
        {/* Bloc pub BAS */}
        <PubBlock 
          image={rightBlockImageBottom}
          video={rightBlockVideoBottom}
          type={rightBlockTypeBottom}
          title={rightBlockTitleBottom}
          size="normal"
        />
      </div>
    </div>
  );
};

export default HeroSection;