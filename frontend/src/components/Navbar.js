import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Heart, Search, Menu, X, ChevronDown, User, Store, 
  Crown, LogOut, Truck, MessageCircle, Bell, Settings, Eye, 
  Filter, Star, TrendingUp, Package, Tag, ChevronRight 
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

// Composant Mega Menu Recherche
const SearchMegaMenu = ({ isOpen, onClose, onSearch, searchQuery, setSearchQuery, inputRef }) => {
  const [filters, setFilters] = useState({
    certifiedVendor: false,
    neuf: false,
    occasion: false,
  });
  const [suggestions, setSuggestions] = useState([]);
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  // Charger les suggestions en temps réel
  useEffect(() => {
    if (!isOpen) return;
    
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setProductSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/search/suggestions?q=${encodeURIComponent(searchQuery)}&limit=5`);
        setSuggestions(response.data.suggestions || []);
        
        const productsRes = await axios.get(`${API}/search/products?q=${encodeURIComponent(searchQuery)}&limit=4`);
        setProductSuggestions(productsRes.data.products || []);
      } catch (error) {
        console.error('Erreur suggestions:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, isOpen]);

  // Fermer le menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          inputRef?.current && !inputRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, inputRef]);

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
    <div className="absolute top-full left-0 right-0 z-50 bg-white shadow-xl border-t border-slate-200 rounded-b-2xl mt-1" ref={menuRef}>
      <div className="max-w-4xl mx-auto p-4">
        
        {/* Barre de recherche dans le méga menu */}
        <div className="mb-4 p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-orange-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Que recherchez-vous ?"
              className="flex-1 bg-transparent border-none outline-none text-slate-700 placeholder-slate-400 text-base"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-slate-200 rounded-full">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Suggestions */}
        {searchQuery.trim() && (
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Suggestions</h3>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={`s-${idx}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-3 text-sm"
                  >
                    <Search className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{suggestion}</span>
                  </button>
                ))}
                {productSuggestions.map((product) => (
                  <button
                    key={`p-${product.id}`}
                    onClick={() => handleSuggestionClick(product.name)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-3 text-sm group"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400 m-2.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-700 group-hover:text-orange-600">{product.name}</p>
                      <p className="text-xs text-slate-400">{product.price?.toLocaleString()} FCFA</p>
                    </div>
                    <Tag className="w-3 h-3 text-slate-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Grille du méga menu */}
        {!searchQuery.trim() && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Catégories
              </h3>
              <div className="space-y-1">
                {CATEGORIES.slice(0, 8).map((cat) => (
                  <Link
                    key={cat.slug}
                    to={`/categories/${cat.slug}`}
                    onClick={onClose}
                    className="block px-2 py-1.5 text-sm text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
                <Link
                  to="/categories"
                  onClick={onClose}
                  className="block px-2 py-1.5 text-xs text-orange-500 hover:text-orange-600 mt-2"
                >
                  Voir toutes →
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Tendances
              </h3>
              <div className="space-y-1">
                {['Sac à main', 'Montre connectée', 'Robe africaine', 'Téléphone', 'Parfum', 'Chaussures'].map((item) => (
                  <button
                    key={item}
                    onClick={() => handleSuggestionClick(item)}
                    className="w-full text-left px-2 py-1.5 text-sm text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filtres
              </h3>
              <div className="space-y-2">
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.neuf}
                    onChange={(e) => setFilters({ ...filters, neuf: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs text-slate-600">Neuf</span>
                </label>
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

              <div className="flex gap-2 mt-4">
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

            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-3">
              <h3 className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-2">Bon plan</h3>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">-20%</div>
                <p className="text-xs text-slate-600">Sur votre première commande</p>
                <p className="text-[10px] text-slate-400 mt-1">Code: <span className="font-mono bg-white px-1 rounded">CLOLEO20</span></p>
              </div>
              <div className="border-t border-orange-200 pt-2 mt-3">
                <Link
                  to="/produits?promo=true"
                  onClick={onClose}
                  className="flex items-center justify-center gap-1 text-xs text-orange-600 hover:text-orange-700"
                >
                  Voir les offres <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-4 pt-2 border-t border-slate-100">
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">
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

            {/* Search bar - Desktop */}
            <div className="hidden md:flex items-center flex-1 min-w-0 max-w-sm mx-1 relative" ref={searchContainerRef}>
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
                  inputRef={searchContainerRef}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="ml-2 flex items-center gap-1 sm:gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full w-8 h-8"
                onClick={() => setSearchOpen(true)}
                data-testid="mobile-search-btn"
              >
                <Search className="w-4 h-4" />
              </Button>

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

              <Button variant="ghost" size="icon" asChild className="hidden md:flex rounded-full w-8 h-8 hover:bg-red-50">
                <Link to="/favoris" data-testid="favorites-btn">
                  <Heart className="w-4 h-4 hover:text-red-500 transition-colors" />
                </Link>
              </Button>

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
                <Button asChild variant="default" size="sm" className="hidden md:inline-flex rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-3 py-1.5 text-xs h-8" data-testid="login-btn">
                  <Link to="/connexion"><User className="w-3 h-3 mr-1" /> Connexion</Link>
                </Button>
              )}

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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white" data-testid="mobile-menu">
          <div className="flex items-center justify-between p-4 border-b">
            {logoUrl ? <img src={logoUrl} alt="Cloléo" className="h-8 w-auto" /> : <span className="text-xl font-bold"><span className="text-orange-500">Clo</span><span className="text-amber-600">léo</span></span>}
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}><X className="w-6 h-6" /></Button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-80px)]">
            {isAuthenticated ? (
              <div className="p-4 bg-gray-50 rounded-lg mb-4"><p className="font-medium">{user?.name}</p><p className="text-sm text-gray-500">{user?.email}</p></div>
            ) : (
              <Link to="/connexion" className="flex items-center gap-2 p-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium" onClick={() => setMobileMenuOpen(false)}><User className="w-5 h-5" /> Connexion / Inscription</Link>
            )}
            {isAdmin && <Link to="/admin" className="flex items-center gap-2 py-3 border-b font-medium text-amber-600" onClick={() => setMobileMenuOpen(false)}><Crown className="w-5 h-5" /> Administration</Link>}
            {isVendor && !isAdmin && <Link to="/vendeur" className="flex items-center gap-2 py-3 border-b font-medium text-orange-600" onClick={() => setMobileMenuOpen(false)}><Store className="w-5 h-5" /> Espace vendeur</Link>}
            <Link to="/categories" className="block py-3 border-b font-medium" onClick={() => setMobileMenuOpen(false)}>Toutes les catégories</Link>
            {CATEGORIES.map((cat) => (<Link key={cat.slug} to={`/categories/${cat.slug}`} className="block py-2 text-gray-600 hover:text-orange-500" onClick={() => setMobileMenuOpen(false)}>{cat.name}</Link>))}
            <div className="pt-4 border-t space-y-2">
              <Link to="/favoris" className="flex items-center gap-2 py-2" onClick={() => setMobileMenuOpen(false)}><Heart className="w-5 h-5" /> Mes favoris</Link>
              {isAuthenticated && <Link to="/abonnements" className="flex items-center gap-2 py-2" onClick={() => setMobileMenuOpen(false)}><Bell className="w-5 h-5" /> Mes abonnements</Link>}
              <Link to="/panier" className="flex items-center gap-2 py-2" onClick={() => setMobileMenuOpen(false)}><ShoppingCart className="w-5 h-5" /> Mon panier ({cart.item_count})</Link>
            </div>
            {isAuthenticated && (<div className="pt-4 border-t"><button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="flex items-center gap-2 py-2 text-red-600 w-full"><LogOut className="w-5 h-5" /> Déconnexion</button></div>)}
          </div>
        </div>
      )}

      {/* Mobile Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div className="bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch({ q: searchQuery }); }} className="flex items-center gap-2">
              <Input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 rounded-full" autoFocus />
              <Button type="submit" size="icon" className="rounded-full bg-orange-500 hover:bg-orange-600"><Search className="w-4 h-4" /></Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => setSearchOpen(false)} className="rounded-full"><X className="w-4 h-4" /></Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;