import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChevronRight, Smartphone, Shirt, Home, Car, Gift, Sparkles, Heart, Globe, 
  Briefcase, Baby, Activity, Gamepad2, Music, Camera, Watch, Headphones, 
  ShoppingBag, Flower2, Coffee, Package, Wrench, Palette, Gem, Apple, 
  Monitor, Phone, User, Crown, Eye, Droplet, 
  Scissors, Dumbbell, Bike, Trophy, Users, Mountain, 
  Book, Shield, ShoppingCart, Leaf, Zap, Armchair, 
  Building2, Utensils, ArrowRight, MessageSquare
} from 'lucide-react';

const MegaMenu = () => {
  const [activeCategory, setActiveCategory] = useState(null);
  const menuRef = useRef(null);

  const categories = [
    {
      id: 'electronique',
      name: 'Électronique',
      icon: <Smartphone className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80',
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
      subcategories: [
        { name: 'Vêtements Bébé', slug: 'vetements-bebe', icon: <Baby className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=400&q=80' },
        { name: 'Jouets', slug: 'jouets', icon: <Gamepad2 className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400&q=80' },
        { name: 'Puériculture', slug: 'puericulture', icon: <Package className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1596701552554-994cd2f54013?w=400&q=80' },
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
      subcategories: [
        { name: 'Pièces Auto', slug: 'pieces-auto', icon: <Wrench className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=80' },
        { name: 'Accessoires Auto', slug: 'accessoires-auto', icon: <Car className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&q=80' },
        { name: 'Moto', slug: 'moto', icon: <Bike className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=400&q=80' },
        { name: 'Équipement Moto', slug: 'equipement-moto', icon: <Shield className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=400&q=80' },
        { name: 'Outils', slug: 'outils', icon: <Wrench className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&q=80' },
        { name: 'Entretien', slug: 'entretien', icon: <Droplet className="w-4 h-4" />, image: 'https://images.unsplash.com/photo-1619642751034-760dfbf21cf1?w=400&q=80' },
      ]
    }
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveCategory(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="border-b border-gray-200 bg-white shadow-sm" ref={menuRef}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
          {/* Categories */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {categories.map((category) => (
              <div
                key={category.id}
                className="relative group"
                onMouseEnter={() => setActiveCategory(category.id)}
                onMouseLeave={() => setActiveCategory(null)}
              >
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group-hover:scale-105"
                style={{ minWidth: '140px' }}
                onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
                aria-expanded={activeCategory === category.id}
                  aria-haspopup="true"
                >
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${category.color} text-white`}>
                    {category.icon}
                  </div>
                  <span className="font-semibold text-gray-800 text-sm whitespace-nowrap">{category.name}</span>
                  <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${activeCategory === category.id ? 'rotate-90' : ''}`} />
                </button>

                {/* Mega Menu Dropdown */}
                {activeCategory === category.id && (
                  <div className="absolute left-0 top-full mt-2 w-[800px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    <div className="flex h-[400px]">
                      {/* Left Panel - Subcategories */}
                      <div className="w-1/2 p-6 border-r border-gray-100 overflow-y-auto">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                          {category.icon}
                          {category.name}
                        </h3>
                        <div className="space-y-2">
                          {category.subcategories.map((sub) => (
                            <Link
                              key={sub.slug}
                              to={`/category/${sub.slug}`}
                              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200 group/sub"
                              onClick={() => setActiveCategory(null)}
                            >
                              <div className="p-2 rounded-lg bg-gray-100 group-hover/sub:bg-gradient-to-br group-hover/sub:from-purple-500 group-hover/sub:to-pink-500 text-gray-600 group-hover/sub:text-white transition-all duration-200">
                                {sub.icon}
                              </div>
                              <div className="flex-1">
                                <span className="font-medium text-gray-800 group-hover/sub:text-purple-700 transition-colors">{sub.name}</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover/sub:text-purple-500 group-hover/sub:translate-x-1 transition-all duration-200" />
                            </Link>
                          ))}
                        </div>
                      </div>

                      {/* Right Panel - Featured Image */}
                      <div className="w-1/2 relative overflow-hidden">
                        <img
                          src={category.image}
                          alt={category.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <h4 className="text-white text-xl font-bold mb-2">Découvrez {category.name}</h4>
                          <p className="text-white/80 text-sm mb-4">Explorez notre sélection de produits {category.name.toLowerCase()}</p>
                          <Link
                            to={`/category/${category.subcategories[0]?.slug || category.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-full font-semibold hover:bg-purple-600 hover:text-white transition-all duration-200"
                            onClick={() => setActiveCategory(null)}
                          >
                            Voir tout
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Special Offers */}
          <div className="flex items-center gap-4">
            <Link
              to="/forum"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 hover:scale-105"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="font-semibold text-sm">Forum</span>
            </Link>
            <Link
              to="/produits?discount=true"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-all duration-200 hover:scale-105"
            >
              <Gift className="w-4 h-4" />
              <span className="font-semibold text-sm">Promotions</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MegaMenu;