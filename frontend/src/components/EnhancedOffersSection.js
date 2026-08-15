import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Clock, TrendingUp, CheckCircle, X, Loader2, Calculator, Info } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

/**
 * AdvancedNegotiationModal - Modal for advanced offer negotiation
 * @param {Object} offer - Offer object
 * @param {Object} user - Current user object
 * @param {string} token - Authentication token
 * @param {Function} onClose - Close modal function
 * @param {Function} onUpdateOffer - Update offer callback
 */
const AdvancedNegotiationModal = ({ offer, user, token, onClose, onUpdateOffer }) => {
  const [proposedPrice, setProposedPrice] = useState(offer?.proposed_price || '');
  const [proposedQuantity, setProposedQuantity] = useState(offer?.proposed_quantity || '');
  const [deliveryTime, setDeliveryTime] = useState(offer?.delivery_time || '');
  const [message, setMessage] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    calculateSuggestions();
  }, [offer]);

  const calculateSuggestions = () => {
    setCalculating(true);
    // Simulate AI-powered suggestions
    setTimeout(() => {
      const basePrice = offer?.product_price || 10000;
      const suggestions = [
        {
          type: 'discount',
          label: 'Remise 5%',
          price: Math.round(basePrice * 0.95),
          confidence: 85,
          reason: 'Remise standard pour nouveau client'
        },
        {
          type: 'bulk',
          label: 'Achat en gros',
          price: Math.round(basePrice * 0.90),
          quantity: 10,
          confidence: 92,
          reason: 'Remise volume pour commande > 10 unités'
        },
        {
          type: 'express',
          label: 'Livraison express',
          price: Math.round(basePrice * 1.05),
          deliveryTime: '2 jours',
          confidence: 78,
          reason: 'Surcharge pour livraison prioritaire'
        }
      ];
      setSuggestions(suggestions);
      setCalculating(false);
    }, 500);
  };

  const handleSubmit = async () => {
    try {
      // TODO: Replace with actual API call
      // await axios.post(`${API}/enterprises/offers/${offer.id}/negotiate`, {
      //   proposed_price: proposedPrice,
      //   proposed_quantity: proposedQuantity,
      //   delivery_time: deliveryTime,
      //   message
      // }, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });

      onUpdateOffer(offer.id, {
        proposed_price: proposedPrice,
        proposed_quantity: proposedQuantity,
        delivery_time: deliveryTime,
        message,
        status: 'negotiating'
      });
      onClose();
    } catch (error) {
      console.error('Error submitting negotiation:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-amber-400" />
              Négociation Avancée
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Offer Summary */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <h4 className="font-semibold text-white mb-3">Détails de l'offre</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Produit</p>
                <p className="text-white">{offer?.product_name || 'Produit'}</p>
              </div>
              <div>
                <p className="text-slate-400">Prix original</p>
                <p className="text-white">{offer?.product_price?.toLocaleString()} FCFA</p>
              </div>
              <div>
                <p className="text-slate-400">Quantité</p>
                <p className="text-white">{offer?.quantity || 1}</p>
              </div>
              <div>
                <p className="text-slate-400">Statut</p>
                <p className="text-amber-400">{offer?.status || 'En attente'}</p>
              </div>
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-5 h-5 text-purple-400" />
              <h4 className="font-semibold text-white">Suggestions IA</h4>
              {calculating && <Loader2 className="w-4 h-4 animate-spin text-purple-400" />}
            </div>
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setProposedPrice(suggestion.price);
                    if (suggestion.quantity) setProposedQuantity(suggestion.quantity);
                    if (suggestion.deliveryTime) setDeliveryTime(suggestion.deliveryTime);
                  }}
                  className="w-full flex items-center justify-between p-3 bg-slate-900/50 hover:bg-slate-800/50 rounded-lg transition-colors text-left"
                >
                  <div>
                    <p className="text-white font-medium">{suggestion.label}</p>
                    <p className="text-xs text-slate-400">{suggestion.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 font-bold">{suggestion.price.toLocaleString()} FCFA</p>
                    <p className="text-xs text-purple-400">{suggestion.confidence}% confiance</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Negotiation Form */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1 block">Prix proposé (FCFA)</label>
              <input
                type="number"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                placeholder="Prix proposé"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1 block">Quantité proposée</label>
              <input
                type="number"
                value={proposedQuantity}
                onChange={(e) => setProposedQuantity(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                placeholder="Quantité"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1 block">Délai de livraison</label>
              <input
                type="text"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none"
                placeholder="Ex: 3 jours, 1 semaine"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-1 block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-amber-500 focus:outline-none resize-none"
                rows={3}
                placeholder="Expliquez votre proposition..."
              />
            </div>
          </div>

          {/* Negotiation Tips */}
          <div className="bg-blue-500/20 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-white mb-2">Conseils de négociation</h4>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• Proposez un prix réaliste basé sur le marché</li>
                  <li>• Augmentez la quantité pour obtenir de meilleures remises</li>
                  <li>• Soyez flexible sur les délais de livraison</li>
                  <li>• Expliquez votre motivation dans le message</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 flex gap-3">
          <button
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium"
          >
            <Send className="w-5 h-5" />
            Envoyer la proposition
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * EnhancedOffersSection - Enhanced offers section with advanced negotiation
 * @param {Object} props - Component props
 */
const EnhancedOffersSection = ({ offers, loading, onRefresh, onAccept, onReject, onCounter, onWithdraw, onCopyLink, token, formatPrice }) => {
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [filter, setFilter] = useState('all');

  const filteredOffers = offers?.filter(offer => {
    if (filter === 'all') return true;
    return offer.status === filter;
  }) || [];

  const handleOpenNegotiation = (offer) => {
    setSelectedOffer(offer);
    setShowNegotiationModal(true);
  };

  const handleUpdateOffer = (offerId, updates) => {
    onCounter(offerId, updates);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'accepted': return 'text-green-400 bg-green-500/20';
      case 'rejected': return 'text-red-400 bg-red-500/20';
      case 'pending': return 'text-amber-400 bg-amber-500/20';
      case 'negotiating': return 'text-blue-400 bg-blue-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'accepted': return 'Accepté';
      case 'rejected': return 'Refusé';
      case 'pending': return 'En attente';
      case 'negotiating': return 'Négociation';
      default: return status;
    }
  };

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-amber-400" />
          Offres & Négociations
        </h2>
        <div className="flex gap-2">
          {['all', 'pending', 'negotiating', 'accepted', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                filter === status
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {status === 'all' ? 'Tous' : getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {filteredOffers.length === 0 ? (
        <div className="bg-slate-800/50 rounded-xl p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400">Aucune offre trouvée</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOffers.map((offer) => (
            <div key={offer.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-white">{offer.product_name || 'Produit'}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(offer.status)}`}>
                      {getStatusLabel(offer.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400">Prix original</p>
                      <p className="text-white font-medium">{formatPrice(offer.product_price)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Prix proposé</p>
                      <p className="text-amber-400 font-medium">{formatPrice(offer.proposed_price)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Quantité</p>
                      <p className="text-white font-medium">{offer.quantity || 1}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Délai</p>
                      <p className="text-white font-medium">{offer.delivery_time || 'Non spécifié'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onCopyLink(offer.id)}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Copier le lien"
                  >
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {offer.message && (
                <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-slate-300">{offer.message}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {offer.status === 'pending' && (
                  <>
                    <button
                      onClick={() => onAccept(offer.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accepter
                    </button>
                    <button
                      onClick={() => onReject(offer.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <XCircle className="w-4 h-4" />
                      Refuser
                    </button>
                    <button
                      onClick={() => handleOpenNegotiation(offer)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Négocier
                    </button>
                  </>
                )}
                {offer.status === 'negotiating' && (
                  <button
                    onClick={() => handleOpenNegotiation(offer)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Contre-proposition
                  </button>
                )}
                {(offer.status === 'pending' || offer.status === 'negotiating') && (
                  <button
                    onClick={() => onWithdraw(offer.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    Retirer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showNegotiationModal && (
        <AdvancedNegotiationModal
          offer={selectedOffer}
          user={{}}
          token={token}
          onClose={() => setShowNegotiationModal(false)}
          onUpdateOffer={handleUpdateOffer}
        />
      )}
    </div>
  );
};

export default EnhancedOffersSection;
