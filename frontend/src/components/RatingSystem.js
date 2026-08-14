import React, { useState, useEffect } from 'react';
import { 
  Star, MessageCircle, Send, ThumbsUp, ThumbsDown, 
  Flag, Check, X, Clock, User, Truck, Store
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const API = API_URL;

const RatingSystem = ({ orderId, orderType, recipientId, recipientName, recipientRole, isOpen, onClose }) => {
  const { user, token } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [existingRating, setExistingRating] = useState(null);

  // Available tags based on role
  const tagOptions = {
    driver: [
      { id: 'punctual', label: 'À l\'heure', icon: Clock },
      { id: 'courteous', label: 'Courtois', icon: User },
      { id: 'professional', label: 'Professionnel', icon: Check },
      { id: 'careful', label: 'Soigneux', icon: ThumbsUp },
      { id: 'communicative', label: 'Bon communicateur', icon: MessageCircle }
    ],
    vendor: [
      { id: 'quality', label: 'Qualité produit', icon: Star },
      { id: 'fast', label: 'Livraison rapide', icon: Truck },
      { id: 'responsive', label: 'Réactif', icon: MessageCircle },
      { id: 'packaging', label: 'Emballage soigné', icon: Store },
      { id: 'honest', label: 'Honnête', icon: Check }
    ],
    customer: [
      { id: 'accessible', label: 'Accessible', icon: User },
      { id: 'friendly', label: 'Aimable', icon: ThumbsUp },
      { id: 'clear_address', label: 'Adresse claire', icon: Store },
      { id: 'patient', label: 'Patient', icon: Clock },
      { id: 'responsive', label: 'Réactif', icon: MessageCircle }
    ]
  };

  const availableTags = tagOptions[recipientRole] || tagOptions.vendor;

  // Check if user has already rated
  useEffect(() => {
    const checkExistingRating = async () => {
      if (!orderId || !token) return;
      
      try {
        const response = await axios.get(`${API}/ratings/check/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data && response.data.has_rated) {
          setHasRated(true);
          setExistingRating(response.data.rating);
        }
      } catch (error) {
        console.error('Error checking rating:', error);
      }
    };

    if (isOpen) {
      checkExistingRating();
    }
  }, [orderId, token, isOpen, API]);

  const handleTagToggle = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast.error('Veuillez sélectionner une note');
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(`${API}/ratings/submit`, {
        order_id: orderId,
        recipient_id: recipientId,
        recipient_role: recipientRole,
        rating: rating,
        comment: comment,
        tags: selectedTags
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        toast.success('Merci pour votre évaluation !', {
          description: 'Votre feedback nous aide à améliorer nos services'
        });
        setHasRated(true);
        setExistingRating(response.data.rating);
        onClose();
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Erreur lors de la soumission de l\'évaluation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async () => {
    try {
      await axios.post(`${API}/ratings/report`, {
        order_id: orderId,
        recipient_id: recipientId,
        reason: 'Signalement via évaluation'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Signalement envoyé', {
        description: 'Nous allons examiner ce cas'
      });
    } catch (error) {
      console.error('Error reporting:', error);
      toast.error('Erreur lors du signalement');
    }
  };

  if (!isOpen) return null;

  if (hasRated && existingRating) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Évaluation déjà soumise</DialogTitle>
            <DialogDescription>
              Vous avez déjà évalué {recipientName}
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="flex justify-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-8 h-8 ${
                    star <= existingRating.rating 
                      ? 'text-yellow-400 fill-yellow-400' 
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-2xl font-bold mb-2">{existingRating.rating}/5</p>
            {existingRating.comment && (
              <p className="text-slate-600 mb-4">"{existingRating.comment}"</p>
            )}
            {existingRating.tags && existingRating.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {existingRating.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <Button onClick={onClose} className="w-full">
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Évaluer {recipientName}</DialogTitle>
          <DialogDescription>
            Partagez votre expérience pour aider à améliorer nos services
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="text-center">
            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-slate-600">
              {rating > 0 ? `Votre note: ${rating}/5` : 'Sélectionnez une note'}
            </p>
          </div>

          {/* Tags */}
          <div>
            <p className="text-sm font-medium mb-3">Ce qui vous a plu (optionnel):</p>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => {
                const TagIcon = tag.icon;
                return (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors ${
                      selectedTags.includes(tag.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <TagIcon className="w-4 h-4" />
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium mb-2 block">Commentaire (optionnel):</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partagez votre expérience..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-slate-500 mt-1">
              {comment.length}/500 caractères
            </p>
          </div>

          {/* Report Button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReport}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Flag className="w-4 h-4 mr-2" />
              Signaler un problème
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuler
          </Button>
          <Button
            onClick={handleSubmitRating}
            disabled={submitting || rating === 0}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500"
          >
            {submitting ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Envoyer l'évaluation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingSystem;