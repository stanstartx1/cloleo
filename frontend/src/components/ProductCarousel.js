import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';

const ProductCarousel = ({ allProducts, limit = 12, keywords = [], interval = 1000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedProducts, setDisplayedProducts] = useState([]);

  // Fonction pour mélanger un tableau
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Filtrer et mélanger les produits
  const getFilteredProducts = () => {
    if (!allProducts || allProducts.length === 0) return [];
    
    let products = [...allProducts];
    
    // Filtrer par mots-clés si spécifiés
    if (keywords.length > 0) {
      const keywordList = keywords.map(k => k.toLowerCase());
      products = products.filter(product => {
        const haystack = [
          product.name,
          product.category_name,
          product.category_slug,
          product.subcategory_name,
          product.subcategory_slug,
          ...(product.tags || [])
        ].filter(Boolean).join(' ').toLowerCase();
        return keywordList.some(k => haystack.includes(k));
      });
    }
    
    return shuffleArray(products);
  };

  useEffect(() => {
    const filtered = getFilteredProducts();
    if (filtered.length === 0) return;

    // Afficher les produits par lots de 'limit'
    const updateDisplay = () => {
      const start = currentIndex * limit;
      const end = start + limit;
      const batch = filtered.slice(start, end);
      
      // Si on atteint la fin, on recommence au début
      if (batch.length === 0) {
        setCurrentIndex(0);
        setDisplayedProducts(filtered.slice(0, limit));
      } else {
        setDisplayedProducts(batch);
      }
    };

    updateDisplay();

    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = prev + 1;
        const maxIndex = Math.ceil(filtered.length / limit);
        return nextIndex >= maxIndex ? 0 : nextIndex;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [allProducts, limit, keywords, interval]);

  if (displayedProducts.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-white py-4">
      <div className="site-container">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {displayedProducts.map((product) => (
            <ProductCard key={`${product.id}-${currentIndex}`} product={product} className="scale-[0.94]" />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductCarousel;
