import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, ShoppingBag, Image as ImageIcon, Video } from 'lucide-react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { API_BASE, API_URL } from '../config/api';

const API = API_URL;

// Composant HeroSection - Diaporama rectangle à gauche, 2 blocs pub stables à droite
const HeroSection = ({ categories = [] }) => {
  const [heroImages, setHeroImages] = useState([]);
  const [bgIdx, setBgIdx] = useState(0);
  
  // États pour les deux blocs avec chargement
  const [rightBlockTop, setRightBlockTop] = useState({
    type_content: 'image',
    image: '',
    video: '',
    title: 'Espace publicitaire',
    link: '',
    loading: true
  });
  
  const [rightBlockBottom, setRightBlockBottom] = useState({
    type_content: 'image',
    image: '',
    video: '',
    title: 'Espace publicitaire',
    link: '',
    loading: true
  });

  // Chargement des images hero
  useEffect(() => {
    axios.get(`${API}/hero-settings`)
      .then(res => {
        const imgs = res.data?.images || [];
        setHeroImages(imgs);
      })
      .catch(() => setHeroImages([]));
  }, []);

  // Chargement du bloc HAUT
  useEffect(() => {
    const fetchTopBlock = async () => {
      try {
        const response = await axios.get(`${API}/right-block-settings-top`);
        const data = response.data;
        setRightBlockTop({
          type_content: data.type_content || 'image',
          image: data.image || '',
          video: data.video || '',
          title: data.title || 'Espace publicitaire',
          link: data.link || '',
          loading: false
        });
      } catch (error) {
        console.error('Erreur chargement bloc haut:', error);
        setRightBlockTop(prev => ({ ...prev, loading: false }));
      }
    };
    fetchTopBlock();
  }, []);

  // Chargement du bloc BAS
  useEffect(() => {
    const fetchBottomBlock = async () => {
      try {
        const response = await axios.get(`${API}/right-block-settings-bottom`);
        const data = response.data;
        setRightBlockBottom({
          type_content: data.type_content || 'image',
          image: data.image || '',
          video: data.video || '',
          title: data.title || 'Espace publicitaire',
          link: data.link || '',
          loading: false
        });
      } catch (error) {
        console.error('Erreur chargement bloc bas:', error);
        setRightBlockBottom(prev => ({ ...prev, loading: false }));
      }
    };
    fetchBottomBlock();
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

  // Composant pour un bloc pub stable avec état de chargement
  const PubBlock = ({ data, position }) => {
    const [imgError, setImgError] = useState(false);
    const imageUrl = getImageUrl(data.image);
    
    // Afficher le chargement
    if (data.loading) {
      return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-100">
          <div className="h-[160px] lg:h-[180px] p-2">
            <Skeleton className="w-full h-full rounded-lg" />
          </div>
        </div>
      );
    }
    
    // Contenu du bloc
    const content = (
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-100 transition-all duration-300 hover:shadow-lg h-full">
        <div className="h-[160px] lg:h-[180px] p-2">
          {data.type_content === 'video' && data.video ? (
            <div className="rounded-lg overflow-hidden w-full h-full">
              <iframe 
                src={data.video}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={data.title}
              />
            </div>
          ) : imageUrl && !imgError ? (
            <div className="relative w-full h-full rounded-lg overflow-hidden">
              <img 
                src={imageUrl} 
                alt={data.title || `Publicité ${position}`}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                onError={() => setImgError(true)}
                loading="eager"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex flex-col items-center justify-center p-3 text-center">
              <ShoppingBag className="w-8 h-8 text-orange-400 mb-1" />
              <p className="text-xs font-semibold text-slate-600">{data.title || "Espace pub"}</p>
              <p className="text-[10px] text-slate-400 mt-1">Configurez cet espace</p>
            </div>
          )}
        </div>
      </div>
    );

    if (data.link && !imgError) {
      return (
        <a href={data.link} target="_blank" rel="noopener noreferrer" className="block h-full">
          {content}
        </a>
      );
    }
    return content;
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
        {/* COLONNE GAUCHE : DIAPORAMA HERO EN RECTANGLE */}
        <div className="relative bg-black/20 rounded-xl overflow-hidden">
          {currentBgUrl ? (
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
                  className="w-full h-[260px] lg:h-[340px] object-cover"
                />
              </a>
            ) : (
              <img 
                src={currentBgUrl} 
                alt={currentBgTitle}
                className="w-full h-[260px] lg:h-[340px] object-cover"
              />
            )
          ) : (
            <div className="w-full h-[260px] lg:h-[340px] bg-gradient-to-r from-slate-700 to-slate-800 flex items-center justify-center">
              <div className="text-center text-white/50">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune image configurée</p>
              </div>
            </div>
          )}
          <div className="absolute inset-0 flex flex-col justify-center px-5 lg:px-8 bg-gradient-to-r from-black/60 via-black/30 to-transparent">
            <h1 className="text-white text-xl md:text-2xl lg:text-3xl font-black leading-tight max-w-[280px]">
              L'Afrique à portée<br />
              <span className="text-orange-400">de clic</span>
            </h1>
            <Button asChild size="default" className="mt-3 w-fit rounded-full bg-orange-500 hover:bg-orange-600 text-sm h-10 px-5">
              <Link to="/produits">Explorer <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
        </div>

        {/* COLONNE DROITE : DEUX BLOCS PUB STABLES */}
        <div className="flex flex-col gap-2">
          <PubBlock data={rightBlockTop} position="haut" />
          <PubBlock data={rightBlockBottom} position="bas" />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;