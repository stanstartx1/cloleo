import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  User, Mail, Phone, Lock, Camera, Save, Eye, EyeOff, 
  Shield, Bell, MapPin, Store, Loader2, CheckCircle,
  ArrowLeft, Edit2, Upload
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    shop_name: user?.shop_name || '',
    shop_description: user?.shop_description || '',
    location: user?.location || '',
    city: user?.city || ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [notifications, setNotifications] = useState({
    email_orders: true,
    email_messages: true,
    email_promotions: false,
    push_orders: true,
    push_messages: true
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put(`${API}/users/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (updateUser) {
        updateUser(response.data);
      }
      toast.success('Profil mis à jour avec succès !');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      await axios.put(`${API}/users/password`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      toast.success('Mot de passe modifié avec succès !');
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setUploadingPhoto(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/users/profile/photo`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (updateUser) {
        updateUser({ ...user, profile_photo: response.data.url });
      }
      toast.success('Photo de profil mise à jour !');
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors du téléchargement');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dashboard-card-skin home-premium-gradient">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>
          <h1 className="text-3xl font-bold">Paramètres du compte</h1>
          <p className="text-white/80 mt-2">Gérez vos informations personnelles et préférences</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 -mt-4">
        {/* Profile Photo Card */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-100 to-amber-100 p-6">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-xl">
                  {user?.profile_photo ? (
                    <img 
                      src={user.profile_photo} 
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(user?.name)
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors group-hover:scale-110"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                  ) : (
                    <Camera className="w-4 h-4 text-orange-500" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* User Info */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{user?.name}</h2>
                <p className="text-gray-600">{user?.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    user?.role === 'admin' ? 'bg-red-100 text-red-700' :
                    user?.role === 'vendor' ? 'bg-blue-100 text-blue-700' :
                    user?.role === 'dropshipper' ? 'bg-purple-100 text-purple-700' :
                    user?.role === 'driver' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {user?.role === 'admin' ? 'Administrateur' :
                     user?.role === 'vendor' ? 'Vendeur' :
                     user?.role === 'dropshipper' ? 'Revendeur' :
                     user?.role === 'driver' ? 'Livreur' : 'Client'}
                  </span>
                  {user?.is_verified && (
                    <span className="flex items-center gap-1 text-green-600 text-xs">
                      <CheckCircle className="w-3 h-3" /> Vérifié
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-white border shadow-sm p-1 rounded-xl">
            <TabsTrigger value="profile" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              Profil
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Lock className="w-4 h-4 mr-2" />
              Sécurité
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
                <CardDescription>Mettez à jour vos informations de profil</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        Nom complet
                      </label>
                      <Input
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Votre nom"
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        Email
                      </label>
                      <Input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="votre@email.com"
                        className="h-12"
                        disabled
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        Téléphone
                      </label>
                      <Input
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+225 07 00 00 00"
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        Ville
                      </label>
                      <Input
                        value={profileData.city}
                        onChange={(e) => setProfileData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Abidjan"
                        className="h-12"
                      />
                    </div>
                  </div>

                  {/* Vendor/Dropshipper specific fields */}
                  {(user?.role === 'vendor' || user?.role === 'dropshipper') && (
                    <div className="border-t pt-6 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Store className="w-5 h-5 text-orange-500" />
                        Informations boutique
                      </h3>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Nom de la boutique
                          </label>
                          <Input
                            value={profileData.shop_name}
                            onChange={(e) => setProfileData(prev => ({ ...prev, shop_name: e.target.value }))}
                            placeholder="Ma Boutique"
                            className="h-12"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Localisation
                          </label>
                          <Input
                            value={profileData.location}
                            onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                            placeholder="Cocody, Abidjan"
                            className="h-12"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Description de la boutique
                        </label>
                        <textarea
                          value={profileData.shop_description}
                          onChange={(e) => setProfileData(prev => ({ ...prev, shop_description: e.target.value }))}
                          placeholder="Décrivez votre boutique..."
                          className="w-full p-3 border rounded-xl h-24 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Enregistrer les modifications
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-500" />
                  Sécurité du compte
                </CardTitle>
                <CardDescription>Gérez votre mot de passe et la sécurité de votre compte</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Mot de passe actuel
                    </label>
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                        placeholder="••••••••"
                        className="h-12 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                        placeholder="••••••••"
                        className="h-12 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Minimum 6 caractères</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Confirmer le nouveau mot de passe
                    </label>
                    <Input
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                      placeholder="••••••••"
                      className="h-12"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading || !passwordData.current_password || !passwordData.new_password}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4 mr-2" />
                    )}
                    Modifier le mot de passe
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-500" />
                  Préférences de notification
                </CardTitle>
                <CardDescription>Choisissez comment vous souhaitez être notifié</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Email Notifications */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Notifications par email</h4>
                  
                  <div className="space-y-3">
                    {[
                      { key: 'email_orders', label: 'Nouvelles commandes', desc: 'Recevez un email pour chaque nouvelle commande' },
                      { key: 'email_messages', label: 'Messages', desc: 'Recevez un email pour les nouveaux messages' },
                      { key: 'email_promotions', label: 'Promotions', desc: 'Recevez des offres et promotions' }
                    ].map(item => (
                      <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                        <div>
                          <p className="font-medium text-gray-700">{item.label}</p>
                          <p className="text-sm text-gray-500">{item.desc}</p>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={notifications[item.key]}
                            onChange={(e) => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <Button 
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer les préférences
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
