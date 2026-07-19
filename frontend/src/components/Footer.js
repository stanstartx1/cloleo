import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Heart, ArrowRight, Store, Shield, Truck } from 'lucide-react';
import SiteLogo from './SiteLogo';

const CATEGORIES = [
  { name: 'Mode & Textile', slug: 'mode-textile' },
  { name: 'Artisanat & Décoration', slug: 'artisanat-decoration' },
  { name: 'Bijoux & Accessoires', slug: 'bijoux-accessoires' },
  { name: 'Beauté & Cosmétiques', slug: 'beaute-cosmetiques' },
];

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-white mt-16 relative overflow-hidden" data-testid="footer">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-orange-500/5 to-amber-500/5 rounded-full blur-3xl" />
      </div>
      
      <div className="site-container py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Section */}
          <div className="space-y-6">
            <div>
              <SiteLogo imageClassName="h-16" className="transition-transform duration-300 hover:scale-105" />
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              La première marketplace africaine pour découvrir et acheter des produits authentiques de qualité. Connectez-vous avec des vendeurs locaux et soutenez l'économie africaine.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="group relative w-10 h-10 bg-white/5 hover:bg-orange-500 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-orange-500/30">
                <Facebook className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </a>
              <a href="#" className="group relative w-10 h-10 bg-white/5 hover:bg-pink-500 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-pink-500/30">
                <Instagram className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </a>
              <a href="#" className="group relative w-10 h-10 bg-white/5 hover:bg-blue-400 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-blue-400/30">
                <Twitter className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </a>
            </div>
          </div>

          {/* Categories Section */}
          <div>
            <h4 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <span className="w-8 h-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"></span>
              Catégories
            </h4>
            <ul className="space-y-3">
              {CATEGORIES.map((cat, index) => (
                <li key={cat.slug}>
                  <Link 
                    to={`/categories/${cat.slug}`}
                    className="text-gray-400 hover:text-orange-400 transition-all duration-300 text-sm hover:translate-x-2 inline-flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 bg-gray-600 group-hover:bg-orange-400 rounded-full transition-colors"></span>
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link 
                  to="/categories"
                  className="text-orange-400 hover:text-orange-300 transition-all duration-300 text-sm font-medium hover:translate-x-2 inline-flex items-center gap-2 group"
                >
                  Voir toutes 
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links Section */}
          <div>
            <h4 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <span className="w-8 h-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"></span>
              Liens utiles
            </h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>
                <Link to="/devenir-vendeur" className="hover:text-orange-400 transition-colors inline-flex items-center gap-2 group">
                  <Store className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Devenir vendeur
                </Link>
              </li>
              <li>
                <Link to="/aide" className="hover:text-orange-400 transition-colors inline-flex items-center gap-2 group">
                  <Shield className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Centre d'aide
                </Link>
              </li>
              <li>
                <Link to="/livraison" className="hover:text-orange-400 transition-colors inline-flex items-center gap-2 group">
                  <Truck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Livraison
                </Link>
              </li>
              <li>
                <Link to="/retours" className="hover:text-orange-400 transition-colors">
                  Retours & Remboursements
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-orange-400 transition-colors">
                  Nous contacter
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <span className="w-8 h-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"></span>
              Contact
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/20">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-300 font-medium">Adresse</p>
                  <p className="text-sm text-gray-400">Abidjan, Côte d'Ivoire</p>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/20">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-300 font-medium">Téléphone</p>
                  <p className="text-sm text-gray-400">+225 07 87 41 30 01</p>
                </div>
              </li>
              <li className="flex items-start gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/20">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-300 font-medium">Email</p>
                  <p className="text-sm text-gray-400">contact@cloleo.com</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-gray-500 flex items-center gap-2">
              © 2025 Cloléo. Tous droits réservés.
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline-flex items-center gap-1">
                Fait avec <Heart className="w-4 h-4 text-orange-500 fill-orange-500" /> en Côte d'Ivoire
              </span>
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link to="/confidentialite" className="hover:text-orange-400 transition-colors">Confidentialité</Link>
              <Link to="/conditions" className="hover:text-orange-400 transition-colors">CGV</Link>
              <Link to="/mentions" className="hover:text-orange-400 transition-colors">Mentions légales</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
