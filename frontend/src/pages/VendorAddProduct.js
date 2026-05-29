import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, Loader2, LogOut, Settings, Tag, Palette, Ruler, Footprints, Shirt, Weight, Box, Users, ChevronDown, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import ImageUpload from '../components/ImageUpload';
import { COUNTRIES, getCountryByCode, getCountryFlagUrl } from '../utils/countries';

const API = API_URL;

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
  const [customFields, setCustomFields] = useState([]);
  const [customAttributes, setCustomAttributes] = useState({});
  const [loadingFields, setLoadingFields] = useState(false);

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
    tags: '',
    origin_country_code: 'CI',
    origin_country_name: "Cote d'Ivoire",
    made_in_enabled: false
  });

  // Categories parentes (sans parent_slug)
  const parentCategories = categories.filter(c => !c.parent_slug);

  // Sous-categories de la categorie selectionnee
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
          tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
          origin_country_code: product.origin_country_code || 'CI',
          origin_country_name: product.origin_country_name || "Cote d'Ivoire",
          made_in_enabled: Boolean(product.made_in_enabled)
        });
        if (product.custom_attributes) {
          setCustomAttributes(product.custom_attributes);
        }
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

  const fetchCustomFields = useCallback(async (slug) => {
    if (!slug) { setCustomFields([]); return; }
    setLoadingFields(true);
    try {
      const response = await axios.get(`${API}/categories/${slug}/custom-fields`);
      setCustomFields(response.data.custom_fields || []);
    } catch (error) {
      console.error('Error fetching custom fields:', error);
      setCustomFields([]);
    } finally {
      setLoadingFields(false);
    }
  }, []);

  const handleCategoryChange = (value) => {
    setFormData(prev => ({ ...prev, category_slug: value, subcategory_slug: '' }));
    setCustomAttributes({});
    fetchCustomFields(value);
  };

  useEffect(() => {
    const activeSlug = formData.subcategory_slug || formData.category_slug;
    if (activeSlug) {
      fetchCustomFields(activeSlug);
    }
  }, [formData.subcategory_slug, fetchCustomFields]);

  const handleCustomAttributeChange = (key, value) => {
    setCustomAttributes(prev => ({ ...prev, [key]: value }));
  };

  const handleMultiSelectToggle = (key, optionValue) => {
    setCustomAttributes(prev => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const next = current.includes(optionValue)
        ? current.filter(v => v !== optionValue)
        : [...current, optionValue];
      return { ...prev, [key]: next };
    });
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

    const missingRequired = customFields.filter(f => f.required && !customAttributes[f.key]);
    if (missingRequired.length > 0) {
      toast.error(`Champs requis manquants : ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    setLoading(true);

    try {
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
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        origin_country_code: formData.origin_country_code,
        origin_country_name: formData.origin_country_name,
        made_in_enabled: Boolean(formData.made_in_enabled),
        custom_attributes: customAttributes,
      };

      if (isEditMode) {
        await axios.put(`${API}/vendor/products/${id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Produit modifie avec succes');
      } else {
        await axios.post(`${API}/vendor/products`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Produit cree ! En attente de validation par l'admin.");
      }
      navigate('/vendeur/produits');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la creation');
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
                {isEditMode ? 'Modifiez images, prix, stock et details du produit' : 'Votre produit sera soumis a validation avant publication'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pays d'origine *</Label>
                <Select
                  value={formData.origin_country_code}
                  onValueChange={(value) => {
                    const country = getCountryByCode(value);
                    setFormData(prev => ({
                      ...prev,
                      origin_country_code: value,
                      origin_country_name: country?.name || prev.origin_country_name
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner un pays..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <span className="inline-flex items-center gap-2">
                          <img src={getCountryFlagUrl(country.code)} alt="" className="w-4 h-3 rounded-sm object-cover" />
                          <span>{country.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Option d'affichage</Label>
                <label className="h-10 px-3 rounded-md border border-input flex items-center gap-2 text-sm bg-background">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.made_in_enabled)}
                    onChange={(e) => setFormData(prev => ({ ...prev, made_in_enabled: e.target.checked }))}
                  />
                  Afficher "Made in {formData.origin_country_name}"
                </label>
              </div>
            </div>
          </div>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Deconnexion
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Category Selection - FIRST */}
          <div className="bg-white rounded-xl border p-6 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-500" />
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm flex-shrink-0 mt-0.5">1</div>
              <div>
                <h2 className="font-bold text-lg">Catégorie du produit</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Commencez par sélectionner la catégorie et la sous-catégorie de votre produit. Les champs spécifiques (tailles, couleurs, pointures...) s'afficheront automatiquement en fonction de votre choix.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              {/* Categorie principale */}
              <div className="space-y-2">
                <Label htmlFor="category_slug">Catégorie *</Label>
                <Select
                  value={formData.category_slug || undefined}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger data-testid="product-category" className={!formData.category_slug ? 'border-blue-300 ring-1 ring-blue-100' : ''}>
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

              {/* Sous-categorie */}
              <div className="space-y-2">
                <Label htmlFor="subcategory_slug">
                  Sous-catégorie
                  {subCategories.length === 0 && formData.category_slug && (
                    <span className="text-xs text-muted-foreground ml-1">(aucune disponible)</span>
                  )}
                </Label>
                <Select
                  value={formData.subcategory_slug || 'none'}
                  onValueChange={(value) => {
                    const newSlug = value === 'none' ? '' : value;
                    setFormData(prev => ({ ...prev, subcategory_slug: newSlug }));
                    setCustomAttributes({});
                  }}
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

            {/* Dynamic Custom Fields based on category */}
            {customFields.length > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-blue-100 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-blue-100">
                  <Settings className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-sm text-slate-700">Caractéristiques du produit</h3>
                  <span className="text-xs text-slate-400 ml-auto">{customFields.filter(f => f.required).length} requis</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-sm flex items-center gap-1.5">
                        {field.label}
                        {field.required && <span className="text-red-500 text-xs">*</span>}
                      </Label>

                      {field.field_type === 'text' && (
                        <Input
                          value={customAttributes[field.key] || ''}
                          onChange={(e) => handleCustomAttributeChange(field.key, e.target.value)}
                          placeholder={field.placeholder || ''}
                          className="bg-white"
                        />
                      )}

                      {field.field_type === 'number' && (
                        <Input
                          type="number"
                          value={customAttributes[field.key] || ''}
                          onChange={(e) => handleCustomAttributeChange(field.key, e.target.value)}
                          placeholder={field.placeholder || ''}
                          className="bg-white"
                          step="any"
                        />
                      )}

                      {field.field_type === 'select' && (
                        <Select
                          value={customAttributes[field.key] || 'none'}
                          onValueChange={(value) => handleCustomAttributeChange(field.key, value === 'none' ? '' : value)}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder={field.placeholder || 'Sélectionner...'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- Aucun --</SelectItem>
                            {(field.options || []).map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {field.field_type === 'multiselect' && (
                        <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-md border min-h-[40px]">
                          {(field.options || []).map((opt) => {
                            const selected = Array.isArray(customAttributes[field.key]) && customAttributes[field.key].includes(opt.value);
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleMultiSelectToggle(field.key, opt.value)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                                  selected
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingFields && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement des champs...
              </div>
            )}

            {!formData.category_slug && (
              <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Veuillez sélectionner une catégorie pour continuer</span>
              </div>
            )}
          </div>

          {/* Step 2: Basic Info */}
          <div className="bg-white rounded-xl border p-6 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-500" />
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm flex-shrink-0">2</div>
              <h2 className="font-bold text-lg">Informations du produit</h2>
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="condition">État *</Label>
              <Select
                value={formData.condition || 'neuf'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value }))}
              >
                <SelectTrigger data-testid="product-condition">
                  <SelectValue placeholder="Selectionner l'etat..." />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((cond) => (
                    <SelectItem key={cond.value} value={cond.value}>{cond.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pays d'origine *</Label>
                <Select
                  value={formData.origin_country_code}
                  onValueChange={(value) => {
                    const country = getCountryByCode(value);
                    setFormData(prev => ({
                      ...prev,
                      origin_country_code: value,
                      origin_country_name: country?.name || prev.origin_country_name
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner un pays..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Option d'affichage</Label>
                <label className="h-10 px-3 rounded-md border border-input flex items-center gap-2 text-sm bg-background">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.made_in_enabled)}
                    onChange={(e) => setFormData(prev => ({ ...prev, made_in_enabled: e.target.checked }))}
                  />
                  Afficher "Made in {formData.origin_country_name}"
                </label>
              </div>
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
              <Label htmlFor="stock">Quantite en stock *</Label>
              <Input id="stock" name="stock" type="number" value={formData.stock}
                onChange={handleInputChange} placeholder="10" min="1" required data-testid="product-stock" />
            </div>
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-bold text-lg">Images *</h2>
            <ImageUpload images={formData.images} onChange={handleImagesChange}
              maxImages={5} token={token} label=""
              hint="Uploadez jusqu'a 5 images pour votre produit (JPG, PNG, WebP)" />
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h2 className="font-bold text-lg">Tags</h2>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (separes par des virgules)</Label>
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
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{isEditMode ? 'Mise a jour...' : 'Creation...'}</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />{isEditMode ? 'Mettre a jour le produit' : 'Creer le produit'}</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorAddProduct;

