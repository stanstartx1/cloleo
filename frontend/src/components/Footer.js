import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from 'lucide-react';
import SiteLogo from './SiteLogo';

const CATEGORIES = [
  { name: 'Mode & Textile', slug: 'mode-textile' },
  { name: 'Artisanat & Décoration', slug: 'artisanat-decoration' },
  { name: 'Bijoux & Accessoires', slug: 'bijoux-accessoires' },
  { name: 'Beauté & Cosmétiques', slug: 'beaute-cosmetiques' },
];

const Footer = () => {
  return (
    <footer className="footer-pattern text-white mt-16 relative overflow-hidden" data-testid="footer">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>
      
      <div className="site-container py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <SiteLogo imageClassName="h-16" className="transition-transform duration-300 hover:scale-105" />
            </div>
            <p className="text-gray-400 text-sm mb-4">
              La première marketplace africaine pour découvrir et acheter des produits authentiques de qualité.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-gray-400 hover:text-orange-500 transition-all duration-300 hover:scale-125 hover:-translate-y-1">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-pink-500 transition-all duration-300 hover:scale-125 hover:-translate-y-1">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-400 transition-all duration-300 hover:scale-125 hover:-translate-y-1">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold mb-4">Catégories</h4>
            <ul className="space-y-2">
              {CATEGORIES.map((cat, index) => (
                <li key={cat.slug} style={{ animationDelay: `${index * 0.1}s` }}>
                  <Link 
                    to={`/categories/${cat.slug}`}
                    className="text-gray-400 hover:text-white transition-all duration-300 text-sm hover:translate-x-2 inline-block hover-underline"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link 
                  to="/categories"
                  className="text-orange-500 hover:text-orange-400 transition-all duration-300 text-sm font-medium hover:translate-x-2 inline-flex items-center gap-1 group"
                >
                  Voir toutes 
                  <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Aide */}
          <div>
            <h4 className="font-semibold mb-4">Aide & Support</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link to="/aide" className="hover:text-white transition-colors">Centre d'aide</Link></li>
              <li><Link to="/livraison" className="hover:text-white transition-colors">Livraison</Link></li>
              <li><Link to="/retours" className="hover:text-white transition-colors">Retours & Remboursements</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Nous contacter</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                Abidjan, Côte d'Ivoire
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-500" />
                +225 07 00 00 00
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-orange-500" />
                contact@cloleo.com
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © 2025 Cloléo. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link to="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
            <Link to="/conditions" className="hover:text-white transition-colors">CGV</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
