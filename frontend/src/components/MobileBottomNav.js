import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid3X3, ShoppingCart, User, LayoutDashboard, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const MobileBottomNav = () => {
  const location = useLocation();
  const { cart } = useCart();
  const { isAuthenticated, isAdmin, isVendor, isDropshipper, isDriver } = useAuth();

  // Ne pas afficher sur la page de connexion
  const inAuthPage = location.pathname === '/connexion';
  if (inAuthPage) return null;

  // Déterminer le chemin du dashboard selon le rôle
  const dashboardPath = isAdmin
    ? '/admin'
    : isVendor
      ? '/vendeur'
      : isDropshipper
        ? '/revendeur'
        : isDriver
          ? '/livreur'
          : null;

  const items = [
    { to: '/', label: 'Accueil', icon: Home },
    dashboardPath
      ? { to: dashboardPath, label: 'Dashboard', icon: LayoutDashboard }
      : { to: '/categories', label: 'Catégories', icon: Grid3X3 },
    { to: '/panier', label: 'Panier', icon: ShoppingCart, badge: cart?.item_count || 0 },
    { to: '/favoris', label: 'Favoris', icon: Heart },
    { to: isAuthenticated ? '/parametres' : '/connexion', label: 'Profil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-100 bg-white/95 backdrop-blur-md lg:hidden shadow-lg">
      <div className="mx-auto max-w-xl px-2 pt-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <ul className="grid grid-cols-5 gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`relative flex flex-col items-center justify-center rounded-xl py-1.5 transition-all duration-200 ${
                    isActive 
                      ? 'text-orange-600 bg-orange-50 scale-95' 
                      : 'text-slate-500 hover:text-orange-500 hover:bg-orange-50/50'
                  }`}
                >
                  <span className="relative">
                    <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                    {item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] leading-none flex items-center justify-center font-bold shadow-md">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </span>
                  <span className={`mt-1 text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                    {item.label}
        </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default MobileBottomNav;