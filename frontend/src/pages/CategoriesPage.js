import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '../components/ui/skeleton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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
    <div className="min-h-screen py-8" data-testid="categories-page">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex items-center text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-primary">Accueil</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Catégories</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Toutes les catégories</h1>
          <p className="text-muted-foreground">
            Explorez notre sélection de {categories.length} catégories de produits africains authentiques
          </p>
        </div>

        {/* Categories Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.slug}
                to={`/categories/${category.slug}`}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden"
                data-testid={`category-card-${category.slug}`}
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h2 className="text-xl font-bold mb-1 group-hover:text-orange-300 transition-colors">
                    {category.name}
                  </h2>
                  <p className="text-sm text-white/70 mb-3 line-clamp-2">
                    {category.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">
                      {category.product_count} produits
                    </span>
                    <span className="flex items-center gap-1 text-orange-400 group-hover:gap-2 transition-all">
                      Explorer <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Subcategories section */}
        {!loading && categories.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Parcourir par sous-catégorie</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((category) => (
                <div key={category.slug} className="bg-card rounded-xl border border-border p-6">
                  <h3 className="font-bold mb-4">{category.name}</h3>
                  <ul className="space-y-2">
                    {category.subcategories?.slice(0, 4).map((sub) => (
                      <li key={sub.slug}>
                        <Link
                          to={`/categories/${category.slug}?subcategory=${sub.slug}`}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2"
                        >
                          <ArrowRight className="w-3 h-3" />
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesPage;
