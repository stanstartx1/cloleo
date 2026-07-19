import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Building2, MapPin, Users, Star, ArrowRight, Award } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

const EnterpriseCard = ({ enterprise }) => {
  return (
    <Link
      to={`/enterprise/profile/${enterprise.company_slug}`}
      className="group relative block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100"
    >
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center flex-shrink-0">
            {enterprise.profile_photo ? (
              <img
                src={enterprise.profile_photo}
                alt={enterprise.company_name}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Building2 className="w-8 h-8 text-blue-600" />
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

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <Users className="w-4 h-4 mx-auto mb-1 text-slate-600" />
            <p className="text-xs font-bold text-slate-900">{enterprise.number_of_employees}</p>
            <p className="text-xs text-slate-500">Employés</p>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <Star className="w-4 h-4 mx-auto mb-1 text-amber-500" />
            <p className="text-xs font-bold text-slate-900">{enterprise.average_rating?.toFixed(1) || 'N/A'}</p>
            <p className="text-xs text-slate-500">Note</p>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <Building2 className="w-4 h-4 mx-auto mb-1 text-blue-600" />
            <p className="text-xs font-bold text-slate-900">{enterprise.total_products || 0}</p>
            <p className="text-xs text-slate-500">Produits</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium">
            Depuis {enterprise.year_founded}
          </span>
          <div className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
            <span>Voir le profil</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      <div className="absolute top-3 right-3 flex flex-col gap-1">
        {enterprise.certifications?.length > 0 && (
          <div className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
            Certifié
          </div>
        )}
        {enterprise.dfe_number && (
          <div className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
            DFE
          </div>
        )}
      </div>
    </Link>
  );
};

const EnterprisesSection = () => {
  const [enterprises, setEnterprises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnterprises = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/enterprises/list?limit=8`);
        setEnterprises(response.data.enterprises || []);
      } catch (error) {
        console.error('Error fetching enterprises:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnterprises();
  }, []);

  if (loading) {
    return (
      <section className="w-full bg-white">
        <div className="w-full bg-gradient-to-r from-transparent via-blue-200 to-transparent h-px" />
        <div className="site-container py-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900">
                  Entreprises <span className="text-blue-600">Vérifiées</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">Des partenaires de confiance</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 border border-slate-100 animate-pulse">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-12 bg-slate-200 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (enterprises.length === 0) return null;

  return (
    <section className="w-full bg-white">
      {/* Top Separator */}
      <div className="w-full bg-gradient-to-r from-transparent via-blue-200 to-transparent h-px" />
      
      <div className="site-container py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-xl shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900">
                Entreprises <span className="text-blue-600">Vérifiées</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">Des partenaires de confiance</p>
            </div>
          </div>
          <Link
            to="/entreprises"
            className="hidden sm:flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors group"
          >
            Voir toutes
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Enterprises Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {enterprises.map((enterprise) => (
            <EnterpriseCard key={enterprise.id} enterprise={enterprise} />
          ))}
        </div>

        {/* Mobile View All Button */}
        <div className="mt-6 sm:hidden">
          <Link
            to="/entreprises"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all"
          >
            Voir toutes les entreprises
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Bottom Separator */}
      <div className="w-full bg-gradient-to-r from-transparent via-blue-200 to-transparent h-px" />
    </section>
  );
};

export default EnterprisesSection;
