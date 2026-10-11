import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MapboxMap from '../components/MapboxMap';
import { useDeliveryTracking } from '../hooks/useDeliveryTracking';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { Truck, MapPin, Clock, Navigation, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { API_URL } from '../config/api';

const DriverNavigationPage = () => {
  const { orderId } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  const { trackingData, route, progress, driverLocation, destination, refresh } = useDeliveryTracking(orderId, token);
  const { currentLocation, isTracking, startTracking, stopTracking } = useDriverLocation(orderId, token);
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`${API_URL}/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        setOrder(data);
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId && token) {
      fetchOrder();
    }
  }, [orderId, token]);

  useEffect(() => {
    // Start GPS tracking when page loads
    if (user?.role === 'driver' && !isTracking) {
      startTracking();
      toast.success('Suivi GPS activé');
    }

    return () => {
      stopTracking();
    };
  }, [user, isTracking, startTracking, stopTracking]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success(`Statut mis à jour: ${newStatus}`);
        refresh();
      } else {
        toast.error('Erreur lors de la mise à jour du statut');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de la navigation...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-muted-foreground">Commande non trouvée</p>
          <Button onClick={() => navigate('/livreur/home')} className="mt-4">
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const showRoute = order.status in ['assigned', 'accepted', 'picked_up', 'in_transit'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/livreur/home')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <div>
                <h1 className="font-bold text-lg">Navigation</h1>
                <p className="text-sm text-muted-foreground">Commande #{order.order_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-xs text-muted-foreground">
                {isTracking ? 'GPS actif' : 'GPS inactif'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-bold flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                Itinéraire en temps réel
              </h2>
            </div>
            
            <MapboxMap
              driverLocation={currentLocation || driverLocation}
              customerLocation={destination}
              showRoute={showRoute}
              height="400px"
              mapType="streets"
              followDriver={true}
              driverVehicleType={order.driver_vehicle_type || null}
              routeGeometry={route?.geometry}
              progressPercent={progress?.progress_percent || 0}
            />
            
            {/* Progress Indicator */}
            {progress && showRoute && (
              <div className="p-4 bg-blue-50 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Progression de la livraison</span>
                  <span className="text-sm font-bold text-blue-600">{Math.round(progress.progress_percent)}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${progress.progress_percent}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 text-sm text-blue-800">
                  {progress.distance_remaining_km !== null && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{progress.distance_remaining_km} km restants</span>
                    </div>
                  )}
                  {progress.eta_minutes !== null && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>ETA: {Math.round(progress.eta_minutes)} min</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Order Details & Actions */}
          <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-bold mb-4">Statut actuel</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Truck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <p className="font-bold capitalize">{order.status}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {order.status === 'assigned' && (
                  <Button onClick={() => handleStatusUpdate('accepted')} className="w-full">
                    Accepter la commande
                  </Button>
                )}
                {order.status === 'accepted' && (
                  <Button onClick={() => handleStatusUpdate('picked_up')} className="w-full">
                    Colis récupéré
                  </Button>
                )}
                {order.status === 'picked_up' && (
                  <Button onClick={() => handleStatusUpdate('in_transit')} className="w-full">
                    En route vers le client
                  </Button>
                )}
                {order.status === 'in_transit' && (
                  <Button onClick={() => handleStatusUpdate('delivered')} className="w-full bg-green-600">
                    Livré
                  </Button>
                )}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-2xl border p-6">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Adresse de livraison
              </h3>
              <div className="space-y-2">
                <p className="font-medium">{order.delivery_address?.street}</p>
                <p className="text-sm text-muted-foreground">
                  {order.delivery_address?.city}, {order.delivery_address?.country}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            {order.customer_name && (
              <div className="bg-white rounded-2xl border p-6">
                <h3 className="font-bold mb-4">Client</h3>
                <p className="font-medium">{order.customer_name}</p>
                {order.customer_phone && (
                  <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverNavigationPage;
