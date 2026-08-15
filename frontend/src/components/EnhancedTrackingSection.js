import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Clock, Truck, Phone, MessageSquare, Loader2, RefreshCw, ZoomIn, ZoomOut, Layers } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

/**
 * EnhancedTrackingSection - Enhanced tracking section with interactive map
 * @param {Object} props - Component props
 */
const EnhancedTrackingSection = ({ orders, selectedOrder, onSelectOrder, driverLocation, onSetDriverLocation, token }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapZoom, setMapZoom] = useState(12);
  const [showRoute, setShowRoute] = useState(true);
  const [mapStyle, setMapStyle] = useState('streets');

  useEffect(() => {
    if (selectedOrder) {
      fetchTrackingData(selectedOrder.id);
    }
  }, [selectedOrder, token]);

  const fetchTrackingData = async (orderId) => {
    try {
      // TODO: Replace with actual API call
      // const response = await axios.get(`${API}/enterprises/orders/${orderId}/tracking`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // setTrackingData(response.data);

      // Mock data for now
      const mockTrackingData = {
        order: selectedOrder,
        driver: {
          id: 1,
          name: 'Jean Dupont',
          phone: '+237 6XX XXX XXX',
          avatar: 'JD',
          rating: 4.8,
          vehicle: 'Moto Yamaha MT-07',
          plate: 'CE-123-AB'
        },
        currentLocation: {
          lat: 3.8488,
          lng: 11.5028,
          address: 'Bastos, Yaoundé'
        },
        destination: {
          lat: 3.8766,
          lng: 11.5360,
          address: 'Mvan, Yaoundé'
        },
        pickup: {
          lat: 3.8667,
          lng: 11.5167,
          address: 'Centre Ville, Yaoundé'
        },
        route: [
          { lat: 3.8667, lng: 11.5167, type: 'pickup' },
          { lat: 3.8588, lng: 11.5098, type: 'waypoint' },
          { lat: 3.8488, lng: 11.5028, type: 'current' },
          { lat: 3.8600, lng: 11.5200, type: 'waypoint' },
          { lat: 3.8766, lng: 11.5360, type: 'destination' }
        ],
        eta: '15 min',
        distance: '8.5 km',
        status: 'in_transit',
        timeline: [
          { time: '10:00', status: 'picked_up', description: 'Commande récupérée' },
          { time: '10:15', status: 'in_transit', description: 'En route vers destination' },
          { time: '10:30', status: 'arriving', description: 'Arrivée imminente' },
          { time: '10:35', status: 'delivered', description: 'Livraison prévue' }
        ]
      };
      setTrackingData(mockTrackingData);
    } catch (error) {
      console.error('Error fetching tracking data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    if (selectedOrder) {
      fetchTrackingData(selectedOrder.id);
    }
  };

  const handleZoomIn = () => setMapZoom(Math.min(18, mapZoom + 1));
  const handleZoomOut = () => setMapZoom(Math.max(10, mapZoom - 1));

  if (!selectedOrder) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MapPin className="w-6 h-6 text-amber-400" />
          Suivi des livraisons
        </h2>
        <div className="bg-slate-800/50 rounded-xl p-8 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">Sélectionnez une commande pour suivre sa livraison</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MapPin className="w-6 h-6 text-amber-400" />
          Suivi de livraison #{selectedOrder.order_number || selectedOrder.id}
        </h2>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      {/* Map Controls */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setMapStyle('streets')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                mapStyle === 'streets' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400'
              }`}
            >
              Rues
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                mapStyle === 'satellite' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setShowRoute(!showRoute)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                showRoute ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400'
              }`}
            >
              <Layers className="w-4 h-4 inline mr-1" />
              Itinéraire
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={handleZoomOut} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
              <ZoomOut className="w-4 h-4 text-white" />
            </button>
            <span className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm">{mapZoom}</span>
            <button onClick={handleZoomIn} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
              <ZoomIn className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Interactive Map Placeholder */}
        <div className="relative h-96 bg-slate-900 rounded-xl overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-amber-500" />
              <p className="text-white font-semibold mb-2">Carte Interactive</p>
              <p className="text-slate-400 text-sm">
                Intégration Mapbox/Google Maps prévue
              </p>
              <div className="mt-4 flex items-center justify-center gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Position actuelle</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>Destination</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>Point de départ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Map Markers */}
          {showRoute && trackingData?.route && (
            <div className="absolute inset-0 pointer-events-none">
              {trackingData.route.map((point, index) => (
                <div
                  key={index}
                  className="absolute w-4 h-4 rounded-full animate-pulse"
                  style={{
                    left: `${20 + index * 15}%`,
                    top: `${30 + (index % 2) * 40}%`,
                    backgroundColor: point.type === 'current' ? '#10b981' : point.type === 'destination' ? '#3b82f6' : '#f59e0b'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tracking Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Driver Info */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            Informations du livreur
          </h3>
          {trackingData?.driver && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white text-2xl font-bold">
                  {trackingData.driver.avatar}
                </div>
                <div>
                  <p className="text-white font-semibold">{trackingData.driver.name}</p>
                  <p className="text-sm text-slate-400">{trackingData.driver.vehicle}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-amber-400">★</span>
                    <span className="text-sm text-white">{trackingData.driver.rating}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Téléphone</p>
                  <p className="text-white">{trackingData.driver.phone}</p>
                </div>
                <div>
                  <p className="text-slate-400">Plaque</p>
                  <p className="text-white">{trackingData.driver.plate}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
                  <Phone className="w-4 h-4" />
                  Appeler
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  Message
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delivery Info */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-green-400" />
            Détails de livraison
          </h3>
          {trackingData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <div>
                    <p className="text-white font-medium">ETA</p>
                    <p className="text-xs text-slate-400">Arrivée estimée</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-amber-400">{trackingData.eta}</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">Distance</p>
                    <p className="text-xs text-slate-400">Distance restante</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-blue-400">{trackingData.distance}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-slate-400">Adresse de destination</p>
                <p className="text-white">{trackingData.destination.address}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-400" />
          Historique de livraison
        </h3>
        {trackingData?.timeline && (
          <div className="space-y-4">
            {trackingData.timeline.map((event, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className={`w-3 h-3 rounded-full mt-1.5 ${
                  event.status === 'delivered' ? 'bg-green-500' :
                  event.status === 'in_transit' ? 'bg-blue-500' :
                  event.status === 'arriving' ? 'bg-amber-500' :
                  'bg-slate-500'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium">{event.description}</p>
                    <p className="text-sm text-slate-400">{event.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedTrackingSection;
