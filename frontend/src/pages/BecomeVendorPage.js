import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Store, 
  TrendingUp, 
  ShieldCheck, 
  Globe, 
  Zap, 
  HeadphonesIcon, 
  ArrowRight, 
  CheckCircle,
  Crown,
  BarChart3,
  Package,
  Users,
  Star
} from 'lucide-react';
import { Button } from '../components/ui/button';

const BecomeVendorPage = () => {
  const benefits = [
    {
      icon: TrendingUp,
      title: 'Ventes illimitées',
      description: 'Vendez autant de produits que vous voulez sans frais de transaction',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50'
    },
    {
      icon: Globe,
      title: 'Visibilité mondiale',
      description: 'Vos produits sont visibles par des milliers de clients potentiels',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      icon: ShieldCheck,
      title: 'Paiements sécurisés',
      description: 'Recevez vos paiements de manière sécurisée et rapide',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Zap,
      title: 'Démarrage rapide',
      description: 'Commencez à vendre en quelques minutes avec notre interface intuitive',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50'
    },
    {
      icon: HeadphonesIcon,
      title: 'Support dédié',
      description: 'Notre équipe est disponible pour vous aider à chaque étape',
      color: 'text-rose-500',
      bgColor: 'bg-rose-50'
    },
    {
      icon: BarChart3,
      title: 'Analytics avancés',
      description: 'Suivez vos ventes et performances avec des statistiques détaillées',
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-50'
    }
  ];

  const features = [
    {
      icon: Package,
      title: 'Gestion facile des produits',
      description: 'Ajoutez, modifiez et gérez votre catalogue en quelques clics'
    },
    {
      icon: Users,
      title: 'Base de clients qualifiée',
      description: 'Accédez à une communauté de clients actifs et engagés'
    },
    {
      icon: Star,
      title: 'Mise en avant',
      description: 'Vos produits peuvent être mis en avant dans nos sections vedettes'
    },
    {
      icon: Crown,
      title: 'Statut de vendeur certifié',
      description: 'Obtenez votre badge de vendeur certifié pour plus de confiance'
    }
  ];

  const steps = [
    {
      step: '1',
      title: 'Créez votre compte',
      description: 'Inscrivez-vous gratuitement en quelques minutes'
    },
    {
      step: '2',
      title: 'Ajoutez vos produits',
      description: 'Uploadez vos produits avec photos et descriptions'
    },
    {
      step: '3',
      title: 'Commencez à vendre',
      description: 'Recevez des commandes et commencez à gagner'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-200 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-200 rounded-full blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6">
              <Store className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">Rejoignez nos vendeurs</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Devenez vendeur sur
              <span className="block bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                Cloléo
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Rejoignez des milliers de vendeurs qui font confiance à Cloléo pour développer leur activité en ligne. 
              Simple, rapide et rentable.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/connexion?tab=register&role=vendor">
                <Button size="lg" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-8 py-6 text-lg rounded-full shadow-lg shadow-orange-500/30">
                  Commencer maintenant
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Pourquoi choisir Cloléo ?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Découvrez tous les avantages qui font de Cloléo la plateforme idéale pour votre business
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div 
                key={index}
                className="group p-8 bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-orange-200"
              >
                <div className={`w-14 h-14 ${benefit.bgColor} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-7 h-7 ${benefit.color}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Des outils puissants pour votre succès
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Tout ce dont vous avez besoin pour gérer et développer votre boutique en ligne
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div 
                  key={index}
                  className="flex gap-6 p-6 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 transition-all"
                >
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <Icon className="w-6 h-6 text-orange-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            En 3 étapes simples, lancez votre boutique sur Cloléo
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 h-full">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-6 shadow-lg shadow-orange-500/30">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600">
                  {step.description}
                </p>
              </div>
              
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-8 h-8 text-orange-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500" />
        <div className="absolute inset-0 bg-black/10" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Prêt à commencer votre aventure ?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto mb-8">
              Rejoignez des milliers de vendeurs qui réussissent sur Cloléo
            </p>
            
            <Link to="/connexion?tab=register&role=vendor">
              <Button size="lg" className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-6 text-lg rounded-full shadow-xl">
                Commencer maintenant
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-white/90">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Gratuit</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Sans engagement</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>Support 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BecomeVendorPage;
