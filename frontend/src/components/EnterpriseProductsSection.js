import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Building2, Briefcase, ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard';
import { API_URL } from '../config/api';

const API = API_URL;

const EnterpriseProductsSection = () => {
  const [products, setProducts] = useState([]);
  const [enterprises, setEnterprises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch enterprises
        const enterprisesRes = await axios.get(`${API}/enterprises/list`);
        const enterprisesList = Array.isArray(enterprisesRes.data?.enterprises) 
          ? enterprisesRes.data.enterprises 
          : [];

        // Fetch all products
        const productsRes = await axios.get(`${API}/products?limit=100`);
        const allProducts = Array.isArray(productsRes.data) 
          ? productsRes.data 
          : (productsRes.data?.products || []);

        // Filter products from enterprises
        const enterpriseProductIds = new Set(enterprisesList.map(e => e.id));
        const enterpriseProducts = allProducts.filter(p => 
          p.seller_id && enterpriseProductIds.has(p.seller_id)
        );

        setEnterprises(enterprisesList);
        setProducts(enterpriseProducts);
      } catch (error) {
        console.error('Error fetching enterprise products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50">
        <div className="site-container py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Produits Entreprises</h2>
              <p className="text-sm text-gray-600">Nos partenaires entreprises</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-2 rounded-xl shadow-sm">
                <div className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
                <div className="mt-2 h-3 bg-gray-100 rounded w-3/4" />
                <div className="mt-1 h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-cyan-200/30 to-emerald-200/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="site-container py-8 relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Produits Entreprises
                <Briefcase className="w-5 h-5 text-emerald-500" />
              </h2>
              <p className="text-sm text-gray-600">
                {enterprises.length} entreprises partenaires • {products.length} produits
              </p>
            </div>
          </div>
          <Link 
            to="/search?enterprise=true" 
            className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow text-sm font-medium text-emerald-600"
          >
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {products.slice(0, 12).map(product => (
            <div key={product.id} className="relative">
              <ProductCard product={product} className="scale-[0.94]" />
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                <Building2 className="w-4 h-4 text-white" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link 
            to="/search?enterprise=true" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm text-sm font-medium text-emerald-600"
          >
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseProductsSection;
