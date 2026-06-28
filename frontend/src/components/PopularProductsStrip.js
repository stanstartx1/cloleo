import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toAbsoluteMediaUrl } from '../utils/media';

/**
 * PopularProductsStrip — Capture 2
 * Bandeau blanc avec titre + produits en grandes images flottantes (sans cartes)
 * Plusieurs instances = plusieurs catégories/titres
 */
const PopularProductsStrip = ({ title, products = [], link }) => {
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);

  const IMG_W = 180;
  const GAP   = 24;

  useEffect(() => {
    if (!products.length || paused) return;
    const step = IMG_W + GAP;
    const max  = products.length * step;
    const t    = setInterval(() => setOffset(p => (p + step) % max), 2000);
    return () => clearInterval(t);
  }, [products, paused]);

  const looped = useMemo(() => [...products, ...products], [products]);

  const getImage = (p) => {
    const img = p?.images?.[0] || p?.main_image || p?.image || null;
    return img ? toAbsoluteMediaUrl(img) : null;
  };

  if (!products.length) return null;

  return (
    <section
      style={{ width: '100%', backgroundColor: '#fafafa', borderTop: '1px solid #ececec', padding: '0 0 8px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* En-tête */}
      <div style={{
        maxWidth: '1400px', margin: '0 auto', padding: '18px 24px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h3 style={{
          margin: 0, fontSize: '16px', fontWeight: 700,
          color: '#111', letterSpacing: '-0.01em',
        }}>
          {title}
        </h3>
        {link && (
          <Link to={link} style={{ fontSize: '13px', color: '#0066cc', fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
          >
            Voir tout &rsaquo;
          </Link>
        )}
      </div>

      {/* Produits — grandes images flottantes, pas de cartes */}
      <div style={{ overflow: 'hidden', paddingLeft: 'max(24px, calc((100vw - 1400px) / 2))' }}>
        <div style={{
          display: 'flex',
          gap: `${GAP}px`,
          alignItems: 'center',
          paddingBottom: '20px',
          paddingRight: '24px',
          transform: `translateX(-${offset}px)`,
          transition: paused ? 'none' : 'transform 0.8s cubic-bezier(0.4,0,0.2,1)',
          willChange: 'transform',
        }}>
          {looped.map((product, i) => {
            const imgUrl = getImage(product);
            return (
              <Link
                key={`${product.id}-${i}`}
                to={`/produit/${product.id}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '8px', textDecoration: 'none', color: 'inherit',
                  minWidth: `${IMG_W}px`, flexShrink: 0,
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{
                  width: `${IMG_W}px`, height: `${IMG_W}px`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  padding: '12px',
                }}>
                  {imgUrl ? (
                    <img src={imgUrl} alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <span style={{ fontSize: '40px', opacity: 0.2 }}>📦</span>
                  )}
                </div>
                <p style={{
                  margin: 0, fontSize: '11px', color: '#333', fontWeight: 500,
                  textAlign: 'center', lineHeight: 1.35,
                  maxWidth: `${IMG_W}px`,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {product.name}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PopularProductsStrip;