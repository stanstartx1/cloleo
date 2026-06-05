import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Search, Menu, X, ChevronDown, User, Store, Crown, LogOut, Truck, MessageCircle, Bell, Settings, Eye, Filter, DollarSign, Star, TrendingUp, Clock } from 'lucide-react';
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

// Composant Mega Menu Recherche - version optimisée
const SearchMegaMenu = ({ isOpen, onClose, onSearch, searchQuery, setSearchQuery }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [certifiedVendors, setCertifiedVendors] = useState([]);
  const menuRef = useRef(null);

  // Charger les suggestions depuis l'API
  useEffect(() => {
    if (!isOpen || !searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        // Suggestions de produits
        const response = await axios.get(`${API}/search/suggestions?q=${encodeURIComponent(searchQuery)}&limit=8`);
        setSuggestions(response.data.suggestions || []);
      } catch (error) {
        console.error('Erreur suggestions:', error);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, isOpen]);

  // Charger les données dynamiques
  useEffect(() => {
    if (!isOpen) return;

    // Charger les recherches populaires
    const fetchTrending = async () => {
      try {
        const response = await axios.get(`${API}/search/trending?limit=6`);
        setTrendingSearches(response.data.trending || [
          'Sac à main', 'Montre connectée', 'Robe africaine', 
          'Téléphone portable', 'Parfum', 'Chaussures'
        ]);
      } catch (error) {
        setTrendingSearches(['Sac à main', 'Montre connectée', 'Robe africaine', 'Téléphone portable', 'Parfum', 'Chaussures']);
      }
    };

    // Charger les vendeurs certifiés
    const fetchCertifiedVendors = async () => {
      try {
        const response = await axios.get(`${API}/vendors/certified?limit=4`);
        setCertifiedVendors(response.data.vendors || []);
      } catch (error) {
        setCertifiedVendors([]);
      }
    };

    // Charger les recherches récentes du localStorage
    const stored = localStorage.getItem('recent_searches');
    if (stored) {
      setRecentSearches(JSON.parse(stored).slice(0, 5));
    }

    fetchTrending();
    fetchCertifiedVendors();
  }, [isOpen]);

  // Sauvegarder une recherche
  const saveRecentSearch = (term) => {
    const stored = localStorage.getItem('recent_searches');
    let recent = stored ? JSON.parse(stored) : [];
    recent = [term, ...recent.filter(t => t !== term)].slice(0, 10);
    localStorage.setItem('recent_searches', JSON.stringify(recent));
    setRecentSearches(recent.slice(0, 5));
  };

  const handleSearchClick = (term) => {
    setSearchQuery(term);
    saveRecentSearch(term);
    onSearch({ q: term });
  };

  const clearRecentSearches = () => {
    localStorage.removeItem('recent_searches');
    setRecentSearches([]);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 right-0 z-50 bg-white shadow-xl border-t border-slate-200 rounded-b-2xl" ref={menuRef}>
      <div className="max-w-screen-xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[450px] overflow-y-auto">
          
          {/* Colonne gauche : Suggestions et recherches récentes */}
          <div className="md:col-span-8 border-r border-slate-100">
            
            {/* Suggestions en direct */}
            {searchQuery.trim() && (
              <div className="p-3 border-b border-slate-100">
                <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggestions pour "{searchQuery}"</h3>
                {suggestionsLoading ? (
                  <div className="space-y-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-8 bg-slate-100 animate-pulse rounded-lg"></div>
                    ))}
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="space-y-0.5">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSearchClick(suggestion)}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Search className="w-3 h-3 text-slate-400" />
                        <span className="text-slate-700">{suggestion}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-2">Aucune suggestion pour "{searchQuery}"</p>
                )}
              </div>
            )}

            {/* Recherches récentes */}
            {!searchQuery.trim() && recentSearches.length > 0 && (
              <div className="p-3 border-b border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Récentes
                  </h3>
                  <button onClick={clearRecentSearches} className="text-[10px] text-slate-400 hover:text-red-500">
                    Effacer
                  </button>
                </div>
                <div className="space-y-0.5">
                  {recentSearches.map((term, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearchClick(term)}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-2 text-sm"
                    >
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-700">{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tendances de recherche */}
            {!searchQuery.trim() && (
              <div className="p-3 border-b border-slate-100">
                <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Tendances
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {trendingSearches.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSearchClick(item)}
                      className="px-2 py-1 bg-slate-100 hover:bg-orange-100 rounded-full text-[11px] text-slate-600 transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Catégories populaires */}
            {!searchQuery.trim() && (
              <div className="p-3">
                <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Catégories populaires</h3>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.slice(0, 6).map((cat) => (
                    <Link
                      key={cat.slug}
                      to={`/categories/${cat.slug}`}
                      onClick={onClose}
                      className="px-2 py-1 bg-slate-100 hover:bg-orange-100 rounded-full text-[11px] text-slate-600 transition-colors"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite : Vendeurs certifiés et catégories */}
          <div className="md:col-span-4 p-3 bg-slate-50">
            {/* Vendeurs certifiés */}
            <div className="mb-3">
              <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500" /> Vendeurs certifiés
              </h3>
              {certifiedVendors.length > 0 ? (
                <div className="space-y-1.5">
                  {certifiedVendors.map((vendor) => (
                    <Link
                      key={vendor.id}
                      to={`/vendor-shop/${vendor.id}`}
                      onClick={onClose}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <Store className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-700 group-hover:text-orange-600">
                          {vendor.shop_name || vendor.name}
                        </p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          <span>{vendor.rating || '5.0'} • {vendor.product_count || 0} produits</span>
                        </p>
                      </div>
                      <div className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                        Certifié
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400 text-xs">
                  <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Aucun vendeur certifié</p>
                </div>
              )}
            </div>

            {/* Lien vers tous les vendeurs */}
            <Link
              to="/vendeurs-certifies"
              onClick={onClose}
              className="block text-center text-xs text-orange-500 hover:text-orange-600 mt-2"
            >
              Voir tous les vendeurs certifiés →
            </Link>
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

  // Charger le logo depuis le backend
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
      navigate(`/recherche?q=${encodeURIComponent(filters.q)}`);
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
            <div className="hidden lg:flex items-center gap-5 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 font-medium hover:text-orange-500 transition-all duration-300 nav-item">
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
              <Link to="/produits?featured=true" className="font-medium hover:text-orange-500 transition-all duration-300 nav-item">
                Tendances
              </Link>
              <Link to="/produits?sort_by=created_at" className="font-medium hover:text-orange-500 transition-all duration-300 nav-item">
                Nouveautés
              </Link>
            </div>

            {/* Search bar - Desktop avec Mega Menu */}
            <div className="hidden md:flex items-center flex-1 min-w-0 max-w-md xl:max-w-lg mx-1 lg:mx-2 relative">
              <div className="relative w-full">
                <div 
                  className="flex items-center bg-gray-100 rounded-full px-4 py-2 cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={handleSearchClick}
                >
                  <Search className="w-4 h-4 text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500 flex-1">Rechercher un produit...</span>
                </div>
                {/* Mega Menu intégré */}
                <SearchMegaMenu
                  isOpen={megaMenuOpen}
                  onClose={() => setMegaMenuOpen(false)}
                  onSearch={handleSearch}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              </div>
            </div>

            {/* Actions - rapprochées */}
            <div className="ml-auto flex items-center gap-0.5 sm:gap-1 shrink-0">
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