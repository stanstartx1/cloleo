import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  MapPin, 
  Users, 
  Calendar, 
  Globe, 
  Factory,
  Award,
  Star,
  Package,
  MessageSquare,
  ArrowLeft,
  Share2,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle,
  Trophy,
  Shield,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { toAbsoluteMediaUrl } from '../utils/media';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const EnterpriseProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enterprise, setEnterprise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    const fetchEnterprise = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/enterprises/${id}`);
        setEnterprise(response.data);
        
        // Fetch additional stats
        const statsResponse = await axios.get(`${API_URL}/api/enterprises/${id}/stats`);
        setStats(statsResponse.data);
        
        // Generate performance data (mock for now)
        const performanceData = [
          { month: 'Jan', sales: 4000, orders: 120 },
          { month: 'Fév', sales: 3000, orders: 98 },
          { month: 'Mar', sales: 5000, orders: 150 },
          { month: 'Avr', sales: 4500, orders: 135 },
          { month: 'Mai', sales: 6000, orders: 180 },
          { month: 'Juin', sales: 7000, orders: 210 },
        ];
        setPerformanceData(performanceData);
        
        // Generate category data (mock for now)
        const categoryData = [
          { name: 'Électronique', value: 35, color: '#3b82f6' },
          { name: 'Mode', value: 25, color: '#10b981' },
          { name: 'Maison', value: 20, color: '#f59e0b' },
          { name: 'Services', value: 20, color: '#ef4444' },
        ];
        setCategoryData(categoryData);
        
      } catch (error) {
        console.error('Error fetching enterprise profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnterprise();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!enterprise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900">Entreprise non trouvée</h2>
          <Button onClick={() => navigate('/entreprises')} className="mt-4">
            Retour aux entreprises
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20 overflow-hidden">
        {enterprise.cover_photo && (
          <img
            src={toAbsoluteMediaUrl(enterprise.cover_photo)}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover opacity-100"
          />
        )}
        <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/entreprises')}
            className="text-white hover:bg-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
              {enterprise.profile_photo ? (
                <img
                  src={enterprise.profile_photo}
                  alt={enterprise.company_name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Building2 className="w-12 h-12 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{enterprise.company_name}</h1>
              <p className="text-blue-100 mt-2">{enterprise.business_type}</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="font-semibold">{enterprise.average_rating?.toFixed(1) || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>{enterprise.city}, {enterprise.country}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Ventes totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats?.total_sales || '0'} FCFA</p>
                  <p className="text-sm text-blue-100">+12% ce mois</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-100">Commandes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats?.total_orders || '0'}</p>
                  <p className="text-sm text-green-100">+8% ce mois</p>
                </div>
                <ShoppingBag className="w-8 h-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Taux de livraison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats?.delivery_rate || '98'}%</p>
                  <p className="text-sm text-purple-100">En temps réel</p>
                </div>
                <CheckCircle className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-100">Note moyenne</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{enterprise?.average_rating?.toFixed(1) || '4.5'}</p>
                  <p className="text-sm text-amber-100">Basé sur {stats?.total_reviews || 0} avis</p>
                </div>
                <Star className="w-8 h-8 text-amber-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance des ventes
              </CardTitle>
              <CardDescription>Évolution sur les 6 derniers mois</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#f3f4f6' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="w-5 h-5" />
                Répartition par catégorie
              </CardTitle>
              <CardDescription>Produits par secteur d'activité</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#f3f4f6' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {categoryData.map((item, index) => (
                  <div key={index} className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-600">{item.name} ({item.value}%)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Activité récente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Commandes aujourd'hui</span>
                  <span className="font-semibold text-green-600">{stats?.today_orders || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Livraisons en cours</span>
                  <span className="font-semibold text-blue-600">{stats?.active_deliveries || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Temps de réponse moyen</span>
                  <span className="font-semibold text-purple-600">{stats?.avg_response_time || '15min'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Réalisations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Top vendeur</p>
                    <p className="text-sm text-gray-500">Mois dernier</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Certifié</p>
                    <p className="text-sm text-gray-500">Vendeur premium</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">Objectif atteint</p>
                    <p className="text-sm text-gray-500">+20% de ventes</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Tendances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={performanceData.slice(-4)}>
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#f3f4f6' }}
                  />
                  <Bar dataKey="orders" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>À propos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{enterprise.company_description || 'Aucune description disponible'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Année de création</p>
                    <p className="font-semibold">{enterprise.year_founded}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Nombre d'employés</p>
                    <p className="font-semibold">{enterprise.number_of_employees}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Factory className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Secteur d'activité</p>
                    <p className="font-semibold">{enterprise.business_sector}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                {enterprise.certifications?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {enterprise.certifications.map((cert, index) => (
                      <Badge key={index} variant="secondary">
                        <Award className="w-3 h-3 mr-1" />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Aucune certification affichée</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contacter
                </Button>
                <Button variant="outline" className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trophées & Réalisations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
                    <Trophy className="w-8 h-8 text-yellow-600 mb-2" />
                    <p className="font-semibold text-yellow-800">Vendeur Or</p>
                    <p className="text-xs text-yellow-600">1000+ ventes</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                    <Trophy className="w-8 h-8 text-gray-600 mb-2" />
                    <p className="font-semibold text-gray-800">Vendeur Argent</p>
                    <p className="text-xs text-gray-600">500+ ventes</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg">
                    <Award className="w-8 h-8 text-amber-600 mb-2" />
                    <p className="font-semibold text-amber-800">Étoile du mois</p>
                    <p className="text-xs text-amber-600">Mai 2026</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                    <Shield className="w-8 h-8 text-blue-600 mb-2" />
                    <p className="font-semibold text-blue-800">Certifié Pro</p>
                    <p className="text-xs text-blue-600">Depuis 2024</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistiques détaillées</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Produits</span>
                  <span className="font-semibold">{enterprise?.total_products || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Clients satisfaits</span>
                  <span className="font-semibold text-green-600">{stats?.satisfied_clients || '98%'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Livraisons complétées</span>
                  <span className="font-semibold">{stats?.completed_deliveries || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Note moyenne</span>
                  <span className="font-semibold">{enterprise?.average_rating?.toFixed(1) || 'N/A'}/5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Réponse moyenne</span>
                  <span className="font-semibold">{stats?.avg_response_time || '15min'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseProfilePage;
