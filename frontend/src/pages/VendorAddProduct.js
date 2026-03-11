import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Upload, Plus, X, Image as ImageIcon, Save, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CONDITIONS = [
  { value: 'neuf', label: 'Neuf' },
  { value: 'quasi-neuf', label: 'Quasi-neuf' },
  { value: 'occasion', label: 'Occasion' },
];

const VendorAddProduct = () => {
  const navigate = useNavigate();
  const { token, isVendor } = useAuth();
  
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
    images: [],
    tags: ''
  });

  useEffect(() => {
    if (!isVendor) {
      navigate('/connexion');
      return;
    }
    fetchCategories();
  }, [isVendor, navigate]);

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

  const handleImageAdd = () => {
    const url = prompt('URL de l\'image:');
    if (url) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, url]
      }));
    }
  };

  const handleImageRemove = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
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
      const data = {
        name: formData.name,
        description: formData.description,
        price_fcfa: parseInt(formData.price_fcfa),
        promo_price_fcfa: formData.promo_price_fcfa ? parseInt(formData.promo_price_fcfa) : null,
        stock: parseInt(formData.stock),
        condition: formData.condition,
        category_slug: formData.category_slug,
        images: formData.images,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      await axios.post(`${API}/vendor/products`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Produit créé ! En attente de validation par l\'admin.');
      navigate('/vendeur/produits');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 bg-muted/30" data-testid="add-product-page">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button asChild variant="ghost" size="icon">
            <Link to="/vendeur/produits">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ajouter un produit</h1>
            <p className="text-muted-foreground">
              Votre produit sera soumis à validation avant publication
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-bold text-lg">Informations générales</h2>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Tissu Wax Hollandais 6 yards"
                required
                data-testid="product-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Décrivez votre produit en détail..."
                rows={5}
                required
                data-testid="product-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category_slug">Catégorie *</Label>
                <Select
                  value={formData.category_slug}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_slug: value }))}
                >
                  <SelectTrigger data-testid="product-category">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.slug} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">État *</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}
                >
                  <SelectTrigger data-testid="product-condition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((cond) => (
                      <SelectItem key={cond.value} value={cond.value}>
                        {cond.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-bold text-lg">Prix & Stock</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_fcfa">Prix (FCFA) *</Label>
                <Input
                  id="price_fcfa"
                  name="price_fcfa"
                  type="number"
                  value={formData.price_fcfa}
                  onChange={handleInputChange}
                  placeholder="10000"
                  min="100"
                  required
                  data-testid="product-price"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="promo_price_fcfa">Prix promo (optionnel)</Label>
                <Input
                  id="promo_price_fcfa"
                  name="promo_price_fcfa"
                  type="number"
                  value={formData.promo_price_fcfa}
                  onChange={handleInputChange}
                  placeholder="8000"
                  min="100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Quantité en stock *</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                value={formData.stock}
                onChange={handleInputChange}
                placeholder="10"
                min="1"
                required
                data-testid="product-stock"
              />
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-bold text-lg">Images *</h2>
            <p className="text-sm text-muted-foreground">
              Ajoutez des URLs d'images pour votre produit (minimum 1)
            </p>
            
            <div className="grid grid-cols-4 gap-4">
              {formData.images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img src={img} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleImageRemove(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {formData.images.length < 5 && (
                <button
                  type="button"
                  onClick={handleImageAdd}
                  className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  data-testid="add-image-btn"
                >
                  <ImageIcon className="w-8 h-8 mb-2" />
                  <span className="text-xs">Ajouter</span>
                </button>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Astuce: Utilisez des images Unsplash (ex: https://images.unsplash.com/...)
            </p>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-bold text-lg">Tags</h2>
            
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
              <Input
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="wax, tissu, mode africaine"
                data-testid="product-tags"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/vendeur/produits">Annuler</Link>
            </Button>
            <Button type="submit" disabled={loading} data-testid="submit-product">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Création...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Créer le produit
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorAddProduct;
