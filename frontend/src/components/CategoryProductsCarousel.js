import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import { Button } from './ui/button';

const CategoryProductsCarousel = ({ categories, products }) => {
  const activeCategories = useMemo(
    () => categories.filter((category) => category && category.is_active !== false),
    [categories]
  );

  const carouselCategory = useMemo(() => {
    if (!activeCategories.length) return null;
    return activeCategories[Math.floor(Math.random() * activeCategories.length)];
  }, [activeCategories]);

  const categoryProducts = useMemo(() => {
    if (!carouselCategory || !Array.isArray(products)) return [];
    const filtered = products.filter((product) => {
      return (
        product.category_slug === carouselCategory.slug ||
        product.category_slug === carouselCategory.category_slug ||
        product.category_id === carouselCategory.id
      );
    });
    return filtered.length ? filtered : products.slice(0, 8);
  }, [carouselCategory, products]);

  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    setCarouselIndex(0);
  }, [carouselCategory?.id]);

  useEffect(() => {
    if (!categoryProducts.length) return undefined;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % categoryProducts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [categoryProducts]);

  const visibleProducts = useMemo(() => {
    if (!categoryProducts.length) return [];
    const length = Math.min(6, categoryProducts.length);
    return Array.from({ length }, (_, idx) =>
      categoryProducts[(carouselIndex + idx) % categoryProducts.length]
    );
  }, [categoryProducts, carouselIndex]);

  if (!carouselCategory || !categoryProducts.length) return null;

  return (
    <section style={{ width: '100%', backgroundColor: '#111', color: '#fff', overflow: 'hidden', padding: '0' }}>

      {/* Bandeau supérieur */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backgroundColor: '#111'
      }}>
        <span style={{
          backgroundColor: '#C8F000',
          color: '#111',
          fontWeight: 900,
          fontSize: '13px',
          padding: '3px 10px',
          borderRadius: '4px',
          letterSpacing: '0.05em'
        }}>
          DROPS
        </span>
        <span style={{ fontSize: '13px', color: '#C8F000', fontWeight: 600 }}>
          ⚡ Exclusivité du moment
        </span>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginLeft: '8px' }}>
          Profitez d'offres limitées et de nouveautés fraîchement débarquées — avant tout le monde.
        </span>
      </div>

      {/* Contenu principal */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        alignItems: 'stretch',
        minHeight: '220px'
      }}>

        {/* Panneau gauche */}
        <div style={{
          padding: '28px 28px',
          borderRight: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '16px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{
                width: '10px', height: '10px', borderRadius: '50%',
                backgroundColor: '#ff3b3b',
                boxShadow: '0 0 6px #ff3b3b',
                display: 'inline-block',
                animation: 'pulse 1.5s infinite'
              }} />
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>Lâcher en direct</span>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6', margin: 0 }}>
              Des produits frais, sélectionnés pour toi. Chaque catégorie révèle ses meilleures pièces — ne laisse pas passer ta chance.
            </p>
          </div>
          <Link to={carouselCategory.slug ? `/categories/${carouselCategory.slug}` : '/produits'}>
            <button style={{
              width: '100%',
              padding: '10px 0',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              color: '#fff',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
              onMouseEnter={e => e.target.style.backgroundColor = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
            >
              Voir la sélection →
            </button>
          </Link>
        </div>

        {/* Cartes produits */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '0',
          padding: '0',
          scrollbarWidth: 'none'
        }}>
          {visibleProducts.map((product, i) => (
            <div
              key={product.id}
              style={{
                minWidth: '160px',
                flex: '1',
                borderRight: '1px solid rgba(255,255,255,0.08)',
                backgroundColor: i === 0 ? '#1a1a1a' : '#111',
                padding: '16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {/* Badge date/live */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {i === 0 ? (
                  <>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: '#ff3b3b',
                      display: 'inline-block'
                    }} />
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>Lâcher en direct</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      ○ Nouveauté
                    </span>
                  </>
                )}
              </div>

              {/* Produit */}
              <div style={{ flex: 1 }}>
                <ProductCard product={product} className="h-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </section>
  );
};

export default CategoryProductsCarousel;