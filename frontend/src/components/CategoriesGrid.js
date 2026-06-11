import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Skeleton } from './ui/skeleton';
import { API_URL, API_BASE } from '../config/api';

const API = API_URL;

const CategoriesGrid = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/categories`);
      // Filtrer pour n'avoir que les catégories parentes (sans parent_slug)
      const parentCategories = response.data.filter(
        cat => cat.is_active !== false && !cat.parent_slug
      );
      setCategories(parentCategories);
    } catch (error) {
      console.error('Erreur chargement catégories:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryImage = (category) => {
    // Priorité aux banner_images, puis à l'image principale
    const banners = category.banner_images || [];
    if (banners.length > 0) {
      let img = banners[0];
      if (img && typeof img === 'string' && img.startsWith('/')) {
        img = `${API_BASE}${img}`;
      }
      return img;
    }
    if (category.image) {
      let img = category.image;
      if (img && typeof img === 'string' && img.startsWith('/')) {
        img = `${API_BASE}${img}`;
      }
      return img;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4 mx-auto mt-3" />
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-5">
      {categories.map((category) => {
        const imageUrl = getCategoryImage(category);
        const subCount = category.subcategories_count || 0;
        
        return (
          <Link
            key={category.id}
            to={`/categories/${category.slug}`}
            className="group flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1"
          >
            {/* Conteneur image - format carré avec bord arrondi */}
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 shadow-md group-hover:shadow-xl transition-all duration-300">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={category.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-amber-100">
                  <span className="text-4xl font-bold text-orange-300">
                    {category.name?.charAt(0).toUpperCase() || 'C'}
                  </span>
                </div>
              )}
              
              {/* Overlay subtil au survol */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>
            
            {/* Nom de la catégorie */}
            <h3 className="mt-3 text-sm md:text-base font-semibold text-slate-700 group-hover:text-orange-600 transition-colors line-clamp-1">
              {category.name}
            </h3>
            
            {/* Nombre de produits (optionnel) */}
            {subCount > 0 && (
              <p className="text-xs text-slate-400 mt-0.5">
                {subCount} produit{subCount > 1 ? 's' : ''}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default CategoriesGrid;