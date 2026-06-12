import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { API_BASE, API_URL } from '../config/api';
import './HeroSection.css';

const API = API_URL;

const HeroSection = ({ categories = [] }) => {
  const [heroImages, setHeroImages] = useState([]);
  const [bgIdx, setBgIdx] = useState(0);
  
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

  useEffect(() => {
    axios.get(`${API}/hero-settings`)
      .then(res => {
        const imgs = res.data?.images || [];
        setHeroImages(imgs);
      })
      .catch(() => setHeroImages([]));
  }, []);

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

  const PubBlock = ({ data, position }) => {
    const [imgError, setImgError] = useState(false);
    const imageUrl = getImageUrl(data.image);
    
    if (data.loading) {
      return (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-100 h-full">
          <div className="h-[52px] lg:h-[56px] p-1">
            <Skeleton className="w-full h-full rounded-md" />
          </div>
        </div>
      );
    }
    
    const content = (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-100 transition-all duration-300 hover:shadow-md h-full">
        <div className="h-[52px] lg:h-[56px] p-1 flex items-center justify-center">
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
            <div className="relative w-full h-full rounded-lg overflow-hidden flex items-center justify-center bg-slate-50">
              <img 
                src={imageUrl} 
                alt={data.title || `Publicité ${position}`}
                className="max-w-full max-h-full object-contain transition-transform duration-300 hover:scale-105"
                onError={() => setImgError(true)}
                loading="eager"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex flex-col items-center justify-center p-1 text-center">
              <ShoppingBag className="w-5 h-5 text-orange-400 mb-0.5" />
              <p className="text-[9px] font-semibold text-slate-600 line-clamp-1">{data.title || "Espace pub"}</p>
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
    <div className="hero-section-container w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_140px] gap-1.5">
        {/* COLONNE GAUCHE : DIAPORAMA compact */}
        <div className="hero-image-container relative rounded-lg overflow-hidden">
          {currentBgUrl ? (
            currentBgLink ? (
              <a 
                href={currentBgLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block w-full"
              >
                <img 
                  src={currentBgUrl} 
                  alt={currentBgTitle}
                  className="w-full h-[108px] sm:h-[112px] lg:h-[120px] object-cover"
                />
              </a>
            ) : (
              <img 
                src={currentBgUrl} 
                alt={currentBgTitle}
                className="w-full h-[108px] sm:h-[112px] lg:h-[120px] object-cover"
              />
            )
          ) : (
            <div className="w-full h-[108px] sm:h-[112px] lg:h-[120px] bg-gradient-to-r from-orange-100 to-amber-100 flex items-center justify-center rounded-lg">
              <div className="text-center text-orange-400/50">
                <ShoppingBag className="w-8 h-8 mx-auto mb-1 opacity-50" />
                <p className="text-[10px] font-medium">Aucune image</p>
              </div>
            </div>
          )}
          <div className="absolute inset-0 flex flex-col justify-center px-2.5 lg:px-3 bg-gradient-to-r from-black/60 via-black/30 to-transparent rounded-lg">
            <h1 className="text-white text-[10px] sm:text-xs lg:text-sm font-black leading-tight max-w-[160px] drop-shadow-lg">
              L'Afrique à portée<br />
              <span className="text-orange-400">de clic</span>
            </h1>
            <Button asChild size="sm" className="mt-0.5 w-fit rounded-full bg-orange-500 hover:bg-orange-600 text-[8px] h-4 px-1.5 shadow-md">
              <Link to="/produits">Explorer <ArrowRight className="w-2 h-2 ml-0.5" /></Link>
            </Button>
          </div>
        </div>

        {/* COLONNE DROITE : DEUX BLOCS PUB */}
        <div className="flex flex-col gap-1">
          <PubBlock data={rightBlockTop} position="haut" />
          <PubBlock data={rightBlockBottom} position="bas" />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;