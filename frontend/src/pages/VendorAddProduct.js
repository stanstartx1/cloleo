import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import ImageUpload from '../components/ImageUpload';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CONDITIONS = [
  { value: 'neuf', label: 'Neuf' },
  { value: 'quasi-neuf', label: 'Quasi-neuf' },
  { value: 'occasion', label: 'Occasion' },
];

const VendorAddProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { token, isVendor, logout } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_fcfa: '',
    promo_price_fcfa: '',
    stock: '',
    condition: 'neuf',
    category_slug: '',
    subcategory_slug: '',
    images: [],
    tags: ''
  });

  // Catégories parentes (sans parent_slug)
  const parentCategories = categories.filter(c => !c.parent_slug);

  // Sous-catégories de la catégorie sélectionnée
  const subCategories = categories.filter(
    c => c.parent_slug && c.parent_slug === formData.category_slug
  );

  useEffect(() => {
    if (!isVendor) {
      navigate('/connexion');
      return;
    }
    fetchCategories();
  }, [isVendor, navigate]);

  useEffect(() => {
    if (!isEditMode || !token) return;
    const fetchProductForEdit = async () => {
      try {
        const response = await axios.get(`${API}/vendor/products`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const allProducts = Array.isArray(response.data) ? response.data : (response.data.products || []);
        const product = allProducts.find((p) => p.id === id);
        if (!product) {
          toast.error('Produit introuvable');
          navigate('/vendeur/produits');
          return;
        }
        setFormData({
          name: product.name || '',
          description: product.description || '',
          price_fcfa: product.price_fcfa?.toString() || '',
          promo_price_fcfa: product.promo_price_fcfa?.toString() || '',
          stock: product.stock?.toString() || '',
          condition: product.condition || 'neuf',
          category_slug: product.category_slug || '',
          subcategory_slug: product.subcategory_slug || '',
          images: product.images || [],
          tags: Array.isArray(product.tags) ? product.tags.join(', ') : ''
        });
      } catch (error) {
        toast.error('Erreur chargement produit');
      }
    };
    fetchProductForEdit();
  }, [id, isEditMode, token, navigate]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImagesChange = (images) => {
    setFormData(prev => ({ ...prev, images }));
  };

  const handleCategoryChange = (value) => {
    // Réinitialiser la sous-catégorie quand on change de catégorie
    setFormData(prev => ({ ...prev, category_slug: value, subcategory_slug: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.description || !formData.price_fcfa || !formData.stock || !formData.category_slug) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.images.length === 0) {
      toast.error('Ajoutez au moins une image');
      return;
    }

    setLoading(true);

    try {
      // Le slug final = sous-catégorie si choisie, sinon catégorie principale
      const finalCategorySlug = formData.subcategory_slug || formData.category_slug;

      const data = {
        name: formData.name,
        description: formData.description,
        price_fcfa: parseInt(formData.price_fcfa),
        promo_price_fcfa: formData.promo_price_fcfa ? parseInt(formData.promo_price_fcfa) : null,
        stock: parseInt(formData.stock),
        condition: formData.condition,
        category_slug: finalCategorySlug,
        subcategory_slug: formData.subcategory_slug || null,
        images: formData.images,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      if (isEditMode) {
        await axios.put(`${API}/vendor/products/${id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Produit modifié avec succès');
      } else {
        await axios.post(`${API}/vendor/products`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Produit créé ! En attente de validation par l'admin.");
      }
      navigate('/vendeur/produits');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen py-8 bg-muted/30 dashboard-card-skin home-premium-gradient" data-testid="add-product-page">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/vendeur/produits"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{isEditMode ? 'Modifier le produit' : 'Ajouter un produit'}</h1>
              <p className="text-muted-foreground">
                {isEditMode ? 'Modifiez images, prix, stock et détails du produit' : 'Votre produit sera soumis à validation avant publication'}
              </p>
            </div>
          </div>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Déconnexion
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-bold text-lg">Informations générales</h2>

            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange}
                placeholder="Ex: Tissu Wax Hollandais 6 yards" required data-testid="product-name" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" name="description" value={formData.description}
                onChange={handleInputChange} placeholder="Décrivez votre produit en détail..."
                rows={5} required data-testid="product-description" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Catégorie principale */}
              <div className="space-y-2">
                <Label htmlFor="category_slug">Catégorie *</Label>
                <Select
                  value={formData.category_slug || undefined}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger data-testid="product-category">
                    <SelectValue placeholder="Sélectionner une catégorie..." />
                  </SelectTrigger>
                  <SelectContent>
                    {parentCategories.filter(cat => cat.slug && cat.is_active !== false).map((cat) => (
                      <SelectItem key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sous-catégorie — affichée seulement si la catégorie sélectionnée a des sous-catégories */}
              <div className="space-y-2">
                <Label htmlFor="subcategory_slug">
                  Sous-catégorie
                  {subCategories.length === 0 && formData.category_slug && (
                    <span className="text-xs text-muted-foreground ml-1">(aucune disponible)</span>
                  )}
                </Label>
                <Select
                  value={formData.subcategory_slug || 'none'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory_slug: value === 'none' ? '' : value }))}
                  disabled={subCategories.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={subCategories.length === 0 ? 'Aucune sous-catégorie' : 'Optionnel...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucune sous-catégorie —</SelectItem>
                    {subCategories.filter(s => s.is_active !== false).map((sub) => (
                      <SelectItem key={sub.slug} value={sub.slug}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition">État *</Label>
              <Select
                value={formData.condition || 'neuf'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}
              >
                <SelectTrigger data-testid="product-condition">
                  <SelectValue placeholder="Sélectionner l'état..." />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((cond) => (
                    <SelectItem key={cond.value} value={cond.value}>{cond.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-bold text-lg">Prix & Stock</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_fcfa">Prix (FCFA) *</Label>
                <Input id="price_fcfa" name="price_fcfa" type="number" value={formData.price_fcfa}
                  onChange={handleInputChange} placeholder="10000" min="100" required data-testid="product-price" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promo_price_fcfa">Prix promo (optionnel)</Label>
                <Input id="promo_price_fcfa" name="promo_price_fcfa" type="number" value={formData.promo_price_fcfa}
                  onChange={handleInputChange} placeholder="8000" min="100" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Quantité en stock *</Label>
              <Input id="stock" name="stock" type="number" value={formData.stock}
                onChange={handleInputChange} placeholder="10" min="1" required data-testid="product-stock" />
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-bold text-lg">Images *</h2>
            <ImageUpload images={formData.images} onChange={handleImagesChange}
              maxImages={5} token={token} label=""
              hint="Uploadez jusqu'à 5 images pour votre produit (JPG, PNG, WebP)" />
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-bold text-lg">Tags</h2>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
              <Input id="tags" name="tags" value={formData.tags} onChange={handleInputChange}
                placeholder="wax, tissu, mode africaine" data-testid="product-tags" />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/vendeur/produits">Annuler</Link>
            </Button>
            <Button type="submit" disabled={loading} data-testid="submit-product">
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isEditMode ? 'Mise à jour...' : 'Création...'}</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />{isEditMode ? 'Mettre à jour le produit' : 'Créer le produit'}</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorAddProduct;
