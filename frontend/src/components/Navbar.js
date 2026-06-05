import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Heart, Search, Menu, X, ChevronDown, User, Store, 
  Crown, LogOut, Truck, MessageCircle, Bell, Settings, Eye, 
  Filter, Star
} from 'lucide-react';
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
import axios from 'axios';

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

// Composant Mega Menu simplifié - Version responsive
const SearchMegaMenu = ({ isOpen, onClose, onSearch, searchQuery, setSearchQuery }) => {
  const [filters, setFilters] = useState({
    certifiedVendor: false,
    neuf: false,
    occasion: false,
  });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/search/suggestions?q=${encodeURIComponent(searchQuery)}&limit=6`);
        setSuggestions(response.data.suggestions || []);
      } catch (error) {
        console.error('Erreur suggestions:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, isOpen]);

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

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    onSearch({ q: suggestion });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 bg-white shadow-xl border-t border-slate-200 rounded-b-2xl mt-1 max-h-[80vh] overflow-y-auto" ref={menuRef}>
      <div className="max-w-2xl mx-auto p-3 md:p-4">
        
        {/* Barre de recherche */}
        <div className="mb-3 p-2 md:p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Que recherchez-vous ?"
              className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 text-sm md:text-base"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-slate-200 rounded-full">
                <X className="w-3 h-3 md:w-4 md:h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Suggestions */}
        {searchQuery.trim() && searchQuery.length >= 2 && (
          <div className="mb-3">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggestions</h3>
            {loading ? (
              <div className="space-y-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 md:h-10 bg-slate-100 animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-0.5">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-2 py-1.5 md:px-3 md:py-2 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-2 md:gap-3 text-xs md:text-sm"
                  >
                    <Search className="w-3 h-3 md:w-4 md:h-4 text-slate-400" />
                    <span className="text-slate-700">{suggestion}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2">Aucune suggestion pour "{searchQuery}"</p>
            )}
          </div>
        )}

        {/* Filtres */}
        <div className="border-t border-slate-100 pt-3">
          <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filtres
          </h3>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.certifiedVendor}
                onChange={(e) => setFilters({ ...filters, certifiedVendor: e.target.checked })}
                className="w-3 h-3 md:w-3.5 md:h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-[11px] md:text-xs text-slate-600 flex items-center gap-1">
                <Star className="w-2.5 h-2.5 md:w-3 md:h-3 text-amber-500" /> Vendeur certifié
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.neuf}
                onChange={(e) => setFilters({ ...filters, neuf: e.target.checked })}
                className="w-3 h-3 md:w-3.5 md:h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-[11px] md:text-xs text-slate-600">Neuf</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.occasion}
                onChange={(e) => setFilters({ ...filters, occasion: e.target.checked })}
                className="w-3 h-3 md:w-3.5 md:h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-[11px] md:text-xs text-slate-600">Occasion</span>
            </label>
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleApplyFilters}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-1.5 rounded-lg font-medium text-xs hover:from-orange-600 hover:to-amber-600 transition"
            >
              Appliquer
            </button>
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100 transition"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-3 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="text-[10px] text-slate-400 hover:text-slate-600">
            Fermer
          </button>
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
  
  const searchContainerRef = useRef(null);

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
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white shadow-md transition-all duration-300" data-testid="navbar">
        <div className="container mx-auto px-3 md:px-4">
          <div className="flex items-center h-12 md:h-16 gap-2 md:gap-3 lg:gap-4">
            
            {/* Logo - version responsive */}
            <Link to="/" className="flex items-center gap-1.5 md:gap-2 group shrink-0" data-testid="logo">
              {!logoLoading && logoUrl ? (
                <img src={logoUrl} alt="Cloléo" className="h-7 md:h-10 w-auto object-contain transition-all duration-300 group-hover:scale-105" />
              ) : (
                <>
                  <div className="w-7 h-7 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-base md:text-xl transition-all duration-500 group-hover:scale-110">
                    C
                  </div>
                  <span className="text-base md:text-2xl font-bold tracking-tight">
                    <span className="text-orange-500">Clo</span>
                    <span className="text-amber-600">léo</span>
                  </span>
                </>
              )}
            </Link>

            {/* Desktop Navigation - cachée sur mobile */}
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

            {/* Search bar - cachée sur mobile (utilise l'overlay) */}
            <div className="hidden md:flex items-center flex-1 min-w-0 max-w-sm mx-1 relative" ref={searchContainerRef}>
              <div className="relative w-full">
                <div 
                  className="flex items-center bg-gray-100 rounded-full px-3 py-1.5 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={handleSearchClick}
                >
                  <Search className="w-3.5 h-3.5 text-gray-400" />
                  <span className="ml-2 text-xs text-gray-500 flex-1">Rechercher...</span>
                </div>
                <SearchMegaMenu
                  isOpen={megaMenuOpen}
                  onClose={() => setMegaMenuOpen(false)}
                  onSearch={handleSearch}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              </div>
            </div>

            {/* Actions - version responsive */}
            <div className="ml-auto flex items-center gap-0.5 sm:gap-1 shrink-0">
              
              {/* Bouton recherche mobile */}
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
                    <span className="absolute -top-1 -right-1 min-w-[1rem] h-3.5 md:h-4 px-1 bg-orange-500 text-white text-[8px] md:text-[9px] rounded-full flex items-center justify-center font-bold leading-none shadow-md z-10">
                      {cart.item_count > 99 ? '99+' : cart.item_count}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Favoris - caché sur très petit mobile */}
              <Button variant="ghost" size="icon" asChild className="hidden sm:flex rounded-full w-8 h-8 hover:bg-red-50">
                <Link to="/favoris" data-testid="favorites-btn">
                  <Heart className="w-4 h-4 hover:text-red-500 transition-colors" />
                </Link>
              </Button>

              {/* User Menu */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative rounded-full w-7 h-7 md:w-8 md:h-8 hover:bg-orange-50" data-testid="user-menu-btn">
                      <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 overflow-hidden flex items-center justify-center text-white text-[10px] md:text-xs font-bold">
                        {user?.profile_photo ? (
                          <img src={toAbsoluteMediaUrl(user.profile_photo)} alt={user?.name || 'Profil'} className="w-full h-full object-cover" />
                        ) : (
                          user?.name?.[0]?.toUpperCase() || 'U'
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-3 py-2"><p className="font-medium">{user?.name}</p><p className="text-xs text-gray-500">{user?.email}</p></div>
                    <DropdownMenuSeparator />
                    {isAdmin && <DropdownMenuItem asChild><Link to="/admin"><Crown className="w-4 h-4" /> Administration</Link></DropdownMenuItem>}
                    {isDriver && <DropdownMenuItem asChild><Link to="/livreur"><Truck className="w-4 h-4" /> Espace livreur</Link></DropdownMenuItem>}
                    {isRevendeur && (
                      <>
                        <DropdownMenuItem asChild><Link to="/revendeur"><Store className="w-4 h-4" /> Espace revendeur</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link to={`/boutique/${user?.shop_slug || ''}`}><Eye className="w-4 h-4" /> Voir ma boutique</Link></DropdownMenuItem>
                      </>
                    )}
                    {isVendor && !isAdmin && <DropdownMenuItem asChild><Link to="/vendeur"><Store className="w-4 h-4" /> Espace vendeur</Link></DropdownMenuItem>}
                    <DropdownMenuItem asChild><Link to="/favoris"><Heart className="w-4 h-4" /> Mes favoris</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/abonnements"><Bell className="w-4 h-4" /> Mes abonnements</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/mes-messages"><MessageCircle className="w-4 h-4" /> Mes messages</Link></DropdownMenuItem>
                    <DropdownMenuItem asChild><Link to="/parametres"><Settings className="w-4 h-4" /> Paramètres</Link></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600"><LogOut className="w-4 h-4 mr-2" /> Déconnexion</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild variant="default" size="sm" className="hidden md:inline-flex rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3 py-1.5 text-xs h-8" data-testid="login-btn">
                  <Link to="/connexion"><User className="w-3 h-3 mr-1" /> Connexion</Link>
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

      {/* Mobile Menu - version améliorée */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white" data-testid="mobile-menu">
          <div className="flex items-center justify-between p-3 border-b">
            {logoUrl ? <img src={logoUrl} alt="Cloléo" className="h-7 w-auto" /> : <span className="text-lg font-bold"><span className="text-orange-500">Clo</span><span className="text-amber-600">léo</span></span>}
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}><X className="w-5 h-5" /></Button>
          </div>
          <div className="p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-60px)]">
            {isAuthenticated ? (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-sm">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            ) : (
              <Link to="/connexion" className="flex items-center gap-2 p-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium text-sm" onClick={() => setMobileMenuOpen(false)}><User className="w-4 h-4" /> Connexion / Inscription</Link>
            )}
            {isAdmin && <Link to="/admin" className="flex items-center gap-2 py-2.5 border-b font-medium text-amber-600 text-sm" onClick={() => setMobileMenuOpen(false)}><Crown className="w-4 h-4" /> Administration</Link>}
            {isVendor && !isAdmin && <Link to="/vendeur" className="flex items-center gap-2 py-2.5 border-b font-medium text-orange-600 text-sm" onClick={() => setMobileMenuOpen(false)}><Store className="w-4 h-4" /> Espace vendeur</Link>}
            <Link to="/categories" className="block py-2.5 border-b font-medium text-sm" onClick={() => setMobileMenuOpen(false)}>Toutes les catégories</Link>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => (
                <Link key={cat.slug} to={`/categories/${cat.slug}`} className="block py-2 text-sm text-gray-600 hover:text-orange-500" onClick={() => setMobileMenuOpen(false)}>{cat.name}</Link>
              ))}
            </div>
            <div className="pt-2 border-t space-y-2">
              <Link to="/favoris" className="flex items-center gap-2 py-2 text-sm" onClick={() => setMobileMenuOpen(false)}><Heart className="w-4 h-4" /> Mes favoris</Link>
              {isAuthenticated && <Link to="/abonnements" className="flex items-center gap-2 py-2 text-sm" onClick={() => setMobileMenuOpen(false)}><Bell className="w-4 h-4" /> Mes abonnements</Link>}
              <Link to="/panier" className="flex items-center gap-2 py-2 text-sm" onClick={() => setMobileMenuOpen(false)}><ShoppingCart className="w-4 h-4" /> Mon panier ({cart.item_count})</Link>
            </div>
            {isAuthenticated && (<div className="pt-2 border-t"><button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="flex items-center gap-2 py-2 text-sm text-red-600 w-full"><LogOut className="w-4 h-4" /> Déconnexion</button></div>)}
          </div>
        </div>
      )}

      {/* Mobile Search Overlay - amélioré */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-white" onClick={() => setSearchOpen(false)}>
          <div className="bg-white p-3 border-b" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch({ q: searchQuery }); }} className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-full text-sm h-10"
                autoFocus
              />
              <Button type="submit" size="icon" className="rounded-full bg-orange-500 hover:bg-orange-600 w-10 h-10">
                <Search className="w-4 h-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSearchOpen(false)} className="rounded-full w-10 h-10">
                <X className="w-5 h-5" />
              </Button>
            </form>
          </div>
          {/* Suggestions rapides dans l'overlay */}
          <div className="p-3">
            <p className="text-xs text-slate-400 mb-2">Suggestions populaires</p>
            <div className="flex flex-wrap gap-2">
              {['Sac à main', 'Montre', 'Robe', 'Téléphone', 'Parfum', 'Chaussures'].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setSearchQuery(item);
                    handleSearch({ q: item });
                  }}
                  className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-slate-600 hover:bg-orange-100"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;