import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Save, X, TrendingUp, Activity, DollarSign, Users, Clock, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

/**
 * CustomKPIsSection - Component for managing custom KPIs
 * @param {Object} user - Current user object
 * @param {string} token - Authentication token
 */
const CustomKPIsSection = ({ user, token }) => {
  const [kpis, setKPIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingKPI, setEditingKPI] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKPI, setNewKPI] = useState({ name: '', formula: '', unit: '', target: '' });

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await axios.get(`${API}/enterprises/kpis`, {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
        // setKPIs(response.data || []);

        // Mock data for now
        const mockKPIs = [
          { id: 1, name: 'Taux de conversion', formula: 'orders / visitors * 100', unit: '%', target: 5, current: 4.2, trend: 'up' },
          { id: 2, name: 'Panier moyen', formula: 'revenue / orders', unit: 'FCFA', target: 50000, current: 45000, trend: 'up' },
          { id: 3, name: 'Taux de retour', formula: 'returns / orders * 100', unit: '%', target: 2, current: 3.5, trend: 'down' },
          { id: 4, name: 'Satisfaction client', formula: 'avg(rating)', unit: '/5', target: 4.5, current: 4.2, trend: 'stable' },
        ];
        setKPIs(mockKPIs);
      } catch (error) {
        console.error('Error fetching KPIs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
  }, [token]);

  const handleAddKPI = async () => {
    try {
      // TODO: Replace with actual API call
      // await axios.post(`${API}/enterprises/kpis`, newKPI, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });

      const kpi = {
        id: Date.now(),
        ...newKPI,
        current: 0,
        trend: 'stable'
      };
      setKPIs([...kpis, kpi]);
      setNewKPI({ name: '', formula: '', unit: '', target: '' });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding KPI:', error);
    }
  };

  const handleUpdateKPI = async (kpiId, updates) => {
    try {
      // TODO: Replace with actual API call
      // await axios.put(`${API}/enterprises/kpis/${kpiId}`, updates, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });

      setKPIs(kpis.map(kpi => kpi.id === kpiId ? { ...kpi, ...updates } : kpi));
      setEditingKPI(null);
    } catch (error) {
      console.error('Error updating KPI:', error);
    }
  };

  const handleDeleteKPI = async (kpiId) => {
    try {
      // TODO: Replace with actual API call
      // await axios.delete(`${API}/enterprises/kpis/${kpiId}`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });

      setKPIs(kpis.filter(kpi => kpi.id !== kpiId));
    } catch (error) {
      console.error('Error deleting KPI:', error);
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === 'down') return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />;
    return <Activity className="w-4 h-4 text-slate-400" />;
  };

  const getKPIIcon = (kpiName) => {
    if (kpiName.toLowerCase().includes('conversion')) return <Activity className="w-5 h-5" />;
    if (kpiName.toLowerCase().includes('panier') || kpiName.toLowerCase().includes('revenue')) return <DollarSign className="w-5 h-5" />;
    if (kpiName.toLowerCase().includes('client') || kpiName.toLowerCase().includes('visiteur')) return <Users className="w-5 h-5" />;
    if (kpiName.toLowerCase().includes('temps') || kpiName.toLowerCase().includes('heure')) return <Clock className="w-5 h-5" />;
    return <Settings className="w-5 h-5" />;
  };

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-400" />
          KPIs Personnalisables
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter KPI
        </button>
      </div>

      {/* Add KPI Form */}
      {showAddForm && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-white mb-4">Créer un nouveau KPI</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1 block">Nom du KPI</label>
              <input
                type="text"
                value={newKPI.name}
                onChange={(e) => setNewKPI({ ...newKPI, name: e.target.value })}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                placeholder="Ex: Taux de conversion"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1 block">Formule</label>
              <input
                type="text"
                value={newKPI.formula}
                onChange={(e) => setNewKPI({ ...newKPI, formula: e.target.value })}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                placeholder="Ex: orders / visitors * 100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1 block">Unité</label>
              <input
                type="text"
                value={newKPI.unit}
                onChange={(e) => setNewKPI({ ...newKPI, unit: e.target.value })}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                placeholder="Ex: %, FCFA, /5"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1 block">Objectif</label>
              <input
                type="text"
                value={newKPI.target}
                onChange={(e) => setNewKPI({ ...newKPI, target: e.target.value })}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                placeholder="Ex: 5, 50000, 4.5"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddKPI}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Sauvegarder
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl"
          >
            {editingKPI === kpi.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  defaultValue={kpi.name}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Nom"
                />
                <input
                  type="text"
                  defaultValue={kpi.formula}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Formule"
                />
                <input
                  type="text"
                  defaultValue={kpi.unit}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Unité"
                />
                <input
                  type="text"
                  defaultValue={kpi.target}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Objectif"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateKPI(kpi.id, { name: kpi.name })}
                    className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingKPI(null)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
                      {getKPIIcon(kpi.name)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{kpi.name}</h4>
                      <p className="text-xs text-slate-400">{kpi.formula}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingKPI(kpi.id)}
                      className="p-1 hover:bg-slate-700 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteKPI(kpi.id)}
                      className="p-1 hover:bg-slate-700 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {typeof kpi.current === 'number' ? kpi.current.toFixed(1) : kpi.current}
                      <span className="text-sm text-slate-400 ml-1">{kpi.unit}</span>
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {getTrendIcon(kpi.trend)}
                      <span className="text-xs text-slate-400">vs. objectif: {kpi.target}{kpi.unit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          kpi.current >= kpi.target ? 'bg-green-500' :
                          kpi.current >= kpi.target * 0.8 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(100, (kpi.current / kpi.target) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {Math.min(100, Math.round((kpi.current / kpi.target) * 100))}%
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* KPI Presets */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-white mb-4">KPIs recommandés</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: 'Taux de conversion', formula: 'orders / visitors * 100', unit: '%', target: 5 },
            { name: 'Panier moyen', formula: 'revenue / orders', unit: 'FCFA', target: 50000 },
            { name: 'Taux de retour', formula: 'returns / orders * 100', unit: '%', target: 2 },
            { name: 'Satisfaction client', formula: 'avg(rating)', unit: '/5', target: 4.5 },
            { name: 'Temps de livraison moyen', formula: 'avg(delivery_time)', unit: 'jours', target: 3 },
            { name: 'Taux de rétention', formula: 'returning_customers / total_customers * 100', unit: '%', target: 40 },
          ].map((preset, index) => (
            <button
              key={index}
              onClick={() => setNewKPI(preset) || setShowAddForm(true)}
              className="flex items-center gap-3 p-3 bg-slate-900/50 hover:bg-slate-800/50 rounded-xl transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{preset.name}</p>
                <p className="text-xs text-slate-400">{preset.formula}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomKPIsSection;
