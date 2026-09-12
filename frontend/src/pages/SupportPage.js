import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Mail, Phone, MessageSquare, Send, ArrowLeft, CheckCircle,
  AlertCircle, Clock, MapPin, Star, Users, Shield, HelpCircle,
  Headphones, MessageCircle, FileText, Calendar, Bug, Lightbulb, Package
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

const SupportPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    category: 'general',
    message: '',
    order_id: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { id: 'general', label: 'Question générale', icon: HelpCircle, color: 'blue' },
    { id: 'order', label: 'Problème de commande', icon: FileText, color: 'purple' },
    { id: 'payment', label: 'Problème de paiement', icon: Star, color: 'green' },
    { id: 'delivery', label: 'Problème de livraison', icon: Package, color: 'orange' },
    { id: 'account', label: 'Problème de compte', icon: Users, color: 'pink' },
    { id: 'bug', label: 'Rapport de bug', icon: Bug, color: 'red' },
    { id: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: 'yellow' },
    { id: 'other', label: 'Autre', icon: MessageCircle, color: 'gray' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.post(
        `${API}/api/support/contact`,
        formData,
        { headers }
      );

      if (response.data.success) {
        setSuccess(true);
        setFormData({
          name: user?.name || '',
          email: user?.email || '',
          subject: '',
          category: 'general',
          message: '',
          order_id: ''
        });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'envoi du message');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-white shadow-2xl border-0">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Message envoyé avec succès !
                </h2>
                <p className="text-gray-600 mb-8">
                  Notre équipe de support vous répondra dans les plus brefs délais.
                  Un email de confirmation a été envoyé à {formData.email}.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => setSuccess(false)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    Envoyer un autre message
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/tableau-de-bord')}
                  >
                    Retour au tableau de bord
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Support Cloleo
                </h1>
                <p className="text-sm text-gray-600">Nous sommes là pour vous aider</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-purple-600" />
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                24/7
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md mb-6">
              <Shield className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Support sécurisé et professionnel</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Comment pouvons-nous vous aider ?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Notre équipe de support est disponible 24h/24 et 7j/7 pour répondre à toutes vos questions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="bg-white shadow-xl border-0">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Envoyez-nous un message
                  </CardTitle>
                  <CardDescription className="text-purple-100">
                    Remplissez le formulaire ci-dessous et nous vous répondrons rapidement
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                        <input
                          id="name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                      <input
                        id="subject"
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        placeholder="Décrivez brièvement votre problème"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {(formData.category === 'order' || formData.category === 'delivery') && (
                      <div>
                        <label htmlFor="order_id" className="block text-sm font-medium text-gray-700 mb-1">ID de commande (optionnel)</label>
                        <input
                          id="order_id"
                          type="text"
                          value={formData.order_id}
                          onChange={(e) => setFormData({...formData, order_id: e.target.value})}
                          placeholder="Ex: CMD-12345"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                      <textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        placeholder="Décrivez votre problème ou votre question en détail..."
                        rows={6}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Envoyer le message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Info */}
              <Card className="bg-white shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-purple-600" />
                    Informations de contact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Email</div>
                      <div className="text-sm text-gray-600">support@cloleo.com</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Temps de réponse</div>
                      <div className="text-sm text-gray-600">Moins de 24 heures</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Confidentialité</div>
                      <div className="text-sm text-gray-600">Vos données sont sécurisées</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Categories */}
              <Card className="bg-white shadow-xl border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-purple-600" />
                    Catégories d'aide
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setFormData({...formData, category: cat.id})}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.category === cat.id
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <cat.icon className={`w-5 h-5 mb-1 ${
                          formData.category === cat.id ? 'text-purple-600' : 'text-gray-500'
                        }`} />
                        <div className="text-xs font-medium text-gray-700">{cat.label}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* FAQ Preview */}
              <Card className="bg-gradient-to-br from-purple-600 to-pink-600 text-white border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Questions fréquentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <div className="font-medium mb-1">Comment suivre ma commande ?</div>
                    <div className="text-purple-100 text-xs">
                      Allez dans "Mes commandes" et cliquez sur "Suivre"
                    </div>
                  </div>
                  <div className="text-sm">
                    <div className="font-medium mb-1">Comment annuler une commande ?</div>
                    <div className="text-purple-100 text-xs">
                      Contactez-nous rapidement avant la livraison
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                    onClick={() => navigate('/faq')}
                  >
                    Voir toutes les FAQ
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
