import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Check, Crown, Sparkles, ArrowRight, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const VendorSubscription = () => {
  const navigate = useNavigate();
  const { user, token, isVendor, refreshUser, logout } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);

  useEffect(() => {
    if (!isVendor) {
      navigate('/connexion');
      return;
    }
    fetchPlans();
    
    // Check for payment completion
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollPaymentStatus(sessionId);
    }
  }, [isVendor, navigate, searchParams]);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API}/subscriptions/plans`);
      setPlans(response.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 10;
    
    if (attempts >= maxAttempts) {
      toast.error('Vérification du paiement expirée. Veuillez contacter le support.');
      return;
    }

    try {
      const response = await axios.get(`${API}/subscriptions/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.payment_status === 'paid') {
        toast.success('ðŸŽ‰ Abonnement activé avec succès !');
        await refreshUser();
        // Clear URL params
        navigate('/vendeur/abonnement', { replace: true });
        return;
      } else if (response.data.status === 'expired') {
        toast.error('Session expirée. Veuillez réessayer.');
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
    } catch (error) {
      console.error('Error checking payment:', error);
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
    }
  };

  const handleSubscribe = async (planId) => {
    setProcessingPlan(planId);
    
    try {
      const response = await axios.post(
        `${API}/subscriptions/checkout`,
        {
          plan_id: planId,
          origin_url: window.location.origin
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.url) {
        // Redirect to Stripe
        window.location.href = response.data.url;
      } else if (response.data.redirect) {
        // Free plan - local redirect
        navigate(response.data.redirect.replace(window.location.origin, ''));
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la souscription');
      setProcessingPlan(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const currentPlan = user?.subscription_plan || 'free';

  if (loading) {
    return (
      <div className="min-h-screen py-12 bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="container mx-auto px-4">
          <Skeleton className="h-12 w-64 mx-auto mb-8" />
          <div className="grid md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-96 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-orange-50 to-amber-50 dashboard-card-skin home-premium-gradient" data-testid="subscription-page">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary mb-4">
            <Crown className="w-4 h-4" />
            <span className="text-sm font-medium">Choisissez votre plan</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Plans d'abonnement vendeur</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Développez votre activité sur Cloléo avec le plan adapté Ã  vos besoins. 
            Commencez gratuitement et évoluez selon votre croissance.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isPopular = plan.id === 'commercant';
            
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-xl",
                  isCurrentPlan && "border-primary ring-2 ring-primary/20",
                  isPopular && !isCurrentPlan && "border-amber-400",
                  !isCurrentPlan && !isPopular && "border-transparent hover:border-primary/30"
                )}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> POPULAIRE
                    </span>
                  </div>
                )}

                {/* Current Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-primary text-white text-xs font-bold rounded-full">
                      PLAN ACTUEL
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6 pt-4">
                  <div className="text-4xl mb-3">{plan.emoji}</div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  {plan.badge && (
                    <span className={cn(
                      "inline-block mt-2 px-2 py-0.5 text-xs font-bold rounded-full",
                      plan.badge === 'verified' && "bg-blue-100 text-blue-700",
                      plan.badge === 'pro' && "bg-amber-100 text-amber-700",
                      plan.badge === 'premium' && "bg-purple-100 text-purple-700"
                    )}>
                      Badge {plan.badge === 'verified' ? 'Vérifié' : plan.badge === 'pro' ? 'Pro' : 'Premium'}
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  {plan.price_fcfa === 0 ? (
                    <div className="text-3xl font-bold text-green-600">Gratuit</div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold">
                        {formatPrice(plan.price_fcfa)} <span className="text-base font-normal text-muted-foreground">FCFA</span>
                      </div>
                      <div className="text-sm text-muted-foreground">â‰ˆ ${plan.price_usd} / mois</div>
                    </>
                  )}
                </div>

                {/* Commission highlight */}
                <div className="text-center mb-6 p-3 bg-muted/50 rounded-lg">
                  <span className="text-2xl font-bold text-primary">{plan.commission_percent}%</span>
                  <p className="text-xs text-muted-foreground">de commission</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  className="w-full"
                  variant={isCurrentPlan ? 'outline' : isPopular ? 'default' : 'secondary'}
                  disabled={isCurrentPlan || processingPlan === plan.id}
                  onClick={() => handleSubscribe(plan.id)}
                  data-testid={`subscribe-${plan.id}`}
                >
                  {processingPlan === plan.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Traitement...
                    </>
                  ) : isCurrentPlan ? (
                    'Plan actuel'
                  ) : plan.price_fcfa === 0 ? (
                    'Activer gratuitement'
                  ) : (
                    <>
                      Souscrire <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* FAQ / Info */}
        <div className="max-w-3xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">Questions fréquentes</h2>
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-6 border">
              <h3 className="font-bold mb-2">Puis-je changer de plan Ã  tout moment ?</h3>
              <p className="text-muted-foreground text-sm">
                Oui ! Vous pouvez passer Ã  un plan supérieur Ã  tout moment. Le changement est effectif immédiatement.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border">
              <h3 className="font-bold mb-2">Comment fonctionne la commission ?</h3>
              <p className="text-muted-foreground text-sm">
                La commission est prélevée uniquement sur vos ventes réalisées. Plus votre plan est élevé, plus votre commission est réduite.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border">
              <h3 className="font-bold mb-2">Quels moyens de paiement acceptez-vous ?</h3>
              <p className="text-muted-foreground text-sm">
                Nous acceptons les cartes bancaires (Visa, Mastercard) via notre partenaire Stripe sécurisé.
              </p>
            </div>
          </div>
        </div>

        {/* Back / Logout buttons */}
        <div className="text-center mt-8 flex items-center justify-center gap-3">
          <Button asChild variant="ghost">
            <Link to="/vendeur">â† Retour au tableau de bord</Link>
          </Button>`r`n          <Button variant="destructive" onClick={handleLogout}>`r`n            <LogOut className="w-4 h-4 mr-2" /> Déconnexion`r`n          </Button>`r`n        </div>`r`n      </div>`r`n    </div>
  );
};

export default VendorSubscription;


