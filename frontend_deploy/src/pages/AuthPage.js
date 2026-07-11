import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Store, User, Mail, Lock, Phone, ArrowRight, Truck, Package } from 'lucide-react';
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
      return { backgroundColor: background_color };
    }
    
    // Si type image et des images sont définies
    if (background_type === 'image' && background_images && background_images.length > 0) {
      const images = background_images.map(img => 
        img.startsWith('/') ? `${API_BASE}${img}` : img
      );
      
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(loginEmail, loginPassword);
    
    if (result.success) {
      toast.success(`Bienvenue, ${result.user.name} !`);
      
      // Redirect based on role
      if (result.user.role === 'admin') {
        navigate('/admin');
      } else if (result.user.role === 'vendor') {
        navigate('/vendeur');
      } else if (result.user.role === 'driver') {
        navigate('/livreur');
      } else if (result.user.role === 'dropshipper') {
        navigate('/revendeur');
      } else {
        navigate(from);
      }
    } else {
      toast.error(result.error);
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
      toast.success('Compte créé avec succès !');
      
      if (result.user.role === 'vendor') {
        navigate('/vendeur');
      } else {
        navigate(from);
      }
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  // If user selects "driver" or "dropshipper", redirect to the dedicated registration page
  const handleRoleSelect = (role) => {
    if (role === 'driver') {
      navigate('/devenir-livreur');
    } else if (role === 'dropshipper') {
      navigate('/devenir-revendeur');
    } else {
      setRegisterRole(role);
    }
  };

  return (
    <div 
      className="min-h-screen py-12 bg-gradient-to-br from-orange-50 to-amber-50" 
      style={getBackgroundStyle()}
      data-testid="auth-page"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 group">
              {!logoLoading && logoUrl ? (
                <div className="relative bg-white/80 backdrop-blur-sm rounded-xl p-1.5 shadow-sm transition-all duration-300 group-hover:shadow-md">
                  <img 
                    src={logoUrl} 
                    alt="Cloléo" 
                    className="h-20 w-auto object-contain transition-all duration-300 group-hover:scale-105"
                    onError={handleImageError}
                  />
                  <div className="logo-fallback hidden absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl items-center justify-center">
                    <span className="text-white font-black text-lg">C</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-3xl transition-all duration-500 group-hover:scale-110">
                    C
                  </div>
                  <span className="text-4xl font-bold">
                    <span className="text-orange-500">Clo</span>
                    <span className="text-amber-600">léo</span>
                  </span>
                </>
              )}
            </Link>
          </div>

          {/* Auth Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-4 border-blue-900">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-transparent">
                <TabsTrigger value="login" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">Connexion</TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-orange-50 data-[state=active]:text-orange-600">Inscription</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                        data-testid="login-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                        data-testid="login-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading} data-testid="login-btn">
                    {loading ? 'Connexion...' : 'Se connecter'}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </form>

                {/* Quick login for testing */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Comptes de test :</p>
                  <div className="space-y-1 text-xs">
                    <p><strong>Admin:</strong> admin@cloleo.com / cloclo@2026!</p>
                    <p><strong>Vendeur:</strong> testvendor@cloleo.com / test123</p>
                  </div>
                </div>
              </TabsContent>

              {/* Register Tab */}
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Role Selection - 4 options */}
                  <div className="mb-6">
                    <Label className="text-sm font-medium mb-3 block">Je suis...</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleRoleSelect('customer')}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          registerRole === 'customer'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <User className={`w-6 h-6 mx-auto mb-1 ${registerRole === 'customer' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="font-medium text-xs">Acheteur</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleSelect('vendor')}
                        className={`p-3 rounded-xl border-2 transition-all ${
                          registerRole === 'vendor'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Store className={`w-6 h-6 mx-auto mb-1 ${registerRole === 'vendor' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="font-medium text-xs">Vendeur</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleSelect('dropshipper')}
                        className="p-3 rounded-xl border-2 border-border hover:border-purple-500/50 hover:bg-purple-50 transition-all"
                      >
                        <Package className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                        <p className="font-medium text-xs text-purple-600">Revendeur</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRoleSelect('driver')}
                        className="p-3 rounded-xl border-2 border-border hover:border-blue-500/50 hover:bg-blue-50 transition-all"
                      >
                        <Truck className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                        <p className="font-medium text-xs text-blue-600">Livreur</p>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nom complet</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="Votre nom"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        className="pl-10"
                        required
                        data-testid="register-name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="pl-10"
                        required
                        data-testid="register-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Téléphone (optionnel)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-phone"
                        type="tel"
                        placeholder="+225 07 00 00 00"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        className="pl-10"
                        data-testid="register-phone"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                        minLength={6}
                        data-testid="register-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading} data-testid="register-btn">
                    {loading ? 'Création...' : `Créer mon compte ${registerRole === 'vendor' ? 'vendeur' : ''}`}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          {/* Slogan */}
          <p className="text-center text-sm text-muted-foreground mt-8 font-medium">
            La référence du e-commerce en Afrique
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
