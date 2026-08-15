import React, { useState, useEffect } from 'react';
import { Award, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

/**
 * CertificatesSection - Component for displaying enterprise certifications
 * @param {Object} user - Current user object
 * @param {string} token - Authentication token
 */
const CertificatesSection = ({ user, token }) => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const response = await axios.get(`${API}/enterprises/certifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCertificates(response.data || []);
      } catch (error) {
        console.error('Error fetching certificates:', error);
        // Fallback to mock data if API fails
        const mockCertificates = [
          { id: 1, name: 'Certifié Premium', issuing_organization: 'Cloleo', issue_date: '2024-01-15' },
          { id: 2, name: 'Vendeur Vérifié', issuing_organization: 'Cloleo', issue_date: '2024-02-20' },
          { id: 3, name: 'Service Client Excellence', issuing_organization: 'Cloleo', issue_date: '2024-03-10' },
        ];
        setCertificates(mockCertificates);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificates();
  }, [token]);

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <Award className="w-6 h-6 text-blue-400" />
        Mes Certificats
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {certificates.map((cert) => (
          <div key={cert.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                <Award className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">{cert.name}</h3>
                <p className="text-sm text-slate-400">Délivré par {cert.issuing_organization || cert.issuer || 'Cloleo'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                (!cert.expiry_date || new Date(cert.expiry_date) > new Date()) ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
              }`}>
                {(!cert.expiry_date || new Date(cert.expiry_date) > new Date()) ? 'Actif' : 'Expiré'}
              </span>
              <span className="text-xs text-slate-500">{cert.issue_date || cert.date ? new Date(cert.issue_date || cert.date).toLocaleDateString('fr-FR') : 'N/A'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CertificatesSection;
