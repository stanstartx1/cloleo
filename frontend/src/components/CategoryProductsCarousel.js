import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toAbsoluteMediaUrl } from '../utils/media';

const CARD_WIDTH = 160;
const CARD_GAP = 12;
const LEFT_PANEL_WIDTH = 240;

/* ─── Carte produit taille fixe ─────────────────────────────────────────────── */
const DropCard = ({ product, isLive }) => {
  const image = product.images?.[0] || product.main_image || product.image || null;
  const imageUrl = image ? toAbsoluteMediaUrl(image) : null;
  const price = product.price ? Number(product.price).toLocaleString('fr-FR') + ' FCFA' : null;

  return (
    <Link
      to={`/produits/${product.slug || product.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        borderRadius: '12px',
        overflow: 'hidden',
        width: `${CARD_WIDTH}px`,
        minWidth: `${CARD_WIDTH}px`,
        height: '220px',
        textDecoration: 'none',
        color: 'inherit',
        flexShrink: 0,
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        transition: 'transform 0.18s, box-shadow 0.18s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.22)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.15)';
      }}
    >
      {/* Badge */}
      <div style={{ padding: '7px 10px 0', display: 'flex', alignItems: 'center', gap: '5px' }}>
        {isLive ? (
          <>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              backgroundColor: '#ff3b3b', display: 'inline-block', flexShrink: 0,
              animation: 'dropsPulse 1.4s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#ff3b3b', whiteSpace: 'nowrap' }}>En direct</span>
          </>
        ) : (
          <span style={{ fontSize: '10px', color: '#bbb', whiteSpace: 'nowrap' }}>○ Nouveauté</span>
        )}
      </div>

      {/* Image — taille fixe */}
      <div style={{
        width: '100%', height: '120px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f5f5f5', padding: '8px',
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <span style={{ fontSize: '32px' }}>📦</span>
        )}
      </div>

      {/* Texte */}
      <div style={{ padding: '6px 10px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', overflow: 'hidden' }}>
        <p style={{
          margin: 0, fontSize: '11px', fontWeight: 500, color: '#222',
          lineHeight: 1.35, display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {product.name}
        </p>
        {price && (
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#111' }}>{price}</p>
        )}
      </div>
    </Link>
  );
};

/* ─── Composant principal ───────────────────────────────────────────────────── */
const CategoryProductsCarousel = ({ categories, products }) => {
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef(null);

  /* Catégories parentes actives */
  const parentCategories = useMemo(
    () => categories.filter(c => c && c.is_active !== false && !c.parent_slug),
    [categories]
  );

  /* Catégorie aléatoire (stable par session) */
  const pickedCategory = useMemo(() => {
    if (!parentCategories.length) return null;
    return parentCategories[Math.floor(Math.random() * parentCategories.length)];
  }, [parentCategories]);

  /* Sous-catégories */
  const subSlugs = useMemo(() => {
    if (!pickedCategory) return new Set();
    return new Set(categories.filter(c => c.parent_slug === pickedCategory.slug).map(c => c.slug));
  }, [categories, pickedCategory]);

  /* Produits de la catégorie + sous-catégories */
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
    const maxOffset = categoryProducts.length * (CARD_WIDTH + CARD_GAP);
    const interval = setInterval(() => {
      setOffset(prev => (prev + CARD_WIDTH + CARD_GAP) % maxOffset);
    }, 1000);
    return () => clearInterval(interval);
  }, [categoryProducts, paused]);

  if (!pickedCategory || !categoryProducts.length) return null;

  const categoryLink = pickedCategory.slug ? `/categories/${pickedCategory.slug}` : '/produits';

  /* On duplique les produits pour l'effet infini */
  const loopedProducts = [...categoryProducts, ...categoryProducts];

  return (
    <section
      style={{ width: '100%', backgroundColor: '#111', color: '#fff', position: 'relative', overflow: 'hidden' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Bandeau top ── */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px',
        padding: '11px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{
          backgroundColor: '#C8F000', color: '#111', fontWeight: 900,
          fontSize: '12px', padding: '2px 9px', borderRadius: '4px', letterSpacing: '0.06em',
        }}>DROPS</span>
        <span style={{ fontSize: '13px', color: '#C8F000', fontWeight: 600 }}>⚡ Exclusivité du moment</span>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          Sélection <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{pickedCategory.name}</strong> — actualisée à chaque visite.
        </span>
      </div>

      {/* ── Corps ── */}
      <div style={{ position: 'relative', minHeight: '270px' }}>

        {/* Panneau gauche — flottant par-dessus les cartes */}
        <div style={{
          position: 'absolute', top: 0, left: 0, bottom: 0,
          width: `${LEFT_PANEL_WIDTH}px`,
          zIndex: 10,
          background: 'linear-gradient(to right, #111 78%, transparent)',
          padding: '22px 20px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff3b3b',
                display: 'inline-block', flexShrink: 0,
                animation: 'dropsPulse 1.4s ease-in-out infinite',
              }} />
              <span style={{ fontWeight: 700, fontSize: '13px' }}>Lâcher en direct</span>
            </div>
            <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, lineHeight: 1.2, color: '#fff' }}>
              {pickedCategory.name}
            </h3>
            <p style={{ margin: 0, fontSize: '11.5px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              Les meilleures pièces de cette catégorie et ses sous-catégories. Ne laisse pas passer ta chance.
            </p>
          </div>

          <Link to={categoryLink} style={{ textDecoration: 'none' }}>
            <button
              style={{
                width: '100%', padding: '9px 0',
                border: '1px solid rgba(255,255,255,0.18)', borderRadius: '8px',
                backgroundColor: 'transparent', color: '#fff',
                fontWeight: 600, fontSize: '12px', cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Voir toute la sélection →
            </button>
          </Link>
        </div>

        {/* Track des cartes — commence sous le panneau gauche */}
        <div style={{ overflow: 'hidden', paddingLeft: `${LEFT_PANEL_WIDTH - 20}px` }}>
          <div
            ref={trackRef}
            style={{
              display: 'flex',
              gap: `${CARD_GAP}px`,
              padding: '24px 24px 24px 0',
              transform: `translateX(-${offset}px)`,
              transition: paused ? 'none' : 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
              willChange: 'transform',
            }}
          >
            {loopedProducts.map((product, i) => (
              <DropCard key={`${product.id}-${i}`} product={product} isLive={i === 0} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dropsPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.8); }
        }
      `}</style>
    </section>
  );
};

export default CategoryProductsCarousel;