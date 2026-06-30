import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toAbsoluteMediaUrl } from '../utils/media';

const CARD_WIDTH = 210;
const CARD_GAP = 12;

const CONDITIONS = [
  { key: 'all',          label: 'Tous' },
  { key: 'neuf',         label: 'Neuf' },
  { key: 'occasion',     label: "D'occasion" },
  { key: 'presque_neuf', label: 'Quasi-neuf' },
  { key: 'reconditionne',label: 'Reconditionné' },
];

/* ─── Icône cœur ─────────────────────────────────────────────────────────────── */
const HeartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

/* ─── Carte produit ──────────────────────────────────────────────────────────── */
const OutletCard = ({ product }) => {
  const image = product.images?.[0] || product.main_image || product.image || null;
  const imageUrl = image ? toAbsoluteMediaUrl(image) : null;

  const price = product.price ? Number(product.price) : null;
  const oldPrice = product.original_price || product.compare_price
    || product.old_price || product.price_before || null;
  const oldPriceNum = oldPrice ? Number(oldPrice) : null;

  const savings = (price && oldPriceNum && oldPriceNum > price)
    ? Math.round(oldPriceNum - price)
    : null;

  const fmt = n => Number(n).toLocaleString('fr-FR') + ' FCFA';

  return (
    <Link
      to={`/produit/${product.id}`}
      style={{
        display: 'flex', flexDirection: 'column',
        backgroundColor: '#fff',
        borderRadius: '12px',
        border: '1px solid #e8e8e8',
        overflow: 'hidden',
        width: `${CARD_WIDTH}px`, minWidth: `${CARD_WIDTH}px`,
        textDecoration: 'none', color: 'inherit', flexShrink: 0,
        transition: 'box-shadow 0.2s, transform 0.2s',
        position: 'relative',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.13)';
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Badge économies */}
      {savings && (
        <div style={{
          position: 'absolute', top: '10px', left: '10px', zIndex: 2,
          backgroundColor: '#e30613', color: '#fff',
          fontSize: '11px', fontWeight: 700,
          padding: '3px 8px', borderRadius: '4px',
          letterSpacing: '0.02em',
          whiteSpace: 'nowrap',
        }}>
          Économisez {fmt(savings)}
        </div>
      )}

      {/* Bouton cœur */}
      <button
        onClick={e => e.preventDefault()}
        style={{
          position: 'absolute', top: '10px', right: '10px', zIndex: 2,
          width: '32px', height: '32px', borderRadius: '50%',
          backgroundColor: '#fff', border: '1px solid #ddd',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#999',
          transition: 'color 0.2s, border-color 0.2s',
          padding: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = '#e30613';
          e.currentTarget.style.borderColor = '#e30613';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = '#999';
          e.currentTarget.style.borderColor = '#ddd';
        }}
      >
        <HeartIcon />
      </button>

      {/* Image */}
      <div style={{
        width: '100%', height: '180px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#fff', padding: '32px 16px 12px',
        flexShrink: 0,
      }}>
        {imageUrl ? (
          <img src={imageUrl} alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <span style={{ fontSize: '40px', opacity: 0.2 }}>📦</span>
        )}
      </div>

      {/* Infos */}
      <div style={{
        padding: '10px 14px 16px',
        borderTop: '1px solid #f0f0f0',
        display: 'flex', flexDirection: 'column', gap: '5px',
      }}>
        <p style={{
          margin: 0, fontSize: '13px', color: '#222', fontWeight: 400,
          lineHeight: 1.4, display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          minHeight: '36px',
        }}>
          {product.name}
        </p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
          {price && (
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#111' }}>
              {fmt(price)}
            </span>
          )}
          {oldPriceNum && oldPriceNum > price && (
            <span style={{ fontSize: '12px', color: '#aaa', textDecoration: 'line-through' }}>
              {fmt(oldPriceNum)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

/* ─── Composant principal ───────────────────────────────────────────────────── */
const OutletCarousel = ({ categories, products, excludeSlug = null, onCategoryPick }) => {
  const [activeCondition, setActiveCondition] = useState('all');
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);
  const pickRef = useRef(null);

  /* Catégorie aléatoire parente */
  const parentCategories = useMemo(
    () => categories.filter(c => c && c.is_active !== false && !c.parent_slug),
    [categories]
  );

  const pickedCategory = useMemo(() => {
    if (!parentCategories.length) return null;
    if (pickRef.current) return pickRef.current;

    const pool = excludeSlug
      ? parentCategories.filter(c => c.slug !== excludeSlug)
      : parentCategories;
    const candidates = pool.length ? pool : parentCategories;
    pickRef.current = candidates[Math.floor(Math.random() * candidates.length)];
    return pickRef.current;
  }, [parentCategories, excludeSlug]);

  useEffect(() => {
    if (pickedCategory?.slug && onCategoryPick) {
      onCategoryPick(pickedCategory.slug);
    }
  }, [pickedCategory, onCategoryPick]);

  /* Sous-catégories */
  const subSlugs = useMemo(() => {
    if (!pickedCategory) return new Set();
    return new Set(
      categories.filter(c => c.parent_slug === pickedCategory.slug).map(c => c.slug)
    );
  }, [categories, pickedCategory]);

  /* Produits catégorie + sous-catégories */
  const baseProducts = useMemo(() => {
    if (!pickedCategory || !Array.isArray(products)) return [];
    const filtered = products.filter(p =>
      p.category_slug === pickedCategory.slug ||
      p.category_id === pickedCategory.id ||
      subSlugs.has(p.category_slug) ||
      subSlugs.has(p.subcategory_slug)
    );
    return filtered.length ? filtered : products.slice(0, 16);
  }, [pickedCategory, products, subSlugs]);

  /* Filtrage par condition */
  const filteredProducts = useMemo(() => {
    if (activeCondition === 'all') return baseProducts.slice(0, 16);
    return baseProducts
      .filter(p => {
        const cond = (p.condition || '').toLowerCase().replace(/[-\s]/g, '_');
        if (activeCondition === 'presque_neuf') return cond.includes('presque') || cond.includes('quasi');
        if (activeCondition === 'reconditionne') return cond.includes('recondition');
        return cond === activeCondition;
      })
      .slice(0, 16);
  }, [baseProducts, activeCondition]);

  /* Avance d'une carte par seconde */
  useEffect(() => {
    setOffset(0);
  }, [activeCondition, pickedCategory]);

  useEffect(() => {
    if (!filteredProducts.length || paused) return;
    const step = CARD_WIDTH + CARD_GAP;
    const maxOffset = filteredProducts.length * step;
    const interval = setInterval(() => {
      setOffset(prev => (prev + step) % maxOffset);
    }, 1800);
    return () => clearInterval(interval);
  }, [filteredProducts, paused]);

  if (!pickedCategory || !baseProducts.length) return null;

  const loopedProducts = [...filteredProducts, ...filteredProducts];
  const categoryLink = pickedCategory.slug ? `/categories/${pickedCategory.slug}` : '/produits';

  return (
    <section
      style={{ width: '100%', backgroundColor: '#fff', padding: '28px 0 32px', borderTop: '1px solid #f0f0f0' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="site-container">
        {/* ── En-tête ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#111', letterSpacing: '-0.02em' }}>
            {pickedCategory.name}
          </h2>
          <Link to={categoryLink} style={{
            fontSize: '14px', fontWeight: 600, color: '#0066cc',
            textDecoration: 'none',
          }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
          >
            Voir plus de produits →
          </Link>
        </div>

        {/* ── Filtres de condition ── */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {CONDITIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveCondition(key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                border: activeCondition === key ? '2px solid #0066cc' : '1px solid #ddd',
                backgroundColor: activeCondition === key ? '#e8f0fe' : '#fff',
                color: activeCondition === key ? '#0066cc' : '#444',
                fontSize: '13px', fontWeight: activeCondition === key ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {key === 'all' && '✦ '}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Carrousel ── */}
      <div style={{ overflow: 'hidden', paddingLeft: '24px' }}
        className="site-container-flush"
      >
        <div
          style={{
            display: 'flex',
            gap: `${CARD_GAP}px`,
            transform: `translateX(-${offset}px)`,
            transition: paused ? 'none' : 'transform 0.75s cubic-bezier(0.4, 0, 0.2, 1)',
            willChange: 'transform',
            paddingRight: '24px',
          }}
        >
          {loopedProducts.map((product, i) => (
            <OutletCard key={`${product.id}-${i}`} product={product} />
          ))}
        </div>
      </div>

      <style>{`
        .site-container-flush { width: 100%; overflow: hidden; padding-left: max(24px, calc((100vw - 1400px) / 2)); }
      `}</style>
    </section>
  );
};

export default OutletCarousel;