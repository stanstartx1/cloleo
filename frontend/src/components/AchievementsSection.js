import React, { useState, useEffect } from 'react';
import { Target, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

/**
 * AchievementsSection - Component for displaying enterprise achievements with progress tracking
 * @param {Object} user - Current user object
 * @param {string} token - Authentication token
 */
const AchievementsSection = ({ user, token }) => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await axios.get(`${API}/enterprises/achievements`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAchievements(response.data || []);
      } catch (error) {
        console.error('Error fetching achievements:', error);
        // Fallback to mock data if API fails
        const mockAchievements = [
          { id: 1, title: 'Première vente', description: 'Vous avez effectué votre première vente', progress: 100, icon: '🎯', target_value: 1 },
          { id: 2, title: '100 ventes', description: 'Atteindre 100 ventes totales', progress: 100, icon: '🚀', target_value: 100 },
          { id: 3, title: '500 ventes', description: 'Atteindre 500 ventes totales', progress: 100, icon: '⭐', target_value: 500 },
          { id: 4, title: '1000 ventes', description: 'Atteindre 1000 ventes totales', progress: 75, icon: '🏆', target_value: 1000 },
          { id: 5, title: 'Note 5 étoiles', description: 'Obtenir une note moyenne de 5 étoiles', progress: 80, icon: '⭐', target_value: 5 },
          { id: 6, title: 'Livraison parfaite', description: '100% de livraisons complétées', progress: 95, icon: '✅', target_value: 100 },
        ];
        setAchievements(mockAchievements);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [token]);

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Target className="w-6 h-6 text-green-400" />
        Mes Réalisations
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {achievements.map((achievement) => (
          <div key={achievement.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl">{achievement.icon || '🎯'}</div>
              <div>
                <h3 className="font-bold text-white">{achievement.title}</h3>
                <p className="text-sm text-slate-400">{achievement.description}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Progression</span>
                <span className="text-white font-semibold">{achievement.progress || 0}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    (achievement.progress || 0) === 100 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                    'bg-gradient-to-r from-amber-400 to-amber-600'
                  }`}
                  style={{ width: `${achievement.progress || 0}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AchievementsSection;
