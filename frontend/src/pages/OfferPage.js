import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { Tag, ArrowLeft, Store, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

import { API_BASE, API_URL } from '../config/api';
const API = `${BACKEND_URL}/api`;

const formatPrice = (v) => new Intl.NumberFormat('fr-FR').format(v || 0);

const OfferPage = () => {
  const { offerToken } = useParams();
  const [offer, setOffer] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem('cloleo_token');
        const res = await axios.get(`${API}/offers/${offerToken}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setOffer(res.data);
      } catch (e) {
        setError(e.response?.data?.detail || 'Offre introuvable');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [offerToken]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full">
          <CardContent className="p-6 text-center space-y-3">
            <Tag className="w-10 h-10 mx-auto text-red-500" />
            <h1 className="text-xl font-bold">Offre indisponible</h1>
            <p className="text-gray-600">{error || 'Cette offre n\'est plus disponible.'}</p>
            <Button asChild><Link to="/">Retour à l'accueil</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const p = offer.product_snapshot || {};
  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container mx-auto px-4 max-w-2xl space-y-4">
        <Link to="/mes-messages" className="inline-flex items-center gap-2 text-purple-700 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Retour aux messages
        </Link>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {p.image ? <img src={p.image} alt={p.name} className="w-full h-64 object-cover" /> : null}
            <div className="p-6 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm">
                <Tag className="w-4 h-4" />
                Offre spéciale
              </div>
              <h1 className="text-2xl font-bold">{p.name || 'Produit'}</h1>
              <p className="text-gray-600">Vendeur: {p.seller_name || 'Boutique'}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-gray-100">
                  <p className="text-xs text-gray-500">Prix initial</p>
                  <p className="text-lg line-through">{formatPrice(offer.reference_price_fcfa)} FCFA</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-100">
                  <p className="text-xs text-emerald-700">Nouveau prix négocié</p>
                  <p className="text-2xl font-bold text-emerald-700">{formatPrice(offer.offered_price_fcfa)} FCFA</p>
                </div>
              </div>
              {offer.note ? <p className="text-sm text-gray-700">{offer.note}</p> : null}
              <div className="flex gap-3">
                <Button asChild className="flex-1">
                  <Link to={`/produit/${offer.product_id}`}><ShoppingBag className="w-4 h-4 mr-2" />Voir le produit</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link to={`/vendeur-boutique/${p.seller_id}`}><Store className="w-4 h-4 mr-2" />Voir la boutique</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OfferPage;

