import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, Package, Clock, Star, 
  Users, Target, BarChart3, Calendar, 
  Truck, MapPin, Award, Trophy, Zap,
  ChevronDown, Download, Filter, RefreshCw, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const API = API_URL;

const AnalyticsDashboard = ({ isOpen, onClose, userRole }) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [analytics, setAnalytics] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    if (!token || !userRole) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/analytics/${userRole}`, {
        params: { time_range: timeRange },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen, timeRange, token, userRole, API]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics().finally(() => setRefreshing(false));
  };

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API}/analytics/${userRole}/export`, {
        params: { time_range: timeRange },
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-${userRole}-${timeRange}.csv`;
      link.click();
      
      toast.success('Export réussi');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Erreur lors de l\'export');
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl">
          <div className="py-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-slate-400" />
            <p className="text-slate-600">Chargement des analytics...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose} className="max-w-6xl">
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dashboard Analytics</DialogTitle>
          <DialogDescription>
            Analyses de performance pour {userRole === 'driver' ? 'livreur' : userRole === 'vendor' ? 'vendeur' : 'client'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 heures</SelectItem>
                <SelectItem value="7d">7 jours</SelectItem>
                <SelectItem value="30d">30 jours</SelectItem>
                <SelectItem value="90d">90 jours</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Actualiser
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Exporter
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics?.total_orders || 0}</p>
                    <p className="text-sm text-slate-600">Total commandes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics?.total_revenue ? analytics.total_revenue.toLocaleString() : '0'} FCFA</p>
                    <p className="text-sm text-slate-600">Revenus totaux</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Star className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics?.average_rating?.toFixed(1) || '0.0'}/5</p>
                    <p className="text-sm text-slate-600">Note moyenne</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{analytics?.growth_rate ? analytics.growth_rate.toFixed(1) : '0'}%</p>
                    <p className="text-sm text-slate-600">Croissance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="customers">Clients</TabsTrigger>
              <TabsTrigger value="trends">Tendances</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Statistiques détaillées</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">Commandes complétées</span>
                      <Badge variant="secondary">{analytics?.completed_orders || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">Temps moyen livraison</span>
                      <Badge variant="secondary">{analytics?.avg_delivery_time || 0} min</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">Distance parcourue</span>
                      <Badge variant="secondary">{analytics?.total_distance || 0} km</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">Taux de satisfaction</span>
                      <Badge variant="secondary">{analytics?.satisfaction_rate ? (analytics.satisfaction_rate * 100).toFixed(0) : 0}%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Métriques de performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-slate-600 mb-2">Performance hebdomadaire</p>
                      <div className="h-40 bg-slate-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-8 h-8 text-slate-400" />
                        <span className="text-slate-500 ml-2">Graphique à venir</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600 mb-2">Top produits/services</p>
                      <div className="space-y-2">
                        {analytics?.top_products?.map((product, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <span className="text-sm">{product.name}</span>
                            <Badge variant="outline">{product.count}</Badge>
                          </div>
                        )) || <p className="text-sm text-slate-500">Aucune donnée</p>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="customers" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics clients</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">Clients actifs</span>
                      <Badge variant="secondary">{analytics?.active_customers || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">Nouveaux clients</span>
                      <Badge variant="secondary">{analytics?.new_customers || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">Taux de rétention</span>
                      <Badge variant="secondary">{analytics?.retention_rate ? (analytics.retention_rate * 100).toFixed(0) : 0}%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tendances et prédictions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-800">Prévision de demande</span>
                      </div>
                      <p className="text-sm text-blue-700">
                        {analytics?.demand_forecast || 'Prévision à venir'}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-800">Opportunités identifiées</span>
                      </div>
                      <p className="text-sm text-green-700">
                        {analytics?.opportunities || 'Aucune opportunité détectée'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnalyticsDashboard;