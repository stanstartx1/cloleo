import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';

const ProductCarousel = ({ products, limit = 12, interval = 1000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedProducts, setDisplayedProducts] = useState([]);

  useEffect(() => {
    if (!products || products.length === 0) return;

    // Afficher les produits par lots de 'limit'
    const updateDisplay = () => {
      const start = currentIndex * limit;
      const end = start + limit;
      const batch = products.slice(start, end);
      
      // Si on atteint la fin, on recommence au début
      if (batch.length === 0) {
        setCurrentIndex(0);
        setDisplayedProducts(products.slice(0, limit));
      } else {
        setDisplayedProducts(batch);
      }
    };

    updateDisplay();

    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = prev + 1;
        const maxIndex = Math.ceil(products.length / limit);
        return nextIndex >= maxIndex ? 0 : nextIndex;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [products, limit, interval]);

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
