import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import HeroSection from '../components/HeroSection';
import FeaturedProducts from '../components/FeaturedProducts';
import SpotlightProducts from '../components/SpotlightProducts';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, newRes] = await Promise.all([
          axios.get(`${API}/categories`),
          axios.get(`${API}/products?sort_by=created_at&sort_order=desc&limit=8`)
        ]);
        setCategories(catRes.data);
        setNewProducts(newRes.data.products || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* New Animated Hero Section */}
      <HeroSection />

      {/* Animated Featured Products Carousel */}
      <FeaturedProducts />

      {/* Categories Grid with Animations */}
      <section className="py-16 bg-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-100/50 to-amber-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold">Parcourir par catégorie</h2>
              <p className="text-muted-foreground mt-1">Trouvez ce que vous cherchez</p>
            </div>
            <Button asChild variant="outline" className="hidden md:flex">
              <Link to="/categories">
                Voir tout <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {categories.map((category, index) => (
                <Link
                  key={category.slug}
                  to={`/categories/${category.slug}`}
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                  data-testid={`category-${category.slug}`}
                >
                  {/* Image */}
                  <img
                    src={category.image || `https://source.unsplash.com/400x300/?${category.name}`}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Hover effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 to-amber-500/0 group-hover:from-orange-500/20 group-hover:to-amber-500/20 transition-all duration-500" />
                  
                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-bold text-lg group-hover:translate-x-1 transition-transform duration-300">
                      {category.name}
                    </h3>
                    <p className="text-white/70 text-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      Explorer <ArrowRight className="w-3 h-3" />
                    </p>
                  </div>
                  
                  {/* Border animation */}
                  <div className="absolute inset-0 border-2 border-white/0 group-hover:border-white/30 rounded-2xl transition-all duration-500" />
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Button asChild variant="outline">
              <Link to="/categories">Voir toutes les catégories</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Spotlight Section - Dark with animations */}
      <SpotlightProducts />

      {/* New Products with Entrance Animations */}
      <section className="py-16 bg-gradient-to-b from-white to-slate-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Nouveautés</h2>
                <p className="text-muted-foreground">Les dernières créations de nos artisans</p>
              </div>
            </div>
            <Button asChild variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hidden md:flex">
              <Link to="/produits?sort_by=created_at">
                Voir tout <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {newProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="opacity-0 animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'forwards' }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Button asChild variant="outline">
              <Link to="/produits?sort_by=created_at">Voir toutes les nouveautés</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Rejoignez notre communauté
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Vendez vos créations à des milliers d'acheteurs passionnés ou découvrez des produits uniques du continent africain.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-orange-600 hover:bg-white/90 rounded-full px-8">
              <Link to="/connexion">
                Commencer à vendre
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 rounded-full px-8">
              <Link to="/categories">
                Explorer la marketplace
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Custom animations */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default HomePage;
