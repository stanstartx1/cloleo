import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ProductCard from './ProductCard';
import { API_URL } from '../config/api';

const API = API_URL;

const ProductBlock = ({ title, limit = 12, category = null, keywords = [] }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let params = { limit: '100' };
        
        if (category) {
          params.category = category;
        }
        
        if (keywords.length > 0) {
          params.search = keywords.join(' ');
        }
        
        const response = await axios.get(`${API}/products`, { params });
        let allProducts = response.data?.products || response.data || [];
        
        // Mélanger les produits pour avoir des résultats différents à chaque chargement
        allProducts = shuffleArray(allProducts);
        
        setProducts(allProducts.slice(0, limit));
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [limit, category, keywords]);

  // Fonction pour mélanger un tableau (Fisher-Yates shuffle)
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  if (loading) {
    return (
      <section className="w-full bg-white py-4">
        <div className="site-container">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
            {[...Array(limit)].map((_, i) => (
              <div key={i} className="bg-white p-2">
                <div className="aspect-square bg-slate-200 rounded-xl animate-pulse" />
                <div className="mt-2 h-4 bg-slate-200 rounded animate-pulse" />
                <div className="mt-2 h-4 w-20 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-white py-4">
      <div className="site-container">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} className="scale-[0.94]" />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductBlock;
