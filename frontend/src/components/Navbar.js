import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Search, Menu, X, ChevronDown, User, Store, Crown, LogOut, Truck, MessageCircle, Bell, Settings, Eye, Filter, DollarSign, Star, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { toAbsoluteMediaUrl } from '../utils/media';
import { Input } from './ui/input';
import { API_BASE, API_URL } from '../config/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

const API = API_URL;

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

// Composant Mega Menu Recherche - avec checkbox
const SearchMegaMenu = ({ isOpen, onClose, onSearch, searchQuery, setSearchQuery }) => {
  const [filters, setFilters] = useState({
    certifiedVendor: false,
    neuf: false,
    occasion: false,
  });
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const menuRef = useRef(null);

  // Charger les suggestions
  useEffect(() => {
    if (!isOpen || !searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const response = await axios.get(`${API}/search/suggestions?q=${encodeURIComponent(searchQuery)}&limit=6`);
        setSuggestions(response.data.suggestions || []);
      } catch (error) {
        console.error('Erreur suggestions:', error);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, isOpen]);

  // Fermer le menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleApplyFilters = () => {
    const conditions = [];
    if (filters.neuf) conditions.push('neuf');
    if (filters.occasion) conditions.push('occasion');
    
    onSearch({
      q: searchQuery,
      certifiedVendor: filters.certifiedVendor,
      conditions: conditions,
    });
    onClose();
  };

  const handleResetFilters = () => {
    setFilters({
      certifiedVendor: false,
      neuf: false,
      occasion: false,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 bg-white shadow-xl border-t border-slate-200 rounded-b-2xl" ref={menuRef}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="p-3 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-orange-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un produit..."
              className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 text-sm"
              autoFocus
            />
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-3">
          {/* Suggestions */}
          {searchQuery.trim() && (
            <div className="mb-3">
              <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggestions</h3>
              {suggestionsLoading ? (
                <div className="space-y-1">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-8 bg-slate-100 animate-pulse rounded-lg"></div>
                  ))}
                </div>
              ) : suggestions.length > 0 ? (
                <div className="space-y-0.5">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery(suggestion);
                        handleApplyFilters();
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-2 text-sm"
                    >
                      <Search className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-700">{suggestion}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">Aucune suggestion</p>
              )}
            </div>
          )}

          {/* Filtres avec checkboxes */}
          <div className="border-t border-slate-100 pt-3">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Filtres
            </h3>
            
            <div className="space-y-2">
              {/* Vendeur certifié */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.certifiedVendor}
                  onChange={(e) => setFilters({ ...filters, certifiedVendor: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500" /> Vendeur certifié
                </span>
              </label>

              {/* Neuf */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.neuf}
                  onChange={(e) => setFilters({ ...filters, neuf: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-xs text-slate-600">Neuf</span>
              </label>

              {/* Occasion */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.occasion}
                  onChange={(e) => setFilters({ ...filters, occasion: e.target.checked })}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-xs text-slate-600">Occasion</span>
              </label>
            </div>

            {/* Boutons action */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleApplyFilters}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-1.5 rounded-lg font-medium text-xs hover:from-orange-600 hover:to-amber-600 transition"
              >
                Voir les résultats
              </button>
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Navbar = () => {
  const navigate = useNavigate();
  const { cart } = useCart();
  const { user, isAuthenticated, isVendor, isAdmin, isDriver, isDropshipper: isRevendeur, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoLoading, setLogoLoading] = useState(true);
  
  const searchInputRef = useRef(null);

  // Charger le logo
  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await fetch(`${API_BASE}/logo-settings`);
        const data = await response.json();
        if (data.logo_url && data.logo_url.trim()) {
          const logo = data.logo_url.startsWith('/') ? `${API_BASE}${data.logo_url}` : data.logo_url;
          setLogoUrl(logo);
        }
      } catch (error) {
        console.error('Erreur chargement logo:', error);
      } finally {
        setLogoLoading(false);
      }
    };
    fetchLogo();
  }, []);

  const handleSearch = (filters = null) => {
    if (filters && filters.q) {
      const params = new URLSearchParams();
      params.append('q', filters.q);
      if (filters.certifiedVendor) params.append('certified', 'true');
      if (filters.conditions && filters.conditions.length) {
        params.append('condition', filters.conditions.join(','));
      }
      navigate(`/recherche?${params.toString()}`);
    } else if (searchQuery.trim()) {
      navigate(`/recherche?q=${encodeURIComponent(searchQuery)}`);
    }
    setMegaMenuOpen(false);
    setSearchOpen(false);
  };

  const handleSearchClick = () => {
    setMegaMenuOpen(true);
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white shadow-md transition-all duration-300" data-testid="navbar">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-14 md:h-16 gap-3 lg:gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group shrink-0" data-testid="logo">
              {!logoLoading && logoUrl ? (
                <img src={logoUrl} alt="Cloléo" className="h-8 md:h-10 w-auto object-contain transition-all duration-300 group-hover:scale-105" />
              ) : (
                <>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-lg md:text-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 group-hover:shadow-lg group-hover:shadow-orange-500/30">
                    C
                  </div>
                  <span className="text-xl md:text-2xl font-bold tracking-tight transition-transform duration-300 group-hover:scale-105">
                    <span className="text-orange-500">Clo</span>
                    <span className="text-amber-600">léo</span>
                  </span>
                </>
              )}
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-4 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 font-medium hover:text-orange-500 transition-all duration-300 text-sm">
                    Parcourir <ChevronDown className="w-3.5 h-3.5 transition-transform duration-300 group-hover:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 animate-scale-in">
                  {CATEGORIES.map((cat, index) => (
                    <DropdownMenuItem key={cat.slug} asChild className="transition-all duration-200 hover:translate-x-1">
                      <Link to={`/categories/${cat.slug}`}>{cat.name}</Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/categories" className="font-medium">Voir toutes les catégories</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link to="/produits?featured=true" className="font-medium hover:text-orange-500 transition-all duration-300 text-sm">
                Tendances
              </Link>
              <Link to="/produits?sort_by=created_at" className="font-medium hover:text-orange-500 transition-all duration-300 text-sm">
                Nouveautés
              </Link>
            </div>

            {/* Search bar - Desktop avec largeur réduite */}
            <div className="hidden md:flex items-center flex-1 min-w-0 max-w-sm mx-1 relative">
              <div className="relative w-full">
                <div 
                  className="flex items-center bg-gray-100 rounded-full px-3 py-1.5 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={handleSearchClick}
                >
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <span className="ml-2 text-xs text-gray-500 flex-1">Rechercher...</span>
                </div>
                {/* Mega Menu */}
                <SearchMegaMenu
                  isOpen={megaMenuOpen}
                  onClose={() => setMegaMenuOpen(false)}
                  onSearch={handleSearch}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              </div>
            </div>

            {/* Actions - plus à gauche */}
            <div className="ml-2 flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Mobile search button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full w-8 h-8"
                onClick={() => setSearchOpen(true)}
                data-testid="mobile-search-btn"
              >
                <Search className="w-4 h-4" />
              </Button>

              {/* Panier */}
              <Link to="/panier" data-testid="cart-btn" className="relative">
                <Button variant="ghost" size="icon" className="relative rounded-full w-8 h-8 md:w-9 md:h-9 hover:bg-orange-50">
                  <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 hover:scale-110" />
                  {cart.item_count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[1.125rem] h-4 px-1 bg-orange-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none shadow-md z-10">
                      {cart.item_count > 99 ? '99+' : cart.item_count}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Favoris (cœur) - Desktop uniquement */}
              <Button variant="ghost" size="icon" asChild className="hidden md:flex rounded-full w-8 h-8 hover:bg-red-50">
                <Link to="/favoris" data-testid="favorites-btn">
                  <Heart className="w-4 h-4 hover:text-red-500 transition-colors" />
                </Link>
              </Button>

              {/* User Menu */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative rounded-full w-8 h-8 hover:bg-orange-50" data-testid="user-menu-btn">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 overflow-hidden flex items-center justify-center text-white text-xs font-bold">
                        {user?.profile_photo ? (
                          <img src={toAbsoluteMediaUrl(user.profile_photo)} alt={user?.name || 'Profil'} className="w-full h-full object-cover" />
                        ) : (
                          user?.name?.[0]?.toUpperCase() || 'U'
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2">
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
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
                    {isRevendeur && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/revendeur" className="flex items-center gap-2">
                            <Store className="w-4 h-4" /> Espace revendeur
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/boutique/${user?.shop_slug || ''}`} className="flex items-center gap-2">
                            <Eye className="w-4 h-4" /> Voir ma boutique
                          </Link>
                        </DropdownMenuItem>
                      </>
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
                    <DropdownMenuItem asChild>
                      <Link to="/parametres" className="flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Paramètres
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild variant="default" size="sm" className="hidden md:inline-flex rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-3 py-1.5 text-xs h-8" data-testid="login-btn">
                  <Link to="/connexion">
                    <User className="w-3 h-3 mr-1" />
                    <span className="hidden lg:inline text-xs">Connexion</span>
                  </Link>
                </Button>
              )}

              {/* Menu burger mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden rounded-full w-8 h-8"
                onClick={() => setMobileMenuOpen(true)}
                data-testid="mobile-menu-btn"
              >
                <Menu className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu (inchangé) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white" data-testid="mobile-menu">
          <div className="flex items-center justify-between p-4 border-b">
            {logoUrl ? (
              <img src={logoUrl} alt="Cloléo" className="h-8 w-auto" />
            ) : (
              <span className="text-xl font-bold">
                <span className="text-orange-500">Clo</span>
                <span className="text-amber-600">léo</span>
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
              <X className="w-6 h-6" />
            </Button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-80px)]">
            {isAuthenticated ? (
              <div className="p-4 bg-gray-50 rounded-lg mb-4">
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            ) : (
              <Link 
                to="/connexion" 
                className="flex items-center gap-2 p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium"
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
                className="flex items-center gap-2 py-3 border-b font-medium text-orange-600"
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
                className="block py-2 text-gray-600 hover:text-orange-500"
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
                  className="flex items-center gap-2 py-2 text-red-600 w-full"
                  data-testid="mobile-logout-btn"
                >
                  <LogOut className="w-5 h-5" /> Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Search Overlay (simplifié) */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div className="bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch({ q: searchQuery }); }} className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-full"
                autoFocus
              />
              <Button type="submit" size="icon" className="rounded-full bg-orange-500 hover:bg-orange-600">
                <Search className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSearchOpen(false)} className="rounded-full">
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