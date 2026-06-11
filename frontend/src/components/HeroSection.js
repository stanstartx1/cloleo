import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { API_BASE, API_URL } from '../config/api';

const API = API_URL;

// Composant HeroSection - Diaporama aligné avec blocs pub carrés
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

  // Rotation du diaporama
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

  // Composant pour un bloc pub - format carré aligné
  const PubBlock = ({ data, position }) => {
    const [imgError, setImgError] = useState(false);
    const imageUrl = getImageUrl(data.image);
    
    // Afficher le chargement
    if (data.loading) {
      return (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-100 h-full">
          <div className="aspect-square p-2">
            <Skeleton className="w-full h-full rounded-lg" />
          </div>
        </div>
      );
    }
    
    // Contenu du bloc - format carré
    const content = (
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-100 transition-all duration-300 hover:shadow-lg h-full">
        <div className="aspect-square p-2">
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
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex flex-col items-center justify-center p-4 text-center">
              <ShoppingBag className="w-10 h-10 text-orange-400 mb-2" />
              <p className="text-sm font-semibold text-slate-600">{data.title || "Espace pub"}</p>
              <p className="text-xs text-slate-400 mt-1">Configurez cet espace</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
        {/* COLONNE GAUCHE : DIAPORAMA HERO - HAUTEUR RÉDUITE ET ALIGNÉE */}
        <div className="relative rounded-xl overflow-hidden bg-transparent">
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
                  className="w-full h-[280px] lg:h-[340px] object-cover"
                />
              </a>
            ) : (
              <img 
                src={currentBgUrl} 
                alt={currentBgTitle}
                className="w-full h-[280px] lg:h-[340px] object-cover"
              />
            )
          ) : (
            <div className="w-full h-[280px] lg:h-[340px] bg-gradient-to-r from-orange-100 to-amber-100 flex items-center justify-center rounded-xl">
              <div className="text-center text-orange-400/50">
                <ShoppingBag className="w-16 h-16 mx-auto mb-3 opacity-50" />
                <p className="text-base font-medium">Aucune image configurée</p>
                <p className="text-sm mt-1 opacity-70">Ajoutez des images dans l'admin</p>
              </div>
            </div>
          )}
          {/* Overlay texte */}
          <div className="absolute inset-0 flex flex-col justify-center px-6 lg:px-10 bg-gradient-to-r from-black/50 via-black/20 to-transparent">
            <h1 className="text-white text-2xl md:text-3xl lg:text-4xl font-black leading-tight max-w-[320px] drop-shadow-lg">
              L'Afrique à portée<br />
              <span className="text-orange-400">de clic</span>
            </h1>
            <Button asChild size="lg" className="mt-4 w-fit rounded-full bg-orange-500 hover:bg-orange-600 text-base h-11 px-6 shadow-lg">
              <Link to="/produits">Explorer <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </div>

        {/* COLONNE DROITE : DEUX BLOCS PUB CARRÉS ALIGNÉS */}
        <div className="flex flex-col gap-3">
          <PubBlock data={rightBlockTop} position="haut" />
          <PubBlock data={rightBlockBottom} position="bas" />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;