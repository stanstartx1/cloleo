import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Store, User, Mail, Lock, Phone, ArrowRight, Truck, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
    <div className="min-h-screen py-12 bg-gradient-to-br from-orange-50 to-amber-50" data-testid="auth-page">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-2xl">
                C
              </div>
              <span className="text-3xl font-bold">
                <span className="text-orange-500">Clo</span>
                <span className="text-amber-600">léo</span>
              </span>
            </Link>
          </div>

          {/* Auth Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="register">Inscription</TabsTrigger>
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
                    <p><strong>Admin:</strong> admin@cloleo.com / admin123</p>
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
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
