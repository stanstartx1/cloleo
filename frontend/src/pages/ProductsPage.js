import { API_URL, API_BASE, WS_URL } from '../config/api';
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
import { COUNTRIES, getCountryFlagUrl } from '../utils/countries';

const API = API_URL;

const CONDITIONS = [
  { value: 'neuf', label: 'Neuf' },
  { value: 'quasi-neuf', label: 'Quasi-neuf' },
  { value: 'occasion', label: 'Occasion' },
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
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const featured = searchParams.get('featured') === 'true';
  const categoryParam = searchParams.get('category') || '';
  const sortParam = searchParams.get('sort_by') || 'created_at';
  const orderParam = searchParams.get('sort_order') || 'desc';

  const [conditions, setConditions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [priceRange, setPriceRange] = useState([0, 200000]);
  const [sortBy, setSortBy] = useState(`${sortParam}-${orderParam}`);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [expandedCategories, setExpandedCategories] = useState({});

  const parentCategories = categories.filter((cat) => !cat.parent_slug);
  const childCategoriesByParent = categories.reduce((acc, cat) => {
    if (cat.parent_slug) {
      acc[cat.parent_slug] = acc[cat.parent_slug] || [];
      acc[cat.parent_slug].push(cat);
    }
    return acc;
  }, {});

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

      if (featured) params.set('featured', 'true');
      if (selectedCategory) params.set('category', selectedCategory);
      if (conditions.length > 0) params.set('condition', conditions[0]);
      if (locations.length > 0) params.set('location', locations[0]);
      if (priceRange[0] > 0) params.set('min_price', priceRange[0].toString());
      if (priceRange[1] < 200000) params.set('max_price', priceRange[1].toString());

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
    setConditions((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
    setPage(1);
  };

  const toggleLocation = (value) => {
    setLocations((prev) => (prev.includes(value) ? prev.filter((l) => l !== value) : [...prev, value]));
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

  const hasActiveFilters =
    conditions.length > 0 || locations.length > 0 || priceRange[0] > 0 || priceRange[1] < 200000 || selectedCategory;

  const toggleCategoryExpand = (slug) => {
    setExpandedCategories((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <div className="filter-section">
        <h4 className="font-medium mb-4">Catégories</h4>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox checked={!selectedCategory} onCheckedChange={() => { setSelectedCategory(''); setPage(1); }} />
            <span className="text-sm">Toutes les catégories</span>
          </label>
          {parentCategories.map((cat) => {
            const subCategories = childCategoriesByParent[cat.slug] || [];
            const isExpanded = !!expandedCategories[cat.slug];
            return (
              <div key={cat.slug} className="rounded-md border border-border/60 p-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                    <Checkbox checked={selectedCategory === cat.slug} onCheckedChange={() => { setSelectedCategory(cat.slug); setPage(1); }} />
                    <span className="text-sm truncate">{cat.name}</span>
                  </label>
                  {subCategories.length > 0 && (
                    <button type="button" onClick={() => toggleCategoryExpand(cat.slug)} className="p-1 rounded hover:bg-muted transition-colors" aria-label={`Déplier ${cat.name}`}>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>
                {isExpanded && subCategories.length > 0 && (
                  <div className="mt-2 pl-6 space-y-2 border-l border-border/60">
                    {subCategories.map((subCat) => (
                      <label key={subCat.slug} className="flex items-center gap-3 cursor-pointer">
                        <Checkbox checked={selectedCategory === subCat.slug} onCheckedChange={() => { setSelectedCategory(subCat.slug); setPage(1); }} />
                        <span className="text-sm text-muted-foreground">{subCat.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="filter-section">
        <h4 className="font-medium mb-4">Prix (FCFA)</h4>
        <Slider value={priceRange} onValueChange={setPriceRange} min={0} max={200000} step={5000} className="mb-4" />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{new Intl.NumberFormat('fr-FR').format(priceRange[0])}</span>
          <span>{new Intl.NumberFormat('fr-FR').format(priceRange[1])}</span>
        </div>
      </div>

      <div className="filter-section">
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

      <div className="filter-section">
        <h4 className="font-medium mb-4">Pays d'origine</h4>
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {COUNTRIES.map((country) => (
            <label key={country.code} className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={locations.includes(country.name)} onCheckedChange={() => toggleLocation(country.name)} />
              <div className="flex items-center gap-2 min-w-0">
                <img src={getCountryFlagUrl(country.code)} alt="" className="w-4 h-3 rounded-sm object-cover" />
                <span className="text-sm truncate">{country.name}</span>
              </div>
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
        <nav className="flex items-center text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{featured ? 'Tendances' : 'Tous les produits'}</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
            {featured && <Sparkles className="w-8 h-8 text-amber-500" />}
            {featured ? 'Produits tendances' : 'Tous les produits'}
          </h1>
          <p className="text-muted-foreground">{totalProducts} produits disponibles</p>
        </div>

        <div className="flex gap-8">
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-card rounded-xl border border-border p-6">
              <h3 className="font-bold mb-6 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Filtres</h3>
              <FilterContent />
            </div>
          </aside>

          <div className="flex-1">
            <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-card rounded-xl border border-border">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden"><Filter className="w-4 h-4 mr-2" /> Filtres</Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader><SheetTitle>Filtres</SheetTitle></SheetHeader>
                  <div className="mt-6"><FilterContent /></div>
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">Trier par:</span>
                <Select value={sortBy} onValueChange={(value) => { setSortBy(value); setPage(1); }}>
                  <SelectTrigger className="w-40 sm:w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="hidden sm:flex items-center gap-1 border rounded-lg p-1">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}><Grid3X3 className="w-4 h-4" /></Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}><List className="w-4 h-4" /></Button>
              </div>
            </div>

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
                {products.map((product) => (<ProductCard key={product.id} product={product} />))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">Aucun produit trouvé</p>
                <Button variant="outline" onClick={clearFilters}>Effacer les filtres</Button>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Précédent</Button>
                <span className="px-4 text-sm text-muted-foreground">Page {page} sur {totalPages}</span>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Suivant</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
