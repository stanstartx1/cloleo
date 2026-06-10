import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ShoppingBag, Star } from 'lucide-react';
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

  // Séparer les sous-catégories en deux colonnes pour un meilleur affichage
  const midIndex = Math.ceil(subcategories.length / 2);
  const leftCol = subcategories.slice(0, midIndex);
  const rightCol = subcategories.slice(midIndex);

  return (
    <div 
      className="fixed z-[100] w-[700px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fadeIn"
      style={{
        top: '120px',
        left: '320px',
        maxHeight: 'calc(100vh - 140px)',
        overflowY: 'auto',
      }}
      onMouseLeave={onClose}
    >
      {/* En-tête avec fond dégradé et infos */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-xl">{category.name}</h3>
            {category.description && (
              <p className="text-white/80 text-sm mt-0.5 line-clamp-1">{category.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contenu principal en 2 colonnes */}
      <div className="p-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
          {/* Colonne gauche */}
          <div className="space-y-1">
            {leftCol.map((sub) => (
              <Link
                key={sub.id}
                to={`/categories/${sub.slug}`}
                className="flex items-center gap-2 py-2 px-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors group"
                onClick={onClose}
              >
                <div className="w-6 h-6 rounded bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500" />
                </div>
                <span className="font-medium">{sub.name}</span>
              </Link>
            ))}
          </div>
          
          {/* Colonne droite */}
          <div className="space-y-1">
            {rightCol.map((sub) => (
              <Link
                key={sub.id}
                to={`/categories/${sub.slug}`}
                className="flex items-center gap-2 py-2 px-2 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors group"
                onClick={onClose}
              >
                <div className="w-6 h-6 rounded bg-slate-100 group-hover:bg-orange-100 flex items-center justify-center">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500" />
                </div>
                <span className="font-medium">{sub.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Image de la catégorie en bas - plus grande */}
        {categoryImage && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              to={`/categories/${category.slug}`}
              className="block relative rounded-xl overflow-hidden group/image"
              onClick={onClose}
            >
              <img
                src={categoryImage}
                alt={category.name}
                className="w-full h-48 object-cover transition-transform duration-500 group-hover/image:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-5">
                <div className="text-white">
                  <p className="text-lg font-bold">Découvrir toute la sélection</p>
                  <p className="text-sm opacity-90 flex items-center gap-1">
                    {category.name} <ChevronRight className="w-4 h-4" />
                  </p>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Footer avec lien "Voir tous les produits" */}
      <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
        <Link
          to={`/categories/${category.slug}`}
          className="flex items-center justify-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          onClick={onClose}
        >
          <Star className="w-4 h-4" />
          Voir tous les produits de {category.name}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default CategoryMegaMenu;