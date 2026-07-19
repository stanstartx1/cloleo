import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Building2, MapPin, Users, Star, Search, ArrowRight } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

const EnterpriseCard = ({ enterprise }) => {
  return (
    <Link
      to={`/enterprise/profile/${enterprise.company_slug}`}
      className="group relative block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100"
    >
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center flex-shrink-0">
            {enterprise.profile_photo ? (
              <img
                src={enterprise.profile_photo}
                alt={enterprise.company_name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Building2 className="w-10 h-10 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-slate-900 text-lg line-clamp-1 group-hover:text-blue-600 transition-colors">
              {enterprise.company_name}
            </h3>
            <p className="text-sm text-slate-500 font-medium mt-1">
              {enterprise.business_type}
            </p>
            <div className="flex items-center gap-1 mt-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">{enterprise.city}, {enterprise.country}</span>
            </div>
          </div>
        </div>

        {enterprise.company_description && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-4">
            {enterprise.company_description}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <Users className="w-5 h-5 mx-auto mb-1 text-slate-600" />
            <p className="text-sm font-bold text-slate-900">{enterprise.number_of_employees}</p>
            <p className="text-xs text-slate-500">Employés</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <Star className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-sm font-bold text-slate-900">{enterprise.average_rating?.toFixed(1) || 'N/A'}</p>
            <p className="text-xs text-slate-500">Note</p>
          </div>
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <Building2 className="w-5 h-5 mx-auto mb-1 text-blue-600" />
            <p className="text-sm font-bold text-slate-900">{enterprise.total_products || 0}</p>
            <p className="text-xs text-slate-500">Produits</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-sm text-slate-500 font-medium">
            Depuis {enterprise.year_founded}
          </span>
          <div className="flex items-center gap-1 text-sm font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
            <span>Voir le profil</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-2">
        {enterprise.certifications?.length > 0 && (
          <div className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
            Certifié
          </div>
        )}
        {enterprise.dfe_number && (
          <div className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
            DFE
          </div>
        )}
      </div>
    </Link>
  );
};

const EnterprisesPage = () => {
  const [enterprises, setEnterprises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnterprises = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/enterprises/list?limit=12`);
        setEnterprises(response.data.enterprises || []);
      } catch (error) {
        console.error('Error fetching enterprises:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnterprises();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-4">
            <Building2 className="w-12 h-12" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">Entreprises Vérifiées</h1>
              <p className="text-blue-100 mt-2">
                Découvrez nos partenaires de confiance
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-100 animate-pulse">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 bg-slate-200 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-16 bg-slate-200 rounded w-full mb-4" />
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-20 bg-slate-200 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : enterprises.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune entreprise trouvée
            </h3>
            <p className="text-gray-600">
              Revenez plus tard pour découvrir nos partenaires
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enterprises.map((enterprise) => (
              <EnterpriseCard key={enterprise.id} enterprise={enterprise} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnterprisesPage;
