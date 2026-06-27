import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowRight } from 'lucide-react';

const AdSection = ({ layout = 'row-3', items = [] }) => {
  if (!items || items.length === 0) return null;

  const isRow3 = layout === 'row-3';
  const isRow5 = layout === 'row-5';

  return (
    <section className="w-full bg-white py-3">
      <div className="site-container">
        <div className={`grid gap-3 ${isRow3 ? 'grid-cols-1 md:grid-cols-3' : isRow5 ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-1 md:grid-cols-3'}`}>
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
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/30" />
      
      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-3 md:p-4">
        {item.badge && (
          <span className="inline-block w-fit px-2 py-0.5 mb-1 text-[10px] md:text-xs font-bold text-white bg-orange-500 rounded-full">
            {item.badge}
          </span>
        )}
        
        {item.brand && (
          <p className="text-[10px] md:text-xs font-semibold text-white/90 uppercase tracking-wider mb-0.5">
            {item.brand}
          </p>
        )}
        
        <h3 className={`text-sm md:text-base font-bold text-white mb-1 line-clamp-1`}>
          {item.title}
        </h3>
        
        {item.cta && (
          <div className="flex items-center gap-1 text-white font-semibold text-xs">
            {item.cta}
            <ChevronRight className="w-3 h-3" />
          </div>
        )}
      </div>
      
      {/* Hover Effect */}
      <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/10 transition-colors duration-300" />
    </Link>
  );
};

export default AdSection;
