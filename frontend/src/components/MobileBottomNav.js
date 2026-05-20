import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid3X3, ShoppingCart, User, LayoutDashboard, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const MobileBottomNav = () => {
  const location = useLocation();
  const { cart } = useCart();
  const { isAuthenticated, isAdmin, isVendor, isDropshipper, isDriver } = useAuth();

  const inAuthPage = location.pathname === '/connexion';
  if (inAuthPage) return null;

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
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-white/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto max-w-xl px-2 pb-[max(0.3rem,env(safe-area-inset-bottom))] pt-1">
        <ul className="grid grid-cols-5 gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`relative flex flex-col items-center justify-center rounded-xl py-2 text-[11px] transition-colors ${
                    isActive ? 'text-orange-600 bg-orange-50' : 'text-muted-foreground'
                  }`}
                >
                  <span className="relative">
                    <Icon className="w-5 h-5" />
                    {item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-orange-500 text-white text-[10px] leading-none flex items-center justify-center font-bold">
                        {item.badge}
                      </span>
                    )}
                  </span>
                  <span className="mt-1">{item.label}</span>
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
