// Différentes variantes de layouts pour la HomePage
export const HOME_LAYOUT_VARIANTS = {
  // Variante 1 : Grille compacte dense (Mobile-first)
  compact: {
    id: 'compact',
    name: 'Compact',
    themeSectionGrid: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2', // 1 col mobile, 2 desktop
    productCardGrid: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3',
    productCardPadding: 'p-1',
    productCardRounding: 'rounded-lg',
    productImageHeight: 'h-32 md:h-40',
    productTextSize: 'text-xs md:text-[11px]',
    productPriceSize: 'text-[12px] md:text-[13px]',
    productGap: 'gap-2 md:gap-3',
    sectionPadding: 'px-3 py-3 md:px-4 md:py-4',
    headerSize: 'text-lg md:text-xl',
    minHeight: '0',
  },

  // Variante 2 : Grille large spacieuse
  spacious: {
    id: 'spacious',
    name: 'Spacious',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-3',
    productCardGrid: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4',
    productCardPadding: 'p-2',
    productCardRounding: 'rounded-xl',
    productImageHeight: 'h-48 md:h-56',
    productTextSize: 'text-sm md:text-base',
    productPriceSize: 'text-base md:text-lg',
    productGap: 'gap-4 md:gap-6',
    sectionPadding: 'px-4 py-6 md:px-6 md:py-8',
    headerSize: 'text-2xl md:text-3xl',
    minHeight: 'min-h-96',
  },

  // Variante 3 : Grille masonry asymétrique
  masonry: {
    id: 'masonry',
    name: 'Masonry',
    themeSectionGrid: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
    productCardGrid: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 auto-rows-max gap-2 md:gap-3',
    productCardPadding: 'p-1',
    productCardRounding: 'rounded-md',
    productImageHeight: 'h-28 md:h-36',
    productTextSize: 'text-[10px] md:text-xs',
    productPriceSize: 'text-xs md:text-sm',
    productGap: 'gap-2 md:gap-2',
    sectionPadding: 'px-3 py-3 md:px-4 md:py-4',
    headerSize: 'text-base md:text-lg',
    minHeight: '0',
  },

  // Variante 4 : Carrousel horizontal
  carousel: {
    id: 'carousel',
    name: 'Carousel',
    themeSectionGrid: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2',
    productCardGrid: 'flex overflow-x-auto gap-3 md:gap-4 pb-2 no-scrollbar',
    productCardPadding: 'p-2 flex-shrink-0',
    productCardRounding: 'rounded-lg',
    productImageHeight: 'h-40 md:h-48',
    productTextSize: 'text-xs md:text-sm',
    productPriceSize: 'text-sm md:text-base',
    productGap: 'gap-3 md:gap-4',
    sectionPadding: 'px-3 py-4 md:px-4 md:py-6',
    headerSize: 'text-lg md:text-2xl',
    minHeight: '0',
    isCarousel: true,
  },

  // Variante 5 : Featured focus (grand produit + grille compacte)
  featured: {
    id: 'featured',
    name: 'Featured Focus',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-3',
    productCardGrid: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4',
    productCardPadding: 'p-2',
    productCardRounding: 'rounded-lg',
    productImageHeight: 'h-36 md:h-44',
    productTextSize: 'text-xs md:text-sm',
    productPriceSize: 'text-sm md:text-[15px]',
    productGap: 'gap-3 md:gap-4',
    sectionPadding: 'px-3 py-4 md:px-4 md:py-5',
    headerSize: 'text-lg md:text-2xl',
    minHeight: '0',
    featuredCardColSpan: 'md:col-span-2 lg:col-span-2',
  },

  // Variante 6 : Ultra compact (mobile-optimized)
  ultraCompact: {
    id: 'ultraCompact',
    name: 'Ultra Compact',
    themeSectionGrid: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2',
    productCardGrid: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1 md:gap-2',
    productCardPadding: 'p-0.5',
    productCardRounding: 'rounded-md',
    productImageHeight: 'h-24 md:h-32',
    productTextSize: 'text-[9px] md:text-[10px]',
    productPriceSize: 'text-[10px] md:text-xs',
    productGap: 'gap-1 md:gap-2',
    sectionPadding: 'px-2 py-2 md:px-3 md:py-3',
    headerSize: 'text-base md:text-lg',
    minHeight: '0',
  },
};

// Sélectionner un layout aléatoire
export const getRandomLayoutVariant = () => {
  const variants = Object.values(HOME_LAYOUT_VARIANTS);
  return variants[Math.floor(Math.random() * variants.length)];
};

// Sélectionner un layout basé sur un seed (pour cohérence)
export const getLayoutVariantBySeed = (seed) => {
  const variants = Object.values(HOME_LAYOUT_VARIANTS);
  const index = Math.abs(seed) % variants.length;
  return variants[index];
};
