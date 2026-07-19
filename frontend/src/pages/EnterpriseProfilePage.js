import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  MapPin, 
  Users, 
  Calendar, 
  Globe, 
  Factory,
  Award,
  Star,
  Package,
  MessageSquare,
  ArrowLeft,
  Share2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

const EnterpriseProfilePage = () => {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const [enterprise, setEnterprise] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnterprise = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/enterprises/profile/${companySlug}`);
        setEnterprise(response.data);
      } catch (error) {
        console.error('Error fetching enterprise profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnterprise();
  }, [companySlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!enterprise) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold text-gray-900">Entreprise non trouvée</h2>
          <Button onClick={() => navigate('/entreprises')} className="mt-4">
            Retour aux entreprises
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/entreprises')}
            className="text-white hover:bg-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
              {enterprise.profile_photo ? (
                <img
                  src={enterprise.profile_photo}
                  alt={enterprise.company_name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Building2 className="w-12 h-12 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{enterprise.company_name}</h1>
              <p className="text-blue-100 mt-2">{enterprise.business_type}</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  <span className="font-semibold">{enterprise.average_rating?.toFixed(1) || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>{enterprise.city}, {enterprise.country}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>À propos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{enterprise.company_description || 'Aucune description disponible'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Année de création</p>
                    <p className="font-semibold">{enterprise.year_founded}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Nombre d'employés</p>
                    <p className="font-semibold">{enterprise.number_of_employees}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Factory className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Secteur d'activité</p>
                    <p className="font-semibold">{enterprise.business_sector}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                {enterprise.certifications?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {enterprise.certifications.map((cert, index) => (
                      <Badge key={index} variant="secondary">
                        <Award className="w-3 h-3 mr-1" />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Aucune certification affichée</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Contacter
                </Button>
                <Button variant="outline" className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Partager
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Produits</span>
                  <span className="font-semibold">{enterprise.total_products || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Note</span>
                  <span className="font-semibold">{enterprise.average_rating?.toFixed(1) || 'N/A'}/5</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseProfilePage;
