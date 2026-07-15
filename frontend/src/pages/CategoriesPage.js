import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Grid3X3, ChevronDown } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';

const API = API_URL;

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [expanded, setExpanded] = useState({});

  const parentCategories = useMemo(
    () => categories.filter((c) => !c.parent_slug),
    [categories]
  );

  const childrenByParent = useMemo(
    () =>
      categories.reduce((acc, cat) => {
        if (cat.parent_slug) {
          acc[cat.parent_slug] = acc[cat.parent_slug] || [];
          acc[cat.parent_slug].push(cat);
        }
        return acc;
      }, {}),
    [categories]
  );

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API}/categories`);
        setCategories(response.data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const toggleExpanded = (slug) => {
    setExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  return (
    <div className="min-h-screen" data-testid="categories-page">
      <div className="relative bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 text-white py-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          />
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '30px 30px'
            }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <nav className="inline-flex items-center text-sm mb-6 px-3 py-2 rounded-md border-2 border-white/30 bg-white/10 text-slate-200">
            <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
            <span className="mx-2 text-white/50">/</span>
            <span className="text-amber-300 font-semibold">Catégories</span>
          </nav>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Grid3X3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="inline-block text-4xl md:text-5xl font-bold px-4 py-2 rounded-md border-2 border-white/30 bg-white/10">
                Toutes les catégories
              </h1>
              <p className="text-slate-400 mt-3">{parentCategories.length} univers à explorer</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {parentCategories.map((category, index) => {
              const subCategories = childrenByParent[category.slug] || [];
              const imageSrc = category.image || category.banner_images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200&auto=format&fit=crop';
              return (
                <Link
                  key={category.slug}
                  to={`/categories/${category.slug}`}
                  className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 opacity-0 animate-[fadeInUp_0.6s_ease-out_forwards]"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={imageSrc}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <h3 className="text-white font-bold text-lg mb-1 line-clamp-1">{category.name}</h3>
                      <p className="text-white/90 text-xs line-clamp-2 mb-2">
                        {category.description || 'Explorez cette catégorie'}
                      </p>
                      {subCategories.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-orange-300 text-xs font-medium">
                          <Grid3X3 className="w-3 h-3" />
                          {subCategories.length} sous-catégories
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                      <ArrowRight className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CategoriesPage;
