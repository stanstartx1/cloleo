import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, User, Check, X, 
  ChevronLeft, ChevronRight, AlertCircle, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const API = API_URL;

const DeliveryScheduler = ({ orderId, isOpen, onClose, onScheduleSelect }) => {
  const { user, token } = useAuth();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [deliveryType, setDeliveryType] = useState('standard'); // standard, scheduled, pickup

  // Delivery types
  const deliveryTypes = [
    { id: 'standard', label: 'Livraison standard', description: 'Dès que possible', icon: Clock, estimated: '30-60 min' },
    { id: 'scheduled', label: 'Créneau horaire', description: 'Choisissez votre heure', icon: Calendar, estimated: 'Prévu' },
    { id: 'pickup', label: 'Point relais', description: 'Récupérez en boutique', icon: MapPin, estimated: 'Immédiat' }
  ];

  // Fetch available slots for selected date
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || deliveryType !== 'scheduled') return;
      
      setLoading(true);
      try {
        const response = await axios.get(`${API}/delivery/slots/${orderId}`, {
          params: { date: selectedDate },
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data && response.data.slots) {
          setAvailableSlots(response.data.slots);
        }
      } catch (error) {
        console.error('Error fetching slots:', error);
        toast.error('Erreur lors du chargement des créneaux');
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate, deliveryType, orderId, token, API]);

  // Generate next 7 days
  const getNextDays = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date: date,
        label: i === 0 ? 'Aujourd\'hui' : i === 1 ? 'Demain' : date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }),
        value: date.toISOString().split('T')[0]
      });
    }
    
    return days;
  };

  const handleScheduleDelivery = async () => {
    if (deliveryType === 'scheduled' && (!selectedDate || !selectedSlot)) {
      toast.error('Veuillez sélectionner une date et un créneau');
      return;
    }

    setScheduling(true);

    try {
      const response = await axios.post(`${API}/delivery/schedule`, {
        order_id: orderId,
        delivery_type: deliveryType,
        scheduled_date: selectedDate,
        scheduled_slot: selectedSlot
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        toast.success('Livraison planifiée avec succès !', {
          description: response.data.confirmation_message
        });
        
        if (onScheduleSelect) {
          onScheduleSelect(response.data);
        }
        
        onClose();
      }
    } catch (error) {
      console.error('Error scheduling delivery:', error);
      toast.error('Erreur lors de la planification');
    } finally {
      setScheduling(false);
    }
  };

  const availableDays = getNextDays();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Planifier votre livraison</DialogTitle>
          <DialogDescription>
            Choisissez le mode de livraison qui vous convient le mieux
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Delivery Type Selection */}
          <div>
            <h3 className="font-semibold mb-3">Mode de livraison</h3>
            <div className="grid gap-3">
              {deliveryTypes.map((type) => {
                const TypeIcon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setDeliveryType(type.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      deliveryType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        deliveryType === type.id ? 'bg-blue-500 text-white' : 'bg-slate-100'
                      }`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{type.label}</h4>
                        <p className="text-sm text-slate-600">{type.description}</p>
                        <Badge variant="outline" className="mt-2">
                          {type.estimated}
                        </Badge>
                      </div>
                      {deliveryType === type.id && (
                        <Check className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scheduled Delivery Options */}
          {deliveryType === 'scheduled' && (
            <>
              {/* Date Selection */}
              <div>
                <h3 className="font-semibold mb-3">Choisir la date</h3>
                <div className="grid grid-cols-3 gap-2">
                  {availableDays.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => setSelectedDate(day.value)}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        selectedDate === day.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="text-sm font-medium">{day.label}</p>
                      <p className="text-xs text-slate-500">{day.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slot Selection */}
              {selectedDate && (
                <div>
                  <h3 className="font-semibold mb-3">Choisir le créneau</h3>
                  {loading ? (
                    <div className="text-center py-8 text-slate-500">
                      <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p className="text-sm">Chargement des créneaux...</p>
                    </div>
                  ) : availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot.id)}
                          disabled={!slot.available}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            !slot.available
                              ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                              : selectedSlot === slot.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <p className="font-medium">{slot.start_time}</p>
                          <p className="text-xs text-slate-500">à {slot.end_time}</p>
                          {!slot.available && (
                            <Badge variant="secondary" className="mt-1">Indisponible</Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Aucun créneau disponible pour cette date</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Info Section */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Informations importantes</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• Vous serez notifié 30 min avant l'arrivée</li>
                  <li>• Le livreur vous contactera à l'arrivée</li>
                  <li>• Annulation gratuite jusqu'à 2h avant le créneau</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button
            onClick={handleScheduleDelivery}
            disabled={scheduling || (deliveryType === 'scheduled' && (!selectedDate || !selectedSlot))}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500"
          >
            {scheduling ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Confirmer la planification
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryScheduler;