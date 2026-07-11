import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Store, User, Mail, Lock, Phone, ArrowRight, Truck, Package, Sparkles } from 'lucide-react';
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
      if (result.user.role === 'admin') navigate('/admin');
      else if (result.user.role === 'vendor') navigate('/vendeur');
      else if (result.user.role === 'driver') navigate('/livreur');
      else if (result.user.role === 'dropshipper') navigate('/revendeur');
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
    } else {
      setRegisterRole(role);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-lg mx-auto">
          {/* Logo & Header */}
          <div className="text-center mb-10">
            <Link to="/" className="inline-flex items-center gap-3 group">
              {!logoLoading && logoUrl ? (
                <div className="relative bg-white/80 backdrop-blur-sm rounded-xl p-1.5 shadow-sm transition-all duration-300 group-hover:shadow-md">
                  <img 
                    src={logoUrl} 
                    alt="Cloléo" 
                    className="h-16 w-auto object-contain transition-all duration-300 group-hover:scale-105"
                    onError={handleImageError}
                  />
                  <div className="logo-fallback hidden absolute inset-0 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl items-center justify-center">
                    <span className="text-white font-black text-2xl">C</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/30 group-hover:scale-105 transition-transform">
                    <span className="text-4xl font-black">C</span>
                  </div>
                  <div>
                    <span className="text-4xl font-bold tracking-tight">
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
          <div className="bg-white rounded-3xl shadow-2xl shadow-orange-500/10 overflow-hidden border border-orange-100">
            <div className="p-10">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="login" className="rounded-xl py-3 text-base font-medium data-[state=active]:shadow-sm">Connexion</TabsTrigger>
                  <TabsTrigger value="register" className="rounded-xl py-3 text-base font-medium data-[state=active]:shadow-sm">Inscription</TabsTrigger>
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
                      <Label className="text-base font-medium mb-4 block">Je suis...</Label>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { role: 'customer', label: 'Acheteur', icon: User, color: 'orange' },
                          { role: 'vendor', label: 'Vendeur', icon: Store, color: 'amber' },
                          { role: 'dropshipper', label: 'Revendeur', icon: Package, color: 'purple' },
                          { role: 'driver', label: 'Livreur', icon: Truck, color: 'blue' },
                        ].map(({ role, label, icon: Icon, color }) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => handleRoleSelect(role)}
                            className={`p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-3 hover:shadow-md ${
                              registerRole === role 
                                ? 'border-orange-500 bg-orange-50 shadow-sm' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-xl bg-${color}-100 flex items-center justify-center`}>
                              <Icon className={`w-7 h-7 text-${color}-600`} />
                            </div>
                            <p className="font-semibold text-sm">{label}</p>
                          </button>
                        ))}
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
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            En continuant, vous acceptez nos{' '}
            <Link to="/terms" className="text-orange-600 hover:underline">Conditions d'utilisation</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;