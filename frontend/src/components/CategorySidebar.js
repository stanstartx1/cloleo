import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, ChevronRight, ShoppingBag } from 'lucide-react';
import { API_URL, API_BASE } from '../config/api';

const API = API_URL;

const CategorySidebar = () => {
  const [categories, setCategories] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [categorySlideTick, setCategorySlideTick] = useState(0);
  
  const MAX_VISIBLE_CATEGORIES = 12;

  useEffect(() => {
    axios.get(`${API}/categories`)
      .then(res => setCategories(res.data))
      .catch(err => console.error('Erreur chargement catégories:', err));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCategorySlideTick((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const activeCategories = categories.filter(c => c.is_active !== false);
  const parentCategories = activeCategories.filter(c => !c.parent_slug);
  
  const getSubCategories = (parentSlug) => {
    return activeCategories.filter(c => c.parent_slug === parentSlug);
  };

  const getCategoryImage = (category) => {
    const banners = category.banner_images || [];
    if (banners.length > 0) {
      const idx = (categorySlideTick + (category.id || 0)) % banners.length;
      let img = banners[idx];
      if (img && typeof img === 'string' && img.startsWith('/')) img = `${API_BASE}${img}`;
      return img;
    }
    if (category.image) {
      let img = category.image;
      if (img && typeof img === 'string' && img.startsWith('/')) img = `${API_BASE}${img}`;
      return img;
    }
    return null;
  };

  const visibleCategories = showAllCategories ? parentCategories : parentCategories.slice(0, MAX_VISIBLE_CATEGORIES);
  const hasMoreCategories = parentCategories.length > MAX_VISIBLE_CATEGORIES;

  if (parentCategories.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden h-full">
      {/* PAS DE TITRE - Supprimé */}
      
      <div className="p-2 h-full max-h-[700px] overflow-y-auto">
        {visibleCategories.map(cat => {
          const subCats = getSubCategories(cat.slug);
          const hasSub = subCats.length > 0;
          const categoryImage = getCategoryImage(cat);
          
          return (
            <div 
              key={cat.id}
              className="relative"
              onMouseEnter={() => hasSub && setHoveredCategory(cat.slug)}
              onMouseLeave={() => setHoveredCategory(null)}
            >
              <Link 
                to={`/categories/${cat.slug}`}
                className="flex items-center justify-between py-3 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors group"
              >
                <span className="truncate">{cat.name}</span>
                {hasSub && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 ml-2 text-slate-400 group-hover:text-orange-500" />}
              </Link>
              
              {/* Mega-menu au survol */}
              {hasSub && hoveredCategory === cat.slug && (
                <div className="absolute left-full top-0 ml-1 w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2.5">
                    <h4 className="text-white font-bold text-sm">{cat.name}</h4>
                  </div>
                  <div className="p-3 max-h-[300px] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-1">
                      {subCats.map(sub => (
                        <Link
                          key={sub.id}
                          to={`/categories/${sub.slug}`}
                          className="flex items-center gap-2 py-2 px-2 text-sm text-slate-600 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors"
                        >
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{sub.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                  {categoryImage && (
                    <div className="border-t border-slate-100 p-2 bg-slate-50">
                      <Link to={`/categories/${cat.slug}`} className="block relative rounded-lg overflow-hidden">
                        <img src={categoryImage} alt={cat.name} className="w-full h-24 object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                          <span className="text-white text-xs font-bold">Découvrir →</span>
                        </div>
                      </Link>
                    </div>
                  )}
                  <div className="border-t border-slate-100 p-2 bg-white text-center">
                    <Link to={`/categories/${cat.slug}`} className="text-xs font-semibold text-orange-600">Voir tous les produits →</Link>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {hasMoreCategories && (
        <button
          onClick={() => setShowAllCategories(!showAllCategories)}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors border-t border-slate-100"
        >
          {showAllCategories ? (
            <>Voir moins <ChevronDown className="w-4 h-4" /></>
          ) : (
            <>Voir plus ({parentCategories.length - MAX_VISIBLE_CATEGORIES}) <ChevronDown className="w-4 h-4" /></>
          )}
        </button>
      )}
    </div>
  );
};

export default CategorySidebar;