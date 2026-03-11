import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Search, Menu, X, ChevronDown } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const CATEGORIES = [
  { name: 'Mode & Textile', slug: 'mode-textile' },
  { name: 'Artisanat & Décoration', slug: 'artisanat-decoration' },
  { name: 'Bijoux & Accessoires', slug: 'bijoux-accessoires' },
  { name: 'Beauté & Cosmétiques', slug: 'beaute-cosmetiques' },
  { name: 'Électronique & Gadgets', slug: 'electronique-gadgets' },
  { name: 'Maison & Cuisine', slug: 'maison-cuisine' },
  { name: 'Produits Locaux', slug: 'produits-locaux-agroalimentaire' },
  { name: 'Sport & Loisirs', slug: 'sport-loisirs' },
];

const Navbar = () => {
  const navigate = useNavigate();
  const { cart } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/recherche?q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border shadow-sm" data-testid="navbar">
        <div className="container mx-auto px-4">
          {/* Top bar */}
          <div className="hidden md:flex items-center justify-between text-xs py-2 border-b border-border">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>Livraison gratuite à partir de 50 000 FCFA</span>
              <span>•</span>
              <span>Service client: +225 07 00 00 00</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/favoris" className="hover:text-primary transition-colors">Mes favoris</Link>
              <span>•</span>
              <Link to="/aide" className="hover:text-primary transition-colors">Aide</Link>
            </div>
          </div>

          {/* Main navbar */}
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2" data-testid="logo">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-xl">
                C
              </div>
              <span className="text-2xl font-bold tracking-tight">
                <span className="text-orange-500">Clo</span>
                <span className="text-amber-600">léo</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              <Link to="/categories" className="font-medium hover:text-primary transition-colors" data-testid="nav-categories">
                Catégories
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 font-medium hover:text-primary transition-colors">
                    Parcourir <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  {CATEGORIES.map((cat) => (
                    <DropdownMenuItem key={cat.slug} asChild>
                      <Link to={`/categories/${cat.slug}`}>{cat.name}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Link to="/produits?featured=true" className="font-medium hover:text-primary transition-colors">
                Tendances
              </Link>
              <Link to="/produits?sort_by=created_at" className="font-medium hover:text-primary transition-colors">
                Nouveautés
              </Link>
            </div>

            {/* Search bar - Desktop */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 bg-muted/50 border-0 focus:bg-white"
                  data-testid="search-input"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSearchOpen(true)}
                data-testid="mobile-search-btn"
              >
                <Search className="w-5 h-5" />
              </Button>

              <Button variant="ghost" size="icon" asChild className="hidden md:flex">
                <Link to="/favoris" data-testid="favorites-btn">
                  <Heart className="w-5 h-5" />
                </Link>
              </Button>

              <Link to="/panier" data-testid="cart-btn">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {cart.item_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {cart.item_count}
                    </span>
                  )}
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
                data-testid="mobile-menu-btn"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white" data-testid="mobile-menu">
          <div className="flex items-center justify-between p-4 border-b">
            <span className="text-xl font-bold">Menu</span>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
              <X className="w-6 h-6" />
            </Button>
          </div>
          <div className="p-4 space-y-4">
            <Link 
              to="/categories" 
              className="block py-3 border-b font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Toutes les catégories
            </Link>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/categories/${cat.slug}`}
                className="block py-2 text-muted-foreground hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                {cat.name}
              </Link>
            ))}
            <div className="pt-4 border-t space-y-2">
              <Link 
                to="/favoris" 
                className="flex items-center gap-2 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Heart className="w-5 h-5" /> Mes favoris
              </Link>
              <Link 
                to="/panier" 
                className="flex items-center gap-2 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingCart className="w-5 h-5" /> Mon panier ({cart.item_count})
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div className="bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" size="icon">
                <Search className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSearchOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
