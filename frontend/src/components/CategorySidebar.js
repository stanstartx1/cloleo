import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, ChevronRight, ShoppingBag } from 'lucide-react';
import { API_URL, API_BASE } from '../config/api';
import CategoryMegaMenu from './CategoryMegaMenu';

const API = API_URL;

const CategorySidebar = () => {
  const [categories, setCategories] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hoveredCategoryData, setHoveredCategoryData] = useState(null);
  const [hoveredSubs, setHoveredSubs] = useState([]);
  const [categorySlideTick, setCategorySlideTick] = useState(0);
  const [menuPosition, setMenuPosition] = useState({ top: 0 });
  const menuRef = React.useRef(null);
  
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

  const handleMouseEnter = (category, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({ top: rect.top - 20 });
    setHoveredCategory(category.slug);
    setHoveredCategoryData(category);
    setHoveredSubs(getSubCategories(category.slug));
  };

  const handleMouseLeave = () => {
    setHoveredCategory(null);
    setHoveredCategoryData(null);
    setHoveredSubs([]);
  };

  const visibleCategories = showAllCategories ? parentCategories : parentCategories.slice(0, MAX_VISIBLE_CATEGORIES);
  const hasMoreCategories = parentCategories.length > MAX_VISIBLE_CATEGORIES;

  if (parentCategories.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden sticky top-24">
      {/* Liste des catégories - Hauteur augmentée */}
      <div className="p-2 max-h-[600px] overflow-y-auto" ref={menuRef}>
        {visibleCategories.map(cat => {
          const subCats = getSubCategories(cat.slug);
          const hasSub = subCats.length > 0;
          
          return (
            <div 
              key={cat.id}
              className="relative"
              onMouseEnter={(e) => hasSub && handleMouseEnter(cat, e)}
              onMouseLeave={handleMouseLeave}
            >
              <Link 
                to={`/categories/${cat.slug}`}
                className="flex items-center justify-between py-3 px-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors group"
              >
                <span className="truncate">{cat.name}</span>
                {hasSub && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 ml-2 text-slate-400 group-hover:text-orange-500" />}
              </Link>
            </div>
          );
        })}
      </div>
      
      {/* Bouton Voir plus */}
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

      {/* Mega-menu qui s'affiche au survol */}
      {hoveredCategory && hoveredCategoryData && (
        <div 
          className="fixed z-50"
          style={{
            left: 'calc(280px + 2rem)',
            top: `${menuPosition.top}px`,
          }}
        >
          <CategoryMegaMenu
            category={hoveredCategoryData}
            subcategories={hoveredSubs}
            onClose={handleMouseLeave}
          />
        </div>
      )}
    </div>
  );
};

export default CategorySidebar;