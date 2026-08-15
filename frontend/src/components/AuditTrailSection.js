import React, { useState, useEffect } from 'react';
import { History, Clock, User, FileText, Search, Filter, Download, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

/**
 * AuditTrailSection - Component for displaying audit trail of modifications
 * @param {Object} user - Current user object
 * @param {string} token - Authentication token
 */
const AuditTrailSection = ({ user, token }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, [token]);

  const fetchAuditLogs = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await axios.get(`${API}/enterprises/audit-logs`, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      // setAuditLogs(response.data.logs || []);

      // Mock data for now
      const mockLogs = [
        { id: 1, action: 'update', entity: 'product', entityId: 123, changes: { price: { old: 50000, new: 55000 } }, user: 'Admin', timestamp: '2024-01-15 10:30:00', ip: '192.168.1.1' },
        { id: 2, action: 'create', entity: 'order', entityId: 456, changes: { status: 'pending' }, user: 'Admin', timestamp: '2024-01-15 09:45:00', ip: '192.168.1.1' },
        { id: 3, action: 'delete', entity: 'product', entityId: 789, changes: { name: 'Produit supprimé' }, user: 'Jean Dupont', timestamp: '2024-01-15 08:20:00', ip: '192.168.1.2' },
        { id: 4, action: 'update', entity: 'profile', entityId: user?.id, changes: { phone: { old: '+237 6XX XXX XXX', new: '+237 6YY YYY YYY' } }, user: 'Admin', timestamp: '2024-01-14 16:00:00', ip: '192.168.1.1' },
        { id: 5, action: 'create', entity: 'achievement', entityId: 999, changes: { title: 'Nouveau trophée' }, user: 'System', timestamp: '2024-01-14 14:30:00', ip: 'System' },
      ];
      setAuditLogs(mockLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesFilter = filter === 'all' || log.action === filter;
    const matchesSearch = log.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getActionColor = (action) => {
    switch (action) {
      case 'create': return 'text-green-400 bg-green-500/20';
      case 'update': return 'text-blue-400 bg-blue-500/20';
      case 'delete': return 'text-red-400 bg-red-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'create': return 'Création';
      case 'update': return 'Modification';
      case 'delete': return 'Suppression';
      default: return action;
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Exporting audit logs...');
  };

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="w-6 h-6 text-amber-400" />
          Journal d'audit
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Exporter
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans le journal..."
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'create', 'update', 'delete'].map((action) => (
              <button
                key={action}
                onClick={() => setFilter(action)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  filter === action
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                }`}
              >
                {action === 'all' ? 'Tous' : getActionLabel(action)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Entité</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Modifications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Aucun enregistrement trouvé
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-white">{log.entity}</span>
                        <span className="text-slate-400 text-xs">#{log.entityId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-300">
                        {Object.entries(log.changes).map(([key, value]) => (
                          <div key={key} className="mb-1">
                            <span className="text-slate-400">{key}:</span>
                            {typeof value === 'object' ? (
                              <span className="ml-2">
                                <span className="text-red-400">{value.old}</span>
                                <span className="text-slate-400"> → </span>
                                <span className="text-green-400">{value.new}</span>
                              </span>
                            ) : (
                              <span className="ml-2 text-white">{value}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className="text-white">{log.user}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{log.timestamp}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-sm">
                      {log.ip}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{auditLogs.length}</p>
          <p className="text-xs text-slate-400">Total des logs</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{auditLogs.filter(l => l.action === 'create').length}</p>
          <p className="text-xs text-slate-400">Créations</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{auditLogs.filter(l => l.action === 'update').length}</p>
          <p className="text-xs text-slate-400">Modifications</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{auditLogs.filter(l => l.action === 'delete').length}</p>
          <p className="text-xs text-slate-400">Suppressions</p>
        </div>
      </div>
    </div>
  );
};

export default AuditTrailSection;
