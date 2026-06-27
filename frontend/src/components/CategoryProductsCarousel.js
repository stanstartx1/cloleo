import React, { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toAbsoluteMediaUrl } from '../utils/media';

/* ─── Mini carte produit style "DROPS" ─────────────────────────────────────── */
const DropProductCard = ({ product, isLive }) => {
  const image =
    product.images?.[0] ||
    product.main_image ||
    product.image ||
    null;

  const imageUrl = image ? toAbsoluteMediaUrl(image) : null;

  const price = product.price
    ? Number(product.price).toLocaleString('fr-FR') + ' FCFA'
    : null;

  return (
    <Link
      to={`/produits/${product.slug || product.id}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        borderRadius: '12px',
        overflow: 'hidden',
        minWidth: '150px',
        maxWidth: '150px',
        textDecoration: 'none',
        color: 'inherit',
        flexShrink: 0,
        transition: 'transform 0.18s, box-shadow 0.18s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
      }}
    >
      {/* Badge */}
      <div style={{
        padding: '6px 10px 0 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
      }}>
        {isLive ? (
          <>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              backgroundColor: '#ff3b3b',
              display: 'inline-block',
              flexShrink: 0,
              animation: 'dropsLivePulse 1.4s ease-in-out infinite',
            }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#ff3b3b', whiteSpace: 'nowrap' }}>
              En direct
            </span>
          </>
        ) : (
          <span style={{ fontSize: '10px', color: '#aaa', whiteSpace: 'nowrap' }}>
            ○ Nouveauté
          </span>
        )}
      </div>

      {/* Image */}
      <div style={{
        width: '100%',
        aspectRatio: '1/1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px',
        backgroundColor: '#f9f9f9',
      }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            backgroundColor: '#eee',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
          }}>
            📦
          </div>
        )}
      </div>

      {/* Infos */}
      <div style={{ padding: '8px 10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <p style={{
          fontSize: '11px',
          color: '#222',
          fontWeight: 500,
          lineHeight: 1.35,
          margin: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {product.name}
        </p>
        {price && (
          <p style={{ fontSize: '12px', fontWeight: 700, color: '#111', margin: 0 }}>
            {price}
          </p>
        )}
      </div>
    </Link>
  );
};

/* ─── Composant principal ───────────────────────────────────────────────────── */
const CategoryProductsCarousel = ({ categories, products }) => {
  const scrollRef = useRef(null);

  /* Catégories parentes actives uniquement */
  const parentCategories = useMemo(
    () => categories.filter(c => c && c.is_active !== false && !c.parent_slug),
    [categories]
  );

  /* Catégorie choisie aléatoirement (stable pendant la session) */
  const pickedCategory = useMemo(() => {
    if (!parentCategories.length) return null;
    return parentCategories[Math.floor(Math.random() * parentCategories.length)];
  }, [parentCategories]);

  /* Slugs des sous-catégories de cette catégorie */
  const subSlugs = useMemo(() => {
    if (!pickedCategory) return new Set();
    return new Set(
      categories
        .filter(c => c.parent_slug === pickedCategory.slug)
        .map(c => c.slug)
    );
  }, [categories, pickedCategory]);

  /* Produits de la catégorie ET de ses sous-catégories */
  const categoryProducts = useMemo(() => {
    if (!pickedCategory || !Array.isArray(products)) return [];
    const filtered = products.filter(p =>
      p.category_slug === pickedCategory.slug ||
      p.category_id === pickedCategory.id ||
      subSlugs.has(p.category_slug) ||
      subSlugs.has(p.subcategory_slug)
    );
    /* Fallback : si aucun produit trouvé, on prend les 10 premiers */
    return filtered.length ? filtered.slice(0, 12) : products.slice(0, 10);
  }, [pickedCategory, products, subSlugs]);

  if (!pickedCategory || !categoryProducts.length) return null;

  const categoryLink = pickedCategory.slug
    ? `/categories/${pickedCategory.slug}`
    : '/produits';

  return (
    <section style={{
      width: '100%',
      backgroundColor: '#111',
      color: '#fff',
      overflow: 'hidden',
    }}>
      {/* ── Bandeau top ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '12px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{
          backgroundColor: '#C8F000',
          color: '#111',
          fontWeight: 900,
          fontSize: '12px',
          padding: '2px 9px',
          borderRadius: '4px',
          letterSpacing: '0.06em',
          flexShrink: 0,
        }}>
          DROPS
        </span>
        <span style={{ fontSize: '13px', color: '#C8F000', fontWeight: 600, flexShrink: 0 }}>
          ⚡ Exclusivité du moment
        </span>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
          Nouveautés et meilleures pièces de la catégorie <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{pickedCategory.name}</strong> — sélection actualisée à chaque visite.
        </span>
      </div>

      {/* ── Corps : panneau gauche + produits ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '230px 1fr',
        alignItems: 'stretch',
        minHeight: '230px',
      }}>

        {/* Panneau gauche */}
        <div style={{
          padding: '24px 22px',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '18px',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{
                width: '9px', height: '9px', borderRadius: '50%',
                backgroundColor: '#ff3b3b',
                boxShadow: '0 0 8px #ff3b3b88',
                display: 'inline-block',
                flexShrink: 0,
                animation: 'dropsLivePulse 1.4s ease-in-out infinite',
              }} />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>Lâcher en direct</span>
            </div>

            <h3 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 800,
              lineHeight: 1.2,
              color: '#fff',
            }}>
              {pickedCategory.name}
            </h3>

            <p style={{
              margin: 0,
              fontSize: '12px',
              color: 'rgba(255,255,255,0.5)',
              lineHeight: 1.65,
            }}>
              Des produits triés sur le volet dans cette catégorie — et ses sous-catégories. Ne laisse pas passer ta chance.
            </p>
          </div>

          <Link to={categoryLink} style={{ textDecoration: 'none' }}>
            <button
              style={{
                width: '100%',
                padding: '10px 0',
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: '#fff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Voir toute la sélection →
            </button>
          </Link>
        </div>

        {/* Produits en scroll horizontal */}
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '12px',
            padding: '20px 20px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            alignItems: 'flex-start',
          }}
        >
          {categoryProducts.map((product, i) => (
            <DropProductCard key={product.id} product={product} isLive={i === 0} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes dropsLivePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.85); }
        }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
};

export default CategoryProductsCarousel;