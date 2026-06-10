import React from 'react';
import { Link } from 'react-router-dom';

const AdBannerGrid = () => {
  // Bannières publicitaires - Remplace les images par tes vraies images
  const banners = [
    {
      id: 1,
      title: 'Promo Été',
      subtitle: '-30% sur une sélection',
      image: 'https://placehold.co/600x400/orange/white?text=Promo+Été',
      link: '/produits?promo=true',
      bgColor: 'from-orange-500 to-red-500'
    },
    {
      id: 2,
      title: 'Nouveautés',
      subtitle: 'Découvrez les tendances',
      image: 'https://placehold.co/600x400/blue/white?text=Nouveautés',
      link: '/produits?sort_by=created_at',
      bgColor: 'from-blue-500 to-cyan-500'
    },
    {
      id: 3,
      title: 'Livraison Gratuite',
      subtitle: 'Dès 50 000 FCFA',
      image: 'https://placehold.co/600x400/green/white?text=Livraison+Gratuite',
      link: '/produits',
      bgColor: 'from-green-500 to-emerald-500'
    },
    {
      id: 4,
      title: 'Vendez avec nous',
      subtitle: 'Devenez vendeur',
      image: 'https://placehold.co/600x400/purple/white?text=Vendez+avec+nous',
      link: '/devenir-revendeur',
      bgColor: 'from-purple-500 to-pink-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {banners.map((banner) => (
        <Link
          key={banner.id}
          to={banner.link}
          className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="relative h-48 md:h-56">
            <img 
              src={banner.image} 
              alt={banner.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${banner.bgColor} opacity-80`} />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
              <h3 className="text-lg md:text-xl font-black">{banner.title}</h3>
              <p className="text-xs md:text-sm opacity-90">{banner.subtitle}</p>
              <span className="inline-block mt-2 text-xs font-bold bg-white/20 rounded-full px-3 py-1 backdrop-blur-sm">
                J'en profite →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default AdBannerGrid;