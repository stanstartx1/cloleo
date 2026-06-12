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
          <div className="space-y-5">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {parentCategories.map((category, index) => {
              const subCategories = childrenByParent[category.slug] || [];
              const isOpen = !!expanded[category.slug];
              const imageSrc = category.image || category.banner_images?.[0] || 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=1200&auto=format&fit=crop';
              return (
                <div
                  key={category.slug}
                  className="rounded-2xl overflow-hidden border border-border bg-card opacity-0 animate-[fadeInUp_0.6s_ease-out_forwards]"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <div className="relative min-h-[148px]">
                    <img
                      src={imageSrc}
                      alt={category.name}
                      className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${
                        hoveredCategory === category.slug ? 'scale-105' : 'scale-100'
                      }`}
                    />

                    <div className="relative z-10 p-5 md:p-6 flex items-start md:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="inline-block text-2xl font-bold text-slate-900 truncate px-3 py-1.5 rounded-md border-2 border-white/90 bg-white/90 shadow-sm">
                          {category.name}
                        </h2>
                        <p className="text-sm text-slate-800 mt-3 max-w-xl px-3 py-1.5 rounded-md border border-white/80 bg-white/85 line-clamp-2">
                          {category.description || 'Explorez cette catégorie.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/categories/${category.slug}`}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                          onMouseEnter={() => setHoveredCategory(category.slug)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        >
                          Explorer <ArrowRight className="w-4 h-4" />
                        </Link>
                        {subCategories.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(category.slug)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 text-white hover:bg-white/25 transition-colors"
                          >
                            Sous-catégories
                            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isOpen && subCategories.length > 0 && (
                    <div className="p-4 md:p-5 bg-muted/20 border-t border-border">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {subCategories.map((sub) => (
                          <Link
                            key={sub.slug}
                            to={`/categories/${sub.slug}`}
                            className="group rounded-xl border border-border bg-background p-3 hover:border-orange-400/50 hover:bg-orange-50/40 transition-colors"
                          >
                            <p className="font-semibold text-sm group-hover:text-orange-600 transition-colors">{sub.name}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sub.description || 'Voir les produits de cette sous-catégorie.'}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
