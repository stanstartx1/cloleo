import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, Loader2, Upload, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';

const API = API_URL;

const RevendeurEditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token, logout, isDropshipper } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [product, setProduct] = useState(null);
  const [formData, setFormData] = useState({
    selling_price_fcfa: '',
    custom_description: '',
    custom_image_url: '',
  });

  useEffect(() => {
    if (!isDropshipper) {
      navigate('/connexion');
      return;
    }

    const fetchProduct = async () => {
      try {
        const response = await axios.get(`${API}/revendeur/products`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const items = Array.isArray(response.data) ? response.data : [];
        const current = items.find((p) => p.id === id);
        if (!current) {
          toast.error('Produit revendeur introuvable');
          navigate('/revendeur');
          return;
        }
        setProduct(current);
        setFormData({
          selling_price_fcfa: current.selling_price_fcfa?.toString() || '',
          custom_description: current.custom_description || '',
          custom_image_url: current.custom_image_url || current.original_images?.[0] || '',
        });
      } catch (error) {
        toast.error('Erreur lors du chargement du produit');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, token, navigate, isDropshipper]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const body = new FormData();
      body.append('files', file);
      const response = await axios.post(`${API}/upload/multiple`, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      const url = response.data?.urls?.[0];
      const fullUrl = url?.startsWith('http') ? url : `${API_BASE}${url}`;
      setFormData((prev) => ({ ...prev, custom_image_url: fullUrl }));
      toast.success('Image mise à jour');
    } catch (error) {
      toast.error('Erreur upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!product) return;

    const newPrice = parseInt(formData.selling_price_fcfa || '0', 10);
    const basePrice = Number(product.original_promo_price_fcfa || product.original_price_fcfa || 0);
    if (!newPrice || newPrice < basePrice) {
      toast.error(`Le prix doit être >= ${basePrice.toLocaleString()} FCFA`);
      return;
    }

    setSaving(true);
    try {
      await axios.put(`${API}/revendeur/products/${id}`, {
        selling_price_fcfa: newPrice,
        custom_description: formData.custom_description,
        custom_image_url: formData.custom_image_url || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Produit modifié avec succès');
      navigate('/revendeur');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-muted/30 home-premium-gradient dashboard-card-skin">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/revendeur">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Modifier le produit revendeur</h1>
              <p className="text-muted-foreground">Mettez à jour prix, description et image</p>
            </div>
          </div>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Déconnexion
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-bold text-lg">Produit original</h2>
            <p className="text-sm text-gray-600">{product?.original_name}</p>
            <p className="text-sm text-gray-500">
              Prix source: {(product?.original_promo_price_fcfa || product?.original_price_fcfa || 0).toLocaleString()} FCFA
            </p>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-bold text-lg">Paramètres de revente</h2>
            <div className="space-y-2">
              <Label>Prix de vente (FCFA)</Label>
              <Input
                type="number"
                value={formData.selling_price_fcfa}
                onChange={(e) => setFormData((prev) => ({ ...prev, selling_price_fcfa: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Description personnalisée</Label>
              <Textarea
                value={formData.custom_description}
                onChange={(e) => setFormData((prev) => ({ ...prev, custom_description: e.target.value }))}
                rows={5}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-bold text-lg">Image personnalisée</h2>
            {formData.custom_image_url ? (
              <img src={formData.custom_image_url} alt="Produit" className="w-40 h-40 object-cover rounded-lg border" />
            ) : null}
            <div>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white cursor-pointer hover:bg-purple-700">
                <Upload className="w-4 h-4" /> {uploading ? 'Upload...' : 'Uploader une image'}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/revendeur">Annuler</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</> : <><Save className="w-4 h-4 mr-2" /> Enregistrer</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RevendeurEditProduct;
