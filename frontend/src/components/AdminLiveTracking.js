import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  MapPin, Truck, Package, Eye, Phone, Clock, 
  CheckCircle, XCircle, RefreshCw, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { loadGoogleMaps } from '../utils/googleMapsLoader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const WS_URL = BACKEND_URL
  .replace(/^https:\/\//, 'wss://')
  .replace(/^http:\/\//, 'ws://');
const API = `${BACKEND_URL}/api`;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const ORDER_STATUSES = {
  pending: { label: 'En attente', color: 'amber' },
  assigned: { label: 'Assignée', color: 'blue' },
  picked_up: { label: 'Récupérée', color: 'indigo' },
  in_transit: { label: 'En route', color: 'purple' },
  delivered: { label: 'Livrée', color: 'green' },
  cancelled: { label: 'Annulée', color: 'red' }
};

const AdminLiveTracking = ({ token }) => {
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const wsRef = useRef(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [driversRes, ordersRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/drivers/locations`, { headers }),
        axios.get(`${API}/admin/orders?limit=50`, { headers }),
        axios.get(`${API}/admin/orders/stats`, { headers })
      ]);
      
      setDrivers(driversRes.data.drivers || []);
      setOrders(ordersRes.data.orders || []);
      setOrderStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();

    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then(() => setMapLoaded(true))
      .catch(() => toast.error('Erreur chargement Google Maps'));
  }, [fetchData]);

  // Initialize map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstance.current) return;
    
    // Default to Abidjan
    const center = { lat: 5.3599, lng: -4.0083 };
    
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] }
      ]
    });
    
    // Add markers for drivers
    updateDriverMarkers();
  }, [mapLoaded]);

  // Update markers when drivers change
  useEffect(() => {
    if (mapInstance.current) {
      updateDriverMarkers();
    }
  }, [drivers]);

  const updateDriverMarkers = () => {
    if (!mapInstance.current || !window.google) return;
    
    // Clear old markers
    Object.values(markersRef.current).forEach(marker => marker.setMap(null));
    markersRef.current = {};
    
    // Add new markers
    drivers.forEach(driver => {
      if (!driver.location?.latitude) return;
      
      const pos = { lat: driver.location.latitude, lng: driver.location.longitude };
      
      const marker = new window.google.maps.Marker({
        map: mapInstance.current,
        position: pos,
        icon: {
          url: driver.status === 'available' 
            ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
            : driver.status === 'busy'
            ? 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
            : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(35, 35)
        },
        title: driver.driver_name
      });
      
      // Info window
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 150px;">
            <strong>${driver.driver_name}</strong><br/>
            <span style="color: #666;">${driver.vehicle_type}</span><br/>
            <span style="color: ${driver.status === 'available' ? 'green' : 'orange'};">
              ${driver.status === 'available' ? '● Disponible' : '● Occupé'}
            </span>
          </div>
        `
      });
      
      marker.addListener('click', () => {
        infoWindow.open(mapInstance.current, marker);
        setSelectedDriver(driver);
      });
      
      markersRef.current[driver.driver_id] = marker;
    });
    
    // Fit bounds if we have markers
    if (drivers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      drivers.forEach(d => {
        if (d.location?.latitude) {
          bounds.extend({ lat: d.location.latitude, lng: d.location.longitude });
        }
      });
      mapInstance.current.fitBounds(bounds, { padding: 50 });
    }
  };

  // WebSocket for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(`${WS_URL}/ws/orders/admin_tracking`);
      
      ws.onopen = () => {
        console.log('Admin tracking WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'driver_location') {
          // Update driver location
          setDrivers(prev => prev.map(d => 
            d.driver_id === data.driver_id 
              ? { ...d, location: data.location }
              : d
          ));
          
          // Update marker on map
          if (markersRef.current[data.driver_id] && window.google) {
            markersRef.current[data.driver_id].setPosition({
              lat: data.location.latitude,
              lng: data.location.longitude
            });
          }
        }
        
        if (data.type === 'order_update') {
          // Refresh orders
          fetchData();
        }
        
        if (data.type === 'new_order') {
          toast.info('Nouvelle commande !', {
            description: `${data.order.delivery_address?.city}`
          });
          fetchData();
        }
      };
      
      ws.onclose = () => {
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current = ws;
    };
    
    connectWebSocket();
    
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
    
    return () => {
      clearInterval(pingInterval);
      wsRef.current?.close();
    };
  }, [fetchData]);

  // Focus on driver
  const focusOnDriver = (driver) => {
    if (!mapInstance.current || !driver.location) return;
    
    mapInstance.current.setCenter({
      lat: driver.location.latitude,
      lng: driver.location.longitude
    });
    mapInstance.current.setZoom(16);
    setSelectedDriver(driver);
  };

  // Get active orders count by status
  const getOrderCountByStatus = (status) => {
    return orders.filter(o => o.status === status).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Order Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{orderStats?.total || 0}</p>
          <p className="text-xs text-slate-400">Total commandes</p>
        </div>
        <div className="bg-amber-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-400">{orderStats?.pending || 0}</p>
          <p className="text-xs text-slate-400">En attente</p>
        </div>
        <div className="bg-blue-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-blue-400">{orderStats?.assigned || 0}</p>
          <p className="text-xs text-slate-400">Assignées</p>
        </div>
        <div className="bg-purple-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-400">{orderStats?.in_transit || 0}</p>
          <p className="text-xs text-slate-400">En cours</p>
        </div>
        <div className="bg-green-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-400">{orderStats?.delivered || 0}</p>
          <p className="text-xs text-slate-400">Livrées</p>
        </div>
        <div className="bg-emerald-500/20 rounded-xl p-4">
          <p className="text-2xl font-bold text-emerald-400">{formatPrice(orderStats?.total_revenue_fcfa || 0)}</p>
          <p className="text-xs text-slate-400">Revenus FCFA</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold">Suivi en temps réel</h3>
            </div>
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
            </Button>
          </div>
          
          <div ref={mapRef} className="w-full h-96" data-testid="admin-tracking-map" />
          
          {/* Legend */}
          <div className="p-3 bg-slate-700/50 flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-slate-300">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full" />
              <span className="text-slate-300">Occupé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span className="text-slate-300">Hors ligne</span>
            </div>
          </div>
        </div>

        {/* Active Drivers List */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-bold flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-400" />
              Livreurs actifs ({drivers.length})
            </h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {drivers.length > 0 ? (
              <div className="divide-y divide-slate-700">
                {drivers.map((driver) => (
                  <div 
                    key={driver.driver_id}
                    className={`p-3 hover:bg-slate-700/30 cursor-pointer transition-colors ${
                      selectedDriver?.driver_id === driver.driver_id ? 'bg-slate-700/50' : ''
                    }`}
                    onClick={() => focusOnDriver(driver)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          driver.status === 'available' ? 'bg-green-400' :
                          driver.status === 'busy' ? 'bg-yellow-400' : 'bg-slate-400'
                        }`} />
                        <div>
                          <p className="font-medium text-white text-sm">{driver.driver_name}</p>
                          <p className="text-xs text-slate-400">{driver.vehicle_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {driver.phone && (
                          <a 
                            href={`tel:${driver.phone}`}
                            className="p-1.5 bg-green-500/20 rounded text-green-400 hover:bg-green-500/30"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                        <button 
                          className="p-1.5 bg-blue-500/20 rounded text-blue-400 hover:bg-blue-500/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            focusOnDriver(driver);
                          }}
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Truck className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Aucun livreur en ligne</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-green-400" />
            Commandes récentes
          </h3>
        </div>
        
        <div className="overflow-x-auto touch-scroll-x">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left p-3 text-xs font-medium text-slate-400">Commande</th>
                <th className="text-left p-3 text-xs font-medium text-slate-400">Client</th>
                <th className="text-left p-3 text-xs font-medium text-slate-400">Livreur</th>
                <th className="text-left p-3 text-xs font-medium text-slate-400">Total</th>
                <th className="text-left p-3 text-xs font-medium text-slate-400">Statut</th>
                <th className="text-left p-3 text-xs font-medium text-slate-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((order) => (
                <tr key={order.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                  <td className="p-3">
                    <p className="font-mono text-sm text-white">#{order.order_number?.slice(-8)}</p>
                  </td>
                  <td className="p-3">
                    <p className="text-sm text-white">{order.customer_name}</p>
                    <p className="text-xs text-slate-400">{order.delivery_address?.city}</p>
                  </td>
                  <td className="p-3">
                    {order.driver_name ? (
                      <span className="text-sm text-white">{order.driver_name}</span>
                    ) : (
                      <span className="text-xs text-amber-400">Non assigné</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="font-medium text-white">{formatPrice(order.total_fcfa)}</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${ORDER_STATUSES[order.status]?.color}-500/20 text-${ORDER_STATUSES[order.status]?.color}-400`}>
                      {ORDER_STATUSES[order.status]?.label}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-400">
                    {new Date(order.created_at).toLocaleString('fr-FR', { 
                      day: '2-digit', 
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {orders.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">Aucune commande</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLiveTracking;
