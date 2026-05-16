import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Sparkles, Grid3X3 } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API}/categories`);
        setCategories(response.data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="min-h-screen" data-testid="categories-page">
      {/* Animated Header */}
      <div className="relative bg-gradient-to-br from-slate-900 via-orange-900/20 to-slate-900 text-white py-20 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '30px 30px'
          }} />
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <nav className="flex items-center text-sm text-slate-400 mb-6">
            <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
            <span className="mx-2">/</span>
            <span className="text-amber-400">Catégories</span>
          </nav>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Grid3X3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">Toutes les catégories</h1>
              <p className="text-slate-400 mt-1">
                {categories.length} univers à explorer
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <Link
                key={category.slug}
                to={`/categories/${category.slug}`}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 opacity-0 animate-[fadeInUp_0.6s_ease-out_forwards]"
                style={{ animationDelay: `${index * 100}ms` }}
                data-testid={`category-card-${category.slug}`}
                onMouseEnter={() => setHoveredCategory(category.slug)}
                onMouseLeave={() => setHoveredCategory(null)}
              >
                {/* Image */}
                <img
                  src={category.image}
                  alt={category.name}
                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
                    hoveredCategory === category.slug ? 'scale-110 brightness-75' : 'scale-100'
                  }`}
                />
                
                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className={`absolute inset-0 bg-gradient-to-r from-orange-500/0 to-amber-500/0 transition-all duration-500 ${
                  hoveredCategory === category.slug ? 'from-orange-500/30 to-amber-500/20' : ''
                }`} />
                
                {/* Decorative corner */}
                <div className={`absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-white/0 transition-all duration-500 ${
                  hoveredCategory === category.slug ? 'border-white/50' : ''
                }`} />
                <div className={`absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-white/0 transition-all duration-500 ${
                  hoveredCategory === category.slug ? 'border-white/50' : ''
                }`} />
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs mb-3 transition-all duration-300 ${
                    hoveredCategory === category.slug ? 'bg-orange-500/50' : ''
                  }`}>
                    <Sparkles className="w-3 h-3" />
                    {category.product_count} produits
                  </div>
                  
                  <h2 className={`text-2xl font-bold mb-2 transition-all duration-300 ${
                    hoveredCategory === category.slug ? 'translate-x-2' : ''
                  }`}>
                    {category.name}
                  </h2>
                  
                  <p className={`text-sm text-white/70 mb-3 line-clamp-2 transition-all duration-300 ${
                    hoveredCategory === category.slug ? 'text-white/90' : ''
                  }`}>
                    {category.description}
                  </p>
                  
                  <div className={`flex items-center gap-2 text-orange-400 font-medium transition-all duration-300 ${
                    hoveredCategory === category.slug ? 'translate-x-2' : ''
                  }`}>
                    Explorer <ArrowRight className={`w-4 h-4 transition-transform duration-300 ${
                      hoveredCategory === category.slug ? 'translate-x-1' : ''
                    }`} />
                  </div>
                </div>
                
                {/* Bottom border animation */}
                <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 ${
                  hoveredCategory === category.slug ? 'w-full' : 'w-0'
                }`} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Animation styles */}
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
