import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { API_BASE, API_URL } from '../config/api';

const API = API_URL;

// Composant HeroSection - PLEINE LARGEUR
const HeroSection = ({ categories = [] }) => {
  const [heroImages, setHeroImages] = useState([]);
  const [bgIdx, setBgIdx] = useState(0);
  const [rightBlockTopType, setRightBlockTopType] = useState('image');
  const [rightBlockTopImage, setRightBlockTopImage] = useState('');
  const [rightBlockTopVideo, setRightBlockTopVideo] = useState('');
  const [rightBlockTopTitle, setRightBlockTopTitle] = useState('');
  const [rightBlockTopLink, setRightBlockTopLink] = useState('');
  const [rightBlockBottomType, setRightBlockBottomType] = useState('image');
  const [rightBlockBottomImage, setRightBlockBottomImage] = useState('');
  const [rightBlockBottomVideo, setRightBlockBottomVideo] = useState('');
  const [rightBlockBottomTitle, setRightBlockBottomTitle] = useState('');
  const [rightBlockBottomLink, setRightBlockBottomLink] = useState('');

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
    axios.get(`${API}/admin/settings/right-block-top`)
      .then(res => {
        const data = res.data;
        setRightBlockTopType(data.type_content || 'image');
        setRightBlockTopImage(data.image || '');
        setRightBlockTopVideo(data.video || '');
        setRightBlockTopTitle(data.title || 'Espace publicitaire');
        setRightBlockTopLink(data.link || '');
      })
      .catch(() => {});
    
    axios.get(`${API}/admin/settings/right-block-bottom`)
      .then(res => {
        const data = res.data;
        setRightBlockBottomType(data.type_content || 'image');
        setRightBlockBottomImage(data.image || '');
        setRightBlockBottomVideo(data.video || '');
        setRightBlockBottomTitle(data.title || 'Espace publicitaire');
        setRightBlockBottomLink(data.link || '');
      })
      .catch(() => {});
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

  // Composant pour un bloc pub
  const PubBlock = ({ image, video, type, title, link }) => {
    const imageUrl = getImageUrl(image);
    
    const content = (
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-100 h-full">
        <div className="h-[160px] lg:h-[200px] p-2 flex flex-col">
          {type === 'video' && video ? (
            <div className="rounded-lg overflow-hidden flex-1">
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
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          ) : (
            <div className="flex-1 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex flex-col items-center justify-center p-3 text-center">
              <span className="text-3xl mb-1">📺</span>
              <p className="text-xs font-semibold text-slate-600">{title || "Espace pub"}</p>
            </div>
          )}
        </div>
      </div>
    );

    if (link) {
      return <a href={link} target="_blank" rel="noopener noreferrer" className="block h-full">{content}</a>;
    }
    return content;
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
        {/* COLONNE GAUCHE : DIAPORAMA HERO EN RECTANGLE - PLEINE LARGEUR */}
        <div className="relative bg-black/20 rounded-xl overflow-hidden">
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

        {/* COLONNE DROITE : DEUX BLOCS PUB COMPACTS */}
        <div className="flex flex-col gap-2">
          <PubBlock 
            image={rightBlockTopImage}
            video={rightBlockTopVideo}
            type={rightBlockTopType}
            title={rightBlockTopTitle}
            link={rightBlockTopLink}
          />
          <PubBlock 
            image={rightBlockBottomImage}
            video={rightBlockBottomVideo}
            type={rightBlockBottomType}
            title={rightBlockBottomTitle}
            link={rightBlockBottomLink}
          />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;