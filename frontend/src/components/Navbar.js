import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Search, Menu, X, ChevronDown, User, Store, Crown, LogOut, Truck, MessageCircle, Bell } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  const { user, isAuthenticated, isVendor, isAdmin, isDriver, isDropshipper: isRevendeur, logout } = useAuth();
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-border shadow-sm transition-all duration-300" data-testid="navbar">
        <div className="container mx-auto px-4">
          {/* Top bar */}
          <div className="hidden md:flex items-center justify-between text-xs py-2 border-b border-border">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="animate-pulse">🚚</span>
              <span>Livraison gratuite à partir de 50 000 FCFA</span>
              <span>•</span>
              <span>Service client: +225 07 00 00 00</span>
            </div>
            <div className="flex items-center gap-4">
              {isRevendeur && (
                <Link to="/revendeur" className="hover:text-purple-600 transition-all duration-300 flex items-center gap-1 hover:scale-105">
                  <Store className="w-3 h-3" /> Espace revendeur
                </Link>
              )}
              {isDriver && (
                <Link to="/livreur" className="hover:text-primary transition-all duration-300 flex items-center gap-1 hover:scale-105">
                  <Truck className="w-3 h-3" /> Espace livreur
                </Link>
              )}
              {isVendor && !isAdmin && (
                <Link to="/vendeur" className="hover:text-primary transition-all duration-300 flex items-center gap-1 hover:scale-105">
                  <Store className="w-3 h-3" /> Espace vendeur
                </Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="hover:text-primary transition-all duration-300 flex items-center gap-1 hover:scale-105">
                  <Crown className="w-3 h-3" /> Administration
                </Link>
              )}
              <span>•</span>
              <Link to="/favoris" className="hover:text-red-500 transition-all duration-300 flex items-center gap-1 hover:scale-105">
                <Heart className="w-3 h-3" /> Mes favoris
              </Link>
            </div>
          </div>

          {/* Main navbar */}
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group" data-testid="logo">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg group-hover:shadow-orange-500/30">
                C
              </div>
              <span className="text-2xl font-bold tracking-tight transition-transform duration-300 group-hover:scale-105">
                <span className="text-orange-500">Clo</span>
                <span className="text-amber-600">léo</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 font-medium hover:text-primary transition-all duration-300 nav-item">
                    Parcourir <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 animate-scale-in">
                  {CATEGORIES.map((cat, index) => (
                    <DropdownMenuItem key={cat.slug} asChild className="transition-all duration-200 hover:translate-x-1" style={{ animationDelay: `${index * 0.05}s` }}>
                      <Link to={`/categories/${cat.slug}`}>{cat.name}</Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/categories" className="font-medium">Voir toutes les catégories</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link to="/produits?featured=true" className="font-medium hover:text-primary transition-all duration-300 nav-item">
                Tendances
              </Link>
              <Link to="/produits?sort_by=created_at" className="font-medium hover:text-primary transition-all duration-300 nav-item">
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
                <Button variant="ghost" size="icon" className="relative group">
                  <ShoppingCart className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
                  {cart.item_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pop-in cart-badge-bounce">
                      {cart.item_count}
                    </span>
                  )}
                </Button>
              </Link>

              {/* User Menu */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative" data-testid="user-menu-btn">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold">
                        {user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2">
                          <Crown className="w-4 h-4" /> Administration
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isDriver && (
                      <DropdownMenuItem asChild>
                        <Link to="/livreur" className="flex items-center gap-2">
                          <Truck className="w-4 h-4" /> Espace livreur
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isVendor && !isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/vendeur" className="flex items-center gap-2">
                          <Store className="w-4 h-4" /> Espace vendeur
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/favoris" className="flex items-center gap-2">
                        <Heart className="w-4 h-4" /> Mes favoris
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/abonnements" className="flex items-center gap-2">
                        <Bell className="w-4 h-4" /> Mes abonnements
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/mes-messages" className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" /> Mes messages
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild variant="default" size="sm" className="hidden md:flex" data-testid="login-btn">
                  <Link to="/connexion">
                    <User className="w-4 h-4 mr-2" /> Inscription / Connexion
                  </Link>
                </Button>
              )}

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
          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-80px)]">
            {isAuthenticated ? (
              <div className="p-4 bg-muted/50 rounded-lg mb-4">
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            ) : (
              <Link 
                to="/connexion" 
                className="flex items-center gap-2 p-3 bg-primary text-white rounded-lg font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="w-5 h-5" /> Connexion / Inscription
              </Link>
            )}

            {isAdmin && (
              <Link 
                to="/admin" 
                className="flex items-center gap-2 py-3 border-b font-medium text-amber-600"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Crown className="w-5 h-5" /> Administration
              </Link>
            )}

            {isVendor && !isAdmin && (
              <Link 
                to="/vendeur" 
                className="flex items-center gap-2 py-3 border-b font-medium text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Store className="w-5 h-5" /> Espace vendeur
              </Link>
            )}

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
              {isAuthenticated && (
                <Link 
                  to="/abonnements" 
                  className="flex items-center gap-2 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Bell className="w-5 h-5" /> Mes abonnements
                </Link>
              )}
              <Link 
                to="/panier" 
                className="flex items-center gap-2 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <ShoppingCart className="w-5 h-5" /> Mon panier ({cart.item_count})
              </Link>
            </div>

            {isAuthenticated && (
              <div className="pt-4 border-t">
                <button 
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 py-2 text-destructive w-full"
                  data-testid="mobile-logout-btn"
                >
                  <LogOut className="w-5 h-5" /> Déconnexion
                </button>
              </div>
            )}
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
