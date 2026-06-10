import React from 'react';
import { Link } from 'react-router-dom';

const AdBannerGrid = () => {
  const banners = [
    {
      id: 1,
      title: 'Promo Été',
      subtitle: '-30%',
      image: 'https://placehold.co/400x250/orange/white?text=Promo+Été',
      link: '/produits?promo=true',
      bgColor: 'from-orange-500 to-red-500'
    },
    {
      id: 2,
      title: 'Nouveautés',
      subtitle: 'Tendances',
      image: 'https://placehold.co/400x250/blue/white?text=Nouveautés',
      link: '/produits?sort_by=created_at',
      bgColor: 'from-blue-500 to-cyan-500'
    },
    {
      id: 3,
      title: 'Livraison',
      subtitle: 'Gratuite',
      image: 'https://placehold.co/400x250/green/white?text=Livraison',
      link: '/produits',
      bgColor: 'from-green-500 to-emerald-500'
    },
    {
      id: 4,
      title: 'Vendez',
      subtitle: 'avec nous',
      image: 'https://placehold.co/400x250/purple/white?text=Vendez',
      link: '/devenir-revendeur',
      bgColor: 'from-purple-500 to-pink-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {banners.map((banner) => (
        <Link
          key={banner.id}
          to={banner.link}
          className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
        >
          <div className="relative h-32 md:h-36 lg:h-40">
            <img 
              src={banner.image} 
              alt={banner.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className={`absolute inset-0 bg-gradient-to-t ${banner.bgColor} opacity-75`} />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
              <h3 className="text-sm md:text-base font-black">{banner.title}</h3>
              <p className="text-xs opacity-90">{banner.subtitle}</p>
              <span className="inline-block mt-1 text-[10px] font-bold bg-white/20 rounded-full px-2 py-0.5 backdrop-blur-sm">
                →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default AdBannerGrid;