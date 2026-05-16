import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock, Phone, Store, FileText, ArrowRight, Package, TrendingUp, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const RevendeurRegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    shop_name: '',
    shop_description: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post(`${API}/auth/register/revendeur`, formData);
      const { token, user } = response.data;
      
      // Login with the received token and user to avoid redirect race condition
      login(token, undefined, user);
      
      toast.success('Compte revendeur créé avec succès !');
      navigate('/revendeur');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 bg-gradient-to-br from-purple-50 via-white to-indigo-50" data-testid="revendeur-register-page">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
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

          <div className="grid md:grid-cols-2 gap-8">
            {/* Benefits Section */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-8 text-white">
              <h2 className="text-2xl font-bold mb-6">Devenir Revendeur</h2>
              <p className="text-purple-100 mb-8">
                Lancez votre business en ligne sans stock. Vendez les produits de notre catalogue avec votre propre marge.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Accès au catalogue complet</h3>
                    <p className="text-sm text-purple-100">Des centaines de produits prêts à vendre</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Personnalisez vos prix</h3>
                    <p className="text-sm text-purple-100">Fixez votre propre marge sur chaque produit</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Gagnez 50% de la marge</h3>
                    <p className="text-sm text-purple-100">Partage automatique et transparent</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-white/10 rounded-xl">
                <p className="text-sm font-medium">Exemple de marge :</p>
                <p className="text-xs text-purple-100 mt-1">
                  Produit à 10 000 FCFA → Vous vendez à 15 000 FCFA → Vous gagnez 2 500 FCFA
                </p>
              </div>
            </div>

            {/* Registration Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold mb-6">Créer mon compte</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Votre nom"
                      value={formData.name}
                      onChange={handleChange}
                      className="pl-10"
                      required
                      data-testid="revendeur-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="votre@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10"
                      required
                      data-testid="revendeur-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone (optionnel)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+225 07 00 00 00"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-10"
                      data-testid="revendeur-phone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shop_name">Nom de votre boutique</Label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="shop_name"
                      name="shop_name"
                      type="text"
                      placeholder="Ma Super Boutique"
                      value={formData.shop_name}
                      onChange={handleChange}
                      className="pl-10"
                      required
                      data-testid="revendeur-shop-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shop_description">Description de la boutique (optionnel)</Label>
                  <Textarea
                    id="shop_description"
                    name="shop_description"
                    placeholder="Décrivez votre boutique en quelques mots..."
                    value={formData.shop_description}
                    onChange={handleChange}
                    rows={3}
                    data-testid="revendeur-shop-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10 pr-10"
                      required
                      minLength={6}
                      data-testid="revendeur-password"
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

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700" 
                  disabled={loading}
                  data-testid="revendeur-register-btn"
                >
                  {loading ? 'Création en cours...' : 'Créer mon compte revendeur'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Déjà inscrit ?{' '}
                <Link to="/connexion" className="text-purple-600 hover:underline font-medium">
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevendeurRegisterPage;
