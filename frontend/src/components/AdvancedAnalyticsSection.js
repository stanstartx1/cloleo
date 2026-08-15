import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, BarChart3, Activity, Loader2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, LineChart, Line, BarChart, Bar, CartesianGrid } from 'recharts';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

/**
 * AdvancedAnalyticsSection - Component for displaying advanced analytics (12 months, heatmap, cohorts)
 * @param {Object} user - Current user object
 * @param {string} token - Authentication token
 */
const AdvancedAnalyticsSection = ({ user, token }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('12months');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await axios.get(`${API}/enterprises/analytics?range=${timeRange}`, {
        //   headers: { Authorization: `Bearer ${token}` }
        // });
        // setAnalyticsData(response.data);

        // Mock data for 12 months
        const monthlyData = [
          { month: 'Jan', sales: 45000, orders: 120, revenue: 4200000, newCustomers: 45 },
          { month: 'Fév', sales: 52000, orders: 135, revenue: 4800000, newCustomers: 52 },
          { month: 'Mar', sales: 48000, orders: 125, revenue: 4500000, newCustomers: 48 },
          { month: 'Avr', sales: 61000, orders: 150, revenue: 5800000, newCustomers: 61 },
          { month: 'Mai', sales: 55000, orders: 140, revenue: 5200000, newCustomers: 55 },
          { month: 'Juin', sales: 67000, orders: 165, revenue: 6400000, newCustomers: 67 },
          { month: 'Juil', sales: 72000, orders: 175, revenue: 6900000, newCustomers: 72 },
          { month: 'Août', sales: 68000, orders: 165, revenue: 6500000, newCustomers: 68 },
          { month: 'Sep', sales: 75000, orders: 180, revenue: 7200000, newCustomers: 75 },
          { month: 'Oct', sales: 82000, orders: 195, revenue: 7800000, newCustomers: 82 },
          { month: 'Nov', sales: 91000, orders: 210, revenue: 8700000, newCustomers: 91 },
          { month: 'Déc', sales: 98000, orders: 225, revenue: 9400000, newCustomers: 98 },
        ];

        const cohortData = [
          { cohort: 'Jan', month1: 100, month2: 85, month3: 72, month4: 65, month5: 60 },
          { cohort: 'Fév', month1: 100, month2: 88, month3: 76, month4: 70, month5: 65 },
          { cohort: 'Mar', month1: 100, month2: 90, month3: 82, month4: 75, month5: 70 },
          { cohort: 'Avr', month1: 100, month2: 92, month3: 85, month4: 78, month5: 73 },
          { cohort: 'Mai', month1: 100, month2: 94, month3: 88, month4: 82, month5: 77 },
        ];

        const categoryPerformance = [
          { category: 'Électronique', sales: 450000, growth: 15 },
          { category: 'Mode', sales: 320000, growth: 22 },
          { category: 'Maison', sales: 280000, growth: 8 },
          { category: 'Services', sales: 190000, growth: 18 },
          { category: 'Alimentation', sales: 150000, growth: 12 },
        ];

        setAnalyticsData({ monthlyData, cohortData, categoryPerformance });
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [token, timeRange]);

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" /></div>;
  }

  if (!analyticsData) {
    return <div className="text-center py-12 text-slate-400">Données non disponibles</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-amber-400" />
          Analytics Avancés
        </h2>
        <div className="flex gap-2">
          {['6months', '12months', '24months'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {range === '6months' ? '6 mois' : range === '12months' ? '12 mois' : '24 mois'}
            </button>
          ))}
        </div>
      </div>

      {/* 12 Months Revenue Chart */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Revenus sur 12 mois
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analyticsData.monthlyData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              itemStyle={{ color: '#f3f4f6' }}
              formatter={(value) => `${(value / 1000000).toFixed(2)}M FCFA`}
            />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Orders & Sales Chart */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Commandes mensuelles
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analyticsData.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                itemStyle={{ color: '#f3f4f6' }}
              />
              <Bar dataKey="orders" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Nouveaux clients
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analyticsData.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                itemStyle={{ color: '#f3f4f6' }}
              />
              <Line type="monotone" dataKey="newCustomers" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Performance */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          Performance par catégorie
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={analyticsData.categoryPerformance} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#6b7280" tickFormatter={(value) => `${(value / 1000)}k`} />
            <YAxis dataKey="category" type="category" stroke="#6b7280" width={100} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              itemStyle={{ color: '#f3f4f6' }}
              formatter={(value) => `${(value / 1000).toFixed(0)}k FCFA`}
            />
            <Bar dataKey="sales" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cohort Analysis */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Analyse de cohorte (Rétention)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analyticsData.cohortData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="cohort" stroke="#6b7280" />
            <YAxis stroke="#6b7280" tickFormatter={(value) => `${value}%`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              itemStyle={{ color: '#f3f4f6' }}
            />
            <Line type="monotone" dataKey="month1" stroke="#06b6d4" strokeWidth={2} name="Mois 1" />
            <Line type="monotone" dataKey="month2" stroke="#0891b2" strokeWidth={2} name="Mois 2" />
            <Line type="monotone" dataKey="month3" stroke="#0ea5e9" strokeWidth={2} name="Mois 3" />
            <Line type="monotone" dataKey="month4" stroke="#0284c7" strokeWidth={2} name="Mois 4" />
            <Line type="monotone" dataKey="month5" stroke="#0369a1" strokeWidth={2} name="Mois 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsSection;
