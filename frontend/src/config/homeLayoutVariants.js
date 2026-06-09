// Différentes variantes de layouts pour la HomePage - PREMIUM & OPTIMIZED
export const HOME_LAYOUT_VARIANTS = {
  // Variante 1 : Grille équilibrée PREMIUM
  premium: {
    id: 'premium',
    name: 'Premium',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-2 gap-4', // 1 col mobile, 2 desktop avec espacement
    productCardGrid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3',
    productCardPadding: 'p-2',
    productCardRounding: 'rounded-2xl',
    productImageHeight: 'h-40 md:h-48',
    productTextSize: 'text-sm md:text-base',
    productPriceSize: 'text-base md:text-lg',
    productGap: 'gap-3 md:gap-4',
    sectionPadding: 'px-4 py-5 md:px-6 md:py-6',
    headerSize: 'text-xl md:text-2xl',
    shadow: 'shadow-lg hover:shadow-2xl',
    border: 'border border-slate-100',
  },

  // Variante 2 : Affichage spacieux & aéré
  spacious: {
    id: 'spacious',
    name: 'Spacious',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-2 gap-6',
    productCardGrid: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4',
    productCardPadding: 'p-3',
    productCardRounding: 'rounded-2xl',
    productImageHeight: 'h-48 md:h-56',
    productTextSize: 'text-base md:text-lg',
    productPriceSize: 'text-lg md:text-xl',
    productGap: 'gap-4 md:gap-5',
    sectionPadding: 'px-5 py-7 md:px-7 md:py-8',
    headerSize: 'text-2xl md:text-3xl',
    shadow: 'shadow-xl hover:shadow-2xl',
    border: 'border border-slate-150',
  },

  // Variante 3 : Mode compact optimal pour mobile
  compact: {
    id: 'compact',
    name: 'Compact',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-2 gap-3',
    productCardGrid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2',
    productCardPadding: 'p-1.5',
    productCardRounding: 'rounded-xl',
    productImageHeight: 'h-36 md:h-44',
    productTextSize: 'text-xs md:text-sm',
    productPriceSize: 'text-sm md:text-base',
    productGap: 'gap-2 md:gap-3',
    sectionPadding: 'px-3 py-4 md:px-4 md:py-5',
    headerSize: 'text-lg md:text-xl',
    shadow: 'shadow-md hover:shadow-lg',
    border: 'border border-slate-100',
  },

  // Variante 4 : Showcase - Produit vedette en avant
  showcase: {
    id: 'showcase',
    name: 'Showcase',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-3 gap-4',
    productCardGrid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3',
    productCardPadding: 'p-2',
    productCardRounding: 'rounded-2xl',
    productImageHeight: 'h-40 md:h-48',
    productTextSize: 'text-sm md:text-base',
    productPriceSize: 'text-base md:text-lg',
    productGap: 'gap-3 md:gap-4',
    sectionPadding: 'px-4 py-6 md:px-6 md:py-7',
    headerSize: 'text-xl md:text-2xl',
    shadow: 'shadow-xl hover:shadow-2xl',
    border: 'border-2 border-gradient-to-r from-orange-200 to-blue-200',
    featuredCardColSpan: 'md:col-span-2 lg:col-span-2',
  },

  // Variante 5 : Grille classique balanced
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-2 gap-4',
    productCardGrid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3',
    productCardPadding: 'p-2',
    productCardRounding: 'rounded-xl',
    productImageHeight: 'h-44 md:h-52',
    productTextSize: 'text-sm md:text-base',
    productPriceSize: 'text-base md:text-lg',
    productGap: 'gap-3 md:gap-4',
    sectionPadding: 'px-4 py-5 md:px-5 md:py-6',
    headerSize: 'text-lg md:text-2xl',
    shadow: 'shadow-lg hover:shadow-xl',
    border: 'border border-slate-100',
  },

  // Variante 6 : Cartes larges & détaillées
  detailed: {
    id: 'detailed',
    name: 'Detailed',
    themeSectionGrid: 'grid-cols-1 lg:grid-cols-2 gap-5',
    productCardGrid: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4',
    productCardPadding: 'p-3',
    productCardRounding: 'rounded-2xl',
    productImageHeight: 'h-56 md:h-64',
    productTextSize: 'text-base md:text-lg',
    productPriceSize: 'text-lg md:text-xl',
    productGap: 'gap-4 md:gap-5',
    sectionPadding: 'px-5 py-6 md:px-6 md:py-7',
    headerSize: 'text-2xl md:text-3xl',
    shadow: 'shadow-lg hover:shadow-2xl',
    border: 'border border-slate-150',
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
