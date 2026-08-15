import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Star, Target, Award, Loader2, Zap } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

/**
 * GamificationPointsSection - Component for displaying enterprise points and level system
 * @param {Object} user - Current user object
 * @param {string} token - Authentication token
 */
const GamificationPointsSection = ({ user, token }) => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Level thresholds
  const LEVEL_THRESHOLDS = {
    1: { points: 0, name: 'Débutant', icon: '🌱' },
    2: { points: 100, name: 'Apprenti', icon: '🌿' },
    3: { points: 300, name: 'Confirmé', icon: '🌳' },
    4: { points: 600, name: 'Expert', icon: '🏆' },
    5: { points: 1000, name: 'Maître', icon: '👑' },
    6: { points: 2000, name: 'Légende', icon: '⭐' },
    7: { points: 5000, name: 'Champion', icon: '🌟' },
    8: { points: 10000, name: 'Légende Vivante', icon: '💎' },
  };

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await axios.get(`${API}/enterprises/achievements`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAchievements(response.data || []);
      } catch (error) {
        console.error('Error fetching achievements:', error);
        // Fallback to mock data
        const mockAchievements = [
          { id: 1, title: 'Première vente', progress: 100, target_value: 1 },
          { id: 2, title: '100 ventes', progress: 100, target_value: 100 },
          { id: 3, title: '500 ventes', progress: 100, target_value: 500 },
          { id: 4, title: '1000 ventes', progress: 75, target_value: 1000 },
          { id: 5, title: 'Note 5 étoiles', progress: 80, target_value: 5 },
          { id: 6, title: 'Livraison parfaite', progress: 95, target_value: 100 },
        ];
        setAchievements(mockAchievements);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [token]);

  // Calculate total points from achievements
  const totalPoints = useMemo(() => {
    return achievements.reduce((sum, achievement) => {
      const progressPoints = Math.floor((achievement.progress || 0) / 100 * 100);
      return sum + progressPoints;
    }, 0);
  }, [achievements]);

  // Calculate current level and progress to next level
  const levelInfo = useMemo(() => {
    let currentLevel = 1;
    let nextLevel = 2;
    let currentLevelPoints = 0;
    let nextLevelPoints = LEVEL_THRESHOLDS[2].points;
    let progressToNext = 0;

    for (let level = 1; level <= 8; level++) {
      if (totalPoints >= LEVEL_THRESHOLDS[level].points) {
        currentLevel = level;
        currentLevelPoints = LEVEL_THRESHOLDS[level].points;
      } else {
        nextLevel = level;
        nextLevelPoints = LEVEL_THRESHOLDS[level].points;
        break;
      }
    }

    if (currentLevel < 8) {
      const pointsInLevel = nextLevelPoints - currentLevelPoints;
      const pointsEarned = totalPoints - currentLevelPoints;
      progressToNext = Math.min(100, Math.floor((pointsEarned / pointsInLevel) * 100));
    } else {
      progressToNext = 100;
    }

    return {
      currentLevel,
      nextLevel,
      currentLevelData: LEVEL_THRESHOLDS[currentLevel],
      nextLevelData: LEVEL_THRESHOLDS[nextLevel],
      progressToNext,
      pointsToNext: nextLevelPoints - totalPoints,
    };
  }, [totalPoints]);

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Trophy className="w-6 h-6 text-amber-400" />
        Mes Points & Niveau
      </h2>

      {/* Level Card */}
      <div className="bg-gradient-to-br from-amber-500/20 via-yellow-500/20 to-orange-500/20 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-4xl shadow-lg shadow-amber-500/30">
              {levelInfo.currentLevelData.icon}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Niveau {levelInfo.currentLevel}</h3>
              <p className="text-amber-300 font-medium">{levelInfo.currentLevelData.name}</p>
              <p className="text-sm text-slate-400">{totalPoints} points totaux</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-amber-400">
              <Star className="w-5 h-5" />
              <span className="text-2xl font-bold">{totalPoints}</span>
            </div>
            <p className="text-xs text-slate-400">points</p>
          </div>
        </div>

        {/* Progress to next level */}
        {levelInfo.currentLevel < 8 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Progression vers Niveau {levelInfo.nextLevel}</span>
              <span className="text-white font-semibold">{levelInfo.progressToNext}%</span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 transition-all duration-500"
                style={{ width: `${levelInfo.progressToNext}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 text-center">
              {levelInfo.pointsToNext} points pour atteindre {levelInfo.nextLevelData.name} {levelInfo.nextLevelData.icon}
            </p>
          </div>
        )}

        {levelInfo.currentLevel === 8 && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-4 py-2 rounded-full text-sm font-bold">
              <Zap className="w-4 h-4" />
              Niveau Maximum Atteint !
            </div>
          </div>
        )}
      </div>

      {/* Points Breakdown */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-green-400" />
          Répartition des points
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">Trophées</p>
                <p className="text-xs text-slate-400">Points gagnés</p>
              </div>
            </div>
            <span className="text-xl font-bold text-amber-400">
              {Math.floor(totalPoints * 0.3)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">Certificats</p>
                <p className="text-xs text-slate-400">Points gagnés</p>
              </div>
            </div>
            <span className="text-xl font-bold text-blue-400">
              {Math.floor(totalPoints * 0.2)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">Réalisations</p>
                <p className="text-xs text-slate-400">Points gagnés</p>
              </div>
            </div>
            <span className="text-xl font-bold text-green-400">
              {Math.floor(totalPoints * 0.5)}
            </span>
          </div>
        </div>
      </div>

      {/* Next Level Rewards */}
      {levelInfo.currentLevel < 8 && (
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-purple-400" />
            Récompenses du prochain niveau
          </h3>
          <div className="flex items-center gap-4">
            <div className="text-4xl">{levelInfo.nextLevelData.icon}</div>
            <div>
              <p className="text-white font-semibold">Niveau {levelInfo.nextLevel} - {levelInfo.nextLevelData.name}</p>
              <p className="text-sm text-slate-400">Débloquez de nouvelles fonctionnalités et badges exclusifs</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamificationPointsSection;
