import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Store, Package, Users, ExternalLink, BellOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SubscriptionsPage = () => {
  const { isAuthenticated, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!isAuthenticated || !token) {
        setLoading(false);
        return;
      }
      
      try {
        const response = await axios.get(`${API}/subscriptions/my-subscriptions`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubscriptions(response.data.subscriptions || []);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        toast.error('Erreur lors du chargement des abonnements');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, [isAuthenticated, token]);

  const handleUnsubscribe = async (sellerId, sellerName) => {
    try {
      await axios.delete(`${API}/subscriptions/${sellerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptions(prev => prev.filter(s => s.id !== sellerId));
      toast.success(`Désabonné de ${sellerName}`);
    } catch (error) {
      toast.error('Erreur lors du désabonnement');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-16" data-testid="subscriptions-page">
        <div className="container mx-auto px-4 text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Bell className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Connectez-vous</h2>
          <p className="text-muted-foreground mb-8">
            Connectez-vous pour voir vos abonnements aux vendeurs et revendeurs
          </p>
          <Button asChild size="lg">
            <Link to="/connexion">Se connecter</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen py-8" data-testid="subscriptions-loading">
        <div className="container mx-auto px-4">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8" data-testid="subscriptions-page">
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Accueil</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Mes abonnements</span>
        </nav>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="w-8 h-8 text-orange-500" />
            Mes abonnements
            {subscriptions.length > 0 && (
              <span className="text-lg font-normal text-muted-foreground">
                ({subscriptions.length})
              </span>
            )}
          </h1>
        </div>

        {subscriptions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Aucun abonnement</h2>
            <p className="text-muted-foreground mb-8">
              Abonnez-vous à des vendeurs et revendeurs pour recevoir des notifications sur leurs nouveaux produits
            </p>
            <Button asChild size="lg">
              <Link to="/categories">
                Explorer les produits
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map((seller) => (
              <div 
                key={seller.id} 
                className="bg-card rounded-xl border overflow-hidden hover:shadow-lg transition-shadow"
                data-testid={`subscription-${seller.id}`}
              >
                {/* Banner */}
                <div className={`h-24 ${seller.role === 'vendor' ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-purple-600 to-indigo-700'}`}>
                  <div className="h-full flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                      {seller.role === 'vendor' ? (
                        <Store className="w-8 h-8" />
                      ) : (
                        <Package className="w-8 h-8" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">
                    {seller.shop_name || seller.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      seller.role === 'vendor' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {seller.role === 'vendor' ? 'Vendeur' : 'Revendeur'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      asChild 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                    >
                      <Link to={seller.role === 'vendor' ? `/vendeur-boutique/${seller.id}` : `/boutique/${seller.shop_slug}`}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Voir boutique
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnsubscribe(seller.id, seller.shop_name || seller.name)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <BellOff className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionsPage;
