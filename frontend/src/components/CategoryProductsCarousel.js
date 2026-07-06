import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toAbsoluteMediaUrl } from '../utils/media';

const CARD_WIDTH = 260;
const CARD_GAP = 14;
const LEFT_PANEL_WIDTH = 280;

/* ─── Carte produit ─────────────────────────────────────────────────────────── */
const DropCard = ({ product }) => {
  const image = product.images?.[0] || product.main_image || product.image || null;
  const imageUrl = image ? toAbsoluteMediaUrl(image) : null;
  const price = product.price
    ? Number(product.price).toLocaleString('fr-FR') + ' FCFA'
    : null;

  return (
    <Link
      to={`/produit/${product.id}`}
      style={{
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#fff', borderRadius: '18px',
        overflow: 'hidden',
        width: `${CARD_WIDTH}px`, minWidth: `${CARD_WIDTH}px`,
        height: '360px',
        textDecoration: 'none', color: 'inherit', flexShrink: 0,
        boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.35)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.22)';
      }}
    >
      {/* Image — même fond blanc que la carte */}
      <div style={{
        width: '100%', flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#fff',
        padding: '16px 20px 12px',
      }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain', maxHeight: '260px' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <span style={{ fontSize: '48px', opacity: 0.2 }}>📦</span>
        )}
      </div>

      {/* Nom + Prix — sur fond blanc, séparé par une ligne subtile */}
      <div style={{
        padding: '10px 14px 16px',
        borderTop: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        flexShrink: 0,
      }}>
        <p style={{
          margin: 0, fontSize: '13px', fontWeight: 500, color: '#222',
          lineHeight: 1.4, display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          minHeight: '36px',
        }}>
          {product.name}
        </p>
        {price && (
          <p style={{
            margin: '7px 0 0', fontSize: '15px', fontWeight: 800,
            color: '#111', letterSpacing: '-0.02em',
          }}>
            {price}
          </p>
        )}
      </div>
    </Link>
  );
};

/* ─── Composant principal ───────────────────────────────────────────────────── */
const CategoryProductsCarousel = ({ categories, products }) => {
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);

  const parentCategories = useMemo(
    () => categories.filter(c => c && c.is_active !== false && !c.parent_slug),
    [categories]
  );

  const pickedCategory = useMemo(() => {
    if (!parentCategories.length) return null;
    return parentCategories[Math.floor(Math.random() * parentCategories.length)];
  }, [parentCategories]);

  const subSlugs = useMemo(() => {
    if (!pickedCategory) return new Set();
    return new Set(
      categories.filter(c => c.parent_slug === pickedCategory.slug).map(c => c.slug)
    );
  }, [categories, pickedCategory]);

  const categoryProducts = useMemo(() => {
    if (!pickedCategory || !Array.isArray(products)) return [];
    const filtered = products.filter(p =>
      p.category_slug === pickedCategory.slug ||
      p.category_id === pickedCategory.id ||
      subSlugs.has(p.category_slug) ||
      subSlugs.has(p.subcategory_slug)
    );
    let result = filtered.length ? filtered : products.slice(0, 12);
    result = result.slice(0, 16);

    // Ensure we have enough products to fill the row (at least 8 for good coverage)
    if (result.length < 8 && result.length > 0) {
      const multiplier = Math.ceil(8 / result.length);
      result = Array(multiplier).fill(result).flat();
    }

    return result;
  }, [pickedCategory, products, subSlugs]);

  useEffect(() => {
    if (!categoryProducts.length || paused) return;
    const step = CARD_WIDTH + CARD_GAP;
    const maxOffset = categoryProducts.length * step;
    const interval = setInterval(() => {
      setOffset(prev => (prev + step) % maxOffset);
    }, 1800);
    return () => clearInterval(interval);
  }, [categoryProducts, paused]);

  if (!pickedCategory || !categoryProducts.length) return null;

  const categoryLink = pickedCategory.slug ? `/categories/${pickedCategory.slug}` : '/produits';
  const loopedProducts = [...categoryProducts, ...categoryProducts];

  return (
    <section
      style={{
        width: '100%',
        background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div style={{ position: 'relative', minHeight: '440px', display: 'flex', alignItems: 'center' }}>

        {/* Panneau gauche flottant */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${LEFT_PANEL_WIDTH}px`, zIndex: 10,
          background: 'linear-gradient(to right, #0d1117 68%, transparent)',
          padding: '36px 32px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px',
        }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
            <span style={{
              backgroundColor: '#C8F000', color: '#0d1117',
              fontWeight: 900, fontSize: '11px', padding: '3px 10px',
              borderRadius: '5px', letterSpacing: '0.1em',
            }}>DROPS</span>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: '#ff3b3b',
              boxShadow: '0 0 8px #ff3b3b99',
              display: 'inline-block',
              animation: 'dropsPulse 1.4s ease-in-out infinite',
            }} />
          </div>

          {/* Titre */}
          <div>
            <p style={{
              margin: '0 0 6px', fontSize: '10px', fontWeight: 700,
              color: 'rgba(255,255,255,0.35)', letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}>
              Sélection du moment
            </p>
            <h2 style={{
              margin: 0, fontSize: '26px', fontWeight: 900,
              lineHeight: 1.15, color: '#fff', letterSpacing: '-0.025em',
            }}>
              {pickedCategory.name}
            </h2>
          </div>

          <p style={{
            margin: 0, fontSize: '12.5px',
            color: 'rgba(255,255,255,0.38)', lineHeight: 1.7,
          }}>
            Les meilleures pièces de cette catégorie, actualisées à chaque visite. Ne passe pas à côté.
          </p>

          <Link to={categoryLink} style={{ textDecoration: 'none' }}>
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '11px 20px',
                background: 'rgba(200,240,0,0.12)',
                border: '1px solid rgba(200,240,0,0.4)',
                borderRadius: '9px',
                color: '#C8F000', fontWeight: 700, fontSize: '13px',
                cursor: 'pointer', transition: 'all 0.2s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(200,240,0,0.22)';
                e.currentTarget.style.borderColor = 'rgba(200,240,0,0.7)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(200,240,0,0.12)';
                e.currentTarget.style.borderColor = 'rgba(200,240,0,0.4)';
              }}
            >
              Voir la sélection <span>→</span>
            </button>
          </Link>
        </div>

        {/* Carrousel */}
        <div style={{ overflow: 'hidden', paddingLeft: `${LEFT_PANEL_WIDTH - 24}px`, width: '100%' }}>
          <div
            style={{
              display: 'flex',
              gap: `${CARD_GAP}px`,
              padding: '36px 32px 36px 0',
              transform: `translateX(-${offset}px)`,
              transition: paused ? 'none' : 'transform 0.75s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform',
            }}
          >
            {loopedProducts.map((product, i) => (
              <DropCard
                key={`${product.id}-${i}`}
                product={product}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dropsPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(0.75); }
        }
      `}</style>
    </section>
  );
};

export default CategoryProductsCarousel;