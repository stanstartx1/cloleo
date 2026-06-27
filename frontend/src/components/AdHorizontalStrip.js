import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config/api';

const DEFAULT_SUBTITLES = [
  'Mettez ici vos promos, annonces flash et nouveautés sponsorisées.',
  'Zone dédiée aux campagnes partenaires, bannières saisonnières et bons plans.',
  'Emplacements premium pour opérations spéciales, événements et mises en avant.',
  'Offres limitées dans le temps, ne manquez pas ces bonnes affaires !',
];

const getImageUrl = (url) => {
  if (!url) return '';
  if (typeof url === 'object') url = url.url || '';
  if (url.startsWith('/')) return `${API_BASE}${url}`;
  return url;
};

const getToneStyles = (tone) => {
  const tones = {
    orange: 'from-orange-500 via-amber-500 to-orange-600',
    blue: 'from-blue-500 via-cyan-500 to-blue-600',
    green: 'from-emerald-500 via-teal-500 to-green-600',
    red: 'from-red-500 via-rose-500 to-red-600',
  };
  return tones[tone] || tones.orange;
};

const AdHorizontalStrip = ({ strip }) => {
  const [isHovered, setIsHovered] = useState(false);
  const mediaUrl = getImageUrl(strip.media_url);
  const toneGradient = getToneStyles(strip.tone);
  const isSubtitleCustom = strip.subtitle && strip.subtitle !== DEFAULT_SUBTITLES[0] && strip.subtitle !== DEFAULT_SUBTITLES[1] && strip.subtitle !== DEFAULT_SUBTITLES[2] && strip.subtitle !== DEFAULT_SUBTITLES[3];

  const content = (
    <div
      className={`hero-bottom-block relative overflow-hidden rounded-sm border border-gray-200 bg-white transition-shadow duration-300 ${isHovered ? 'shadow-md' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {strip.media_type === 'image' && mediaUrl ? (
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <img
            src={mediaUrl}
            alt={strip.title}
            className="max-w-full max-h-full object-contain transition-transform duration-500"
            style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
          />
        </div>
      ) : strip.media_type === 'video' && mediaUrl ? (
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <video
            src={mediaUrl}
            className="max-w-full max-h-full object-contain"
            autoPlay={isHovered}
            muted
            loop
            playsInline
          />
        </div>
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${toneGradient} flex flex-col items-center justify-center p-3 text-center`}>
          <span className="text-white text-xs md:text-sm font-bold line-clamp-3">{strip.title}</span>
          {isSubtitleCustom && (
            <span className="text-white/80 text-[10px] mt-1 line-clamp-2">{strip.subtitle}</span>
          )}
        </div>
      )}
    </div>
  );

  if (strip.link) {
    return (
      <Link to={strip.link} className="block h-full">
        {content}
      </Link>
    );
  }
  return content;
};

export default AdHorizontalStrip;
