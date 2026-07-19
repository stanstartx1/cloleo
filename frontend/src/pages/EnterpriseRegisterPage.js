import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, Users, Factory, Globe, Award, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'https://cloleo.com';

const DocumentUpload = ({ label, documentType, onUpload, progress, uploaded }) => {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      onUpload(documentType, selectedFile);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Label className="mb-2 block">{label}</Label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              id={documentType}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <label
              htmlFor={documentType}
              className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">Choisir un fichier</span>
            </label>
            {file && <span className="text-sm text-gray-600">{file.name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {progress === 100 && uploaded ? (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Uploadé</span>
            </div>
          ) : progress === -1 ? (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Erreur</span>
            </div>
          ) : progress > 0 && progress < 100 ? (
            <div className="text-sm text-gray-600">{progress}%</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const EnterpriseRegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedDocuments, setUploadedDocuments] = useState({});
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    company_name: '',
    contact_person: '',
    phone: '',
    business_type: '',
    year_founded: '',
    number_of_employees: '',
    business_sector: '',
    company_description: '',
    city: '',
    country: '',
    certifications: [],
    dfe_number: '',
    trade_register_number: '',
    tax_id: '',
    legal_form: '',
    capital: '',
    address: '',
    website: ''
  });

  const handleDocumentUpload = async (documentType, file) => {
    if (!file) return;
    
    setUploadProgress(prev => ({ ...prev, [documentType]: 0 }));
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    
    try {
      const response = await axios.post(`${API_URL}/api/enterprises/upload-document`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(prev => ({ ...prev, [documentType]: percentCompleted }));
        }
      });
      
      setUploadedDocuments(prev => ({ ...prev, [documentType]: response.data.url }));
      setUploadProgress(prev => ({ ...prev, [documentType]: 100 }));
    } catch (err) {
      console.error('Upload error:', err);
      setUploadProgress(prev => ({ ...prev, [documentType]: -1 }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/api/enterprises/register`, formData);
      navigate('/enterprise');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Devenir Partenaire Entreprise</h1>
          <p className="text-gray-600 mt-2">Rejoignez notre réseau d'entreprises vérifiées</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations de l'entreprise</CardTitle>
            <CardDescription>Remplissez les informations ci-dessous pour créer votre compte entreprise</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email professionnel</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name">Nom de l'entreprise</Label>
                <Input
                  id="company_name"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Personne de contact</Label>
                  <Input
                    id="contact_person"
                    required
                    value={formData.contact_person}
                    onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="business_type">Type d'entreprise</Label>
                  <Select
                    value={formData.business_type}
                    onValueChange={(value) => setFormData({...formData, business_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manufacturer">Fabricant</SelectItem>
                      <SelectItem value="Trading Company">Société commerciale</SelectItem>
                      <SelectItem value="Wholesaler">Grossiste</SelectItem>
                      <SelectItem value="Distributor">Distributeur</SelectItem>
                      <SelectItem value="Service Provider">Prestataire de services</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_form">Forme juridique</Label>
                  <Select
                    value={formData.legal_form}
                    onValueChange={(value) => setFormData({...formData, legal_form: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SARL">SARL</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="SAS">SAS</SelectItem>
                      <SelectItem value="EURL">EURL</SelectItem>
                      <SelectItem value="Auto-entrepreneur">Auto-entrepreneur</SelectItem>
                      <SelectItem value="GIE">GIE</SelectItem>
                      <SelectItem value="Association">Association</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="year_founded">Année de création</Label>
                  <Input
                    id="year_founded"
                    type="number"
                    value={formData.year_founded}
                    onChange={(e) => setFormData({...formData, year_founded: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number_of_employees">Nombre d'employés</Label>
                  <Select
                    value={formData.number_of_employees}
                    onValueChange={(value) => setFormData({...formData, number_of_employees: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10</SelectItem>
                      <SelectItem value="11-50">11-50</SelectItem>
                      <SelectItem value="51-200">51-200</SelectItem>
                      <SelectItem value="201-500">201-500</SelectItem>
                      <SelectItem value="500+">500+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capital">Capital social (FCFA)</Label>
                  <Input
                    id="capital"
                    type="number"
                    value={formData.capital}
                    onChange={(e) => setFormData({...formData, capital: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="dfe_number">Numéro DFE</Label>
                  <Input
                    id="dfe_number"
                    value={formData.dfe_number}
                    onChange={(e) => setFormData({...formData, dfe_number: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trade_register_number">Registre de commerce</Label>
                  <Input
                    id="trade_register_number"
                    value={formData.trade_register_number}
                    onChange={(e) => setFormData({...formData, trade_register_number: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tax_id">Identifiant fiscal</Label>
                  <Input
                    id="tax_id"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_sector">Secteur d'activité</Label>
                  <Input
                    id="business_sector"
                    value={formData.business_sector}
                    onChange={(e) => setFormData({...formData, business_sector: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse complète</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Pays</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({...formData, country: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Site web (optionnel)</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_description">Description de l'entreprise</Label>
                <Textarea
                  id="company_description"
                  rows={4}
                  value={formData.company_description}
                  onChange={(e) => setFormData({...formData, company_description: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documents requis
                </h3>
                
                <div className="space-y-4">
                  <DocumentUpload
                    label="Document DFE"
                    documentType="dfe"
                    onUpload={handleDocumentUpload}
                    progress={uploadProgress.dfe}
                    uploaded={uploadedDocuments.dfe}
                  />
                  
                  <DocumentUpload
                    label="Registre de commerce"
                    documentType="trade_register"
                    onUpload={handleDocumentUpload}
                    progress={uploadProgress.trade_register}
                    uploaded={uploadedDocuments.trade_register}
                  />
                  
                  <DocumentUpload
                    label="Carte d'identité du représentant"
                    documentType="legal_form"
                    onUpload={handleDocumentUpload}
                    progress={uploadProgress.legal_form}
                    uploaded={uploadedDocuments.legal_form}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Création en cours...' : 'Créer mon compte entreprise'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnterpriseRegisterPage;
