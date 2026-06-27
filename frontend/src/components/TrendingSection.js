import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { motion } from 'framer-motion';

const TrendingSection = ({ trendingRef, loading, trendingInView, filteredTrendingProducts }) => {
  return (
    <motion.section
      ref={trendingRef}
      className="py-16 bg-white border-b border-slate-200"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      <div className="site-container relative">
        <div className="mb-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-500/10 text-orange-600 rounded-2xl flex items-center justify-center shadow-sm">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                <h2 className={`text-3xl md:text-4xl font-bold text-slate-900 transition-all duration-700 ${trendingInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                  Tendances du moment
                </h2>
                <p className={`text-slate-500 mt-2 transition-all duration-700 delay-100 ${trendingInView ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'}`}>
                  Les produits les plus populaires
                </p>
              </div>
            </div>
            <div className="flex items-center justify-start lg:justify-end">
              <Link
                to="/produits?sort_by=sales_count"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
              >
                Voir tous les articles
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="grid grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-3xl" />
              ))}
            </div>
            <div className="grid gap-6">
              <Skeleton className="aspect-[4/3] rounded-[32px]" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Skeleton className="aspect-[4/3] rounded-3xl" />
                <Skeleton className="aspect-[4/3] rounded-3xl" />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {filteredTrendingProducts.slice(0, 4).map((product, index) => (
                  <Link
                    key={product.id}
                    to={`/produit/${product.id}`}
                    className={`group block rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 ${trendingInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                    style={{ transitionDelay: `${index * 80}ms` }}
                  >
                    <div className="overflow-hidden rounded-t-3xl bg-slate-100">
                      <img
                        src={product.images?.[0] || product.main_image || 'https://via.placeholder.com/400'}
                        alt={product.name}
                        className="h-40 w-full object-cover transition-all duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-slate-500 line-clamp-2">{product.name}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-base font-semibold text-slate-900">{(product.promo_price_fcfa || product.price_fcfa || product.price || 0).toLocaleString()} FCFA</span>
                        {product.promo_price_fcfa && (
                          <span className="text-xs text-red-500 line-through">{product.price_fcfa?.toLocaleString()} FCFA</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-6">
              {filteredTrendingProducts[4] && (
                <Link
                  to={`/produit/${filteredTrendingProducts[4].id}`}
                  className={`group block overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm transition-all duration-300 ${trendingInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                  style={{ transitionDelay: '0ms' }}
                >
                  <div className="relative overflow-hidden bg-slate-100">
                    <img
                      src={filteredTrendingProducts[4].images?.[0] || filteredTrendingProducts[4].main_image || 'https://via.placeholder.com/600'}
                      alt={filteredTrendingProducts[4].name}
                      className="h-[22rem] md:h-96 w-full object-cover transition-all duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-sm uppercase tracking-[0.24em] text-orange-500">Top vente</p>
                    <h3 className="mt-4 text-xl md:text-2xl font-bold text-slate-900">{filteredTrendingProducts[4].name}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 line-clamp-3">{filteredTrendingProducts[4].description || 'Produit populaire mis en avant pour cette semaine.'}</p>
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-2xl font-bold text-slate-900">{(filteredTrendingProducts[4].promo_price_fcfa || filteredTrendingProducts[4].price_fcfa || filteredTrendingProducts[4].price || 0).toLocaleString()} FCFA</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">Hot</span>
                    </div>
                  </div>
                </Link>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredTrendingProducts.slice(5, 7).map((product, index) => (
                  <Link
                    key={product.id}
                    to={`/produit/${product.id}`}
                    className={`group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 ${trendingInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                    style={{ transitionDelay: `${index * 80}ms` }}
                  >
                    <div className="overflow-hidden rounded-t-3xl bg-slate-100">
                      <img
                        src={product.images?.[0] || product.main_image || 'https://via.placeholder.com/400'}
                        alt={product.name}
                        className="h-36 w-full object-cover transition-all duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2">{product.name}</p>
                      <p className="mt-2 text-sm text-slate-500">{(product.promo_price_fcfa || product.price_fcfa || product.price || 0).toLocaleString()} FCFA</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
};

export default TrendingSection;
