import React from 'react';
import { Link } from 'react-router-dom';

/**
 * PromoBannerGrid — Capture 3
 * Grille de bannières promo :
 *  - rangée du haut : 1 grande bannière + 1 bannière medium + 1 bannière large
 *  - rangée du bas  : 5 petites bannières carrées
 */
const PromoBannerGrid = ({ topBanners = [], bottomBanners = [] }) => {
  if (!topBanners.length && !bottomBanners.length) return null;

  const BannerCard = ({ item, style = {} }) => (
    <Link
      to={item.link || '#'}
      style={{
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end',
        borderRadius: '14px',
        overflow: 'hidden',
        textDecoration: 'none',
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Image de fond ou couleur */}
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.title}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: item.gradient || item.bgColor || 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        }} />
      )}

      {/* Overlay dégradé bas */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent)',
        zIndex: 1,
      }} />

      {/* Contenu */}
      <div style={{ position: 'relative', zIndex: 2, padding: '14px 16px' }}>
        {item.badge && (
          <span style={{
            display: 'inline-block', backgroundColor: '#f97316',
            color: '#fff', fontSize: '10px', fontWeight: 800,
            padding: '2px 8px', borderRadius: '20px',
            letterSpacing: '0.05em', marginBottom: '6px',
          }}>
            {item.badge}
          </span>
        )}
        {item.brand && (
          <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {item.brand}
          </p>
        )}
        {item.title && (
          <p style={{ margin: 0, fontSize: item.large ? '18px' : '14px', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
            {item.title}
          </p>
        )}
        {item.cta && (
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
            {item.cta} &rsaquo;
          </p>
        )}
      </div>
    </Link>
  );

  return (
    <section style={{ width: '100%', backgroundColor: '#fff', padding: '20px 0 24px', borderTop: '1px solid #f0f0f0' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Rangée du haut — bannières larges */}
        {topBanners.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${topBanners.length}, 1fr)`, gap: '12px' }}>
            {topBanners.map((item, i) => (
              <BannerCard key={i} item={item} style={{ height: '160px' }} />
            ))}
          </div>
        )}

        {/* Rangée du bas — petites bannières carrées */}
        {bottomBanners.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${bottomBanners.length}, 1fr)`, gap: '12px' }}>
            {bottomBanners.map((item, i) => (
              <BannerCard key={i} item={item} style={{ height: '120px' }} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PromoBannerGrid;