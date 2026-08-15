import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Medal, Award, Loader2, Crown, Zap, Star } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

/**
 * LeaderboardSection - Component for displaying enterprise ranking and comparison
 * @param {Object} user - Current user object
 * @param {string} token - Authentication token
 */
const LeaderboardSection = ({ user, token }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentRank, setCurrentRank] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await axios.get(`${API}/enterprises/leaderboard`, {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
        // setLeaderboard(response.data.leaderboard || []);
        // setCurrentRank(response.data.currentRank);

        // Mock data for now
        const mockLeaderboard = [
          { id: 1, company_name: 'TechCorp Solutions', points: 12500, sales: 1500, rating: 4.9, change: 2 },
          { id: 2, company_name: 'Global Logistics', points: 11200, sales: 1350, rating: 4.8, change: 1 },
          { id: 3, company_name: 'Premium Retail', points: 9800, sales: 1200, rating: 4.7, change: 0 },
          { id: 4, company_name: 'InnovateTech', points: 8500, sales: 1100, rating: 4.6, change: -1 },
          { id: 5, company_name: 'Smart Supplies', points: 7200, sales: 950, rating: 4.5, change: 3 },
          { id: 6, company_name: 'FastDelivery Co', points: 6500, sales: 880, rating: 4.4, change: 1 },
          { id: 7, company_name: 'Quality First', points: 5800, sales: 750, rating: 4.3, change: 0 },
          { id: 8, company_name: 'Market Leaders', points: 5200, sales: 680, rating: 4.2, change: -2 },
          { id: 9, company_name: 'ValueMax', points: 4800, sales: 620, rating: 4.1, change: 1 },
          { id: 10, company_name: 'Express Services', points: 4200, sales: 550, rating: 4.0, change: 0 },
        ];
        
        setLeaderboard(mockLeaderboard);
        setCurrentRank({ rank: 12, points: 2500, sales: 300, rating: 4.2, change: 5 });
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [token]);

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-slate-400 font-bold">{rank}</span>;
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (change < 0) return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />;
    return <div className="w-4 h-4" />;
  };

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Trophy className="w-6 h-6 text-amber-400" />
        Classement & Comparaison
      </h2>

      {/* Current Rank Card */}
      {currentRank && (
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                #{currentRank.rank}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Votre classement</h3>
                <p className="text-purple-300">Top {Math.ceil(currentRank.rank / 10) * 10}% des entreprises</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                {getChangeIcon(currentRank.change)}
                <span className="text-sm font-medium">
                  {currentRank.change > 0 ? `+${currentRank.change} places` : currentRank.change < 0 ? `${currentRank.change} places` : 'Stable'}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">{currentRank.points}</p>
              <p className="text-xs text-slate-400">points</p>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Top 10 des entreprises
        </h3>
        <div className="space-y-3">
          {leaderboard.map((enterprise, index) => (
            <div
              key={enterprise.id}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                index === 0 ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30' :
                index === 1 ? 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 border border-gray-500/30' :
                index === 2 ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30' :
                'bg-slate-900/50 hover:bg-slate-800/50'
              }`}
            >
              <div className="w-8 flex justify-center">
                {getRankIcon(index + 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{enterprise.company_name}</p>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                  <span>{enterprise.sales} ventes</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {enterprise.rating}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-white">{enterprise.points}</p>
                <div className="flex items-center justify-end gap-1 text-xs">
                  {getChangeIcon(enterprise.change)}
                  <span className={enterprise.change > 0 ? 'text-green-400' : enterprise.change < 0 ? 'text-red-400' : 'text-slate-400'}>
                    {enterprise.change > 0 ? `+${enterprise.change}` : enterprise.change}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Performance</p>
              <p className="text-xl font-bold text-white">Top 15%</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">Plus performant que 85% des entreprises</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-600 flex items-center justify-center">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Certifications</p>
              <p className="text-xl font-bold text-white">Top 20%</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">Plus certifié que 80% des entreprises</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Trophées</p>
              <p className="text-xl font-bold text-white">Top 10%</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">Plus de trophées que 90% des entreprises</p>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardSection;
