import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Sparkles, Truck, Shield, HeadphonesIcon } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import FeaturedProducts from '../components/FeaturedProducts';
import SpotlightProducts from '../components/SpotlightProducts';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, featuredRes, newRes] = await Promise.all([
          axios.get(`${API}/categories`),
          axios.get(`${API}/products?featured=true&limit=8`),
          axios.get(`${API}/products?sort_by=created_at&sort_order=desc&limit=8`)
        ]);
        setCategories(catRes.data);
        setFeaturedProducts(featuredRes.data.products || []);
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
      {/* Hero Section */}
      <section className="hero-gradient text-white py-16 md:py-24 african-pattern">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Découvrez l'Afrique<br />
              <span className="text-amber-200">authentique</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-xl">
              La marketplace africaine qui connecte artisans, créateurs et acheteurs passionnés du monde entier.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild size="lg" className="bg-white text-orange-600 hover:bg-amber-100">
                <Link to="/categories" data-testid="explore-btn">
                  Explorer les produits <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Link to="/produits?featured=true">
                  <Sparkles className="mr-2 w-5 h-5" /> Tendances
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-8 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4">
              <Truck className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium text-sm">Livraison rapide</p>
                <p className="text-xs text-muted-foreground">Partout en Afrique</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium text-sm">Paiement sécurisé</p>
                <p className="text-xs text-muted-foreground">100% sécurisé</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <HeadphonesIcon className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium text-sm">Support 24/7</p>
                <p className="text-xs text-muted-foreground">À votre écoute</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4">
              <Sparkles className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium text-sm">Produits authentiques</p>
                <p className="text-xs text-muted-foreground">Qualité garantie</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Animated Featured Products Carousel */}
      <FeaturedProducts />

      {/* Categories */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Nos catégories</h2>
              <p className="text-muted-foreground">Explorez notre sélection unique</p>
            </div>
            <Button asChild variant="ghost" className="hidden md:flex">
              <Link to="/categories">
                Voir tout <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.slice(0, 8).map((category) => (
                <Link
                  key={category.slug}
                  to={`/categories/${category.slug}`}
                  className="category-card relative aspect-[4/3] rounded-xl overflow-hidden group"
                  data-testid={`category-${category.slug}`}
                >
                  <img
                    src={category.image}
                    alt={category.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
                    <h3 className="text-white font-bold text-lg">{category.name}</h3>
                    <p className="text-white/70 text-sm">{category.product_count} produits</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6 text-center md:hidden">
            <Button asChild variant="outline">
              <Link to="/categories">Voir toutes les catégories</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Spotlight Section - Dark with animations */}
      <SpotlightProducts />

      {/* Featured Products */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                <Sparkles className="inline w-6 h-6 mr-2 text-amber-500" />
                Produits tendances
              </h2>
              <p className="text-muted-foreground">Les favoris de nos clients</p>
            </div>
            <Button asChild variant="ghost" className="hidden md:flex">
              <Link to="/produits?featured=true">
                Voir tout <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Button asChild variant="outline">
              <Link to="/produits?featured=true">Voir plus de tendances</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* New Products */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Nouveautés</h2>
              <p className="text-muted-foreground">Fraîchement arrivés sur Cloléo</p>
            </div>
            <Button asChild variant="ghost" className="hidden md:flex">
              <Link to="/produits?sort_by=created_at&sort_order=desc">
                Voir tout <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {newProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-12 md:py-16 bg-gradient-to-r from-orange-500 to-amber-500">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Rejoignez la communauté Cloléo
          </h2>
          <p className="text-white/90 mb-8 max-w-xl mx-auto">
            Plus de 10 000 vendeurs et 100 000 clients nous font confiance chaque jour.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-white text-orange-600 hover:bg-amber-100">
              Créer un compte
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              En savoir plus
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
