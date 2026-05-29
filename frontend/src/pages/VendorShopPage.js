import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Store, Package, ArrowLeft, ArrowRight, Star, MapPin, ShoppingBag, Calendar, BadgeCheck, MessageCircle, Share2, Copy, Bell, BellOff, Heart } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import axios from 'axios';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';
import { toAbsoluteMediaUrl } from '../utils/media';
import { copyToClipboard, shareOrCopy } from '../utils/share';

const API = API_URL;

const VendorShopPage = () => {
  const { sellerId } = useParams();
  const { isAuthenticated, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);

  useEffect(() => {
    const fetchShop = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API}/vendor-shop/${sellerId}?page=${page}&limit=12`);
        setShop(response.data.shop);
        setProducts(response.data.products);
        setTotalPages(response.data.total_pages);
        setTotal(response.data.total);
        setSubscriberCount(response.data.shop?.subscriber_count || 0);
        
        // Check if user is subscribed
        if (isAuthenticated && token) {
          try {
            const subRes = await axios.get(`${API}/subscriptions/check/${sellerId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setIsSubscribed(subRes.data.is_subscribed);
          } catch (e) {
            // Subscription check failed, ignore
          }
        }
      } catch (error) {
        console.error('Error fetching shop:', error);
        toast.error('Boutique non trouvée');
      } finally {
        setLoading(false);
      }
    };

    if (sellerId) {
      fetchShop();
    }
  }, [sellerId, page, isAuthenticated, token]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page]);

  const handleShare = async () => {
    const shopUrl = window.location.href;
    const res = await shareOrCopy({
      title: `Boutique ${shop?.name}`,
      text: `Découvrez la boutique ${shop?.name} sur Cloléo`,
      url: shopUrl,
    });
    if (res.copied) toast.success('Lien de la boutique copié !');
  };

  const handleCopyLink = () => {
    copyToClipboard(window.location.href).then((ok) => {
      if (ok) toast.success('Lien copié dans le presse-papier');
      else toast.error('Impossible de copier le lien');
    });
  };

  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      toast.error('Connectez-vous pour vous abonner');
      return;
    }
    
    try {
      if (isSubscribed) {
        await axios.delete(`${API}/subscriptions/${sellerId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsSubscribed(false);
        setSubscriberCount(prev => Math.max(0, prev - 1));
        toast.success('Désabonné avec succès');
      } else {
        await axios.post(`${API}/subscriptions/${sellerId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsSubscribed(true);
        setSubscriberCount(prev => prev + 1);
        toast.success('Abonné avec succès ! Vous recevrez des notifications.');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'opération');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white" data-testid="vendor-shop-loading">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 py-16">
          <div className="container mx-auto px-4 text-center">
            <Skeleton className="w-24 h-24 mx-auto rounded-full mb-4 bg-white/20" />
            <Skeleton className="h-8 w-48 mx-auto mb-2 bg-white/20" />
            <Skeleton className="h-4 w-64 mx-auto bg-white/20" />
          </div>
        </div>
        {/* Products Skeleton */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4" data-testid="vendor-shop-not-found">
        <Store className="w-20 h-20 text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vendeur non trouvé</h1>
        <p className="text-gray-500 mb-6 text-center">Cette boutique n'existe pas ou n'est plus disponible.</p>
        <Link to="/">
          <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Récemment';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white" data-testid="vendor-shop-page">
      {/* Shop Header Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTIgMi0yIDR6Ii8+PC9nPjwvZz48L3N2Zz4=')]" />
        </div>
        
        <div className="container mx-auto px-4 py-12 md:py-16 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Shop Avatar */}
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30 shadow-xl overflow-hidden">
              {shop.profile_photo ? (
                <img src={toAbsoluteMediaUrl(shop.profile_photo)} alt={shop.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl md:text-6xl font-bold text-white">
                  {shop.name?.charAt(0)?.toUpperCase() || 'V'}
                </span>
              )}
            </div>
            
            {/* Shop Info */}
            <div className="text-center md:text-left flex-1">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold">{shop.name}</h1>
                {shop.is_verified && (
                  <BadgeCheck className="w-7 h-7 text-white fill-orange-300" />
                )}
              </div>
              
              {shop.description && (
                <p className="text-white/90 max-w-xl mb-4">{shop.description}</p>
              )}
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm">
                <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
                  <MapPin className="w-4 h-4" />
                  <span>{shop.location}, {shop.country}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
                  <Calendar className="w-4 h-4" />
                  <span>Membre depuis {formatDate(shop.created_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
                  <Heart className="w-4 h-4" />
                  <span>{subscriberCount} abonné{subscriberCount > 1 ? 's' : ''}</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                <Button
                  onClick={handleSubscribe}
                  className={`${isSubscribed 
                    ? 'bg-white/20 hover:bg-white/30 text-white' 
                    : 'bg-white text-orange-600 hover:bg-white/90'
                  } transition-all`}
                >
                  {isSubscribed ? (
                    <>
                      <BellOff className="w-4 h-4 mr-2" />
                      Se désabonner
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      S'abonner
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/20"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager
                </Button>
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="border-white/40 text-white hover:bg-white/20"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copier le lien
                </Button>
              </div>
            </div>
          </div>
          
          {/* Stats - Only subscriber count and rating visible to customers */}
          <div className="grid grid-cols-2 gap-4 mt-8 max-w-md mx-auto md:mx-0">
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <p className="text-3xl font-bold">{subscriberCount}</p>
              <p className="text-white/80 text-sm">Abonnés</p>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center justify-center gap-1">
                <Star className="w-5 h-5 fill-amber-300 text-amber-300" />
                <span className="text-3xl font-bold">{shop.avg_rating || '4.5'}</span>
              </div>
              <p className="text-white/80 text-sm">Note</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tous les produits</h2>
          </div>
          <Link to="/">
            <Button variant="outline" className="hidden md:flex">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>

        {products.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product}
                  showSellerInfo={false}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-full"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                
                <div className="flex items-center gap-2">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-10 h-10 rounded-full font-medium transition-all ${
                          page === pageNum
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2 text-gray-400">...</span>
                      <button
                        onClick={() => setPage(totalPages)}
                        className={`w-10 h-10 rounded-full font-medium transition-all ${
                          page === totalPages
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-full"
                >
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Package className="w-20 h-20 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun produit disponible</h3>
            <p className="text-gray-500 mb-6">Ce vendeur n'a pas encore de produits approuvés.</p>
            <Link to="/">
              <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                Explorer d'autres produits
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorShopPage;
