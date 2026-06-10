// Différentes variantes de layouts pour la HomePage - PREMIUM & OPTIMIZED
export const HOME_LAYOUT_VARIANTS = {
  // Variante 1 : Grille GALLERY - Images dominantes 60% de la carte
  gallery: {
    id: 'gallery',
    name: 'Gallery',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-2 gap-6',
    productCardGrid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4',
    productCardPadding: 'p-0',
    productCardRounding: 'rounded-3xl',
    productImageHeight: 'h-56 md:h-64',
    productTextSize: 'text-sm md:text-base',
    productPriceSize: 'text-lg md:text-xl font-black',
    productGap: 'gap-4',
    sectionPadding: 'px-4 py-8 md:px-6 md:py-10',
    headerSize: 'text-2xl md:text-3xl font-black',
    shadow: 'shadow-xl hover:shadow-2xl',
    border: 'border-0',
    cardLayout: 'imageTopLarge',
  },

  // Variante 2 : Affichage GRID DENSE - Plus de produits, images moyennes
  grid: {
    id: 'grid',
    name: 'Grid',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-2 gap-5',
    productCardGrid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3',
    productCardPadding: 'p-0',
    productCardRounding: 'rounded-2xl',
    productImageHeight: 'h-48 md:h-56',
    productTextSize: 'text-xs md:text-sm',
    productPriceSize: 'text-base md:text-lg font-bold',
    productGap: 'gap-3',
    sectionPadding: 'px-4 py-6 md:px-5 md:py-7',
    headerSize: 'text-xl md:text-2xl font-bold',
    shadow: 'shadow-lg hover:shadow-xl',
    border: 'border-0',
    cardLayout: 'imageTop',
  },

  // Variante 3 : COMPACT MOBILE-FIRST - Optimisé smartphone
  compact: {
    id: 'compact',
    name: 'Compact',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-2 gap-4',
    productCardGrid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5',
    productCardPadding: 'p-0',
    productCardRounding: 'rounded-2xl',
    productImageHeight: 'h-40 md:h-48',
    productTextSize: 'text-xs md:text-sm',
    productPriceSize: 'text-sm md:text-base font-bold',
    productGap: 'gap-2',
    sectionPadding: 'px-3 py-5 md:px-4 md:py-6',
    headerSize: 'text-lg md:text-xl font-bold',
    shadow: 'shadow-md hover:shadow-lg',
    border: 'border-0',
    cardLayout: 'imageTop',
  },

  // Variante 4 : SHOWCASE - Vedettes grandes + grille complète
  showcase: {
    id: 'showcase',
    name: 'Showcase',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-3 gap-5',
    productCardGrid: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
    productCardPadding: 'p-0',
    productCardRounding: 'rounded-2xl',
    productImageHeight: 'h-52 md:h-60',
    productTextSize: 'text-sm md:text-base',
    productPriceSize: 'text-lg md:text-xl font-black',
    productGap: 'gap-4',
    sectionPadding: 'px-5 py-8 md:px-6 md:py-10',
    headerSize: 'text-2xl md:text-3xl font-black',
    shadow: 'shadow-xl hover:shadow-2xl',
    border: 'border-0',
    cardLayout: 'imageLarge',
    featuredCardColSpan: 'md:col-span-2 lg:col-span-2',
  },

  // Variante 5 : PREMIUM LUXURY - Cartes larges, espacement aéré
  luxury: {
    id: 'luxury',
    name: 'Luxury',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-2 gap-7',
    productCardGrid: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-5',
    productCardPadding: 'p-0',
    productCardRounding: 'rounded-3xl',
    productImageHeight: 'h-64 md:h-72',
    productTextSize: 'text-base md:text-lg',
    productPriceSize: 'text-xl md:text-2xl font-black',
    productGap: 'gap-5',
    sectionPadding: 'px-6 py-10 md:px-8 md:py-12',
    headerSize: 'text-3xl md:text-4xl font-black',
    shadow: 'shadow-2xl hover:shadow-3xl',
    border: 'border-0',
    cardLayout: 'imageLarge',
  },

  // Variante 6 : EDITORIAL - Style magazine, images 70% de la carte
  editorial: {
    id: 'editorial',
    name: 'Editorial',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-2 gap-6',
    productCardGrid: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4',
    productCardPadding: 'p-0',
    productCardRounding: 'rounded-2xl',
    productImageHeight: 'h-72 md:h-80',
    productTextSize: 'text-base md:text-lg',
    productPriceSize: 'text-xl md:text-2xl font-black',
    productGap: 'gap-4',
    sectionPadding: 'px-5 py-8 md:px-6 md:py-10',
    headerSize: 'text-2xl md:text-3xl font-black',
    shadow: 'shadow-lg hover:shadow-2xl',
    border: 'border-0',
    cardLayout: 'imageXLarge',
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
