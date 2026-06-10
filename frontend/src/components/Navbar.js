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
    <div
      className="absolute top-full left-0 right-0 z-50 bg-white shadow-2xl border-t-2 border-orange-400 rounded-b-2xl mt-1 max-h-[80vh] overflow-y-auto"
      ref={menuRef}
    >
      <div className="max-w-2xl mx-auto p-4 md:p-5">
        
        {/* Barre de recherche */}
        <div className="mb-4 p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-orange-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Que recherchez-vous ?"
              className="flex-1 bg-transparent border-none outline-none text-slate-800 font-semibold placeholder-slate-400 text-sm md:text-base"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-orange-100 rounded-full transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Suggestions */}
        {searchQuery.trim() && searchQuery.length >= 2 && (
          <div className="mb-4">
            <h3 className="text-[11px] font-bold text-orange-500 uppercase tracking-wider mb-2">Suggestions</h3>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-1">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-3 text-sm"
                  >
                    <Search className="w-4 h-4 text-orange-400" />
                    <span className="text-slate-700 font-medium">{suggestion}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-2 font-medium">Aucune suggestion pour "{searchQuery}"</p>
            )}
          </div>
        )}

        {/* Filtres */}
        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-[11px] font-bold text-orange-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Filtres
          </h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.certifiedVendor}
                onChange={(e) => setFilters({ ...filters, certifiedVendor: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-700 font-semibold flex items-center gap-1.5 group-hover:text-orange-600 transition-colors">
                <Star className="w-3.5 h-3.5 text-amber-500" /> Vendeur certifié
              </span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.neuf}
                onChange={(e) => setFilters({ ...filters, neuf: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-700 font-semibold group-hover:text-orange-600 transition-colors">Neuf</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.occasion}
                onChange={(e) => setFilters({ ...filters, occasion: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-xs text-slate-700 font-semibold group-hover:text-orange-600 transition-colors">Occasion</span>
            </label>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleApplyFilters}
              className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2 rounded-xl font-bold text-xs hover:from-orange-600 hover:to-amber-600 transition shadow-sm"
            >
              Appliquer les filtres
            </button>
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 font-semibold hover:bg-slate-100 transition"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-3 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors">
            Fermer ✕
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
        const response = await fetch(`${API}/logo-settings`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} when fetching logo`);
        }

        const contentType = response.headers.get('content-type') || '';
        let data = null;

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.warn('Logo endpoint returned non-JSON response:', contentType, text.slice(0, 200));
          return;
        }

        if (data && data.logo_url && data.logo_url.trim()) {
          let logo = data.logo_url;
          if (logo.startsWith('/')) {
            logo = `${API_BASE}${logo}`;
          }
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

  const handleImageError = (e) => {
    e.target.style.display = 'none';
    const parent = e.target.parentElement;
    if (parent && parent.parentElement) {
      const fallback = parent.parentElement.querySelector('.logo-fallback');
      if (fallback) {
        e.target.style.display = 'none';
        fallback.style.display = 'flex';
      }
    }
  };

  return (
    <>
      {/* ── Navbar principale ── hauteur augmentée : h-16 mobile / h-20 desktop */}
      <nav
        className="sticky top-0 z-40 bg-white shadow-md transition-all duration-300 border-b-2 border-orange-100"
        data-testid="navbar"
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center h-20 md:h-28 gap-3 md:gap-4 lg:gap-6">
            
            {/* ── Logo ── */}
            <Link to="/" className="flex items-center gap-2 group shrink-0" data-testid="logo">
              {!logoLoading && logoUrl ? (
                <div className="relative bg-white/80 backdrop-blur-sm rounded-xl p-1.5 shadow-sm transition-all duration-300 group-hover:shadow-md">
                  <img 
                    src={logoUrl} 
                    alt="Cloléo" 
                    className="h-14 md:h-20 w-auto object-contain transition-all duration-300 group-hover:scale-105"
                    onError={handleImageError}
                  />
                  <div className="logo-fallback hidden absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl items-center justify-center">
                    <span className="text-white font-black text-lg md:text-2xl">C</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-xl md:text-3xl transition-all duration-500 group-hover:scale-110 shadow-sm">
                    C
                  </div>
                  <span className="text-xl md:text-2xl font-black tracking-tight">
                    <span className="text-orange-500">Clo</span>
                    <span className="text-amber-600">léo</span>
                  </span>
                </>
              )}
            </Link>

            {/* ── Desktop Navigation ── */}
            <div className="hidden lg:flex items-center gap-5 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-orange-500 transition-all duration-300 text-sm tracking-wide">
                    Parcourir <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60 animate-scale-in shadow-xl">
                  {CATEGORIES.map((cat) => (
                    <DropdownMenuItem key={cat.slug} asChild className="transition-all duration-200 hover:translate-x-1 font-semibold">
                      <Link to={`/categories/${cat.slug}`}>{cat.name}</Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/categories" className="font-bold text-orange-600">Voir toutes les catégories →</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link
                to="/produits?featured=true"
                className="font-bold text-slate-700 hover:text-orange-500 transition-all duration-300 text-sm tracking-wide"
              >
                Tendances
              </Link>
              <Link
                to="/produits?sort_by=created_at"
                className="font-bold text-slate-700 hover:text-orange-500 transition-all duration-300 text-sm tracking-wide"
              >
                Nouveautés
              </Link>
            </div>

            {/* ── Barre de recherche stylée ── */}
            <div className="hidden md:flex items-center flex-1 min-w-0 max-w-xl mx-3 relative" ref={searchContainerRef}>
              <div className="relative w-full">
                <div 
                  className="flex items-center bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 hover:border-orange-400 rounded-full px-5 py-3 cursor-pointer transition-all duration-300 hover:shadow-md group"
                  onClick={handleSearchClick}
                >
                  <Search className="w-5 h-5 text-orange-400 group-hover:text-orange-600 transition-colors shrink-0" />
                  <span className="ml-3 text-sm font-semibold text-slate-500 group-hover:text-slate-700 flex-1 transition-colors">
                    Rechercher un produit...
                  </span>
                  <span className="hidden lg:flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-white border border-orange-200 rounded-full px-2 py-0.5">
                    ⌘K
                  </span>
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

            {/* ── Actions ── */}
            <div className="ml-auto flex items-center gap-1 shrink-0">
              
              {/* Bouton recherche mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full w-9 h-9 hover:bg-orange-50"
                onClick={() => setSearchOpen(true)}
                data-testid="mobile-search-btn"
              >
                <Search className="w-5 h-5 text-slate-700" />
              </Button>

              {/* Panier */}
              <Link to="/panier" data-testid="cart-btn" className="relative">
                <Button variant="ghost" size="icon" className="relative rounded-full w-9 h-9 md:w-10 md:h-10 hover:bg-orange-50">
                  <ShoppingCart className="w-5 h-5 text-slate-700 transition-transform duration-300 hover:scale-110" />
                  {cart.item_count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-4 px-1 bg-orange-500 text-white text-[9px] rounded-full flex items-center justify-center font-black leading-none shadow-md z-10">
                      {cart.item_count > 99 ? '99+' : cart.item_count}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Favoris */}
              <Button variant="ghost" size="icon" asChild className="hidden sm:flex rounded-full w-9 h-9 md:w-10 md:h-10 hover:bg-red-50">
                <Link to="/favoris" data-testid="favorites-btn">
                  <Heart className="w-5 h-5 text-slate-700 hover:text-red-500 transition-colors" />
                </Link>
              </Button>

              {/* Bouton Connexion (non connecté, desktop) */}
              {!isAuthenticated && (
                <Button
                  asChild
                  variant="default"
                  size="sm"
                  className="hidden md:inline-flex rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 text-xs font-bold h-9 shadow-sm hover:shadow-md hover:from-orange-600 hover:to-amber-600 transition-all"
                  data-testid="login-btn"
                >
                  <Link to="/connexion"><User className="w-3.5 h-3.5 mr-1.5" /> Connexion</Link>
                </Button>
              )}

              {/* User Menu (connecté) */}
              {isAuthenticated && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative rounded-full w-9 h-9 md:w-10 md:h-10 hover:bg-orange-50 ring-2 ring-orange-200 hover:ring-orange-400 transition-all"
                      data-testid="user-menu-btn"
                    >
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 overflow-hidden flex items-center justify-center text-white text-xs font-black">
                        {user?.profile_photo ? (
                          <img src={toAbsoluteMediaUrl(user.profile_photo)} alt={user?.name || 'Profil'} className="w-full h-full object-cover" />
                        ) : (
                          user?.name?.[0]?.toUpperCase() || 'U'
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 shadow-xl">
                    <div className="px-3 py-2.5 bg-orange-50 rounded-t-lg">
                      <p className="font-bold text-slate-800">{user?.name}</p>
                      <p className="text-xs font-medium text-slate-500">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="font-bold text-amber-600">
                          <Crown className="w-4 h-4 mr-2" /> Administration
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isDriver && (
                      <DropdownMenuItem asChild>
                        <Link to="/livreur" className="font-semibold">
                          <Truck className="w-4 h-4 mr-2" /> Espace livreur
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {isRevendeur && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/revendeur" className="font-semibold">
                            <Store className="w-4 h-4 mr-2" /> Espace revendeur
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/boutique/${user?.shop_slug || ''}`} className="font-semibold">
                            <Eye className="w-4 h-4 mr-2" /> Voir ma boutique
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {isVendor && !isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/vendeur" className="font-semibold">
                          <Store className="w-4 h-4 mr-2" /> Espace vendeur
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/favoris" className="font-semibold"><Heart className="w-4 h-4 mr-2" /> Mes favoris</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/abonnements" className="font-semibold"><Bell className="w-4 h-4 mr-2" /> Mes abonnements</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/mes-messages" className="font-semibold"><MessageCircle className="w-4 h-4 mr-2" /> Mes messages</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/parametres" className="font-semibold"><Settings className="w-4 h-4 mr-2" /> Paramètres</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 font-bold">
                      <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Menu burger mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden rounded-full w-9 h-9 hover:bg-orange-50"
                onClick={() => setMobileMenuOpen(true)}
                data-testid="mobile-menu-btn"
              >
                <Menu className="w-5 h-5 text-slate-700" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Mobile Menu ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white" data-testid="mobile-menu">
          <div className="flex items-center justify-between p-4 border-b-2 border-orange-100 bg-white">
            {logoUrl ? (
              <div className="bg-white/80 rounded-lg p-1">
                <img 
                  src={logoUrl} 
                  alt="Cloléo" 
                  className="h-8 w-auto object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            ) : (
              <span className="text-xl font-black">
                <span className="text-orange-500">Clo</span>
                <span className="text-amber-600">léo</span>
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="rounded-full hover:bg-orange-50">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-64px)]">
            {isAuthenticated ? (
              <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                <p className="font-bold text-slate-800 text-sm">{user?.name}</p>
                <p className="text-xs font-medium text-slate-500">{user?.email}</p>
              </div>
            ) : (
              <Link
                to="/connexion"
                className="flex items-center gap-2 p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold text-sm shadow-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                <User className="w-4 h-4" /> Connexion / Inscription
              </Link>
            )}

            {isAdmin && (
              <Link to="/admin" className="flex items-center gap-2 py-3 border-b font-bold text-amber-600 text-sm" onClick={() => setMobileMenuOpen(false)}>
                <Crown className="w-4 h-4" /> Administration
              </Link>
            )}
            {isVendor && !isAdmin && (
              <Link to="/vendeur" className="flex items-center gap-2 py-3 border-b font-bold text-orange-600 text-sm" onClick={() => setMobileMenuOpen(false)}>
                <Store className="w-4 h-4" /> Espace vendeur
              </Link>
            )}

            <Link to="/categories" className="block py-3 border-b font-bold text-slate-800 text-sm" onClick={() => setMobileMenuOpen(false)}>
              Toutes les catégories
            </Link>

            <div className="space-y-0.5">
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/categories/${cat.slug}`}
                  className="block py-2.5 px-2 text-sm font-semibold text-slate-600 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            <div className="pt-3 border-t space-y-1">
              <Link to="/favoris" className="flex items-center gap-2.5 py-2.5 px-2 text-sm font-semibold text-slate-700 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                <Heart className="w-4 h-4" /> Mes favoris
              </Link>
              {isAuthenticated && (
                <Link to="/abonnements" className="flex items-center gap-2.5 py-2.5 px-2 text-sm font-semibold text-slate-700 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Bell className="w-4 h-4" /> Mes abonnements
                </Link>
              )}
              <Link to="/panier" className="flex items-center gap-2.5 py-2.5 px-2 text-sm font-semibold text-slate-700 hover:text-orange-500 rounded-lg hover:bg-orange-50 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                <ShoppingCart className="w-4 h-4" /> Mon panier
                {cart.item_count > 0 && (
                  <span className="ml-auto bg-orange-500 text-white text-[10px] font-black rounded-full px-2 py-0.5">{cart.item_count}</span>
                )}
              </Link>
            </div>

            {isAuthenticated && (
              <div className="pt-3 border-t">
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2.5 py-2.5 px-2 text-sm font-bold text-red-600 w-full rounded-lg hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile Search Overlay ── */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div className="bg-white p-4 border-b-2 border-orange-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSearch({ q: searchQuery }); }}
              className="flex items-center gap-2"
            >
              <div className="flex-1 flex items-center bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-full px-4 py-2 focus-within:border-orange-500 transition-colors">
                <Search className="w-4 h-4 text-orange-400 shrink-0" />
                <Input
                  type="text"
                  placeholder="Rechercher un produit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 text-sm font-semibold text-slate-700 placeholder-slate-400 h-auto py-0 px-2"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                size="icon"
                className="rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 w-10 h-10 shadow-sm"
              >
                <Search className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(false)}
                className="rounded-full w-10 h-10 hover:bg-orange-50"
              >
                <X className="w-5 h-5" />
              </Button>
            </form>
          </div>

          {/* Suggestions rapides */}
          <div className="bg-white mt-0 p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-bold text-orange-500 uppercase tracking-wide mb-3">Suggestions populaires</p>
            <div className="flex flex-wrap gap-2">
              {['Sac à main', 'Montre', 'Robe', 'Téléphone', 'Parfum', 'Chaussures'].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setSearchQuery(item);
                    handleSearch({ q: item });
                  }}
                  className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full text-xs font-bold text-orange-600 hover:bg-orange-100 hover:border-orange-400 transition-all"
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