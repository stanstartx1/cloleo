import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Filter, ChevronDown, Grid3X3, List, SlidersHorizontal, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Slider } from '../components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { useInfiniteScroll } from '../components/InfiniteScroll';

const API = API_URL;

const CONDITIONS = [
  { value: 'neuf', label: 'Neuf' },
  { value: 'quasi-neuf', label: 'Quasi-neuf' },
  { value: 'occasion', label: 'Occasion' },
];
const LOCATIONS = [
  { value: "Côte d'Ivoire", label: "Côte d'Ivoire" },
  { value: 'Sénégal', label: 'Sénégal' },
  { value: 'Nigeria', label: 'Nigeria' },
  { value: 'Cameroun', label: 'Cameroun' },
  { value: 'Ghana', label: 'Ghana' },
];
const SORT_OPTIONS = [
  { value: 'created_at-desc', label: 'Plus récents' },
  { value: 'created_at-asc', label: 'Plus anciens' },
  { value: 'price_fcfa-asc', label: 'Prix croissant' },
  { value: 'price_fcfa-desc', label: 'Prix décroissant' },
  { value: 'sales_count-desc', label: 'Plus populaires' },
  { value: 'rating-desc', label: 'Mieux notés' },
];

const CategoryPage = () => {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
 
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
 
  // Filters
  const [conditions, setConditions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 200000]);
  const [sortBy, setSortBy] = useState('created_at-desc');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid');

  // Banner Slider State
  const [currentBanner, setCurrentBanner] = useState(0);

  const fetchCategory = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/categories/${slug}`);
      setCategory(response.data);
    } catch (error) {
      console.error('Error fetching category:', error);
    }
  }, [slug]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [sort, order] = sortBy.split('-');
      const params = new URLSearchParams({
        category: slug,
        sort_by: sort,
        sort_order: order,
        page: page.toString(),
        limit: '20',
      });
      if (conditions.length > 0) {
        params.set('condition', conditions.join(','));
      }
      if (locations.length > 0) {
        params.set('location', locations.join(','));
      }
      if (priceRange[0] > 0) {
        params.set('min_price', priceRange[0].toString());
      }
      if (priceRange[1] < 200000) {
        params.set('max_price', priceRange[1].toString());
      }
      const response = await axios.get(`${API}/products?${params}`);
      setProducts(response.data.products || []);
      setTotalProducts(response.data.total || 0);
      setTotalPages(response.data.total_pages || 1);
      setHasMore(page < (response.data.total_pages || 1));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [slug, sortBy, page, conditions, locations, priceRange]);

  // Load more products for infinite scroll
  const loadMoreProducts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
   
    setLoadingMore(true);
    try {
      const [sortField, sortOrder] = sortBy.split('-');
      const params = new URLSearchParams({
        category: slug || '',
        page: page + 1,
        limit: 12,
        sort_by: sortField,
        sort_order: sortOrder,
      });
     
      if (conditions.length > 0) params.append('condition', conditions.join(','));
      if (locations.length > 0) params.append('location', locations.join(','));
      if (priceRange[0] > 0) params.append('min_price', priceRange[0]);
      if (priceRange[1] < 200000) params.append('max_price', priceRange[1]);
     
      const response = await axios.get(`${API}/products?${params}`);
      const newProducts = response.data.products || [];
     
      setProducts(prev => [...prev, ...newProducts]);
      setPage(prev => prev + 1);
      setHasMore(page + 1 < (response.data.total_pages || 1));
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [slug, sortBy, page, conditions, locations, priceRange, loadingMore, hasMore]);

  const loadMoreRef = useInfiniteScroll(loadMoreProducts, hasMore, loadingMore);

  // Banner Auto Slide
  useEffect(() => {
    if (!category?.banner_images || category.banner_images.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % category.banner_images.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [category?.banner_images]);

  useEffect(() => {
    fetchCategory();
  }, [fetchCategory]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchProducts();
  }, [slug, sortBy, conditions, locations, priceRange]);

  const toggleCondition = (value) => {
    setConditions((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
    setPage(1);
  };

  const toggleLocation = (value) => {
    setLocations((prev) =>
      prev.includes(value) ? prev.filter((l) => l !== value) : [...prev, value]
    );
    setPage(1);
  };

  const clearFilters = () => {
    setConditions([]);
    setLocations([]);
    setPriceRange([0, 200000]);
    setSortBy('created_at-desc');
    setPage(1);
  };

  const hasActiveFilters = conditions.length > 0 || locations.length > 0 || priceRange[0] > 0 || priceRange[1] < 200000;

  const banners = category?.banner_images || [];
  const filterProps = {
    conditions,
    locations,
    priceRange,
    setPriceRange,
    toggleCondition,
    toggleLocation,
    clearFilters,
    hasActiveFilters,
  };

  return (
    <div className="min-h-screen" data-testid="category-page">
      {/* Banner Slider */}
      {banners.length > 0 && (
        <div className="relative h-[420px] overflow-hidden">
          {banners.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={category?.name}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${idx === currentBanner ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}

          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black/80" />

          <div className="absolute inset-0 flex items-center">
            <div className="container mx-auto px-4 relative z-10">
              <nav className="flex items-center text-sm text-white/70 mb-6">
                <Link to="/" className="hover:text-white transition-colors">Accueil</Link>
                <span className="mx-2">/</span>
                <Link to="/categories" className="hover:text-white transition-colors">Catégories</Link>
                <span className="mx-2">/</span>
                <span className="text-amber-400 font-medium">{category?.name || slug}</span>
              </nav>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {category?.name}
              </h1>
              {category?.description && (
                <p className="text-white/90 text-lg max-w-2xl">{category.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4">
                <span className="px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm">
                  {totalProducts} produits
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          {banners.length > 1 && (
            <>
              <button 
                onClick={() => setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length)}
                className="absolute left-6 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all z-20"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setCurrentBanner(prev => (prev + 1) % banners.length)}
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all z-20"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentBanner(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${idx === currentBanner ? 'bg-white scale-125' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Subcategories */}
      {category?.subcategories && category.subcategories.length > 0 && (
        <div className="bg-white border-b py-4 sticky top-16 z-20 shadow-sm">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-muted-foreground mr-2">Sous-catégories :</span>
              {category.subcategories.map((sub, index) => (
                <Link
                  key={sub.slug}
                  to={`/categories/${sub.slug}`}
                  className="px-4 py-2 text-sm bg-slate-100 hover:bg-orange-50 hover:text-orange-600 rounded-full transition-all duration-300"
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-card rounded-xl border border-border p-6">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Filtres
              </h3>
              <FilterContent {...filterProps} />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-card rounded-xl border border-border">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <Filter className="w-4 h-4 mr-2" /> Filtres
                    {hasActiveFilters && (
                      <span className="ml-2 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                        {conditions.length + locations.length + (priceRange[0] > 0 || priceRange[1] < 200000 ? 1 : 0)}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Filtres</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent {...filterProps} />
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">Trier par:</span>
                <Select value={sortBy} onValueChange={(value) => { setSortBy(value); setPage(1); }}>
                  <SelectTrigger className="w-40 sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden sm:flex items-center gap-1 border rounded-lg p-1">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}>
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}>
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className={`grid gap-4 md:gap-6 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className={`grid gap-3 sm:gap-4 md:gap-6 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1'} stagger-animation`}>
                  {products.map((product, index) => (
                    <div
                      key={product.id}
                      className="opacity-0 animate-[fadeInUp_0.5s_ease-out_forwards]"
                      style={{ animationDelay: `${Math.min(index, 11) * 50}ms` }}
                    >
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>

                <div ref={loadMoreRef} className="w-full py-8 flex justify-center">
                  {loadingMore && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Chargement de plus de produits...</span>
                    </div>
                  )}
                  {!hasMore && products.length > 0 && (
                    <p className="text-muted-foreground text-sm">
                      Vous avez vu tous les {totalProducts} produits
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">Aucun produit trouvé dans cette catégorie</p>
                <Button variant="outline" onClick={clearFilters}>
                  Effacer les filtres
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
      `}</style>
    </div>
  );
};

const FilterContent = ({ conditions, locations, priceRange, setPriceRange, toggleCondition, toggleLocation, clearFilters, hasActiveFilters }) => (
  <div className="space-y-6">
    <div>
      <h4 className="font-medium mb-4">Prix (FCFA)</h4>
      <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={200000} step={5000} className="mb-4" />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{new Intl.NumberFormat('fr-FR').format(priceRange[0])} FCFA</span>
        <span>{new Intl.NumberFormat('fr-FR').format(priceRange[1])} FCFA</span>
      </div>
    </div>

    <div>
      <h4 className="font-medium mb-4">État</h4>
      <div className="space-y-3">
        {CONDITIONS.map((condition) => (
          <label key={condition.value} className="flex items-center gap-3 cursor-pointer">
            <Checkbox checked={conditions.includes(condition.value)} onCheckedChange={() => toggleCondition(condition.value)} />
            <span className="text-sm">{condition.label}</span>
          </label>
        ))}
      </div>
    </div>

    <div>
      <h4 className="font-medium mb-4">Localisation</h4>
      <div className="space-y-3">
        {LOCATIONS.map((location) => (
          <label key={location.value} className="flex items-center gap-3 cursor-pointer">
            <Checkbox checked={locations.includes(location.value)} onCheckedChange={() => toggleLocation(location.value)} />
            <span className="text-sm">{location.label}</span>
          </label>
        ))}
      </div>
    </div>

    {hasActiveFilters && (
      <Button variant="outline" className="w-full" onClick={clearFilters}>
        <X className="w-4 h-4 mr-2" /> Effacer les filtres
      </Button>
    )}
  </div>
);

export default CategoryPage;
