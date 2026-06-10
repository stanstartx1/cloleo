import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ShoppingBag } from 'lucide-react';
import { API_BASE } from '../config/api';

const CategoryMegaMenu = ({ category, subcategories, onClose }) => {
  if (!category) return null;

  const getCategoryImage = () => {
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

  const categoryImage = getCategoryImage();

  // Grouper les sous-catégories par groupe (optionnel)
  // Pour l'instant, on les affiche simplement en grille
  const groupedSubs = subcategories || [];

  return (
    <div 
      className="absolute left-full top-0 ml-2 w-[500px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fadeIn"
      onMouseLeave={onClose}
    >
      {/* En-tête avec fond dégradé */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">{category.name}</h3>
            {category.description && (
              <p className="text-white/80 text-xs mt-0.5 line-clamp-1">{category.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contenu principal : sous-catégories + image */}
      <div className="p-5">
        {groupedSubs.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {groupedSubs.map((sub) => (
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
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p>Aucune sous-catégorie disponible</p>
          </div>
        )}

        {/* Image de la catégorie */}
        {categoryImage && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <Link
              to={`/categories/${category.slug}`}
              className="block relative rounded-xl overflow-hidden group/image"
              onClick={onClose}
            >
              <img
                src={categoryImage}
                alt={category.name}
                className="w-full h-36 object-cover transition-transform duration-500 group-hover/image:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
                <div className="text-white">
                  <p className="text-sm font-bold">Découvrir toute la sélection</p>
                  <p className="text-xs opacity-90">{category.name} →</p>
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Footer avec lien "Voir tous les produits" */}
      <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
        <Link
          to={`/categories/${category.slug}`}
          className="flex items-center justify-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
          onClick={onClose}
        >
          Voir tous les produits de {category.name}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default CategoryMegaMenu;