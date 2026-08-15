import React, { useState, useEffect } from 'react';
import { Trophy, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

/**
 * GamificationTrophiesSection - Component for displaying enterprise trophies from API
 * @param {Object} user - Current user object
 * @param {string} token - Authentication token
 */
const GamificationTrophiesSection = ({ user, token }) => {
  const [trophies, setTrophies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrophies = async () => {
      try {
        const response = await axios.get(`${API}/enterprises/trophies`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setTrophies(response.data || []);
      } catch (error) {
        console.error('Error fetching trophies:', error);
        // Fallback to mock data if API fails
        const mockTrophies = [
          { id: 1, name: 'Vendeur Or', description: '1000+ ventes', icon: 'gold', date: '2024-03-15' },
          { id: 2, name: 'Vendeur Argent', description: '500+ ventes', icon: 'silver', date: '2024-02-20' },
          { id: 3, name: 'Étoile du mois', description: 'Meilleur vendeur Mai 2026', icon: 'star', date: '2026-05-01' },
          { id: 4, name: 'Livreur Express', description: 'Livraison en moins de 24h', icon: 'speed', date: '2024-04-10' },
        ];
        setTrophies(mockTrophies);
      } finally {
        setLoading(false);
      }
    };

    fetchTrophies();
  }, [token]);

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Trophy className="w-6 h-6 text-amber-400" />
        Mes Trophées
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {trophies.map((trophy) => (
          <div key={trophy.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
              trophy.icon === 'gold' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
              trophy.icon === 'silver' ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
              trophy.icon === 'star' ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
              'bg-gradient-to-br from-blue-400 to-blue-600'
            }`}>
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-white text-center mb-2">{trophy.name || trophy.title}</h3>
            <p className="text-sm text-slate-400 text-center mb-3">{trophy.description}</p>
            <p className="text-xs text-slate-500 text-center">{trophy.date ? new Date(trophy.date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GamificationTrophiesSection;
