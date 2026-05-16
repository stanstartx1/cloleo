import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Filter, ChevronDown, Grid3X3, List, SlidersHorizontal, X, Sparkles } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Slider } from '../components/ui/slider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Get filters from URL
  const featured = searchParams.get('featured') === 'true';
  const categoryParam = searchParams.get('category') || '';
  const sortParam = searchParams.get('sort_by') || 'created_at';
  const orderParam = searchParams.get('sort_order') || 'desc';
  
  // Filters state
  const [conditions, setConditions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 200000]);
  const [sortBy, setSortBy] = useState(`${sortParam}-${orderParam}`);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [sort, order] = sortBy.split('-');
      const params = new URLSearchParams({
        sort_by: sort,
        sort_order: order,
        page: page.toString(),
        limit: '20',
      });

      if (featured) {
        params.set('featured', 'true');
      }
      if (selectedCategory) {
        params.set('category', selectedCategory);
      }
      if (conditions.length > 0) {
        params.set('condition', conditions[0]);
      }
      if (locations.length > 0) {
        params.set('location', locations[0]);
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
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy, page, conditions, locations, priceRange, featured, selectedCategory]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
    setSelectedCategory('');
    setPage(1);
  };

  const hasActiveFilters = conditions.length > 0 || locations.length > 0 || priceRange[0] > 0 || priceRange[1] < 200000 || selectedCategory;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Category */}
      <div className="filter-section">
        <h4 className="font-medium mb-4">Catégorie</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={!selectedCategory}
              onCheckedChange={() => { setSelectedCategory(''); setPage(1); }}
            />
            <span className="text-sm">Toutes les catégories</span>
          </label>
          {categories.map((cat) => (
            <label key={cat.slug} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={selectedCategory === cat.slug}
                onCheckedChange={() => { setSelectedCategory(cat.slug); setPage(1); }}
              />
              <span className="text-sm">{cat.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="filter-section">
        <h4 className="font-medium mb-4">Prix (FCFA)</h4>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          min={0}
          max={200000}
          step={5000}
          className="mb-4"
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{new Intl.NumberFormat('fr-FR').format(priceRange[0])}</span>
          <span>{new Intl.NumberFormat('fr-FR').format(priceRange[1])}</span>
        </div>
      </div>

      {/* Condition */}
      <div className="filter-section">
        <h4 className="font-medium mb-4">État</h4>
        <div className="space-y-3">
          {CONDITIONS.map((condition) => (
            <label key={condition.value} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={conditions.includes(condition.value)}
                onCheckedChange={() => toggleCondition(condition.value)}
              />
              <span className="text-sm">{condition.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="filter-section">
        <h4 className="font-medium mb-4">Localisation</h4>
        <div className="space-y-3">
          {LOCATIONS.map((location) => (
            <label key={location.value} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={locations.includes(location.value)}
                onCheckedChange={() => toggleLocation(location.value)}
              />
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

  return (
    <div className="min-h-screen py-8" data-testid="products-page">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">
            {featured ? 'Tendances' : 'Tous les produits'}
          </span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            {featured && <Sparkles className="w-8 h-8 text-amber-500" />}
            {featured ? 'Produits tendances' : 'Tous les produits'}
          </h1>
          <p className="text-muted-foreground">{totalProducts} produits disponibles</p>
        </div>

        <div className="flex gap-8">
          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-card rounded-xl border border-border p-6">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" /> Filtres
              </h3>
              <FilterContent />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-card rounded-xl border border-border">
              {/* Mobile filter button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <Filter className="w-4 h-4 mr-2" /> Filtres
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Filtres</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Sort */}
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

              {/* View mode */}
              <div className="hidden sm:flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('list')}
                >
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
              <div className={`grid gap-4 md:gap-6 ${viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">Aucun produit trouvé</p>
                <Button variant="outline" onClick={clearFilters}>
                  Effacer les filtres
                </Button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Précédent
                </Button>
                <span className="px-4 text-sm text-muted-foreground">
                  Page {page} sur {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Suivant
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
