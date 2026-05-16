import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Truck, Mail, Lock, User, Phone, MapPin, Car, FileText,
  Loader2, Upload, CheckCircle, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VEHICLE_TYPES = [
  { value: 'moto', label: 'Moto', icon: '🏍️' },
  { value: 'voiture', label: 'Voiture', icon: '🚗' },
  { value: 'velo', label: 'Vélo', icon: '🚲' },
];

const CITIES = [
  "Abidjan", "Yamoussoukro", "Bouaké", "Dakar", "Thiès", 
  "Lagos", "Abuja", "Douala", "Yaoundé", "Accra", "Kumasi"
];

const COUNTRIES = ["Côte d'Ivoire", "Sénégal", "Nigeria", "Cameroun", "Ghana"];

const DriverRegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const fileInputRef = useRef(null);
  
  const [step, setStep] = useState(1); // 1: Info, 2: License
  const [loading, setLoading] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [tempUser, setTempUser] = useState(null);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    vehicle_type: '',
    license_number: '',
    city: '',
    country: "Côte d'Ivoire"
  });

  const [licenseFile, setLicenseFile] = useState(null);
  const [licensePreview, setLicensePreview] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (!formData.vehicle_type || !formData.city) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/register/driver`, {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: formData.phone,
        vehicle_type: formData.vehicle_type,
        license_number: formData.license_number,
        city: formData.city,
        country: formData.country
      });

      setTempToken(response.data.token);
      setTempUser(response.data.user || null);
      setStep(2);
      toast.success('Informations enregistrées ! Uploadez maintenant votre permis.');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Le fichier est trop volumineux (max 10 MB)');
        return;
      }
      setLicenseFile(file);
      
      // Preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLicensePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setLicensePreview(null);
      }
    }
  };

  const handleUploadLicense = async () => {
    if (!licenseFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setUploadingLicense(true);

    try {
      const formData = new FormData();
      formData.append('file', licenseFile);

      await axios.post(`${API}/driver/upload-license`, formData, {
        headers: {
          Authorization: `Bearer ${tempToken}`
        }
      });

      setRegistrationComplete(true);
      toast.success('Permis uploadé avec succès !');
      
      // Auto login after 2 seconds
      setTimeout(() => {
        login(tempToken, undefined, tempUser);
        navigate('/livreur');
      }, 2000);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'upload du permis');
    } finally {
      setUploadingLicense(false);
    }
  };

  const handleSkipLicense = () => {
    login(tempToken, undefined, tempUser);
    navigate('/livreur');
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Inscription réussie !</h1>
          <p className="text-gray-600 mb-4">
            Votre compte livreur a été créé. Un administrateur va vérifier votre permis
            et activer votre compte sous peu.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <span>Compte en attente de vérification</span>
          </div>
          <p className="text-sm text-gray-500 mt-4">Redirection vers votre dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Devenir Livreur</h1>
          </div>
          <p className="text-blue-100">Rejoignez l'équipe de livraison Cloléo</p>
          
          {/* Progress */}
          <div className="flex items-center gap-2 mt-4">
            <div className={`flex-1 h-1 rounded ${step >= 1 ? 'bg-white' : 'bg-white/30'}`} />
            <div className={`flex-1 h-1 rounded ${step >= 2 ? 'bg-white' : 'bg-white/30'}`} />
          </div>
          <div className="flex justify-between text-xs mt-1 text-blue-100">
            <span>Informations</span>
            <span>Permis</span>
          </div>
        </div>

        <div className="p-6">
          {step === 1 ? (
            <form onSubmit={handleStep1Submit} className="space-y-4">
              {/* Personal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nom complet *</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Konan Yao"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="konan@email.com"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password">Mot de passe *</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirmer *</Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="••••••"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="phone">Téléphone *</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+225 07 00 00 00"
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle & Location */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4" /> Véhicule & Zone
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type de véhicule *</Label>
                    <Select
                      value={formData.vehicle_type}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, vehicle_type: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_TYPES.map((v) => (
                          <SelectItem key={v.value} value={v.value}>
                            {v.icon} {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="license_number">N° Permis *</Label>
                    <Input
                      id="license_number"
                      name="license_number"
                      value={formData.license_number}
                      onChange={handleInputChange}
                      placeholder="AB123456"
                      className="mt-1"
                      required
                    />
                  </div>

                  <div>
                    <Label>Pays</Label>
                    <Select
                      value={formData.country}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Ville *</Label>
                    <Select
                      value={formData.city}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CITIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Inscription...</>
                ) : (
                  <>Continuer</>
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <FileText className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                <h3 className="font-bold text-lg">Upload de votre permis</h3>
                <p className="text-sm text-gray-500">
                  Pour vérification par notre équipe
                </p>
              </div>

              {/* File Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
              >
                {licensePreview ? (
                  <img src={licensePreview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
                ) : licenseFile ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle className="w-6 h-6" />
                    <span>{licenseFile.name}</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Cliquez pour uploader</p>
                    <p className="text-xs text-gray-400">JPG, PNG ou PDF (max 10 MB)</p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSkipLicense}
                >
                  Passer pour l'instant
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleUploadLicense}
                  disabled={!licenseFile || uploadingLicense}
                >
                  {uploadingLicense ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Upload...</>
                  ) : (
                    <>Terminer l'inscription</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-gray-500">
            Déjà inscrit ?{' '}
            <Link to="/connexion" className="text-blue-600 hover:underline">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverRegisterPage;
