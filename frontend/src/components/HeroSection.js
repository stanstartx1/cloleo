import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { API_BASE, API_URL } from '../config/api';
import './HeroSection.css';

const API = API_URL;

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

const PubBlock = ({ data, position }) => {
  const [imgError, setImgError] = useState(false);
  const imageUrl = getImageUrl(data.image);

  if (data.loading) {
    return (
      <div className="hero-pub-block">
        <Skeleton className="w-full h-full rounded-none" />
      </div>
    );
  }

  const inner = (
    <div className="hero-pub-block h-full">
      {data.type_content === 'video' && data.video ? (
        <iframe
          src={data.video}
          className="w-full h-full"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={data.title}
        />
      ) : imageUrl && !imgError ? (
        <img
          src={imageUrl}
          alt={data.title || `Publicité ${position}`}
          onError={() => setImgError(true)}
          loading="eager"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-3 text-center">
          <ShoppingBag className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-xs font-medium text-slate-500 line-clamp-2">
            {data.title || 'Espace publicitaire'}
          </p>
        </div>
      )}
    </div>
  );

  if (data.link && !imgError) {
    return (
      <a href={data.link} target="_blank" rel="noopener noreferrer" className="block flex-1 min-h-0">
        {inner}
      </a>
    );
  }
  return inner;
};

const HeroSection = () => {
  const [heroImages, setHeroImages] = useState([]);
  const [bgIdx, setBgIdx] = useState(0);

  const [rightBlockTop, setRightBlockTop] = useState({
    type_content: 'image',
    image: '',
    video: '',
    title: 'Espace publicitaire',
    link: '',
    loading: true,
  });

  const [rightBlockBottom, setRightBlockBottom] = useState({
    type_content: 'image',
    image: '',
    video: '',
    title: 'Espace publicitaire',
    link: '',
    loading: true,
  });

  useEffect(() => {
    axios
      .get(`${API}/hero-settings`)
      .then((res) => setHeroImages(res.data?.images || []))
      .catch(() => setHeroImages([]));
  }, []);

  useEffect(() => {
    axios
      .get(`${API}/right-block-settings-top`)
      .then((res) => {
        const data = res.data;
        setRightBlockTop({
          type_content: data.type_content || 'image',
          image: data.image || '',
          video: data.video || '',
          title: data.title || 'Espace publicitaire',
          link: data.link || '',
          loading: false,
        });
      })
      .catch(() => setRightBlockTop((prev) => ({ ...prev, loading: false })));
  }, []);

  useEffect(() => {
    axios
      .get(`${API}/right-block-settings-bottom`)
      .then((res) => {
        const data = res.data;
        setRightBlockBottom({
          type_content: data.type_content || 'image',
          image: data.image || '',
          video: data.video || '',
          title: data.title || 'Espace publicitaire',
          link: data.link || '',
          loading: false,
        });
      })
      .catch(() => setRightBlockBottom((prev) => ({ ...prev, loading: false })));
  }, []);

  const goTo = useCallback(
    (idx) => {
      if (heroImages.length === 0) return;
      setBgIdx(((idx % heroImages.length) + heroImages.length) % heroImages.length);
    },
    [heroImages.length]
  );

  const goPrev = useCallback(() => goTo(bgIdx - 1), [bgIdx, goTo]);
  const goNext = useCallback(() => goTo(bgIdx + 1), [bgIdx, goTo]);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const t = setInterval(() => {
      setBgIdx((i) => (i + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(t);
  }, [heroImages.length]);

  const currentImage = heroImages[bgIdx];
  const currentBgUrl = getImageUrl(currentImage);
  const currentBgLink = getImageLink(currentImage);
  const currentBgTitle = getImageTitle(currentImage);

  const carouselImage = currentBgUrl ? (
    currentBgLink ? (
      <a href={currentBgLink} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
        <img src={currentBgUrl} alt={currentBgTitle} />
      </a>
    ) : (
      <img src={currentBgUrl} alt={currentBgTitle} />
    )
  ) : (
    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center text-white/40">
        <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-medium">Aucune image hero</p>
      </div>
    </div>
  );

  return (
    <div className="hero-section-container w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_minmax(160px,200px)] gap-2">
        {/* Carrousel central — pleine largeur sur mobile, colonne principale sur desktop */}
        <div className="hero-carousel md:col-span-2 lg:col-span-1">
          {carouselImage}

          {heroImages.length > 1 && (
            <>
              <button
                type="button"
                className="hero-nav-btn hero-nav-btn--prev"
                onClick={goPrev}
                aria-label="Slide précédent"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                className="hero-nav-btn hero-nav-btn--next"
                onClick={goNext}
                aria-label="Slide suivant"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="hero-dots">
                {heroImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`hero-dot${idx === bgIdx ? ' is-active' : ''}`}
                    onClick={() => goTo(idx)}
                    aria-label={`Aller au slide ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Blocs promo empilés à droite (côte à côte sur tablette) */}
        <div className="hero-side-ads md:col-span-2 lg:col-span-1">
          <PubBlock data={rightBlockTop} position="haut" />
          <PubBlock data={rightBlockBottom} position="bas" />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
