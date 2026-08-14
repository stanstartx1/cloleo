import React, { useState, useEffect } from 'react';
import { 
  Trophy, Award, Star, Target, Flame, Zap, Crown,
  Medal, Gem, TrendingUp, Calendar, Lock, Unlock,
  CheckCircle, XCircle, Gift, Heart, Flag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';

const API = API_URL;

const GamificationSystem = ({ isOpen, onClose, userRole }) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gamificationData, setGamificationData] = useState(null);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [availableRewards, setAvailableRewards] = useState([]);
  const [redeeming, setRedeeming] = useState(null);

  // Fetch gamification data
  useEffect(() => {
    const fetchGamificationData = async () => {
      if (!token || !userRole) return;
      
      setLoading(true);
      try {
        const response = await axios.get(`${API}/gamification/${userRole}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data) {
          setGamificationData(response.data);
          setDailyStreak(response.data.daily_streak || 0);
          setAvailableRewards(response.data.available_rewards || []);
        }
      } catch (error) {
        console.error('Error fetching gamification data:', error);
        toast.error('Erreur lors du chargement des récompenses');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchGamificationData();
    }
  }, [isOpen, token, userRole, API]);

  // Redeem reward
  const redeemReward = async (rewardId) => {
    setRedeeming(rewardId);
    
    try {
      const response = await axios.post(`${API}/gamification/redeem`, {
        reward_id: rewardId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        toast.success('Récompense obtenue !', {
          description: response.data.message
        });
        
        // Refresh data
        fetchGamificationData();
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast.error('Erreur lors de l\'obtention de la récompense');
    } finally {
      setRedeeming(null);
    }
  };

  // Get level info
  const getLevelInfo = (points) => {
    const levels = [
      { threshold: 0, name: 'Débutant', icon: Star, color: 'gray' },
      { threshold: 100, name: 'Apprenti', icon: Star, color: 'blue' },
      { threshold: 500, name: 'Confirmé', icon: Award, color: 'green' },
      { threshold: 1000, name: 'Expert', icon: Trophy, color: 'purple' },
      { threshold: 2500, name: 'Maître', icon: Crown, color: 'orange' },
      { threshold: 5000, name: 'Légende', icon: Medal, color: 'red' },
      { threshold: 10000, name: 'Champion', icon: Flame, color: 'yellow' }
    ];

    let currentLevel = levels[0];
    let nextLevel = levels[1];
    let progress = 0;

    for (let i = 0; i < levels.length; i++) {
      if (points >= levels[i].threshold) {
        currentLevel = levels[i];
        nextLevel = levels[i + 1] || null;
        if (nextLevel) {
          const range = nextLevel.threshold - currentLevel.threshold;
          const progressInLevel = points - currentLevel.threshold;
          progress = (progressInLevel / range) * 100;
        }
      } else {
        break;
      }
    }

    return { currentLevel, nextLevel, progress };
  };

  const { currentLevel, nextLevel, progress } = getLevelInfo(gamificationData?.points || 0);
  const LevelIcon = currentLevel?.icon || Star;

  if (!isOpen) return null;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="py-12 text-center">
            <Zap className="w-8 h-8 mx-auto mb-4 animate-spin text-slate-400" />
            <p className="text-slate-600">Chargement du système de récompenses...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose} className="max-w-2xl">
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Système de récompenses</DialogTitle>
          <DialogDescription>
            Gagnez des points et débloquez des avantages exclusifs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Level Progress */}
          <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-full">
                    <LevelIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-purple-100 text-sm">Niveau actuel</p>
                    <p className="text-2xl font-bold">{currentLevel?.name || 'Débutant'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{gamificationData?.points || 0}</p>
                  <p className="text-purple-100 text-sm">Points</p>
                </div>
              </div>
              
              {nextLevel && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Prochain niveau: {nextLevel.name}</span>
                    <span>{nextLevel.threshold - (gamificationData?.points || 0)} pts</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Streak */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                Série de victoires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <div
                      key={day}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        day <= dailyStreak ? 'bg-orange-500' : 'bg-gray-200'
                      }`}
                    >
                      {day <= dailyStreak && <CheckCircle className="w-5 h-5 text-white" />}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-2xl font-bold">{dailyStreak} jours</p>
                  <p className="text-sm text-slate-600">Consécutifs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="rewards" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="rewards">
                <Gift className="w-4 h-4 mr-2" />
                Récompenses
              </TabsTrigger>
              <TabsTrigger value="achievements">
                <Trophy className="w-4 h-4 mr-2" />
                Succès
              </TabsTrigger>
              <TabsTrigger value="leaderboard">
                <TrendingUp className="w-4 h-4 mr-2" />
                Classement
              </TabsTrigger>
            </TabsList>

            {/* Rewards Tab */}
            <TabsContent value="rewards" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {availableRewards.map((reward) => (
                  <Card key={reward.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${reward.unlocked ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {reward.unlocked ? (
                            <Unlock className="w-5 h-5 text-green-600" />
                          ) : (
                            <Lock className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{reward.name}</h4>
                          <p className="text-sm text-slate-600">{reward.points} points</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{reward.description}</p>
                      <Button
                        onClick={() => redeemReward(reward.id)}
                        disabled={!reward.unlocked || redeeming === reward.id}
                        className="w-full"
                        variant={reward.unlocked ? 'default' : 'secondary'}
                      >
                        {redeeming === reward.id ? (
                          <Zap className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          reward.unlocked ? 'Obtenir' : 'Verrouillé'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements" className="space-y-4 mt-4">
              <div className="space-y-3">
                {gamificationData?.achievements?.map((achievement) => (
                  <Card key={achievement.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${achievement.unlocked ? 'bg-purple-100' : 'bg-gray-100'}`}>
                          <Achievement.unlocked ? (
                            <CheckCircle className="w-6 h-6 text-purple-600" />
                          ) : (
                            <XCircle className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{achievement.name}</h4>
                          <p className="text-sm text-slate-600">{achievement.description}</p>
                          <Badge variant="outline" className="mt-2">
                            {achievement.points} points
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Classement {userRole === 'driver' ? 'des livreurs' : userRole === 'vendor' ? 'des vendeurs' : 'des clients'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {gamificationData?.leaderboard?.map((entry, index) => (
                      <div 
                        key={entry.id} 
                        className={`flex items-center gap-4 p-3 rounded-lg ${
                          entry.id === user?.id ? 'bg-blue-50 border-2 border-blue-500' : 'bg-slate-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-300' : index === 2 ? 'bg-orange-400' : 'bg-slate-200'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{entry.name}</p>
                          <p className="text-sm text-slate-600">{entry.points} points</p>
                        </div>
                        {entry.id === user?.id && (
                          <Badge variant="secondary">Vous</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GamificationSystem;