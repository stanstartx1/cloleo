import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowRight } from 'lucide-react';

const AdSection = ({ layout = 'row-3', items = [] }) => {
  if (!items || items.length === 0) return null;

  const isRow3 = layout === 'row-3';
  const isRow5 = layout === 'row-5';

  return (
    <section className="w-full bg-white py-6">
      <div className="site-container">
        <div className={`grid gap-4 ${isRow3 ? 'grid-cols-1 md:grid-cols-3' : isRow5 ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-1 md:grid-cols-3'}`}>
          {items.map((item, index) => (
            <AdItem key={index} item={item} layout={layout} />
          ))}
        </div>
      </div>
    </section>
  );
};

const AdItem = ({ item, layout }) => {
  const isRow3 = layout === 'row-3';
  const isRow5 = layout === 'row-5';
  
  const bgColor = item.bgColor || 'bg-gradient-to-br from-slate-100 to-slate-200';
  const textColor = item.textColor || 'text-slate-800';
  const accentColor = item.accentColor || 'text-orange-600';

  return (
    <Link
      to={item.link || '#'}
      className={`group relative overflow-hidden rounded-xl ${isRow5 ? 'aspect-[4/3]' : 'aspect-[16/9]'} ${bgColor} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
    >
      {/* Background Image */}
      {item.image && (
        <img
          src={item.image}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      
      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
        {item.badge && (
          <span className="inline-block w-fit px-3 py-1 mb-2 text-xs font-bold text-white bg-orange-500 rounded-full">
            {item.badge}
          </span>
        )}
        
        {item.brand && (
          <p className="text-xs md:text-sm font-semibold text-white/90 uppercase tracking-wider mb-1">
            {item.brand}
          </p>
        )}
        
        <h3 className={`text-lg md:text-xl font-bold ${textColor} mb-2 line-clamp-2`}>
          {item.title}
        </h3>
        
        {item.subtitle && (
          <p className="text-sm text-white/80 mb-3 line-clamp-2">
            {item.subtitle}
          </p>
        )}
        
        {item.price && (
          <p className="text-lg md:text-xl font-bold text-white mb-3">
            {item.price}
          </p>
        )}
        
        {item.cta && (
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            {item.cta}
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>
      
      {/* Hover Effect */}
      <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/10 transition-colors duration-300" />
    </Link>
  );
};

export default AdSection;
