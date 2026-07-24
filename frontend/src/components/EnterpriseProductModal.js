import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { toAbsoluteMediaUrl } from '../utils/media';
import { COUNTRIES } from '../utils/countries';
import { API_URL } from '../config/api';
import { X, Plus, Save, Loader2 } from 'lucide-react';

const API = API_URL;

const EnterpriseProductModal = ({ isOpen, onClose, onSubmit, product, categories, token }) => {
  const [formData, setFormData] = useState({
    name: '',
    short_description: '',
    description: '',
    price_fcfa: '',
    promo_price_fcfa: '',
    wholesale_enabled: false,
    wholesale_min_quantity: '',
    wholesale_unit_price_fcfa: '',
    stock: '',
    condition: 'neuf',
    category_slug: '',
    subcategory_slug: '',
    images: [],
    tags: '',
    origin_country_code: 'CI',
    origin_country_name: "Cote d'Ivoire",
    made_in_enabled: false,
    brand: '',
    model: '',
    sku: '',
    ean: '',
    weight: '',
    dimensions: '',
    warranty: '',
    video_url: '',
    specifications: '',
    certifications: '',
    documentation: '',
    faq: ''
  });
  const [customFields, setCustomFields] = useState([]);
  const [customAttributes, setCustomAttributes] = useState({});
  const [loadingFields, setLoadingFields] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const parentCategories = categories.filter(c => !c.parent_slug);
  const subCategories = categories.filter(
    c => c.parent_slug && c.parent_slug === formData.category_slug
  );

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        short_description: product.short_description || '',
        description: product.description,
        price_fcfa: product.price_fcfa,
        promo_price_fcfa: product.promo_price_fcfa || '',
        wholesale_enabled: Boolean(product.wholesale_enabled),
        wholesale_min_quantity: product.wholesale_min_quantity || '',
        wholesale_unit_price_fcfa: product.wholesale_unit_price_fcfa || '',
        stock: product.stock,
        condition: product.condition,
        category_slug: product.category_slug,
        subcategory_slug: product.subcategory_slug || '',
        images: product.images || [],
        tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
        origin_country_code: product.origin_country_code || 'CI',
        origin_country_name: product.origin_country_name || "Cote d'Ivoire",
        made_in_enabled: Boolean(product.made_in_enabled),
        brand: product.brand || '',
        model: product.model || '',
        sku: product.sku || '',
        ean: product.ean || '',
        weight: product.weight || '',
        dimensions: product.dimensions || '',
        warranty: product.warranty || '',
        video_url: product.video_url || '',
        specifications: product.specifications || '',
        certifications: product.certifications || '',
        documentation: product.documentation || '',
        faq: product.faq || ''
      });
      if (product.custom_attributes) {
        setCustomAttributes(product.custom_attributes);
      }
    }
  }, [product]);

  const fetchCustomFields = async (slug) => {
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
  };

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
  }, [formData.subcategory_slug]);

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

  const handleImageUpload = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setFormData(prev => ({ 
        ...prev, 
        images: [...prev.images, response.data.url] 
      }));
      toast.success('Image uploadée avec succès');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.description || !formData.price_fcfa || !formData.stock || !formData.category_slug) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.images.length === 0) {
      toast.error('Ajoutez au moins une image');
      return;
    }

    if (formData.wholesale_enabled && (Number(formData.wholesale_min_quantity) < 2 || Number(formData.wholesale_unit_price_fcfa) <= 0)) {
      toast.error('Indiquez une quantité minimum de 2 et un prix unitaire de gros');
      return;
    }

    const missingRequired = customFields.filter(f => f.required && !customAttributes[f.key]);
    if (missingRequired.length > 0) {
      toast.error(`Champs requis manquants : ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const finalCategorySlug = formData.subcategory_slug || formData.category_slug;

      const data = {
        name: formData.name,
        short_description: formData.short_description,
        description: formData.description,
        price_fcfa: parseInt(formData.price_fcfa),
        promo_price_fcfa: formData.promo_price_fcfa ? parseInt(formData.promo_price_fcfa) : null,
        wholesale_enabled: Boolean(formData.wholesale_enabled),
        wholesale_min_quantity: formData.wholesale_enabled ? parseInt(formData.wholesale_min_quantity) : null,
        wholesale_unit_price_fcfa: formData.wholesale_enabled ? parseInt(formData.wholesale_unit_price_fcfa) : null,
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
        brand: formData.brand,
        model: formData.model,
        sku: formData.sku,
        ean: formData.ean,
        weight: formData.weight,
        dimensions: formData.dimensions,
        warranty: formData.warranty,
        video_url: formData.video_url,
        specifications: formData.specifications,
        certifications: formData.certifications,
        documentation: formData.documentation,
        faq: formData.faq
      };

      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting product:', error);
      toast.error('Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 my-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-slate-900 pb-4 border-b border-slate-700">
          <h4 className="font-bold text-xl text-white">{product ? 'Modifier le produit' : 'Ajouter un produit'}</h4>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800/50">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="space-y-6">
          {/* Category */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h5 className="font-semibold text-white mb-3">Catégorie</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Catégorie *</label>
                <select
                  value={formData.category_slug || ''}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Sélectionner...</option>
                  {parentCategories.filter(cat => cat.slug && cat.is_active !== false).map((cat) => (
                    <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Sous-catégorie</label>
                <select
                  value={formData.subcategory_slug || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, subcategory_slug: e.target.value }))}
                  disabled={subCategories.length === 0}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Aucune</option>
                  {subCategories.filter(s => s.is_active !== false).map((sub) => (
                    <option key={sub.slug} value={sub.slug}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {customFields.length > 0 && (
              <div className="mt-4 p-4 rounded-lg bg-slate-900/50 border border-slate-700/50 space-y-3">
                <p className="text-sm font-medium text-slate-300">Caractéristiques</p>
                <div className="grid grid-cols-2 gap-3">
                  {customFields.map((field) => (
                    <div key={field.key}>
                      <label className="text-xs text-slate-400 mb-1 block">
                        {field.label} {field.required && <span className="text-red-400">*</span>}
                      </label>
                      {field.field_type === 'text' && (
                        <Input
                          value={customAttributes[field.key] || ''}
                          onChange={(e) => handleCustomAttributeChange(field.key, e.target.value)}
                          className="bg-slate-800/50 border-slate-700 text-white text-sm"
                        />
                      )}
                      {field.field_type === 'number' && (
                        <Input
                          type="number"
                          value={customAttributes[field.key] || ''}
                          onChange={(e) => handleCustomAttributeChange(field.key, e.target.value)}
                          className="bg-slate-800/50 border-slate-700 text-white text-sm"
                        />
                      )}
                      {field.field_type === 'select' && (
                        <select
                          value={customAttributes[field.key] || ''}
                          onChange={(e) => handleCustomAttributeChange(field.key, e.target.value)}
                          className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-white text-sm"
                        >
                          <option value="">Sélectionner...</option>
                          {(field.options || []).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      )}
                      {field.field_type === 'multiselect' && (
                        <div className="flex flex-wrap gap-1">
                          {(field.options || []).map((opt) => {
                            const selected = Array.isArray(customAttributes[field.key]) && customAttributes[field.key].includes(opt.value);
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleMultiSelectToggle(field.key, opt.value)}
                                className={`px-2 py-1 rounded text-xs ${
                                  selected ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'
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
          </div>

          {/* Basic Info */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h5 className="font-semibold text-white mb-3">Informations de base</h5>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Nom du produit *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: iPhone 15 Pro Max"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Description courte</label>
                <Input
                  value={formData.short_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, short_description: e.target.value }))}
                  placeholder="Brève description pour les listes"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Description détaillée *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description complète du produit..."
                  rows={5}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">État *</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="neuf">Neuf</option>
                  <option value="quasi-neuf">Quasi-neuf</option>
                  <option value="occasion">Occasion</option>
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h5 className="font-semibold text-white mb-3">Prix & Stock</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Prix (FCFA) *</label>
                <Input
                  type="number"
                  value={formData.price_fcfa}
                  onChange={(e) => setFormData(prev => ({ ...prev, price_fcfa: e.target.value }))}
                  placeholder="500000"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Prix promo (optionnel)</label>
                <Input
                  type="number"
                  value={formData.promo_price_fcfa}
                  onChange={(e) => setFormData(prev => ({ ...prev, promo_price_fcfa: e.target.value }))}
                  placeholder="450000"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Stock *</label>
                <Input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                  placeholder="10"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <label className="flex items-center gap-2 text-sm text-amber-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.wholesale_enabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, wholesale_enabled: e.target.checked }))}
                />
                Activer la vente en gros
              </label>
              {formData.wholesale_enabled && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Quantité min</label>
                    <Input
                      type="number"
                      value={formData.wholesale_min_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, wholesale_min_quantity: e.target.value }))}
                      placeholder="10"
                      className="bg-slate-900/50 border-slate-700 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Prix unitaire gros</label>
                    <Input
                      type="number"
                      value={formData.wholesale_unit_price_fcfa}
                      onChange={(e) => setFormData(prev => ({ ...prev, wholesale_unit_price_fcfa: e.target.value }))}
                      placeholder="450000"
                      className="bg-slate-900/50 border-slate-700 text-white text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enterprise-specific fields */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h5 className="font-semibold text-white mb-3">Informations entreprise</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Marque</label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="Apple, Samsung..."
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Modèle</label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="iPhone 15 Pro Max"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">SKU / Code produit</label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="SKU-001"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">EAN / ISBN</label>
                <Input
                  value={formData.ean}
                  onChange={(e) => setFormData(prev => ({ ...prev, ean: e.target.value }))}
                  placeholder="1234567890123"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Poids (kg)</label>
                <Input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="0.5"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Dimensions (LxHxP cm)</label>
                <Input
                  value={formData.dimensions}
                  onChange={(e) => setFormData(prev => ({ ...prev, dimensions: e.target.value }))}
                  placeholder="15x7x0.8"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Garantie</label>
                <Input
                  value={formData.warranty}
                  onChange={(e) => setFormData(prev => ({ ...prev, warranty: e.target.value }))}
                  placeholder="2 ans"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Vidéo (URL)</label>
                <Input
                  value={formData.video_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm text-slate-300 mb-1 block">Spécifications techniques</label>
              <textarea
                value={formData.specifications}
                onChange={(e) => setFormData(prev => ({ ...prev, specifications: e.target.value }))}
                placeholder="Liste des spécifications techniques..."
                rows={3}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none text-sm"
              />
            </div>
            <div className="mt-4">
              <label className="text-sm text-slate-300 mb-1 block">Certifications</label>
              <textarea
                value={formData.certifications}
                onChange={(e) => setFormData(prev => ({ ...prev, certifications: e.target.value }))}
                placeholder="ISO, CE, etc."
                rows={2}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none text-sm"
              />
            </div>
            <div className="mt-4">
              <label className="text-sm text-slate-300 mb-1 block">Documentation</label>
              <textarea
                value={formData.documentation}
                onChange={(e) => setFormData(prev => ({ ...prev, documentation: e.target.value }))}
                placeholder="Liens vers la documentation technique..."
                rows={2}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none text-sm"
              />
            </div>
            <div className="mt-4">
              <label className="text-sm text-slate-300 mb-1 block">FAQ produit</label>
              <textarea
                value={formData.faq}
                onChange={(e) => setFormData(prev => ({ ...prev, faq: e.target.value }))}
                placeholder="Questions fréquentes sur le produit..."
                rows={3}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none text-sm"
              />
            </div>
          </div>

          {/* Origin */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h5 className="font-semibold text-white mb-3">Origine</h5>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Pays d'origine *</label>
                <select
                  value={formData.origin_country_code}
                  onChange={(e) => {
                    const country = COUNTRIES.find(c => c.code === e.target.value);
                    setFormData({
                      ...formData,
                      origin_country_code: e.target.value,
                      origin_country_name: country?.name || formData.origin_country_name
                    });
                  }}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-white focus:border-amber-500 focus:outline-none"
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.made_in_enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, made_in_enabled: e.target.checked }))}
                  />
                  Afficher "Made in {formData.origin_country_name}"
                </label>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h5 className="font-semibold text-white mb-3">Images (jusqu'à 10)</h5>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden">
                    <img src={toAbsoluteMediaUrl(img)} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {formData.images.length < 10 && (
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-amber-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files[0] && handleImageUpload(e.target.files[0])}
                      className="hidden"
                    />
                    <Plus className="w-6 h-6 text-slate-400" />
                  </label>
                )}
              </div>
              <p className="text-xs text-slate-400">JPG, PNG, WebP. Max 5MB par image</p>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h5 className="font-semibold text-white mb-3">Tags</h5>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
              placeholder="wax, tissu, mode africaine (séparés par des virgules)"
              className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300 hover:bg-slate-700/50">
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || uploading} className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {product ? 'Mettre à jour' : 'Créer le produit'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseProductModal;
