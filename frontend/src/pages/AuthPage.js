import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Store, User, Mail, Lock, Phone, ArrowRight, Truck, Package, Sparkles, Building2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { API_BASE, API_URL } from '../config/api';

const API = API_URL;

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
 
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoLoading, setLogoLoading] = useState(true);
  const [authPageSettings, setAuthPageSettings] = useState({
    enabled: false,
    background_type: 'color',
    background_color: '',
    background_images: [],
    layout_type: 'single'
  });

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await fetch(`${API}/logo-settings`);

        if (!response.ok) {
          console.warn('Logo endpoint not available, using fallback');
          return;
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
        console.warn('Erreur chargement logo, using fallback:', error.message);
      } finally {
        setLogoLoading(false);
      }
    };
    fetchLogo();
  }, []);

  useEffect(() => {
    const fetchAuthPageSettings = async () => {
      try {
        const response = await fetch(`${API}/auth-page-settings`);
        if (response.ok) {
          const data = await response.json();
          setAuthPageSettings(data);
        }
      } catch (error) {
        console.warn('Erreur chargement auth page settings:', error.message);
      }
    };
    fetchAuthPageSettings();
  }, []);

  // Calculer le style de fond
  const getBackgroundStyle = () => {
    const { enabled, background_type, background_color, background_images, layout_type } = authPageSettings;
    
    // Si le fond n'est pas activé, utiliser le gradient par défaut
    if (!enabled) {
      return {};
    }
    
    // Si type couleur et une couleur est définie
    if (background_type === 'color' && background_color && background_color.trim()) {
      return { backgroundColor: background_color, backgroundImage: 'none' };
    }
    
    // Si type image et des images sont définies
    if (background_type === 'image' && background_images && background_images.length > 0) {
      const images = background_images.filter(Boolean).map(img =>
        img.startsWith('/') ? `${API_BASE}${img}` : img
      );

      if (!images.length) return {};
      
      if (images.length === 1) {
        return { backgroundImage: `url(${images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' };
      } else if (images.length === 2 && layout_type === 'split') {
        return {
          backgroundImage: `url(${images[0]}), url(${images[1]})`,
          backgroundSize: '50% 100%, 50% 100%',
          backgroundPosition: 'left, right',
          backgroundRepeat: 'no-repeat, no-repeat'
        };
      } else {
        // Par défaut, utiliser la première image en cover
        return { backgroundImage: `url(${images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' };
      }
    }
    
    // Fallback : gradient par défaut
    return {};
  };

  const authBackgroundImages = (authPageSettings.background_images || [])
    .filter(Boolean)
    .map((image) => image.startsWith('/') ? `${API_BASE}${image}` : image);
  const isCustomImageBackground = authPageSettings.enabled
    && authPageSettings.background_type === 'image'
    && authBackgroundImages.length > 0;
  const isSplitImageBackground = isCustomImageBackground
    && authPageSettings.layout_type === 'split'
    && authBackgroundImages.length >= 2;

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
 
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
 
  // Register form
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerRole, setRegisterRole] = useState('customer');

  const from = location.state?.from?.pathname || '/';

  // Handle URL parameters for tab and role pre-selection
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    const role = searchParams.get('role');

    if (tab === 'register') {
      setActiveTab('register');
    }

    if (role && ['customer', 'vendor', 'dropshipper', 'driver', 'enterprise'].includes(role)) {
      setRegisterRole(role);
    }
  }, [location.search]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
   
    const result = await login(loginEmail, loginPassword);
   
    if (result.success) {
      toast.success(`Bienvenue, ${result.user.name || result.user.company_name} !`);
      console.log('DEBUG: Login successful, role:', result.user.role);
      if (result.user.role === 'admin') navigate('/admin');
      else if (result.user.role === 'vendor') navigate('/vendeur');
      else if (result.user.role === 'driver') navigate('/livreur');
      else if (result.user.role === 'dropshipper') navigate('/revendeur');
      else if (result.user.role === 'enterprise') {
        console.log('DEBUG: Redirecting enterprise to /enterprise');
        navigate('/enterprise');
      }
      else navigate(from);
    } else {
      toast.error(result.error || 'Une erreur est survenue');
    }
   
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
   
    const result = await register(
      registerName,
      registerEmail,
      registerPassword,
      registerRole,
      registerPhone || null
    );
   
    if (result.success) {
      toast.success('Compte créé avec succès ! 🎉');
      if (result.user.role === 'vendor') navigate('/vendeur');
      else navigate(from);
    } else {
      toast.error(result.error || 'Une erreur est survenue');
    }
   
    setLoading(false);
  };

  const handleRoleSelect = (role) => {
    if (role === 'driver') {
      navigate('/devenir-livreur');
    } else if (role === 'dropshipper') {
      navigate('/devenir-revendeur');
    } else if (role === 'enterprise') {
      navigate('/devenir-entreprise');
    } else {
      setRegisterRole(role);
    }
  };

  return (
    <div
      className={`relative min-h-screen overflow-hidden py-12 ${
        authPageSettings.enabled ? '' : 'bg-gradient-to-br from-orange-50 via-amber-50 to-white'
      }`}
      style={getBackgroundStyle()}
    >
      {isCustomImageBackground && (
        <div className="absolute inset-0" aria-hidden="true">
          {isSplitImageBackground ? (
            <div className="flex h-full w-full">
              <img src={authBackgroundImages[0]} alt="" aria-hidden="true" decoding="async" className="h-full w-1/2 select-none object-cover object-center" draggable="false" />
              <img src={authBackgroundImages[1]} alt="" aria-hidden="true" decoding="async" className="h-full w-1/2 select-none object-cover object-center" draggable="false" />
            </div>
          ) : (
            <img src={authBackgroundImages[0]} alt="" aria-hidden="true" decoding="async" className="h-full w-full select-none object-cover object-center" draggable="false" />
          )}
          <div className="absolute inset-0 bg-slate-950/20" />
        </div>
      )}

      <div className="container relative z-10 mx-auto px-4">
        <div className="max-w-lg mx-auto">
          {/* Logo & Header */}
          <div className="text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-3 group">
              {!logoLoading && logoUrl ? (
                <div className="relative transition-transform duration-300 group-hover:scale-105">
                  <img 
                    src={logoUrl} 
                    alt="Cloléo" 
                    className="h-28 w-auto object-contain transition-all duration-300"
                    onError={handleImageError}
                  />
                  <div className="logo-fallback hidden absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl items-center justify-center">
                    <span className="text-white font-black text-2xl">C</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/30 group-hover:scale-105 transition-transform">
                    <span className="text-5xl font-black">C</span>
                  </div>
                  <div>
                    <span className="text-5xl font-bold tracking-tight">
                      <span className="text-orange-600">Clo</span>
                      <span className="text-amber-600">léo</span>
                    </span>
                    <p className="text-sm text-muted-foreground">Marketplace Premium</p>
                  </div>
                </>
              )}
            </Link>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-2xl shadow-orange-500/10 overflow-hidden border-4 border-blue-900">
            <div className="p-10">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-transparent">
                  <TabsTrigger value="login" className="rounded-xl py-3 text-base font-medium data-[state=active]:shadow-sm data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">Connexion</TabsTrigger>
                  <TabsTrigger value="register" className="rounded-xl py-3 text-base font-medium data-[state=active]:shadow-sm data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">Inscription</TabsTrigger>
                </TabsList>

                {/* ====================== LOGIN TAB ====================== */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="votre@email.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-12 h-12 rounded-2xl border-gray-200 focus:border-orange-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Mot de passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-12 pr-12 h-12 rounded-2xl border-gray-200 focus:border-orange-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-2xl text-base font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all"
                      disabled={loading}
                    >
                      {loading ? 'Connexion en cours...' : 'Se connecter'}
                      <ArrowRight className="ml-2" />
                    </Button>
                  </form>
                </TabsContent>

                {/* ====================== REGISTER TAB ====================== */}
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-6">
                    {/* Role Selection */}
                    <div>
                      <Label className="text-base font-medium mb-3 block">Je suis...</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { value: 'customer', label: 'Acheteur', icon: User, color: 'text-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
                          { value: 'vendor', label: 'Vendeur', icon: Store, color: 'text-amber-500', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
                          { value: 'dropshipper', label: 'Revendeur', icon: Package, color: 'text-purple-500', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
                          { value: 'driver', label: 'Livreur', icon: Truck, color: 'text-blue-500', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
                          { value: 'enterprise', label: 'Entreprise', icon: Building2, color: 'text-green-500', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
                        ].map((role) => {
                          const Icon = role.icon;
                          const isSelected = registerRole === role.value;
                          return (
                            <button
                              key={role.value}
                              type="button"
                              onClick={() => handleRoleSelect(role.value)}
                              className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                                isSelected 
                                  ? `${role.bgColor} ${role.borderColor} border-current shadow-md` 
                                  : 'bg-white border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 bg-current rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                              <Icon className={`w-6 h-6 ${role.color} mb-2`} />
                              <span className="text-sm font-medium text-gray-700">{role.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label>Nom complet</Label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                          <Input
                            type="text"
                            placeholder="Votre nom complet"
                            value={registerName}
                            onChange={(e) => setRegisterName(e.target.value)}
                            className="pl-12 h-12 rounded-2xl"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Email professionnel</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                          <Input
                            type="email"
                            placeholder="votre@email.com"
                            value={registerEmail}
                            onChange={(e) => setRegisterEmail(e.target.value)}
                            className="pl-12 h-12 rounded-2xl"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Téléphone (optionnel)</Label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                          <Input
                            type="tel"
                            placeholder="+225 07 00 00 00"
                            value={registerPhone}
                            onChange={(e) => setRegisterPhone(e.target.value)}
                            className="pl-12 h-12 rounded-2xl"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Mot de passe</Label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Créer un mot de passe"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            className="pl-12 pr-12 h-12 rounded-2xl"
                            required
                            minLength={6}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full h-12 rounded-2xl text-base font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all mt-4"
                      disabled={loading}
                    >
                      {loading ? 'Création du compte...' : `Créer mon compte ${registerRole === 'vendor' ? 'vendeur' : ''}`}
                      <Sparkles className="ml-2 w-5 h-5" />
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-8 py-5 text-center">
              <p className="text-sm text-slate-600">
                En continuant, vous acceptez nos{' '}
                <a href="https://cloleo.com/terms" className="font-medium text-orange-600 hover:underline">
                  Conditions d'utilisation
                </a>
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-700">
                La référence du e-commerce en Afrique
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
