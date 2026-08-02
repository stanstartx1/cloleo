import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, MapPin, Phone, Mail, Globe, Star, Shield, Award, 
  Users, Clock, CheckCircle, ChevronRight, Filter, Grid, List,
  Heart, Share2, MessageCircle, Facebook, Instagram, Linkedin, Twitter,
  Youtube, Calendar, Package, TrendingUp, Zap, Crown, Sparkles,
  ArrowLeft, Search, SlidersHorizontal
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { toAbsoluteMediaUrl } from '../utils/media';
import { API_URL } from '../config/api';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const EnterpriseShopPage = () => {
  const { id } = useParams();
  const [enterprise, setEnterprise] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchEnterpriseData();
  }, [id]);

  const fetchEnterpriseData = async () => {
    try {
      setLoading(true);
      const [enterpriseRes, productsRes] = await Promise.all([
        axios.get(`${API}/enterprises/${id}`),
        axios.get(`${API}/products/seller/${id}`)
      ]);
      setEnterprise(enterpriseRes.data);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error fetching enterprise shop data:', error);
      toast.error('Erreur lors du chargement de la boutique');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category_slug === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'price-asc') return a.price_fcfa - b.price_fcfa;
      if (sortBy === 'price-desc') return b.price_fcfa - a.price_fcfa;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  const categories = [...new Set(products.map(p => p.category_slug))];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header Skeleton */}
        <div className="h-64 bg-gradient-to-r from-slate-200 to-slate-300 animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 -mt-20">
          <div className="flex items-end gap-6 mb-8">
            <Skeleton className="w-32 h-32 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!enterprise) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">Boutique non trouvée</p>
          <Link to="/" className="inline-block mt-4 text-amber-600 hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Cover Photo */}
      <div className="relative h-64 md:h-80 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 overflow-hidden">
        {enterprise.shop_cover_photo && (
          <img
            src={toAbsoluteMediaUrl(enterprise.shop_cover_photo)}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Back Button */}
        <Link to="/" className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-slate-800 hover:bg-white transition-colors shadow-lg">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Retour</span>
        </Link>

        {/* Share & Contact Buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button size="sm" className="bg-white text-slate-800 hover:bg-slate-100 shadow-lg">
            <Share2 className="w-4 h-4 mr-2" />
            Partager
          </Button>
          <Button size="sm" className="bg-white text-slate-800 hover:bg-slate-100 shadow-lg">
            <MessageCircle className="w-4 h-4 mr-2" />
            Contacter
          </Button>
        </div>
      </div>

      {/* Profile Section */}
      <div className="max-w-7xl mx-auto px-4 -mt-12">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-8">
          {/* Profile Photo */}
          <div className="relative">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-white">
              <img
                src={toAbsoluteMediaUrl(enterprise.profile_photo) || 'https://via.placeholder.com/150'}
                alt={enterprise.company_name}
                className="w-full h-full object-cover"
              />
            </div>
            {enterprise.is_verified && (
              <div className="absolute bottom-2 right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            )}
          </div>

          {/* Company Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{enterprise.company_name}</h1>
              {enterprise.business_type && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                  {enterprise.business_type}
                </span>
              )}
            </div>
            <p className="text-slate-600 mb-3 line-clamp-2">{enterprise.company_description}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
              {enterprise.city && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{enterprise.city}, {enterprise.country}</span>
                </div>
              )}
              {enterprise.year_founded && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Depuis {enterprise.year_founded}</span>
                </div>
              )}
              {enterprise.number_of_employees && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{enterprise.number_of_employees} employés</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div className="text-center px-4 py-2 bg-white rounded-xl shadow-md">
              <div className="text-2xl font-bold text-amber-600">{products.length}</div>
              <div className="text-xs text-slate-600">Produits</div>
            </div>
            <div className="text-center px-4 py-2 bg-white rounded-xl shadow-md">
              <div className="text-2xl font-bold text-amber-600">4.8</div>
              <div className="text-xs text-slate-600">Note</div>
            </div>
            <div className="text-center px-4 py-2 bg-white rounded-xl shadow-md">
              <div className="text-2xl font-bold text-amber-600">98%</div>
              <div className="text-xs text-slate-600">Réponse</div>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="flex gap-3 mb-8">
          {enterprise.facebook && (
            <a href={enterprise.facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-lg hover:bg-slate-100 transition-colors shadow-sm">
              <Facebook className="w-5 h-5 text-blue-600" />
            </a>
          )}
          {enterprise.instagram && (
            <a href={enterprise.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-lg hover:bg-slate-100 transition-colors shadow-sm">
              <Instagram className="w-5 h-5 text-pink-600" />
            </a>
          )}
          {enterprise.linkedin && (
            <a href={enterprise.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-lg hover:bg-slate-100 transition-colors shadow-sm">
              <Linkedin className="w-5 h-5 text-blue-700" />
            </a>
          )}
          {enterprise.twitter && (
            <a href={enterprise.twitter} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-lg hover:bg-slate-100 transition-colors shadow-sm">
              <Twitter className="w-5 h-5 text-sky-500" />
            </a>
          )}
          {enterprise.youtube && (
            <a href={enterprise.youtube} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-lg hover:bg-slate-100 transition-colors shadow-sm">
              <Youtube className="w-5 h-5 text-red-600" />
            </a>
          )}
          {enterprise.website && (
            <a href={enterprise.website} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-lg hover:bg-slate-100 transition-colors shadow-sm">
              <Globe className="w-5 h-5 text-slate-600" />
            </a>
          )}
        </div>

        {/* Certifications & Badges */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-8 border border-amber-200">
          <div className="flex flex-wrap items-center gap-4">
            {enterprise.is_verified && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-slate-700">Entreprise vérifiée</span>
              </div>
            )}
            {enterprise.certifications?.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
                <Award className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-slate-700">Certifiée</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
              <Zap className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-slate-700">Réponse rapide</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm">
              <Crown className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-slate-700">Membre Premium</span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="newest">Plus récents</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="name">Nom A-Z</option>
            </select>

            {/* View Toggle */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-amber-500 hover:bg-amber-600' : ''}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-amber-500 hover:bg-amber-600' : ''}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              Nos produits ({filteredProducts.length})
            </h2>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">Aucun produit trouvé</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6' 
              : 'space-y-4'
            }>
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/produit/${product.id}`}
                  className={viewMode === 'grid' 
                    ? 'group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300' 
                    : 'group bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex gap-6'
                  }
                >
                  {product.images?.[0] && (
                    <div className={viewMode === 'grid' 
                      ? 'aspect-square overflow-hidden' 
                      : 'w-48 h-48 flex-shrink-0 rounded-xl overflow-hidden'
                    }>
                      <img
                        src={toAbsoluteMediaUrl(product.images[0])}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className={viewMode === 'grid' ? 'p-4' : 'flex-1'}>
                    <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
                      {product.name}
                    </h3>
                    {product.short_description && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                        {product.short_description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg font-bold text-amber-600">
                        {formatPrice(product.promo_price_fcfa || product.price_fcfa)} FCFA
                      </span>
                      {product.promo_price_fcfa && (
                        <span className="text-sm text-slate-400 line-through">
                          {formatPrice(product.price_fcfa)} FCFA
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {product.stock > 0 ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          En stock
                        </span>
                      ) : (
                        <span className="text-red-600">Rupture</span>
                      )}
                      {product.wholesale_enabled && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          Gros disponible
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 mb-8 text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">Contactez-nous</h3>
              <p className="text-amber-100 mb-6">
                Une question sur nos produits ? N'hésitez pas à nous contacter !
              </p>
              <div className="space-y-3">
                {enterprise.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5" />
                    <span>{enterprise.phone}</span>
                  </div>
                )}
                {enterprise.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5" />
                    <span>{enterprise.email}</span>
                  </div>
                )}
                {enterprise.city && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5" />
                    <span>{enterprise.city}, {enterprise.country}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <Button size="lg" className="bg-white text-amber-600 hover:bg-amber-50 mb-3">
                <MessageCircle className="w-5 h-5 mr-2" />
                Envoyer un message
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
                <Heart className="w-5 h-5 mr-2" />
                Suivre la boutique
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseShopPage;
