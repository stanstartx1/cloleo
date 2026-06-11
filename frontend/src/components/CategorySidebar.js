import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { API_URL } from '../config/api';
import CategoryMegaMenu from './CategoryMegaMenu';

const API = API_URL;

const CategorySidebar = () => {
  const [categories, setCategories] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [hoveredCategoryData, setHoveredCategoryData] = useState(null);
  const [hoveredSubs, setHoveredSubs] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  
  let hoverTimeout = useRef(null);
  
  const MAX_VISIBLE_CATEGORIES = 12;

  useEffect(() => {
    axios.get(`${API}/categories`)
      .then(res => setCategories(res.data))
      .catch(err => console.error('Erreur chargement catégories:', err));
  }, []);

  const activeCategories = categories.filter(c => c.is_active !== false);
  const parentCategories = activeCategories.filter(c => !c.parent_slug);
  
  const getSubCategories = (parentSlug) => {
    return activeCategories.filter(c => c.parent_slug === parentSlug);
  };

  const handleMouseEnter = (category) => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    
    const subCats = getSubCategories(category.slug);
    setHoveredCategory(category.slug);
    setHoveredCategoryData(category);
    setHoveredSubs(subCats);
    setMenuVisible(true);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setMenuVisible(false);
      setHoveredCategory(null);
      setHoveredCategoryData(null);
      setHoveredSubs([]);
    }, 100);
  };

  const handleMegaMenuMouseEnter = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
  };

  const visibleCategories = showAllCategories ? parentCategories : parentCategories.slice(0, MAX_VISIBLE_CATEGORIES);
  const hasMoreCategories = parentCategories.length > MAX_VISIBLE_CATEGORIES;

  if (parentCategories.length === 0) {
    return null;
  }

  return (
    <>
      {/* Menu des catégories - sticky top-0 pour coller parfaitement en haut */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden sticky top-0 z-40">
        <div className="p-2 max-h-[600px] overflow-y-auto">
          {visibleCategories.map(cat => {
            const subCats = getSubCategories(cat.slug);
            const hasSub = subCats.length > 0;
            
            return (
              <div 
                key={cat.id}
                className="relative"
                onMouseEnter={() => hasSub && handleMouseEnter(cat)}
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

      {/* Mega-menu flottant */}
      {menuVisible && hoveredCategoryData && (
        <div 
          onMouseEnter={handleMegaMenuMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <CategoryMegaMenu
            category={hoveredCategoryData}
            subcategories={hoveredSubs}
            onClose={handleMouseLeave}
          />
        </div>
      )}
    </>
  );
};

export default CategorySidebar;