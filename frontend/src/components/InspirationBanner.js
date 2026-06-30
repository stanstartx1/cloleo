import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toAbsoluteMediaUrl } from '../utils/media';

const InspirationBanner = ({ products = [], title = "Trouvez des idées et de l'inspiration pour votre prochaine aventure.", ctaLabel = "Commencez à explorer", ctaLink = "/produits" }) => {

  const picks = useMemo(() => {
    if (!products.length) return [];
    const shuffled = [...products].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }, [products]);

  const getImage = (p) => {
    const img = p?.images?.[0] || p?.main_image || p?.image || null;
    return img ? toAbsoluteMediaUrl(img) : null;
  };

  if (!picks.length) return null;

  return (
    <section style={{
      width: '100%',
      background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 40%, #9333ea 70%, #a855f7 100%)',
      overflow: 'hidden',
      padding: '0',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        minHeight: '220px',
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 24px',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center', gap: '20px',
          padding: '32px 24px 32px 0',
        }}>
          <h2 style={{
            margin: 0, fontSize: '22px', fontWeight: 800,
            color: '#fff', lineHeight: 1.3,
          }}>
            <span style={{ color: '#facc15' }}>Trouvez</span>{' '}
            {title.replace('Trouvez ', '')}
          </h2>
          <Link to={ctaLink} style={{ textDecoration: 'none', width: 'fit-content' }}>
            <button style={{
              padding: '10px 20px',
              backgroundColor: '#fff',
              color: '#4c1d95',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'transform 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {ctaLabel}
            </button>
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gridTemplateRows: '1fr 1fr',
          gap: '4px',
          padding: '12px 0',
        }}>
          {picks.map((product, i) => {
            const imgUrl = getImage(product);
            const dark = i % 2 === 0;
            return (
              <Link
                key={product.id}
                to={`/produit/${product.id}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  padding: '10px',
                  textDecoration: 'none',
                  transition: 'transform 0.18s, background 0.18s',
                  minHeight: '90px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.06)';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.22)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = dark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.12)';
                }}
              >
                {imgUrl ? (
                  <img src={imgUrl} alt={product.name}
                    style={{ maxWidth: '100%', maxHeight: '90px', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <span style={{ fontSize: '32px', opacity: 0.4 }}>📦</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default InspirationBanner;
