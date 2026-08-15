import React, { useState, useEffect } from 'react';
import { 
  Package, Clock, MapPin, Truck, CheckCircle, AlertCircle,
  Calendar, Filter, SortAsc, ChevronRight, Plus,
  Target, Route, Layers, Bell, TrendingUp, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';

const API = API_URL;

const MultiDeliveryManager = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  const [activeOrders, setActiveOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('priority');

  // Fetch driver's orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!token) return;
      
      try {
        const response = await axios.get(`${API}/delivery/driver/multi-orders`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data) {
          setActiveOrders(response.data.active || []);
          setPendingOrders(response.data.pending || []);
          setCompletedOrders(response.data.completed || []);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, token, API]);

  // Optimize route for multiple orders
  const optimizeRoute = async () => {
    setOptimizing(true);
    
    try {
      const response = await axios.post(`${API}/delivery/driver/optimize-route`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        toast.success('Route optimisée avec succès !', {
          description: `ETA total: ${response.data.total_eta_minutes || 0} min`
        });
        if (response.data.stops) {
          const orderedIds = response.data.stops.map(s => s.order_id);
          setActiveOrders(prev => [...prev].sort((a, b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)));
        }
      }
    } catch (error) {
      console.error('Error optimizing route:', error);
      toast.error('Erreur lors de l\'optimisation');
    } finally {
      setOptimizing(false);
    }
  };

  // Accept order
  const acceptOrder = async (orderId) => {
    try {
      const response = await axios.post(`${API}/driver/accept-order`, {
        order_id: orderId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        toast.success('Commande acceptée');
        // Refresh orders
        // fetchOrders(); // Would need to be defined
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Erreur lors de l\'acceptation');
    }
  };

  // Get order priority
  const getOrderPriority = (order) => {
    if (order.priority === 'urgent') return { level: 'urgent', color: 'red', label: 'Urgent' };
    if (order.priority === 'high') return { level: 'high', color: 'orange', label: 'Haute' };
    if (order.priority === 'normal') return { level: 'normal', color: 'blue', label: 'Normale' };
    return { level: 'low', color: 'green', label: 'Basse' };
  };

  // Calculate ETA for order
  const calculateOrderETA = (order) => {
    if (!order.distance || !order.average_speed) return null;
    
    const speedMPerMin = (order.average_speed * 1000) / 60;
    const etaMinutes = order.distance / speedMPerMin;
    
    return Math.round(etaMinutes);
  };

  const totalOrders = activeOrders.length + pendingOrders.length;
  const estimatedTotalTime = activeOrders.reduce((sum, order) => {
    const eta = calculateOrderETA(order);
    return sum + (eta || 0);
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose} className="max-w-4xl">
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestion multi-livraisons</DialogTitle>
          <DialogDescription>
            Optimisez et gérez plusieurs livraisons simultanées
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">
              <Package className="w-4 h-4 mr-2" />
              Actives ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              <Clock className="w-4 h-4 mr-2" />
              En attente ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              <CheckCircle className="w-4 h-4 mr-2" />
              Terminées ({completedOrders.length})
            </TabsTrigger>
          </TabsList>

          {/* Active Orders Tab */}
          <TabsContent value="active" className="space-y-4 mt-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{activeOrders.length}</p>
                      <p className="text-sm text-slate-600">Commandes actives</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{estimatedTotalTime} min</p>
                      <p className="text-sm text-slate-600">Temps estimé total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Route className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">Optimisé</p>
                      <p className="text-sm text-slate-600">Route actuelle</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Optimization Button */}
            {activeOrders.length > 1 && (
              <Button
                onClick={optimizeRoute}
                disabled={optimizing}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500"
              >
                {optimizing ? (
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Target className="w-4 h-4 mr-2" />
                )}
                Optimiser la route
              </Button>
            )}

            {/* Active Orders List */}
            <div className="space-y-3">
              {activeOrders.map((order, index) => {
                const priority = getOrderPriority(order);
                const eta = calculateOrderETA(order);
                
                return (
                  <Card key={order.id} className="border-l-4" style={{ borderLeftColor: priority.color }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-bold">#{index + 1}</span>
                            <span className="font-medium">{order.order_number}</span>
                            <Badge variant="outline" style={{ borderColor: priority.color, color: priority.color }}>
                              {priority.label}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-500" />
                              <span>{order.distance} km</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-500" />
                              <span>ETA: {eta} min</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-500" />
                              <span>{order.customer_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-slate-500" />
                              <span>{order.status}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Button size="sm" variant="outline">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Pending Orders Tab */}
          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingOrders.length > 0 ? (
              <div className="space-y-3">
                {pendingOrders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-bold mb-2">{order.order_number}</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-slate-500" />
                              <span>{order.distance} km</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-slate-500" />
                              <span>{order.estimated_earnings} FCFA</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          onClick={() => acceptOrder(order.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Accepter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune commande en attente</p>
              </div>
            )}
          </TabsContent>

          {/* Completed Orders Tab */}
          <TabsContent value="completed" className="space-y-4 mt-4">
            <div className="space-y-3">
              {completedOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold">{order.order_number}</h4>
                        <p className="text-sm text-slate-600">Livré le {new Date(order.delivered_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <Badge variant="secondary">Terminé</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MultiDeliveryManager;