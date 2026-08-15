import React, { useState, useEffect } from 'react';
import { Bell, Clock, Users, Shield, Mail, Smartphone, Loader2, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

/**
 * AdvancedSettingsSection - Advanced settings with notifications, schedules, teams
 * @param {Object} props - Component props
 */
const AdvancedSettingsSection = ({ user, token, onRefresh }) => {
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      sms: false,
      orderUpdates: true,
      newMessages: true,
      promotions: false
    },
    schedule: {
      businessHours: {
        monday: { open: '09:00', close: '18:00', enabled: true },
        tuesday: { open: '09:00', close: '18:00', enabled: true },
        wednesday: { open: '09:00', close: '18:00', enabled: true },
        thursday: { open: '09:00', close: '18:00', enabled: true },
        friday: { open: '09:00', close: '18:00', enabled: true },
        saturday: { open: '10:00', close: '14:00', enabled: true },
        sunday: { open: '09:00', close: '18:00', enabled: false }
      },
      timezone: 'Africa/Douala'
    },
    team: [
      { id: 1, name: 'Admin Principal', email: 'admin@company.com', role: 'admin', avatar: 'AP' },
      { id: 2, name: 'Jean Dupont', email: 'jean@company.com', role: 'manager', avatar: 'JD' },
      { id: 3, name: 'Marie Curie', email: 'marie@company.com', role: 'employee', avatar: 'MC' }
    ]
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const fetchSettings = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await axios.get(`${API}/enterprises/settings`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // TODO: Replace with actual API call
      // await axios.put(`${API}/enterprises/settings`, settings, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      onRefresh();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleNotification = (key) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: !settings.notifications[key]
      }
    });
  };

  const updateBusinessHours = (day, field, value) => {
    setSettings({
      ...settings,
      schedule: {
        ...settings.schedule,
        businessHours: {
          ...settings.schedule.businessHours,
          [day]: {
            ...settings.schedule.businessHours[day],
            [field]: value
          }
        }
      }
    });
  };

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-400" />
          Paramètres Avancés
        </h2>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder
        </button>
      </div>

      {/* Notifications */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-amber-400" />
          Notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">Notifications email</p>
                <p className="text-xs text-slate-400">Recevoir les alertes par email</p>
              </div>
            </div>
            <button
              onClick={() => toggleNotification('email')}
              className={`p-2 rounded-lg transition-colors ${
                settings.notifications.email ? 'bg-green-500' : 'bg-slate-700'
              }`}
            >
              {settings.notifications.email ? <ToggleRight className="w-6 h-6 text-white" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white font-medium">Notifications push</p>
                <p className="text-xs text-slate-400">Recevoir les alertes sur mobile</p>
              </div>
            </div>
            <button
              onClick={() => toggleNotification('push')}
              className={`p-2 rounded-lg transition-colors ${
                settings.notifications.push ? 'bg-green-500' : 'bg-slate-700'
              }`}
            >
              {settings.notifications.push ? <ToggleRight className="w-6 h-6 text-white" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-white font-medium">Notifications SMS</p>
                <p className="text-xs text-slate-400">Recevoir les alertes par SMS</p>
              </div>
            </div>
            <button
              onClick={() => toggleNotification('sms')}
              className={`p-2 rounded-lg transition-colors ${
                settings.notifications.sms ? 'bg-green-500' : 'bg-slate-700'
              }`}
            >
              {settings.notifications.sms ? <ToggleRight className="w-6 h-6 text-white" /> : <ToggleLeft className="w-6 h-6 text-slate-400" />}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {[
              { key: 'orderUpdates', label: 'Mises à jour de commandes' },
              { key: 'newMessages', label: 'Nouveaux messages' },
              { key: 'promotions', label: 'Promotions' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl">
                <p className="text-sm text-white">{item.label}</p>
                <button
                  onClick={() => toggleNotification(item.key)}
                  className={`p-1 rounded-lg transition-colors ${
                    settings.notifications[item.key] ? 'bg-green-500' : 'bg-slate-700'
                  }`}
                >
                  {settings.notifications[item.key] ? <ToggleRight className="w-5 h-5 text-white" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-green-400" />
          Horaires d'ouverture
        </h3>
        <div className="space-y-3">
          {days.map((day) => (
            <div key={day} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-xl">
              <div className="w-32">
                <p className="text-white font-medium">{dayNames[day]}</p>
              </div>
              <button
                onClick={() => updateBusinessHours(day, 'enabled', !settings.schedule.businessHours[day].enabled)}
                className={`p-1 rounded-lg transition-colors ${
                  settings.schedule.businessHours[day].enabled ? 'bg-green-500' : 'bg-slate-700'
                }`}
              >
                {settings.schedule.businessHours[day].enabled ? <ToggleRight className="w-5 h-5 text-white" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
              </button>
              {settings.schedule.businessHours[day].enabled && (
                <>
                  <input
                    type="time"
                    value={settings.schedule.businessHours[day].open}
                    onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="time"
                    value={settings.schedule.businessHours[day].close}
                    onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Team Management */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          Gestion de l'équipe
        </h3>
        <div className="space-y-3">
          {settings.team.map((member) => (
            <div key={member.id} className="flex items-center gap-4 p-3 bg-slate-900/50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold">
                {member.avatar}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{member.name}</p>
                <p className="text-xs text-slate-400">{member.email}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                member.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                member.role === 'manager' ? 'bg-blue-500/20 text-blue-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {member.role}
              </span>
            </div>
          ))}
          <button className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-amber-500 hover:text-amber-500 transition-colors">
            <Users className="w-5 h-5" />
            Ajouter un membre
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSettingsSection;
