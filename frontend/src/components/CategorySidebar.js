import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import * as LucideIcons from 'lucide-react';
import { ChevronRight, Tag } from 'lucide-react';
import { API_URL, API_BASE } from '../config/api';
import CategoryMegaMenu from './CategoryMegaMenu';

const API = API_URL;

const CategoryIcon = ({ category }) => {
  const iconName = category.icon;
  const IconComponent = iconName && LucideIcons[iconName] ? LucideIcons[iconName] : Tag;

  if (category.image) {
    const src = category.image.startsWith('/') ? `${API_BASE}${category.image}` : category.image;
    return (
      <img
        src={src}
        alt=""
        className="w-5 h-5 object-contain flex-shrink-0 opacity-70"
      />
    );
  }

  return <IconComponent className="w-4 h-4 flex-shrink-0 text-slate-400" strokeWidth={1.75} />;
};

const CategorySidebar = () => {
  const [categories, setCategories] = useState([]);
  const [hoveredCategoryData, setHoveredCategoryData] = useState(null);
  const [hoveredSubs, setHoveredSubs] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);

  const hoverTimeout = useRef(null);

  useEffect(() => {
    axios
      .get(`${API}/categories`)
      .then((res) => setCategories(res.data))
      .catch((err) => console.error('Erreur chargement catégories:', err));
  }, []);

  const activeCategories = categories.filter((c) => c.is_active !== false);
  const parentCategories = activeCategories.filter((c) => !c.parent_slug);

  const getSubCategories = (parentSlug) =>
    activeCategories.filter((c) => c.parent_slug === parentSlug);

  const handleMouseEnter = (category) => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    const subCats = getSubCategories(category.slug);
    setHoveredCategoryData(category);
    setHoveredSubs(subCats);
    setMenuVisible(subCats.length > 0);
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setMenuVisible(false);
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

  if (parentCategories.length === 0) {
    return null;
  }

  return (
    <>
      <div className="category-sidebar-panel bg-white border border-gray-200 rounded-sm overflow-hidden h-full max-h-full flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto">
          {parentCategories.map((cat) => {
            const subCats = getSubCategories(cat.slug);
            const hasSub = subCats.length > 0;

            return (
              <div
                key={cat.id}
                className="relative border-b border-gray-100 last:border-b-0"
                onMouseEnter={() => hasSub && handleMouseEnter(cat)}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  to={`/categories/${cat.slug}`}
                  className="flex items-center gap-2.5 py-2.5 px-3 text-[13px] font-bold text-gray-800 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
                >
                  <CategoryIcon category={cat} />
                  <span className="flex-1 truncate">{cat.name}</span>
                  {hasSub && (
                    <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-gray-300 group-hover:text-blue-400" />
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {menuVisible && hoveredCategoryData && (
        <div onMouseEnter={handleMegaMenuMouseEnter} onMouseLeave={handleMouseLeave}>
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
