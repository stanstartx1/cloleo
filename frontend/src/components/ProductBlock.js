import React, { useMemo } from 'react';
import ProductCard from './ProductCard';

const ProductBlock = ({ products, limit = 12 }) => {
  const displayProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.slice(0, limit);
  }, [products, limit]);

  if (displayProducts.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-white py-4">
      <div className="site-container">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} className="scale-[0.94]" />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductBlock;
