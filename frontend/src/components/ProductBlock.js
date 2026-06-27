import React, { useMemo } from 'react';
import ProductCard from './ProductCard';

const ProductBlock = ({ allProducts, limit = 12, category = null, keywords = [] }) => {
  // Fonction pour mélanger un tableau (Fisher-Yates shuffle)
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const filteredProducts = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [];
    
    let products = [...allProducts];
    
    // Filtrer par catégorie si spécifiée
    if (category) {
      products = products.filter(p => p.category_slug === category);
    }
    
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
    
    // Mélanger pour avoir des résultats différents
    products = shuffleArray(products);
    
    return products.slice(0, limit);
  }, [allProducts, limit, category, keywords]);

  if (filteredProducts.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-white py-4">
      <div className="site-container">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} className="scale-[0.94]" />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductBlock;
