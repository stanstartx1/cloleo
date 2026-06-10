import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { API_BASE } from '../config/api';

const CategoryMegaMenu = ({ category, subcategories, onClose }) => {
  if (!category) return null;

  const getCategoryImage = () => {
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

  const categoryImage = getCategoryImage();

  // Séparer les sous-catégories en deux colonnes
  const midIndex = Math.ceil(subcategories.length / 2);
  const leftCol = subcategories.slice(0, midIndex);
  const rightCol = subcategories.slice(midIndex);

  // Vérifier s'il y a des sous-catégories
  const hasSubcategories = subcategories.length > 0;

  return (
    <div 
      className="fixed z-[100] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-y-auto animate-fadeIn"
      style={{
        top: '100px',
        left: '300px',
        width: '800px',
        maxWidth: 'calc(100vw - 320px)',
        maxHeight: 'calc(100vh - 120px)',
      }}
      onMouseLeave={onClose}
    >
      {/* Contenu principal en 2 colonnes */}
      <div className="p-8">
        {hasSubcategories ? (
          <div className="grid grid-cols-2 gap-x-12 gap-y-3">
            {/* Colonne gauche */}
            <div className="space-y-2">
              {leftCol.map((sub) => (
                <Link
                  key={sub.id}
                  to={`/categories/${sub.slug}`}
                  className="flex items-center gap-3 py-3 px-4 text-base text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-all duration-200 group"
                  onClick={onClose}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500" />
                  </div>
                  <span className="font-medium">{sub.name}</span>
                </Link>
              ))}
            </div>
            
            {/* Colonne droite */}
            <div className="space-y-2">
              {rightCol.map((sub) => (
                <Link
                  key={sub.id}
                  to={`/categories/${sub.slug}`}
                  className="flex items-center gap-3 py-3 px-4 text-base text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-all duration-200 group"
                  onClick={onClose}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500" />
                  </div>
                  <span className="font-medium">{sub.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <p className="text-lg">Aucune sous-catégorie disponible</p>
            <Link
              to={`/categories/${category.slug}`}
              className="inline-block mt-4 text-orange-500 hover:text-orange-600 font-semibold"
              onClick={onClose}
            >
              Découvrir {category.name} →
            </Link>
          </div>
        )}

        {/* Image de la catégorie en bas */}
        {categoryImage && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <Link
              to={`/categories/${category.slug}`}
              className="block relative rounded-xl overflow-hidden group/image"
              onClick={onClose}
            >
              <img
                src={categoryImage}
                alt={category.name}
                className="w-full h-56 object-cover transition-transform duration-500 group-hover/image:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-6">
                <div className="text-white">
                  <p className="text-xl font-bold">Découvrir toute la sélection</p>
                  <p className="text-sm opacity-90 mt-1">{category.name}</p>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryMegaMenu;