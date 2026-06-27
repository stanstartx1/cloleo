import React from 'react';
import { Link } from 'react-router-dom';
import { toAbsoluteMediaUrl } from '../utils/media';

const AdStrip = ({ stripId, tone = 'orange', title, subtitle, adStrips = [] }) => {
  const configuredStrip = Array.isArray(adStrips)
    ? adStrips.find((strip) => strip.id === stripId)
    : undefined;
  const strip = {
    title,
    subtitle,
    tone,
    enabled: true,
    media_type: 'none',
    media_url: '',
    link: '',
    ...(configuredStrip || {}),
  };

  const tones = {
    orange: 'from-orange-50 via-amber-50 to-orange-100 border-orange-200',
    blue: 'from-sky-50 via-cyan-50 to-blue-100 border-sky-200',
    green: 'from-emerald-50 via-teal-50 to-green-100 border-emerald-200',
  };

  if (!strip.enabled) return null;

  const mediaUrl = strip.media_url ? toAbsoluteMediaUrl(strip.media_url) : '';
  const content = (
    <div className={`relative min-h-[150px] overflow-hidden rounded-2xl border bg-gradient-to-r ${tones[strip.tone] || tones[tone]} px-5 py-6 md:min-h-[210px] md:px-8 md:py-8`}>
      {strip.media_type === 'image' && mediaUrl && (
        <img src={mediaUrl} alt={strip.title} className="absolute inset-0 h-full w-full object-cover" />
      )}
      {strip.media_type === 'video' && mediaUrl && (
        <video src={mediaUrl} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline />
      )}
      {(strip.media_type === 'image' || strip.media_type === 'video') && mediaUrl && (
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/25 to-transparent" />
      )}
      <div className="relative z-10 flex h-full min-h-[102px] flex-col justify-center md:min-h-[150px]">
        <p className={`text-base font-black md:text-2xl ${(strip.media_type !== 'none' && mediaUrl) ? 'text-white drop-shadow' : 'text-slate-800'}`}>
          {strip.title}
        </p>
        <p className={`mt-2 max-w-2xl text-sm md:text-base ${(strip.media_type !== 'none' && mediaUrl) ? 'text-white/90' : 'text-slate-600'}`}>
          {strip.subtitle}
        </p>
      </div>
    </div>
  );

  return (
    <section className="py-5 bg-white">
      <div className="site-container">
        {strip.link ? (
          strip.link.startsWith('http') ? (
            <a href={strip.link} target="_blank" rel="noopener noreferrer" className="block">
              {content}
            </a>
          ) : (
            <Link to={strip.link} className="block">
              {content}
            </Link>
          )
        ) : content}
      </div>
    </section>
  );
};

export default AdStrip;
