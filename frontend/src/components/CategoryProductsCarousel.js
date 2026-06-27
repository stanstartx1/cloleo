import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toAbsoluteMediaUrl } from '../utils/media';

const CARD_WIDTH = 190;
const CARD_GAP = 14;
const LEFT_PANEL_WIDTH = 260;

/* ─── Carte produit ─────────────────────────────────────────────────────────── */
const DropCard = ({ product, isLive }) => {
  const image = product.images?.[0] || product.main_image || product.image || null;
  const imageUrl = image ? toAbsoluteMediaUrl(image) : null;
  const price = product.price
    ? Number(product.price).toLocaleString('fr-FR') + ' FCFA'
    : null;

  return (
    <Link
      to={`/produits/${product.slug || product.id}`}
      style={{
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#fff', borderRadius: '14px',
        overflow: 'hidden',
        width: `${CARD_WIDTH}px`, minWidth: `${CARD_WIDTH}px`, height: '265px',
        textDecoration: 'none', color: 'inherit', flexShrink: 0,
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.28)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
      }}
    >
      {/* Badge */}
      <div style={{ padding: '8px 12px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
        {isLive ? (
          <>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              backgroundColor: '#ff3b3b', display: 'inline-block', flexShrink: 0,
              animation: 'dropsPulse 1.4s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#ff3b3b', letterSpacing: '0.03em' }}>EN DIRECT</span>
          </>
        ) : (
          <span style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.03em' }}>NOUVEAUTÉ</span>
        )}
      </div>

      {/* Image */}
      <div style={{
        width: '100%', height: '148px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f7f7f7', padding: '10px',
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <span style={{ fontSize: '40px', opacity: 0.3 }}>📦</span>
        )}
      </div>

      {/* Séparateur */}
      <div style={{ height: '1px', backgroundColor: '#f0f0f0', margin: '0 12px' }} />

      {/* Nom + Prix */}
      <div style={{ padding: '9px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <p style={{
          margin: 0, fontSize: '12px', fontWeight: 500, color: '#333',
          lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {product.name}
        </p>
        {price && (
          <p style={{
            margin: '6px 0 0', fontSize: '14px', fontWeight: 800,
            color: '#111', letterSpacing: '-0.01em',
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

  /* Catégories parentes actives */
  const parentCategories = useMemo(
    () => categories.filter(c => c && c.is_active !== false && !c.parent_slug),
    [categories]
  );

  /* Catégorie aléatoire stable par session */
  const pickedCategory = useMemo(() => {
    if (!parentCategories.length) return null;
    return parentCategories[Math.floor(Math.random() * parentCategories.length)];
  }, [parentCategories]);

  /* Sous-catégories de cette catégorie */
  const subSlugs = useMemo(() => {
    if (!pickedCategory) return new Set();
    return new Set(
      categories.filter(c => c.parent_slug === pickedCategory.slug).map(c => c.slug)
    );
  }, [categories, pickedCategory]);

  /* Produits catégorie + sous-catégories */
  const categoryProducts = useMemo(() => {
    if (!pickedCategory || !Array.isArray(products)) return [];
    const filtered = products.filter(p =>
      p.category_slug === pickedCategory.slug ||
      p.category_id === pickedCategory.id ||
      subSlugs.has(p.category_slug) ||
      subSlugs.has(p.subcategory_slug)
    );
    return (filtered.length ? filtered : products.slice(0, 12)).slice(0, 16);
  }, [pickedCategory, products, subSlugs]);

  /* Avance d'une carte par seconde */
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
      style={{ width: '100%', background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)', color: '#fff', position: 'relative', overflow: 'hidden', margin: 0, padding: 0 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Corps ── */}
      <div style={{ position: 'relative', minHeight: '320px', display: 'flex', alignItems: 'center' }}>

        {/* Panneau gauche flottant */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${LEFT_PANEL_WIDTH}px`, zIndex: 10,
          background: `linear-gradient(to right, #0d1117 65%, transparent)`,
          padding: '32px 28px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '18px',
        }}>
          {/* Badge DROPS */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', width: 'fit-content' }}>
            <span style={{
              backgroundColor: '#C8F000', color: '#0d1117',
              fontWeight: 900, fontSize: '11px', padding: '3px 9px',
              borderRadius: '4px', letterSpacing: '0.08em',
            }}>DROPS</span>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              backgroundColor: '#ff3b3b', display: 'inline-block',
              animation: 'dropsPulse 1.4s ease-in-out infinite',
            }} />
          </div>

          {/* Titre */}
          <div>
            <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Sélection du moment
            </p>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, lineHeight: 1.15, color: '#fff', letterSpacing: '-0.02em' }}>
              {pickedCategory.name}
            </h2>
          </div>

          {/* Description */}
          <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, maxWidth: '200px' }}>
            Les meilleures pièces de cette catégorie, actualisées à chaque visite. Ne passe pas à côté.
          </p>

          {/* CTA */}
          <Link to={categoryLink} style={{ textDecoration: 'none', marginTop: '4px' }}>
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '10px 18px',
                background: 'rgba(200,240,0,0.12)',
                border: '1px solid rgba(200,240,0,0.35)',
                borderRadius: '8px',
                color: '#C8F000', fontWeight: 700, fontSize: '12px',
                cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(200,240,0,0.2)';
                e.currentTarget.style.borderColor = 'rgba(200,240,0,0.6)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(200,240,0,0.12)';
                e.currentTarget.style.borderColor = 'rgba(200,240,0,0.35)';
              }}
            >
              Voir la sélection <span style={{ fontSize: '14px' }}>→</span>
            </button>
          </Link>
        </div>

        {/* Track des cartes */}
        <div style={{ overflow: 'hidden', paddingLeft: `${LEFT_PANEL_WIDTH - 30}px`, width: '100%' }}>
          <div
            style={{
              display: 'flex', gap: `${CARD_GAP}px`,
              padding: '28px 28px 28px 0',
              transform: `translateX(-${offset}px)`,
              transition: paused ? 'none' : 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform',
            }}
          >
            {loopedProducts.map((product, i) => (
              <DropCard key={`${product.id}-${i}`} product={product} isLive={i % categoryProducts.length === 0} />
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