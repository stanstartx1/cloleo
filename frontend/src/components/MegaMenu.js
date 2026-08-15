import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, Smartphone, Shirt, Home, Car, Gift, Sparkles, Heart, Globe, 
  Briefcase, Baby, Activity, Gamepad2, Music, Camera, Watch, Headphones, 
  ShoppingBag, Flower2, Coffee, Package, Wrench, Palette, Gem, Apple, 
  Monitor, Phone, User, Crown, Eye, Droplet, 
  Scissors, Dumbbell, Bike, Trophy, Users, Mountain, 
  Book, Shield, ShoppingCart, Leaf, Zap, Armchair, 
  Building2, Utensils, ArrowRight, MessageSquare, X, Menu,
  Flame, Star, TrendingUp, Moon, Sun, Filter, Zap as Lightning
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../config/api';

const API = API_URL;

const MegaMenu = () => {
  const { isVendor, isEnterprise } = useAuth();
  const [activeCategory, setActiveCategory] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [recommendedCategories, setRecommendedCategories] = useState([]);
  const [categoryStats, setCategoryStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(true);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const menuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const menuSlides = [
    { text: 'Livraison rapide à Abidjan', accent: 'from-orange-500 to-amber-500' },
    { text: 'Paiement sécurisé et suivi en temps réel', accent: 'from-blue-500 to-indigo-500' },
    { text: 'Nouveautés et offres chaque semaine', accent: 'from-violet-500 to-fuchsia-500' },
  ];

  // Load dark mode preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSlideIndex((index) => (index + 1) % menuSlides.length);
    }, 4500);
    return () => window.clearInterval(interval);
  }, [menuSlides.length]);

  // Load recommended categories
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await axios.get(`${API}/user/recommended-categories`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setRecommendedCategories(response.data || []);
      } catch (error) {
        console.error('Error loading recommendations:', error);
      }
    };
    fetchRecommendations();
  }, []);

  // Load category stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API}/categories/stats`);
        setCategoryStats(response.data || {});
      } catch (error) {
        console.error('Error loading stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveCategory(null);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e, categoryId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveCategory(categoryId);
    }
    if (e.key === 'Escape') {
      setActiveCategory(null);
      setMobileMenuOpen(false);
    }
  };

  // Debounced hover
  const handleMouseEnter = (categoryId) => {
    clearTimeout(hoverTimeout);
    const timeout = setTimeout(() => {
      setActiveCategory(categoryId);
    }, 150);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimeout);
    const timeout = setTimeout(() => {
      setActiveCategory(null);
    }, 300);
    setHoverTimeout(timeout);
  };

  const categories = [
    {
      id: 'electronique',
      name: 'Électronique',
      icon: <Smartphone className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80',
      badge: categoryStats['electronique']?.product_count > 0 ? `${categoryStats['electronique'].product_count}+` : null,
      trending: categoryStats['electronique']?.trending || false,
      subcategories: [
        { name: 'Smartphones', slug: 'smartphones', icon: <Phone className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80' },
        { name: 'Ordinateurs', slug: 'ordinateurs', icon: <Monitor className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&q=80' },
        { name: 'Tablettes', slug: 'tablettes', icon: <Monitor className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&q=80' },
        { name: 'Accessoires', slug: 'accessoires-tech', icon: <Headphones className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80' },
        { name: 'Appareils Photo', slug: 'appareils-photo', icon: <Camera className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80' },
        { name: 'Montres Connectées', slug: 'montres-connectees', icon: <Watch className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80' },
      ]
    },
    {
      id: 'mode',
      name: 'Mode',
      icon: <Shirt className="w-6 h-6" />,
      color: 'from-pink-500 to-rose-500',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80',
      badge: categoryStats['mode']?.product_count > 0 ? `${categoryStats['mode'].product_count}+` : null,
      trending: categoryStats['mode']?.trending || false,
      subcategories: [
        { name: 'Vêtements Homme', slug: 'vetements-homme', icon: <User className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400&q=80' },
        { name: 'Vêtements Femme', slug: 'vetements-femme', icon: <User className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80' },
        { name: 'Chaussures', slug: 'chaussures', icon: <ShoppingBag className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' },
        { name: 'Sacs & Maroquinerie', slug: 'sacs-maroquinerie', icon: <ShoppingBag className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80' },
        { name: 'Accessoires', slug: 'accessoires-mode', icon: <Gem className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80' },
        { name: 'Luxe', slug: 'luxe', icon: <Crown className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1605763240004-7d93b172d75d?w=400&q=80' },
      ]
    },
    {
      id: 'maison',
      name: 'Maison',
      icon: <Home className="w-6 h-6" />,
      color: 'from-amber-500 to-orange-500',
      image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=800&q=80',
      badge: categoryStats['maison']?.product_count > 0 ? `${categoryStats['maison'].product_count}+` : null,
      trending: categoryStats['maison']?.trending || false,
      subcategories: [
        { name: 'Meubles', slug: 'meubles', icon: <Armchair className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80' },
        { name: 'Décoration', slug: 'decoration', icon: <Palette className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&q=80' },
        { name: 'Cuisine', slug: 'cuisine', icon: <Utensils className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400&q=80' },
        { name: 'Électroménager', slug: 'electromenager', icon: <Zap className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80' },
        { name: 'Jardin', slug: 'jardin', icon: <Flower2 className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80' },
        { name: 'Bricolage', slug: 'bricolage', icon: <Wrench className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=400&q=80' },
      ]
    },
    {
      id: 'beaute',
      name: 'Beauté',
      icon: <Sparkles className="w-6 h-6" />,
      color: 'from-purple-500 to-fuchsia-500',
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80',
      badge: categoryStats['beaute']?.product_count > 0 ? `${categoryStats['beaute'].product_count}+` : null,
      trending: categoryStats['beaute']?.trending || false,
      subcategories: [
        { name: 'Maquillage', slug: 'maquillage', icon: <Eye className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=400&q=80' },
        { name: 'Soins de la Peau', slug: 'soins-peau', icon: <Droplet className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80' },
        { name: 'Parfums', slug: 'parfums', icon: <Sparkles className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80' },
        { name: 'Capillaires', slug: 'capillaires', icon: <Scissors className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80' },
        { name: 'Bien-être', slug: 'bien-etre', icon: <Heart className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80' },
        { name: 'Santé', slug: 'sante', icon: <Activity className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=80' },
      ]
    },
    {
      id: 'sport',
      name: 'Sport',
      icon: <Activity className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-500',
      image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
      badge: categoryStats['sport']?.product_count > 0 ? `${categoryStats['sport'].product_count}+` : null,
      trending: categoryStats['sport']?.trending || false,
      subcategories: [
        { name: 'Fitness', slug: 'fitness', icon: <Dumbbell className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' },
        { name: 'Vélos', slug: 'velos', icon: <Bike className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&q=80' },
        { name: 'Équipements Sport', slug: 'equipements-sport', icon: <Trophy className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80' },
        { name: 'Running', slug: 'running', icon: <Activity className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1551781800-9d8d8b8f1c0e?w=400&q=80' },
        { name: 'Sports d\'équipe', slug: 'sports-equipe', icon: <Users className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&q=80' },
        { name: 'Outdoor', slug: 'outdoor', icon: <Mountain className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&q=80' },
      ]
    },
    {
      id: 'bebes-enfants',
      name: 'Bébés & Enfants',
      icon: <Baby className="w-6 h-6" />,
      color: 'from-yellow-400 to-amber-500',
      image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&q=80',
      badge: categoryStats['bebes-enfants']?.product_count > 0 ? `${categoryStats['bebes-enfants'].product_count}+` : null,
      trending: categoryStats['bebes-enfants']?.trending || false,
      subcategories: [
        { name: 'Vêtements Bébé', slug: 'vetements-bebe', icon: <Baby className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&q=80' },
        { name: 'Jouets', slug: 'jouets', icon: <Gamepad2 className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&q=80' },
        { name: 'Puériculture', slug: 'puericulture', icon: <Package className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1599599516354-58f1948565ee?w=400&q=80' },
        { name: 'Chambre Enfant', slug: 'chambre-enfant', icon: <Home className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1505693416388-ae281c503eb7?w=400&q=80' },
        { name: 'Livres & Éducation', slug: 'livres-education', icon: <Book className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80' },
        { name: 'Sécurité', slug: 'securite-enfant', icon: <Shield className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1599599516354-58f1948565ee?w=400&q=80' },
      ]
    },
    {
      id: 'alimentation',
      name: 'Alimentation',
      icon: <Coffee className="w-6 h-6" />,
      color: 'from-red-500 to-pink-500',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
      badge: categoryStats['alimentation']?.product_count > 0 ? `${categoryStats['alimentation'].product_count}+` : null,
      trending: categoryStats['alimentation']?.trending || false,
      subcategories: [
        { name: 'Produits Frais', slug: 'produits-frais', icon: <Apple className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&q=80' },
        { name: 'Épicerie', slug: 'epicerie', icon: <ShoppingCart className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80' },
        { name: 'Boissons', slug: 'boissons', icon: <Coffee className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&q=80' },
        { name: 'Produits Locaux', slug: 'produits-locaux', icon: <Globe className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1498654077810-12c21d4d6dc3?w=400&q=80' },
        { name: 'Bio & Naturel', slug: 'bio-naturel', icon: <Leaf className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80' },
        { name: 'Pâtisserie', slug: 'patisserie', icon: <Sparkles className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80' },
      ]
    },
    {
      id: 'auto-moto',
      name: 'Auto & Moto',
      icon: <Car className="w-6 h-6" />,
      color: 'from-slate-600 to-slate-800',
      image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80',
      badge: categoryStats['auto-moto']?.product_count > 0 ? `${categoryStats['auto-moto'].product_count}+` : null,
      trending: categoryStats['auto-moto']?.trending || false,
      subcategories: [
        { name: 'Pièces Auto', slug: 'pieces-auto', icon: <Wrench className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=80' },
        { name: 'Accessoires Auto', slug: 'accessoires-auto', icon: <Car className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&q=80' },
        { name: 'Moto', slug: 'moto', icon: <Bike className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400&q=80' },
        { name: 'Équipement Moto', slug: 'equipement-moto', icon: <Shield className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80' },
        { name: 'Outils', slug: 'outils', icon: <Wrench className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&q=80' },
        { name: 'Entretien', slug: 'entretien', icon: <Droplet className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1619642751034-760dfbf21cf1?w=400&q=80' },
      ]
    },
    {
      id: 'forum',
      name: 'Forum',
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'from-purple-600 to-indigo-600',
      image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80',
      badge: null,
      trending: false,
      isForum: true,
      subcategories: [
        { name: 'Vendeurs', slug: 'forum-vendors', icon: <Briefcase className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&q=80' },
        { name: 'Entreprises', slug: 'forum-enterprises', icon: <Building2 className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80' },
        { name: 'Discussions', slug: 'forum-general', icon: <Users className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&q=80' },
      ]
    }
  ];

  const menuBg = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textColor = darkMode ? 'text-white' : 'text-gray-800';
  const subTextColor = darkMode ? 'text-gray-300' : 'text-gray-600';
  const hoverBg = darkMode ? 'hover:bg-slate-700' : 'hover:bg-gray-100';
  const dropdownBg = darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100';

  return (
    <>
      {/* Desktop Menu */}
      <div className={`border-b shadow-sm hidden md:block ${menuBg}`} ref={menuRef}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            {/* Categories */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="relative group"
                  onMouseEnter={() => handleMouseEnter(category.id)}
                  onMouseLeave={handleMouseLeave}
                >
                  <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg ${hoverBg} transition-all duration-200 group-hover:scale-105`}
                    style={{ minWidth: '140px' }}
                    onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                    onKeyDown={(e) => handleKeyDown(e, category.id)}
                    aria-expanded={activeCategory === category.id}
                    aria-haspopup="true"
                    aria-controls={`submenu-${category.id}`}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${category.color} text-white`}>
                      {category.icon}
                    </div>
                    <span className={`font-semibold ${textColor} text-sm whitespace-nowrap`}>{category.name}</span>
                    {category.trending && (
                      <Flame className="w-4 h-4 text-orange-500" />
                    )}
                    {category.badge && (
                      <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                        {category.badge}
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${activeCategory === category.id ? 'rotate-90' : ''}`} />
                  </button>

                  {/* Mega Menu Dropdown */}
                  <AnimatePresence>
                    {activeCategory === category.id && (
                      <motion.div
                        id={`submenu-${category.id}`}
                        role="menu"
                        aria-label={`Menu ${category.name}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute left-0 top-full mt-2 w-[800px] rounded-2xl shadow-2xl z-50 overflow-hidden ${dropdownBg}`}
                      >
                        <div className="flex h-[400px]">
                          {/* Left Panel - Subcategories */}
                          <div className={`w-1/2 p-6 border-r ${darkMode ? 'border-slate-700' : 'border-gray-100'} overflow-y-auto`}>
                            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${textColor}`}>
                              {category.icon}
                              {category.name}
                            </h3>
                            <div className="space-y-2">
                              {category.subcategories.map((sub) => (
                                <Link
                                  key={sub.slug}
                                  to={category.isForum ? `/forum?category=${sub.slug}` : `/category/${sub.slug}`}
                                  className={`flex items-center gap-3 p-3 rounded-xl ${hoverBg} transition-all duration-200 group/sub`}
                                  onClick={() => setActiveCategory(null)}
                                >
                                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-gray-100'} group-hover/sub:bg-gradient-to-br group-hover/sub:from-purple-500 group-hover/sub:to-pink-500 ${darkMode ? 'text-gray-300' : 'text-gray-600'} group-hover/sub:text-white transition-all duration-200`}>
                                    {sub.icon}
                                  </div>
                                  <div className="flex-1">
                                    <span className={`font-medium ${textColor} group-hover/sub:text-purple-700 transition-colors`}>{sub.name}</span>
                                  </div>
                                  <ChevronRight className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'} group-hover/sub:text-purple-500 group-hover/sub:translate-x-1 transition-all duration-200`} />
                                </Link>
                              ))}
                            </div>
                          </div>

                          {/* Right Panel - Featured Image */}
                          <div className="w-1/2 relative overflow-hidden">
                            <img
                              src={category.image}
                              alt={category.name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/800x400?text=Image+non+disponible';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-6">
                              <h4 className="text-white text-xl font-bold mb-2">Découvrez {category.name}</h4>
                              <p className="text-white/80 text-sm mb-4">Explorez notre sélection de produits {category.name.toLowerCase()}</p>
                              <Link
                                to={category.isForum ? '/forum' : `/category/${category.subcategories[0]?.slug || category.id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-full font-semibold hover:bg-purple-600 hover:text-white transition-all duration-200"
                                onClick={() => setActiveCategory(null)}
                              >
                                Voir tout
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Contextual action & controls */}
            <div className="flex items-center gap-4">
              {(isVendor || isEnterprise) ? (
                <Link to="/forum" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-semibold text-sm">Forum</span>
                </Link>
              ) : <div className="w-0" aria-hidden="true" />}

              {/* Dark Mode Toggle */}
              <button
                onClick={() => {
                  setDarkMode(!darkMode);
                  localStorage.setItem('theme', darkMode ? 'light' : 'dark');
                }}
                className={`p-2 rounded-lg ${hoverBg} transition-colors`}
                aria-label={darkMode ? 'Activer le mode clair' : 'Activer le mode sombre'}
              >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </button>

              {/* Special Offers */}
              <Link
                to="/produits?discount=true"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-all duration-200 hover:scale-105"
              >
                <Gift className="w-4 h-4" />
                <span className="font-semibold text-sm">Promotions</span>
              </Link>
            </div>
          </div>
          <div className={`relative h-9 overflow-hidden border-t ${darkMode ? 'border-slate-700' : 'border-gray-100'}`} aria-label="Informations Cloléo">
            <AnimatePresence mode="wait">
              <motion.div
                key={slideIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className={`absolute inset-0 flex items-center justify-center bg-gradient-to-r ${menuSlides[slideIndex].accent} text-white`}
              >
                <span className="text-xs font-semibold tracking-wide">{menuSlides[slideIndex].text}</span>
              </motion.div>
            </AnimatePresence>
            <div className="absolute right-4 top-1/2 z-10 flex -translate-y-1/2 gap-1">
              {menuSlides.map((slide, index) => (
                <button key={slide.text} type="button" aria-label={`Afficher l'information ${index + 1}`} onClick={() => setSlideIndex(index)} className={`h-1.5 rounded-full transition-all ${index === slideIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60 hover:bg-white'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className={`md:hidden border-b ${menuBg}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`p-2 rounded-lg ${hoverBg}`}
              aria-label="Ouvrir le menu"
            >
              <Menu className={`w-6 h-6 ${textColor}`} />
            </button>

            {(isVendor || isEnterprise) ? (
              <Link to="/forum" className="mx-4 flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white">
                <MessageSquare className="w-4 h-4" /> Forum
              </Link>
            ) : <div className="flex-1" aria-hidden="true" />}

            {/* Dark Mode Toggle Mobile */}
            <button
              onClick={() => {
                setDarkMode(!darkMode);
                localStorage.setItem('theme', darkMode ? 'light' : 'dark');
              }}
              className={`p-2 rounded-lg ${hoverBg}`}
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
          </div>
          <div className="relative h-8 overflow-hidden border-t border-gray-100">
            <AnimatePresence mode="wait">
              <motion.div key={slideIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`absolute inset-0 flex items-center justify-center bg-gradient-to-r ${menuSlides[slideIndex].accent} px-8 text-center text-[11px] font-semibold text-white`}>
                {menuSlides[slideIndex].text}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Menu Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              ref={mobileMenuRef}
              className={`fixed left-0 top-0 bottom-0 w-80 z-50 overflow-y-auto ${darkMode ? 'bg-slate-800' : 'bg-white'} md:hidden`}
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-bold ${textColor}`}>Catégories</h2>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className={`p-2 rounded-lg ${hoverBg}`}
                  >
                    <X className={`w-5 h-5 ${textColor}`} />
                  </button>
                </div>

                {/* Recommended Categories */}
                {recommendedCategories.length > 0 && (
                  <div className="mb-6">
                    <h3 className={`text-sm font-semibold ${subTextColor} mb-3 flex items-center gap-2`}>
                      <Star className="w-4 h-4 text-yellow-500" />
                      Recommandé pour vous
                    </h3>
                    <div className="space-y-2">
                      {recommendedCategories.map((catId) => {
                        const cat = categories.find(c => c.id === catId);
                        if (!cat) return null;
                        return (
                          <Link
                            key={cat.id}
                            to={cat.isForum ? '/forum' : `/category/${cat.subcategories[0]?.slug || cat.id}`}
                            className={`flex items-center gap-3 p-3 rounded-lg ${hoverBg}`}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${cat.color} text-white`}>
                              {cat.icon}
                            </div>
                            <span className={`font-medium ${textColor}`}>{cat.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* All Categories */}
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id}>
                      <button
                        onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg ${hoverBg} transition-colors`}
                      >
                        <div className={`p-2 rounded-lg bg-gradient-to-br ${category.color} text-white`}>
                          {category.icon}
                        </div>
                        <span className={`font-medium ${textColor}`}>{category.name}</span>
                        {category.trending && <Flame className="w-4 h-4 text-orange-500" />}
                        <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${activeCategory === category.id ? 'rotate-90' : ''}`} />
                      </button>

                      {activeCategory === category.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="ml-4 mt-2 space-y-1"
                        >
                          {category.subcategories.map((sub) => (
                            <Link
                              key={sub.slug}
                              to={category.isForum ? `/forum?category=${sub.slug}` : `/category/${sub.slug}`}
                              className={`block px-4 py-2 rounded-lg ${subTextColor} ${hoverBg} text-sm`}
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quick Links */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <Link
                    to="/produits?discount=true"
                    className={`flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white ${hoverBg}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Gift className="w-5 h-5" />
                    <span className="font-semibold">Promotions</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default MegaMenu;
