import { API_URL } from '../config/api';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  X, MapPin, Phone, User, CreditCard, Truck, 
  CheckCircle, Loader2, Package, Navigation, Zap,
  Minus, Plus, ShoppingBag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { loadMapbox } from '../utils/mapboxLoader';
import { DEFAULT_MAP_CENTER, forwardGeocodeMapbox, reverseGeocodeMapbox, toLngLat, upsertMarker } from '../utils/mapboxMap';

const API = API_URL;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';

const QuickCheckoutModal = ({ product, quantity: initialQuantity = 1, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const mapboxRef = useRef(null);
  const markerRef = useRef(null);
  
  const [quantity, setQuantity] = useState(initialQuantity);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);
  const [step, setStep] = useState(1); // 1: Confirm product, 2: Address, 3: Success
  
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

  const displayPrice = product.promo_price_fcfa || product.price_fcfa;
  const totalPrice = displayPrice * quantity;
  const deliveryFee = 1500; // Fixed delivery fee
  const grandTotal = totalPrice + deliveryFee;

  // Load Mapbox
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        loadMapbox()
          .then((mapboxgl) => {
            mapboxRef.current = mapboxgl;
            initMap(mapboxgl);
          })
          .catch(() => toast.error('Erreur chargement Mapbox'));
      }, 100);
    }
  }, [step]);

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
      color: '#f97316',
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
      upsertMarker(mapboxgl, mapInstance.current, markerRef, { latitude, longitude }, { color: '#f97316' });
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

      upsertMarker(mapboxRef.current, mapInstance.current, markerRef, result, { color: '#f97316' });
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
          upsertMarker(mapboxRef.current, mapInstance.current, markerRef, location, { color: '#f97316' });
        }
        
        setFormData(prev => ({ ...prev, latitude, longitude }));
        reverseGeocode(latitude, longitude);
        setLocatingUser(false);
        toast.success('Position trouvée !');
      },
      () => {
        setLocatingUser(false);
        toast.error('Impossible de vous localiser');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async () => {
    if (!formData.street || !formData.phone || !formData.name) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (!formData.latitude || !formData.longitude) {
      toast.error('Veuillez sélectionner votre position sur la carte');
      return;
    }
    
    setLoading(true);
    
    try {
      const orderData = {
        items: [{
          product_id: product.id,
          quantity: quantity
        }],
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
        notes: formData.notes,
        is_direct_purchase: true
      };
      
      const response = await axios.post(`${API}/orders`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setOrderId(response.data.id);
      setOrderPlaced(true);
      setStep(3);
      toast.success('Commande passée avec succès !');
      
      if (onSuccess) {
        onSuccess(response.data);
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la commande');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Product confirmation
  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Product Summary */}
      <div className="flex gap-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
        {product.images?.[0] && (
          <img 
            src={product.images[0]} 
            alt={product.name}
            className="w-24 h-24 object-cover rounded-lg shadow-md"
          />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{product.name}</h3>
          <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
          {product.promo_price_fcfa && product.promo_price_fcfa < product.price_fcfa ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-gray-400 line-through text-sm">{formatPrice(product.price_fcfa)}</span>
              <span className="text-xl font-bold text-orange-600">{formatPrice(product.promo_price_fcfa)}</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                -{Math.round((1 - product.promo_price_fcfa / product.price_fcfa) * 100)}%
              </span>
            </div>
          ) : (
            <p className="text-xl font-bold text-orange-600 mt-2">{formatPrice(product.price_fcfa)}</p>
          )}
        </div>
      </div>

      {/* Quantity Selector */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <span className="font-medium">Quantité</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
            disabled={quantity <= 1}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-xl font-bold w-8 text-center">{quantity}</span>
          <button
            onClick={() => setQuantity(q => Math.min(product.stock || 99, q + 1))}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Price Summary */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
        <div className="flex justify-between text-gray-600">
          <span>Sous-total ({quantity} article{quantity > 1 ? 's' : ''})</span>
          <span>{formatPrice(totalPrice)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span className="flex items-center gap-2">
            <Truck className="w-4 h-4" /> Livraison
          </span>
          <span>{formatPrice(deliveryFee)}</span>
        </div>
        <div className="border-t pt-3 flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-orange-600">{formatPrice(grandTotal)}</span>
        </div>
      </div>

      {/* Continue Button */}
      <Button
        onClick={() => setStep(2)}
        className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-xl"
        data-testid="direct-checkout-continue"
      >
        <Zap className="w-5 h-5 mr-2" />
        Continuer vers la livraison
      </Button>
    </div>
  );

  // Step 2: Delivery address
  const renderStep2 = () => (
    <div className="space-y-4">
      {/* Map */}
      <div className="relative">
        <div 
          ref={mapRef} 
          className="w-full h-48 rounded-xl bg-gray-100"
          style={{ minHeight: '200px' }}
        />
        <button
          onClick={getCurrentLocation}
          disabled={locatingUser}
          className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
        >
          {locatingUser ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 text-orange-500" />
          )}
          <span className="text-sm font-medium">Ma position</span>
        </button>
      </div>

      {/* Form Fields */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            <User className="w-4 h-4 inline mr-1" /> Nom complet *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Votre nom"
            className="h-12"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            <Phone className="w-4 h-4 inline mr-1" /> Téléphone *
          </label>
          <Input
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+225 07 00 00 00"
            className="h-12"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            <MapPin className="w-4 h-4 inline mr-1" /> Adresse de livraison *
          </label>
          <Input
            value={formData.street}
            onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
            onBlur={geocodeTypedAddress}
            placeholder="Cliquez sur la carte ou entrez l'adresse"
            className="h-12"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Notes (optionnel)
          </label>
          <Input
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Instructions pour le livreur..."
            className="h-12"
          />
        </div>
      </div>

      {/* Payment Method */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-3">
        <label className="text-sm font-medium text-gray-700 block">
          <CreditCard className="w-4 h-4 inline mr-1" /> Mode de paiement
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'cash' }))}
            className={`p-4 rounded-xl border-2 transition-all ${
              formData.paymentMethod === 'cash' 
                ? 'border-orange-500 bg-orange-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Package className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <p className="font-medium text-sm">Paiement à la livraison</p>
          </button>
          <button
            onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'mobile_money' }))}
            className={`p-4 rounded-xl border-2 transition-all ${
              formData.paymentMethod === 'mobile_money' 
                ? 'border-orange-500 bg-orange-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <CreditCard className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <p className="font-medium text-sm">Mobile Money</p>
          </button>
        </div>
      </div>

      {/* Order Summary Mini */}
      <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">{quantity}x {product.name}</p>
            <p className="text-xs text-gray-500">+ Livraison {formatPrice(deliveryFee)}</p>
          </div>
          <p className="text-xl font-bold text-orange-600">{formatPrice(grandTotal)}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep(1)}
          className="flex-1 h-12"
        >
          Retour
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !formData.name || !formData.phone || !formData.street}
          className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
          data-testid="direct-checkout-submit"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Confirmer la commande
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // Step 3: Order success
  const renderStep3 = () => (
    <div className="text-center py-8 space-y-6">
      <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-bounce">
        <CheckCircle className="w-10 h-10 text-white" />
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-gray-800">Commande confirmée !</h3>
        <p className="text-gray-600 mt-2">Votre commande #{orderId?.slice(0, 8)} a été passée avec succès</p>
      </div>
      
      <div className="p-4 bg-green-50 rounded-xl border border-green-100">
        <p className="text-green-800 font-medium">
          Vous recevrez bientôt une confirmation par téléphone
        </p>
        <p className="text-green-600 text-sm mt-1">
          Livraison estimée : 2-4 heures
        </p>
      </div>
      
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          Continuer mes achats
        </Button>
        <Button
          onClick={() => navigate(`/mes-commandes/${orderId}`)}
          className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500"
        >
          Suivre ma commande
        </Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="quick-checkout-modal">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-orange-500 to-amber-500 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Achat Direct</h2>
              <p className="text-sm text-white/80">
                {step === 1 && 'Confirmez votre achat'}
                {step === 2 && 'Adresse de livraison'}
                {step === 3 && 'Commande confirmée'}
              </p>
            </div>
          </div>
          {step !== 3 && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Progress Steps */}
        {step !== 3 && (
          <div className="flex items-center justify-center gap-2 py-3 bg-gray-50">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 1 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>1</div>
            <div className={`w-12 h-1 rounded ${step >= 2 ? 'bg-orange-500' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 2 ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>2</div>
            <div className={`w-12 h-1 rounded ${step >= 3 ? 'bg-orange-500' : 'bg-gray-200'}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 3 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>
      </div>
    </div>
  );
};

export default QuickCheckoutModal;
