import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { 
  Package, Truck, MapPin, Phone, Clock, CheckCircle, 
  Eye, RefreshCw, Loader2, User
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { loadGoogleMaps } from '../utils/googleMapsLoader';

import { API_BASE, API_URL } from '../config/api';

const API = API_URL;
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const ORDER_STATUSES = {
  pending: { label: 'En attente', color: 'amber' },
  assigned: { label: 'Livreur assigné', color: 'blue' },
  picked_up: { label: 'Colis récupéré', color: 'indigo' },
  in_transit: { label: 'En livraison', color: 'purple' },
  delivered: { label: 'Livrée', color: 'green' },
  cancelled: { label: 'Annulée', color: 'red' }
};

const VendorOrdersTracking = ({ token, vendorId }) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarker = useRef(null);
  const customerMarker = useRef(null);
  const wsRef = useRef(null);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // WebSocket for selected order
  useEffect(() => {
    if (!selectedOrder) return;
    
    const connectWebSocket = () => {
      const ws = new WebSocket(`${WS_URL}/api/ws/orders/order_${selectedOrder.id}`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'driver_location') {
          setDriverLocation(data.location);
          updateDriverMarker(data.location);
        }
        
        if (data.type === 'order_update') {
          fetchOrders();
          toast.info(data.message);
        }
      };
      
      ws.onclose = () => {
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current = ws;
    };
    
    connectWebSocket();
    
    return () => wsRef.current?.close();
  }, [selectedOrder, fetchOrders]);

  // Initialize map when order is selected
  useEffect(() => {
    if (!selectedOrder || !mapRef.current) return;

    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then(() => createMap())
      .catch(() => toast.error('Erreur chargement Google Maps'));
  }, [selectedOrder]);

  const createMap = () => {
    if (!selectedOrder?.delivery_address) return;
    
    const customerPos = {
      lat: selectedOrder.delivery_address.latitude,
      lng: selectedOrder.delivery_address.longitude
    };
    
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center: customerPos,
      zoom: 14,
      styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
    });
    
    // Customer marker
    customerMarker.current = new window.google.maps.Marker({
      map: mapInstance.current,
      position: customerPos,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new window.google.maps.Size(35, 35)
      },
      title: 'Client'
    });
    
    // Driver marker if location available
    if (selectedOrder.driver_live_location || driverLocation) {
      const loc = driverLocation || selectedOrder.driver_live_location;
      updateDriverMarker(loc);
    }
  };

  const updateDriverMarker = (location) => {
    if (!mapInstance.current || !window.google || !location) return;
    
    const pos = { lat: location.latitude, lng: location.longitude };
    
    if (driverMarker.current) {
      driverMarker.current.setPosition(pos);
    } else {
      driverMarker.current = new window.google.maps.Marker({
        map: mapInstance.current,
        position: pos,
        icon: {
          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
          scaledSize: new window.google.maps.Size(35, 35)
        },
        title: 'Livreur'
      });
    }
  };

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <Package className="w-6 h-6 text-primary mb-2" />
          <p className="text-2xl font-bold">{orders.length}</p>
          <p className="text-sm text-muted-foreground">Total commandes</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <Clock className="w-6 h-6 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-amber-700">{activeOrders.length}</p>
          <p className="text-sm text-amber-600">En cours</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-green-700">
            {orders.filter(o => o.status === 'delivered').length}
          </p>
          <p className="text-sm text-green-600">Livrées</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
          <Truck className="w-6 h-6 text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-purple-700">
            {orders.filter(o => o.status === 'in_transit').length}
          </p>
          <p className="text-sm text-purple-600">En livraison</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Orders List */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Commandes actives
            </h3>
            <Button size="sm" variant="ghost" onClick={fetchOrders}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
          
          {activeOrders.length > 0 ? (
            <div className="divide-y max-h-96 overflow-y-auto">
              {activeOrders.map((order) => (
                <div 
                  key={order.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedOrder?.id === order.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium">#{order.order_number?.slice(-8)}</p>
                      <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${ORDER_STATUSES[order.status]?.color}-100 text-${ORDER_STATUSES[order.status]?.color}-700`}>
                      {ORDER_STATUSES[order.status]?.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {order.items?.length} article(s)
                    </span>
                    <span className="font-medium">{formatPrice(order.total_fcfa)} FCFA</span>
                  </div>
                  
                  {order.driver_name && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                      <Truck className="w-4 h-4" />
                      {order.driver_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-muted-foreground">Aucune commande active</p>
            </div>
          )}
        </div>

        {/* Map / Order Details */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {selectedOrder ? (
            <>
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">Suivi de la commande</h3>
                    <p className="text-sm text-muted-foreground">#{selectedOrder.order_number}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${ORDER_STATUSES[selectedOrder.status]?.color}-100 text-${ORDER_STATUSES[selectedOrder.status]?.color}-700`}>
                    {ORDER_STATUSES[selectedOrder.status]?.label}
                  </span>
                </div>
              </div>
              
              {/* Map */}
              <div ref={mapRef} className="w-full h-48" data-testid="vendor-tracking-map" />
              
              {/* Order Info */}
              <div className="p-4 space-y-4">
                {/* Customer */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedOrder.delivery_address?.street}
                    </p>
                    <a 
                      href={`tel:${selectedOrder.delivery_address?.phone}`}
                      className="text-sm text-primary flex items-center gap-1 mt-1"
                    >
                      <Phone className="w-3 h-3" />
                      {selectedOrder.delivery_address?.phone}
                    </a>
                  </div>
                </div>
                
                {/* Driver */}
                {selectedOrder.driver_name && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Truck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedOrder.driver_name}</p>
                      <p className="text-sm text-muted-foreground">Livreur</p>
                      {selectedOrder.driver?.phone && (
                        <a 
                          href={`tel:${selectedOrder.driver.phone}`}
                          className="text-sm text-primary flex items-center gap-1 mt-1"
                        >
                          <Phone className="w-3 h-3" />
                          {selectedOrder.driver.phone}
                        </a>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Items */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">Articles</p>
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span>{item.product_name} x{item.quantity}</span>
                      <span>{formatPrice(item.subtotal_fcfa)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                    <span>Total</span>
                    <span>{formatPrice(selectedOrder.total_fcfa)} FCFA</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-96 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-muted-foreground">
                  Sélectionnez une commande pour voir le suivi
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Completed Orders */}
      {completedOrders.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Commandes terminées
            </h3>
          </div>
          <div className="overflow-x-auto touch-scroll-x">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Commande</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Client</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Total</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Statut</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {completedOrders.slice(0, 10).map((order) => (
                  <tr key={order.id} className="border-t">
                    <td className="p-3 font-mono text-sm">#{order.order_number?.slice(-8)}</td>
                    <td className="p-3 text-sm">{order.customer_name}</td>
                    <td className="p-3 font-medium">{formatPrice(order.total_fcfa)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'delivered' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {ORDER_STATUSES[order.status]?.label}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorOrdersTracking;
