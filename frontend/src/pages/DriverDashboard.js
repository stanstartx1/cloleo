import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Truck, Package, DollarSign, MapPin, Clock, CheckCircle, 
  XCircle, AlertCircle, Phone, Mail, Settings, LogOut,
  Navigation, Loader2, Star, TrendingUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatPrice = (price) => new Intl.NumberFormat('fr-FR').format(price);

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout, isDriver } = useAuth();
  
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('offline');

  useEffect(() => {
    if (!isDriver) {
      navigate('/connexion');
      return;
    }
    fetchDashboard();
  }, [isDriver, navigate]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/driver/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data);
      setCurrentStatus(response.data.user?.status || 'offline');
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      await axios.put(`${API}/driver/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentStatus(newStatus);
      toast.success(`Statut mis à jour: ${newStatus === 'available' ? 'Disponible' : newStatus === 'busy' ? 'Occupé' : 'Hors ligne'}`);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-40 rounded-2xl mb-4 bg-slate-800" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl bg-slate-800" />)}
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats;
  const driverUser = dashboard?.user;

  // Check if account is pending verification
  const isPendingVerification = !driverUser?.is_verified || !driverUser?.is_active;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" data-testid="driver-dashboard">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white">Espace Livreur</h1>
              <p className="text-xs text-slate-400">{driverUser?.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Pending Verification Alert */}
        {isPendingVerification && (
          <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-amber-200">Compte en attente de vérification</h3>
              <p className="text-sm text-amber-300/70 mt-1">
                Votre permis de conduire est en cours de vérification par notre équipe.
                Vous recevrez une notification une fois votre compte activé.
              </p>
              {!driverUser?.license_image && (
                <p className="text-sm text-amber-400 mt-2">
                  N'oubliez pas d'uploader votre permis pour accélérer la vérification.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                {driverUser?.name?.charAt(0) || 'L'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{driverUser?.name}</h2>
                <p className="text-slate-400 text-sm flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {driverUser?.city}, {driverUser?.country}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {driverUser?.email}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {driverUser?.phone}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                driverUser?.is_verified ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {driverUser?.is_verified ? 'Vérifié' : 'En attente'}
              </span>
              <p className="text-xs text-slate-500 mt-1 capitalize">{driverUser?.vehicle_type}</p>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-4 p-3 bg-slate-700/50 rounded-lg">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="font-bold text-white">{driverUser?.rating?.toFixed(1) || '0.0'}</span>
            </div>
            <div className="h-6 w-px bg-slate-600" />
            <div className="text-sm text-slate-400">
              {driverUser?.total_deliveries || 0} livraisons effectuées
            </div>
          </div>
        </div>

        {/* Status Selector */}
        <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Votre statut</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'available', label: 'Disponible', color: 'green', icon: CheckCircle },
              { value: 'busy', label: 'Occupé', color: 'amber', icon: Clock },
              { value: 'offline', label: 'Hors ligne', color: 'slate', icon: XCircle },
            ].map((status) => {
              const Icon = status.icon;
              const isActive = currentStatus === status.value;
              const isDisabled = isPendingVerification || updatingStatus;
              
              return (
                <button
                  key={status.value}
                  onClick={() => !isDisabled && updateStatus(status.value)}
                  disabled={isDisabled}
                  className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                    isActive 
                      ? status.color === 'green' ? 'border-green-500 bg-green-500/20' :
                        status.color === 'amber' ? 'border-amber-500 bg-amber-500/20' :
                        'border-slate-500 bg-slate-500/20'
                      : 'border-slate-700 hover:border-slate-600'
                  } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <Icon className={`w-5 h-5 ${
                    isActive 
                      ? status.color === 'green' ? 'text-green-400' :
                        status.color === 'amber' ? 'text-amber-400' :
                        'text-slate-400'
                      : 'text-slate-500'
                  }`} />
                  <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {status.label}
                  </span>
                </button>
              );
            })}
          </div>
          {isPendingVerification && (
            <p className="text-xs text-amber-400 text-center mt-2">
              Activez votre compte pour changer de statut
            </p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <Package className="w-6 h-6 text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats?.total_deliveries || 0}</p>
            <p className="text-xs text-slate-400">Total livraisons</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <Clock className="w-6 h-6 text-amber-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats?.pending_deliveries || 0}</p>
            <p className="text-xs text-slate-400">En attente</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <CheckCircle className="w-6 h-6 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats?.completed_deliveries || 0}</p>
            <p className="text-xs text-slate-400">Terminées</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <DollarSign className="w-6 h-6 text-emerald-400 mb-2" />
            <p className="text-2xl font-bold text-white">{formatPrice(stats?.total_earnings || 0)}</p>
            <p className="text-xs text-slate-400">FCFA gagnés</p>
          </div>
        </div>

        {/* Recent Deliveries */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700">
            <h3 className="font-bold text-white">Livraisons récentes</h3>
          </div>
          {dashboard?.recent_deliveries?.length > 0 ? (
            <div className="divide-y divide-slate-700">
              {dashboard.recent_deliveries.map((delivery) => (
                <div key={delivery.id} className="p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    delivery.status === 'completed' ? 'bg-green-500/20' :
                    delivery.status === 'pending' ? 'bg-amber-500/20' :
                    'bg-slate-700'
                  }`}>
                    <Package className={`w-5 h-5 ${
                      delivery.status === 'completed' ? 'text-green-400' :
                      delivery.status === 'pending' ? 'text-amber-400' :
                      'text-slate-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Commande #{delivery.order_id?.slice(-6) || 'N/A'}</p>
                    <p className="text-xs text-slate-400">{delivery.destination || 'Destination non définie'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-400">{formatPrice(delivery.driver_fee || 0)} FCFA</p>
                    <p className="text-xs text-slate-500 capitalize">{delivery.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400">Aucune livraison pour le moment</p>
              <p className="text-xs text-slate-500 mt-1">
                {isPendingVerification 
                  ? 'Votre compte doit être vérifié avant de recevoir des livraisons'
                  : 'Les nouvelles livraisons apparaîtront ici'}
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link 
            to="/"
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-3 hover:bg-slate-700/50 transition-colors"
          >
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-white">Voir la boutique</p>
              <p className="text-xs text-slate-400">Cloléo Marketplace</p>
            </div>
          </Link>
          <button 
            onClick={() => toast.info('Fonctionnalité à venir')}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-3 hover:bg-slate-700/50 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="font-medium text-white">Navigation</p>
              <p className="text-xs text-slate-400">Bientôt disponible</p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;
