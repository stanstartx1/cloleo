import React from 'react';
import { Link } from 'react-router-dom';

const CategoryMarquee = ({ parentLoopItems, categorySlideTick, prefix, sectionClassName }) => {
  if (!parentLoopItems || parentLoopItems.length === 0) return null;

  const renderCategoryItems = (keyPrefix) => (
    <>
      {parentLoopItems.map((category, index) => {
        const banners = category.banner_images || [];
        const img = banners.length > 0
          ? banners[(categorySlideTick + index) % banners.length]
          : (category.image || `https://source.unsplash.com/200x200/?africa,${encodeURIComponent(category.name)}`);

        return (
          <Link
            key={`${keyPrefix}-${index}`}
            to={`/categories/${category.slug}`}
            className="flex-shrink-0 w-64 md:w-72 group snap-start"
          >
            <div className="w-full h-40 md:h-44 rounded-2xl overflow-hidden border-2 border-orange-100 group-hover:border-orange-400 transition-all duration-300 shadow-md group-hover:scale-[1.03]">
              <img src={img} alt={category.name} className="w-full h-full object-cover" />
            </div>
            <span className="mt-2 block text-sm font-semibold text-slate-700 group-hover:text-orange-600 transition-colors truncate">
              {category.name}
            </span>
          </Link>
        );
      })}
    </>
  );

  return (
    <section className={sectionClassName}>
      <div className="relative overflow-x-auto touch-scroll-x no-scrollbar md:overflow-hidden">
        <div className="continuous-marquee">
          <div className="continuous-marquee-track continuous-marquee-track-cats">{renderCategoryItems(`${prefix}-a`)}</div>
          <div className="continuous-marquee-track continuous-marquee-track-cats hidden md:flex" aria-hidden="true">{renderCategoryItems(`${prefix}-b`)}</div>
        </div>
      </div>
    </section>
  );
};

export default CategoryMarquee;
