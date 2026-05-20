import React from 'react';
import { Star, Truck, Shield, Sparkles, Zap, Heart, Award, Clock, Gift, BadgeCheck, ThumbsUp, TrendingUp } from 'lucide-react';

// Horizontal scrolling banner
export const ScrollingBanner = ({ 
  items, 
  speed = 30, 
  direction = 'left',
  className = '',
  pauseOnHover = true,
  bgColor = 'bg-primary',
  textColor = 'text-primary-foreground'
}) => {
  const animationClass = direction === 'left' ? 'animate-scroll-left' : 'animate-scroll-right';
  const animationStyle = { animationDuration: `${speed}s` };
  
  return (
    <div className={`overflow-hidden touch-scroll-x ${bgColor} ${className} ${pauseOnHover ? 'scroll-container' : ''}`}>
      <div className={`flex whitespace-nowrap ${animationClass}`} style={animationStyle}>
        {/* Duplicate content for seamless loop */}
        {[...items, ...items].map((item, index) => (
          <div 
            key={index} 
            className={`inline-flex items-center gap-2 px-6 py-3 ${textColor}`}
          >
            {item.icon && <item.icon className="w-4 h-4" />}
            <span className="font-medium">{item.text}</span>
            <span className="mx-4 opacity-30">•</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Pre-configured promo banner
export const PromoBanner = () => {
  const promoItems = [
    { icon: Truck, text: 'Livraison gratuite dès 50,000 FCFA' },
    { icon: Shield, text: 'Paiement 100% sécurisé' },
    { icon: Sparkles, text: 'Produits authentiques garantis' },
    { icon: Clock, text: 'Livraison en 2-5 jours' },
    { icon: Gift, text: 'Offres exclusives chaque jour' },
    { icon: Award, text: '+1000 vendeurs vérifiés' },
  ];

  return (
    <ScrollingBanner 
      items={promoItems} 
      speed={40}
      bgColor="bg-gradient-to-r from-orange-500 to-amber-500"
      textColor="text-white"
      className="py-2"
    />
  );
};

// Trust badges banner
export const TrustBanner = () => {
  const trustItems = [
    { icon: BadgeCheck, text: 'Vendeurs vérifiés' },
    { icon: ThumbsUp, text: '+10,000 clients satisfaits' },
    { icon: Star, text: '4.8/5 note moyenne' },
    { icon: Shield, text: 'Garantie acheteur' },
    { icon: TrendingUp, text: 'Meilleurs prix du marché' },
  ];

  return (
    <ScrollingBanner 
      items={trustItems} 
      speed={35}
      direction="right"
      bgColor="bg-slate-900"
      textColor="text-white"
      className="py-2"
    />
  );
};

// Category pills scrolling
export const CategoryScrollBanner = ({ categories }) => {
  return (
    <div className="overflow-hidden touch-scroll-x scroll-container py-4">
      <div className="flex whitespace-nowrap animate-scroll-left" style={{ animationDuration: '50s' }}>
        {[...categories, ...categories].map((cat, index) => (
          <a
            key={index}
            href={`/categorie/${cat.slug}`}
            className="inline-flex items-center gap-2 px-4 py-2 mx-2 bg-white rounded-full shadow-md hover:shadow-lg transition-shadow border border-gray-100"
          >
            <span className="text-2xl">{cat.icon || '📦'}</span>
            <span className="font-medium text-gray-800">{cat.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
};

// Brands/partners scrolling banner
export const BrandsBanner = ({ brands }) => {
  return (
    <div className="overflow-hidden touch-scroll-x bg-gray-50 py-8">
      <div className="flex items-center whitespace-nowrap animate-scroll-left" style={{ animationDuration: '40s' }}>
        {[...brands, ...brands].map((brand, index) => (
          <div key={index} className="mx-8 grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100">
            <img 
              src={brand.logo} 
              alt={brand.name} 
              className="h-12 object-contain"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// Testimonials scrolling
export const TestimonialsBanner = ({ testimonials }) => {
  return (
    <div className="overflow-hidden touch-scroll-x py-8 scroll-container">
      <div className="flex whitespace-nowrap animate-scroll-left" style={{ animationDuration: '60s' }}>
        {[...testimonials, ...testimonials].map((testimonial, index) => (
          <div 
            key={index} 
            className="inline-block mx-4 p-6 bg-white rounded-2xl shadow-lg min-w-[300px] max-w-[350px] whitespace-normal"
          >
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-4 h-4 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                />
              ))}
            </div>
            <p className="text-gray-700 mb-4 line-clamp-3">"{testimonial.comment}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold">
                {testimonial.name[0]}
              </div>
              <div>
                <p className="font-medium text-gray-900">{testimonial.name}</p>
                <p className="text-sm text-gray-500">{testimonial.location}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Stats counter banner
export const StatsBanner = ({ stats }) => {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="text-center animate-bounce-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex justify-center mb-2">
                {stat.icon && <stat.icon className="w-8 h-8 text-orange-400" />}
              </div>
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Vertical scrolling notification feed
export const NotificationFeed = ({ notifications }) => {
  return (
    <div className="overflow-hidden h-[60px] bg-gradient-to-r from-green-50 to-emerald-50 border-y border-green-100">
      <div className="flex flex-col animate-scroll-up" style={{ animationDuration: '15s' }}>
        {[...notifications, ...notifications].map((notif, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-800">
              <strong>{notif.user}</strong> {notif.action} <strong>{notif.product}</strong>
            </span>
            <span className="text-green-600 text-xs">{notif.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Floating action badges
export const FloatingBadges = () => {
  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-3">
      <div className="animate-float-slow">
        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform cursor-pointer">
          <Heart className="w-5 h-5" />
        </div>
      </div>
      <div className="animate-float-rotate" style={{ animationDelay: '1s' }}>
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform cursor-pointer">
          <Zap className="w-5 h-5" />
        </div>
      </div>
      <div className="animate-float-fast" style={{ animationDelay: '2s' }}>
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform cursor-pointer">
          <Sparkles className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default {
  ScrollingBanner,
  PromoBanner,
  TrustBanner,
  CategoryScrollBanner,
  BrandsBanner,
  TestimonialsBanner,
  StatsBanner,
  NotificationFeed,
  FloatingBadges
};
