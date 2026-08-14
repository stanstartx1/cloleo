import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, X, Check, AlertCircle, MapPin, Signature,
  Upload, Image as ImageIcon, FileText, Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const API = API_URL;

const DeliveryProof = ({ orderId, isOpen, onClose, onSubmit }) => {
  const { user, token } = useAuth();
  const [proofType, setProofType] = useState('photo'); // photo, signature, both
  const [photo, setPhoto] = useState(null);
  const [signature, setSignature] = useState(null);
  const [notes, setNotes] = useState('');
  const [uploading, setSubmitting] = useState(false);
  const [location, setLocation] = useState(null);
  
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  // Get current location
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Impossible d\'obtenir votre position');
        }
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      getCurrentLocation();
    }
  }, [isOpen]);

  // Handle photo capture
  const handlePhotoCapture = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle camera capture
  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Camera implementation would go here
      // For now, just trigger file input
      fileInputRef.current?.click();
    } catch (error) {
      console.error('Camera access denied:', error);
      toast.error('Accès caméra refusé');
    }
  };

  // Handle signature (canvas)
  const handleSignatureStart = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  };

  const handleSignatureMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handleSignatureEnd = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.closePath();
    
    // Save signature as base64
    setSignature(canvas.toDataURL());
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

  // Submit delivery proof
  const handleSubmitProof = async () => {
    if (proofType === 'photo' && !photo) {
      toast.error('Veuillez fournir une photo');
      return;
    }
    
    if (proofType === 'signature' && !signature) {
      toast.error('Veuillez fournir une signature');
      return;
    }
    
    if (proofType === 'both' && (!photo || !signature)) {
      toast.error('Veuillez fournir photo et signature');
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(`${API}/delivery/proof`, {
        order_id: orderId,
        proof_type: proofType,
        photo: photo,
        signature: signature,
        notes: notes,
        location: location,
        delivered_at: new Date().toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        toast.success('Preuve de livraison soumise !', {
          description: 'La livraison a été confirmée'
        });
        
        if (onSubmit) {
          onSubmit(response.data);
        }
        
        onClose();
      }
    } catch (error) {
      console.error('Error submitting proof:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preuve de livraison</DialogTitle>
          <DialogDescription>
            Confirmez la livraison avec une photo et/ou signature
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Proof Type Selection */}
          <div>
            <h3 className="font-semibold mb-3">Type de preuve</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setProofType('photo')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  proofType === 'photo'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Camera className="w-5 h-5 mx-auto mb-1" />
                <p className="text-sm font-medium">Photo</p>
              </button>
              <button
                onClick={() => setProofType('signature')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  proofType === 'signature'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Signature className="w-5 h-5 mx-auto mb-1" />
                <p className="text-sm font-medium">Signature</p>
              </button>
              <button
                onClick={() => setProofType('both')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  proofType === 'both'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Check className="w-5 h-5 mx-auto mb-1" />
                <p className="text-sm font-medium">Les deux</p>
              </button>
            </div>
          </div>

          {/* Photo Section */}
          {(proofType === 'photo' || proofType === 'both') && (
            <div>
              <h3 className="font-semibold mb-3">Photo de livraison</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoCapture}
                className="hidden"
              />
              
              {photo ? (
                <div className="relative">
                  <img src={photo} alt="Delivery proof" className="w-full rounded-lg" />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => setPhoto(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                  <Camera className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-sm text-slate-600 mb-3">Ajoutez une photo du colis livré</p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Importer
                    </Button>
                    <Button onClick={handleCameraCapture} variant="outline" size="sm">
                      <Camera className="w-4 h-4 mr-2" />
                      Caméra
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Signature Section */}
          {(proofType === 'signature' || proofType === 'both') && (
            <div>
              <h3 className="font-semibold mb-3">Signature du client</h3>
              <div className="border-2 border-slate-300 rounded-lg bg-white">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={150}
                  className="w-full"
                  onMouseDown={handleSignatureStart}
                  onMouseMove={handleSignatureMove}
                  onMouseUp={handleSignatureEnd}
                  onMouseLeave={handleSignatureEnd}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSignature}
                className="mt-2"
              >
                Effacer la signature
              </Button>
            </div>
          )}

          {/* Location Section */}
          {location && (
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">
                  Position: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </span>
                <Badge variant="outline" className="ml-auto">
                  ±{Math.round(location.accuracy)}m
                </Badge>
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div>
            <label className="text-sm font-medium mb-2 block">Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez des notes sur la livraison..."
              className="w-full p-3 border rounded-lg text-sm"
              rows={2}
              maxLength={200}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button
            onClick={handleSubmitProof}
            disabled={uploading}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
          >
            {uploading ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Confirmer la livraison
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryProof;