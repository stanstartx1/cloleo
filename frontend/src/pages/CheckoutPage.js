import { API_URL } from '../config/api';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ShoppingBag, MapPin, Phone, User, CreditCard, Truck, 
  ArrowLeft, CheckCircle, Loader2, Package, Clock, Navigation
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { loadMapbox } from '../utils/mapboxLoader';
import { DEFAULT_MAP_CENTER, forwardGeocodeMapbox, reverseGeocodeMapbox, toLngLat, upsertMarker } from '../utils/mapboxMap';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { cart, clearCart } = useCart();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const mapboxRef = useRef(null);
  const markerRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    street: '',
    city: 'Abidjan',
    country: "Côte d'Ivoire",
    latitude: null,
    longitude: null,
    paymentMethod: 'cash',
    notes: ''
  });

  // Load Mapbox
  useEffect(() => {
    loadMapbox()
      .then((mapboxgl) => {
        mapboxRef.current = mapboxgl;
        initMap(mapboxgl);
      })
      .catch(() => toast.error('Erreur chargement Mapbox'));
  }, []);

  const initMap = (mapboxgl) => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: toLngLat(DEFAULT_MAP_CENTER),
      zoom: 13,
    });

    mapInstance.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    upsertMarker(mapboxgl, mapInstance.current, markerRef, DEFAULT_MAP_CENTER, {
      color: '#ef4444',
      title: 'Adresse de livraison',
      draggable: true,
      onDragEnd: ({ latitude, longitude }) => {
        setFormData(prev => ({ ...prev, latitude, longitude }));
        reverseGeocode(latitude, longitude);
      },
    });

    mapInstance.current.on('click', (event) => {
      const latitude = event.lngLat.lat;
      const longitude = event.lngLat.lng;
      upsertMarker(mapboxgl, mapInstance.current, markerRef, { latitude, longitude }, { color: '#ef4444' });
      setFormData(prev => ({ ...prev, latitude, longitude }));
      reverseGeocode(latitude, longitude);
    });
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const address = await reverseGeocodeMapbox(lat, lng);
      if (address) setFormData(prev => ({ ...prev, street: address }));
    } catch (error) {
      console.error('Geocoding error:', error);
    }
  };

  const geocodeTypedAddress = async () => {
    try {
      const result = await forwardGeocodeMapbox(formData.street);
      if (!result || !mapInstance.current || !mapboxRef.current) return;

      upsertMarker(mapboxRef.current, mapInstance.current, markerRef, result, { color: '#ef4444' });
      mapInstance.current.easeTo({ center: toLngLat(result), zoom: 17 });
      setFormData(prev => ({
        ...prev,
        street: result.address,
        latitude: result.latitude,
        longitude: result.longitude,
      }));
    } catch (error) {
      console.error('Forward geocoding error:', error);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée');
      return;
    }
    
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapInstance.current && markerRef.current) {
          const location = { latitude, longitude };
          mapInstance.current.easeTo({ center: toLngLat(location), zoom: 17 });
          upsertMarker(mapboxRef.current, mapInstance.current, markerRef, location, { color: '#ef4444' });
        }
        
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude
        }));
        
        reverseGeocode(latitude, longitude);
        setLocatingUser(false);
        toast.success('Position trouvée !');
      },
      (error) => {
        setLocatingUser(false);
        toast.error('Impossible de vous localiser');
        console.error('Geolocation error:', error);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.street || !formData.phone || !formData.name) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (!formData.latitude || !formData.longitude) {
      toast.error('Veuillez sélectionner votre position sur la carte');
      return;
    }
    
    if (cart.items.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }
    
    setLoading(true);
    
    try {
      const orderData = {
        items: cart.items.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity
        })),
        delivery_address: {
          name: formData.name,
          phone: formData.phone,
          street: formData.street,
          city: formData.city,
          country: formData.country,
          latitude: formData.latitude,
          longitude: formData.longitude
        },
        payment_method: formData.paymentMethod,
        notes: formData.notes
      };
      
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`${API}/orders`, orderData, { headers });
      
      setOrderId(response.data.id);
      setOrderPlaced(true);
      
      // Clear cart
      await clearCart();
      
      toast.success('Commande passée avec succès !');
      
      // Play notification sound
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      } catch {}
      
    } catch (error) {
      console.error('Order error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la commande');
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Commande confirmée !</h1>
          <p className="text-gray-600 mb-6">
            Votre commande a été passée avec succès. Un livreur va bientôt la prendre en charge.
          </p>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm text-gray-500">Numéro de commande</p>
            <p className="font-mono font-bold text-lg">{orderId?.slice(0, 8).toUpperCase()}</p>
          </div>
          
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link to={`/suivi/${orderId}`}>
                <MapPin className="w-4 h-4 mr-2" /> Suivre ma commande
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">
                Continuer mes achats
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-gray-50" data-testid="checkout-page">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/panier')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Finaliser la commande</h1>
            <p className="text-muted-foreground">{cart.item_count} article(s) • {formatPrice(cart.total_fcfa)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Info */}
              <div className="bg-white rounded-xl border p-6">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Informations de contact
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom complet *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Votre nom"
                      required
                      data-testid="checkout-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Téléphone *</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+225 07 00 00 00"
                      required
                      data-testid="checkout-phone"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="bg-white rounded-xl border p-6">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Adresse de livraison
                </h2>
                
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        id="address-input"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        onBlur={geocodeTypedAddress}
                        placeholder="Rechercher votre adresse..."
                        data-testid="checkout-address"
                      />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={getCurrentLocation}
                      disabled={locatingUser}
                    >
                      {locatingUser ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Navigation className="w-4 h-4" />
                      )}
                      <span className="ml-2 hidden sm:inline">Ma position</span>
                    </Button>
                  </div>
                  
                  {/* Map */}
                  <div 
                    ref={mapRef} 
                    className="w-full h-64 rounded-xl border overflow-hidden"
                    data-testid="checkout-map"
                  />
                  
                  <p className="text-sm text-muted-foreground">
                    Cliquez sur la carte ou glissez le marqueur pour ajuster votre position exacte
                  </p>
                  
                  {formData.latitude && formData.longitude && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      Position sélectionnée
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Ville</label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Abidjan"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Pays</label>
                      <Input value={formData.country} disabled />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-xl border p-6">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Mode de paiement
                </h2>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: 'cash' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.paymentMethod === 'cash' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid="payment-cash"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        ??
                      </div>
                      <div>
                        <p className="font-medium">Paiement à la livraison</p>
                        <p className="text-sm text-muted-foreground">Espèces ou Mobile Money</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: 'card' })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.paymentMethod === 'card' 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid="payment-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        ??
                      </div>
                      <div>
                        <p className="font-medium">Carte bancaire</p>
                        <p className="text-sm text-muted-foreground">Visa, Mastercard</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-xl border p-6">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Instructions de livraison (optionnel)
                </h2>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Indications pour le livreur (étage, code, repères...)"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
                  data-testid="checkout-notes"
                />
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border p-6 sticky top-24">
                <h2 className="font-bold text-lg mb-4">Récapitulatif</h2>
                
                {/* Items */}
                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <img 
                        src={item.product.images?.[0] || 'https://via.placeholder.com/60'} 
                        alt={item.product.name}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">Qté: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-sm">
                        {formatPrice(item.subtotal_fcfa)}
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Totals */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span>{formatPrice(cart.total_fcfa)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Truck className="w-4 h-4" /> Livraison
                    </span>
                    <span>{formatPrice(1000)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-3">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(cart.total_fcfa + 1000)}</span>
                  </div>
                </div>
                
                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full mt-6" 
                  size="lg"
                  disabled={loading || cart.items.length === 0}
                  data-testid="place-order-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      Confirmer la commande
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground mt-4">
                  En confirmant, vous acceptez nos conditions générales de vente
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPage;
