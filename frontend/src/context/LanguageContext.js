import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'cloleo.locale';

const translations = {
  fr: {
    nav: {
      trends: 'Tendances', partner: 'Devenir partenaire', seller: 'Vendeur', driver: 'Livreur', reseller: 'Revendeur', enterprise: 'Entreprise',
      searchPlaceholder: 'Rechercher un produit...', login: 'Connexion', favorites: 'Mes favoris', orders: 'Mes commandes', wallet: 'Mon portefeuille',
      offers: 'Mes offres', subscriptions: 'Mes abonnements', messages: 'Mes messages', settings: 'Paramètres', logout: 'Déconnexion', forum: 'Forum',
      allCategories: 'Toutes les catégories', cart: 'Mon panier', account: 'Mon compte', language: 'Langue', seeShop: 'Voir ma boutique',
      vendorSpace: 'Espace vendeur', enterpriseSpace: 'Espace entreprise', driverSpace: 'Espace livreur', resellerSpace: 'Espace revendeur', administration: 'Administration',
      search: 'Rechercher', products: 'Produits', users: 'Utilisateurs', filters: 'Filtres', reset: 'Réinitialiser', apply: 'Appliquer',
      productSuggestions: 'Suggestions de produits', userSuggestions: 'Suggestions d’utilisateurs', noSuggestion: 'Aucune suggestion pour',
    },
    footer: {
      tagline: 'La première marketplace africaine pour découvrir et acheter des produits authentiques de qualité. Connectez-vous avec des vendeurs locaux et soutenez l’économie africaine.',
      categories: 'Catégories', allCategories: 'Voir toutes', usefulLinks: 'Liens utiles', becomeSeller: 'Devenir vendeur', help: 'Centre d’aide', delivery: 'Livraison',
      returns: 'Retours & remboursements', contactUs: 'Nous contacter', contact: 'Contact', address: 'Adresse', phone: 'Téléphone', email: 'Email',
      rights: 'Tous droits réservés.', madeWith: 'Fait avec', in: 'en Côte d’Ivoire',
    },
    mega: {
      slides: ['Livraison rapide à Abidjan', 'Paiement sécurisé et suivi en temps réel', 'Nouveautés et offres chaque semaine'],
      forum: 'Forum professionnel', allCategories: 'Toutes les catégories', recommendations: 'Recommandé pour vous', popular: 'Populaire', new: 'Nouveau',
    },
    commerce: {
      home: 'Accueil', search: 'Recherche', searchProducts: 'Rechercher des produits...', searchProductsTitle: 'Rechercher des produits', searchResults: 'Résultats pour', productsFound: 'produit trouvé', productsFoundPlural: 'produits trouvés',
      noResults: 'Aucun résultat', noResultsDescription: 'Aucun produit ne correspond à votre recherche', exploreCategories: 'Explorer les catégories', page: 'Page', previous: 'Précédent', next: 'Suivant',
      cart: 'Panier', yourCart: 'Votre panier', cartEmpty: 'Votre panier est vide', cartEmptyDescription: 'Vous n’avez aucun article dans votre panier.', continueShopping: 'Explorer les produits', item: 'article', items: 'articles', remove: 'Supprimer', clearCart: 'Vider le panier',
      orderSummary: 'Résumé de la commande', subtotal: 'Sous-total', delivery: 'Livraison', deliveryAtCheckout: 'Calculée à la caisse', total: 'Total', checkout: 'Passer la commande', wholesalePrice: 'Prix de gros',
      addToCart: 'Ajouter au panier', buyNow: 'Acheter maintenant', contactSeller: 'Contacter le vendeur', productAdded: 'Ajouté au panier !', productRemoved: 'Article supprimé', cartCleared: 'Panier vidé',
      allProducts: 'Tous les produits', trendingProducts: 'Produits tendances', productsAvailable: 'produits disponibles', filters: 'Filtres', clearFilters: 'Effacer les filtres', sortBy: 'Trier par :', noProducts: 'Aucun produit trouvé',
    },
    checkout: {
      title: 'Finaliser la commande', contact: 'Informations de contact', fullName: 'Nom complet', yourName: 'Votre nom', phone: 'Téléphone', deliveryAddress: 'Adresse de livraison', searchAddress: 'Rechercher votre adresse...', myLocation: 'Ma position', mapHelp: 'Cliquez sur la carte ou glissez le marqueur pour ajuster votre position exacte', positionSelected: 'Position sélectionnée', city: 'Ville', country: 'Pays', payment: 'Mode de paiement', cashOnDelivery: 'Paiement à la livraison', cashDescription: 'Espèces ou Mobile Money', card: 'Carte bancaire', instructions: 'Instructions de livraison (optionnel)', instructionsPlaceholder: 'Indications pour le livreur (étage, code, repères...)', summary: 'Récapitulatif', quantity: 'Qté', processing: 'Traitement...', confirm: 'Confirmer la commande', terms: 'En confirmant, vous acceptez nos conditions générales de vente', confirmed: 'Commande confirmée !', confirmationText: 'Votre commande a été passée avec succès. Un livreur va bientôt la prendre en charge.', orderNumber: 'Numéro de commande', trackOrder: 'Suivre ma commande', continueShopping: 'Continuer mes achats', loginRequired: 'Connectez-vous pour continuer', loginDescription: 'Pour finaliser votre commande, vous devez être connecté à votre compte.', createAccount: 'Créer un compte', cancel: 'Annuler',
    },
  },
  en: {
    nav: {
      trends: 'Trending', partner: 'Become a partner', seller: 'Seller', driver: 'Courier', reseller: 'Reseller', enterprise: 'Business',
      searchPlaceholder: 'Search for a product...', login: 'Sign in', favorites: 'My favourites', orders: 'My orders', wallet: 'My wallet',
      offers: 'My offers', subscriptions: 'My subscriptions', messages: 'My messages', settings: 'Settings', logout: 'Sign out', forum: 'Forum',
      allCategories: 'All categories', cart: 'My cart', account: 'My account', language: 'Language', seeShop: 'View my shop',
      vendorSpace: 'Seller dashboard', enterpriseSpace: 'Business dashboard', driverSpace: 'Courier dashboard', resellerSpace: 'Reseller dashboard', administration: 'Administration',
      search: 'Search', products: 'Products', users: 'Users', filters: 'Filters', reset: 'Reset', apply: 'Apply',
      productSuggestions: 'Product suggestions', userSuggestions: 'User suggestions', noSuggestion: 'No suggestions for',
    },
    footer: {
      tagline: 'The leading African marketplace to discover and buy quality, authentic products. Connect with local sellers and support the African economy.',
      categories: 'Categories', allCategories: 'View all', usefulLinks: 'Useful links', becomeSeller: 'Become a seller', help: 'Help centre', delivery: 'Delivery',
      returns: 'Returns & refunds', contactUs: 'Contact us', contact: 'Contact', address: 'Address', phone: 'Phone', email: 'Email',
      rights: 'All rights reserved.', madeWith: 'Made with', in: 'in Côte d’Ivoire',
    },
    mega: {
      slides: ['Fast delivery in Abidjan', 'Secure payment and real-time tracking', 'New arrivals and weekly offers'],
      forum: 'Professional forum', allCategories: 'All categories', recommendations: 'Recommended for you', popular: 'Popular', new: 'New',
    },
    commerce: {
      home: 'Home', search: 'Search', searchProducts: 'Search for products...', searchProductsTitle: 'Search for products', searchResults: 'Results for', productsFound: 'product found', productsFoundPlural: 'products found',
      noResults: 'No results', noResultsDescription: 'No product matches your search', exploreCategories: 'Browse categories', page: 'Page', previous: 'Previous', next: 'Next',
      cart: 'Cart', yourCart: 'Your cart', cartEmpty: 'Your cart is empty', cartEmptyDescription: 'You have no items in your cart.', continueShopping: 'Browse products', item: 'item', items: 'items', remove: 'Remove', clearCart: 'Clear cart',
      orderSummary: 'Order summary', subtotal: 'Subtotal', delivery: 'Delivery', deliveryAtCheckout: 'Calculated at checkout', total: 'Total', checkout: 'Checkout', wholesalePrice: 'Wholesale price',
      addToCart: 'Add to cart', buyNow: 'Buy now', contactSeller: 'Contact seller', productAdded: 'Added to cart!', productRemoved: 'Item removed', cartCleared: 'Cart cleared',
      allProducts: 'All products', trendingProducts: 'Trending products', productsAvailable: 'products available', filters: 'Filters', clearFilters: 'Clear filters', sortBy: 'Sort by:', noProducts: 'No products found',
    },
    checkout: {
      title: 'Complete your order', contact: 'Contact information', fullName: 'Full name', yourName: 'Your name', phone: 'Phone', deliveryAddress: 'Delivery address', searchAddress: 'Search your address...', myLocation: 'My location', mapHelp: 'Click the map or drag the marker to set your exact location', positionSelected: 'Location selected', city: 'City', country: 'Country', payment: 'Payment method', cashOnDelivery: 'Pay on delivery', cashDescription: 'Cash or Mobile Money', card: 'Bank card', instructions: 'Delivery instructions (optional)', instructionsPlaceholder: 'Instructions for the courier (floor, code, landmarks...)', summary: 'Summary', quantity: 'Qty', processing: 'Processing...', confirm: 'Confirm order', terms: 'By confirming, you accept our terms and conditions', confirmed: 'Order confirmed!', confirmationText: 'Your order has been placed successfully. A courier will take charge of it shortly.', orderNumber: 'Order number', trackOrder: 'Track my order', continueShopping: 'Continue shopping', loginRequired: 'Sign in to continue', loginDescription: 'You need to sign in to complete your order.', createAccount: 'Create an account', cancel: 'Cancel',
    },
  },
};

// Categories are stored in French in the catalogue. Keep their slugs stable and
// localise only their presentation layer.
const categoryTranslations = {
  electronique: { en: 'Electronics' }, mode: { en: 'Fashion' }, maison: { en: 'Home & living' }, beaute: { en: 'Beauty' }, sport: { en: 'Sports & leisure' },
  'bebes-enfants': { en: 'Baby & kids' }, alimentation: { en: 'Food & groceries' }, 'mode-textile': { en: 'Fashion & textiles' },
  'artisanat-decoration': { en: 'Crafts & décor' }, 'bijoux-accessoires': { en: 'Jewellery & accessories' }, 'beaute-cosmetiques': { en: 'Beauty & cosmetics' },
  'electronique-gadgets': { en: 'Electronics & gadgets' }, 'maison-cuisine': { en: 'Home & kitchen' }, 'produits-locaux-agroalimentaire': { en: 'Local food products' },
  smartphones: { en: 'Smartphones' }, ordinateurs: { en: 'Computers' }, tablettes: { en: 'Tablets' }, 'accessoires-tech': { en: 'Tech accessories' }, 'appareils-photo': { en: 'Cameras' }, 'montres-connectees': { en: 'Smart watches' },
  'vetements-homme': { en: "Men's clothing" }, 'vetements-femme': { en: "Women's clothing" }, chaussures: { en: 'Shoes' }, 'sacs-maroquinerie': { en: 'Bags & leather goods' }, 'accessoires-mode': { en: 'Fashion accessories' }, luxe: { en: 'Luxury' },
  meubles: { en: 'Furniture' }, decoration: { en: 'Décor' }, cuisine: { en: 'Kitchen' }, electromenager: { en: 'Home appliances' }, jardin: { en: 'Garden' }, bricolage: { en: 'DIY & tools' },
  maquillage: { en: 'Make-up' }, 'soins-peau': { en: 'Skincare' }, parfums: { en: 'Fragrances' }, capillaires: { en: 'Hair care' }, 'bien-etre': { en: 'Wellness' }, sante: { en: 'Health' },
  fitness: { en: 'Fitness' }, velos: { en: 'Bikes' }, 'equipements-sport': { en: 'Sports equipment' }, running: { en: 'Running' }, 'sports-equipe': { en: 'Team sports' }, outdoor: { en: 'Outdoor' },
  'vetements-bebe': { en: 'Baby clothing' }, jouets: { en: 'Toys' }, puericulture: { en: 'Baby care' }, 'chambre-enfant': { en: "Children's room" }, 'livres-education': { en: 'Books & education' }, 'securite-enfant': { en: 'Child safety' },
  'produits-frais': { en: 'Fresh products' }, 'produits-locaux': { en: 'Local products' }, boissons: { en: 'Drinks' }, epicerie: { en: 'Groceries' },
};

const LanguageContext = createContext(null);

const lookup = (dictionary, key) => key.split('.').reduce((value, segment) => value?.[segment], dictionary);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'fr');

  const setLanguage = useCallback((nextLanguage) => {
    if (!translations[nextLanguage]) return;
    localStorage.setItem(STORAGE_KEY, nextLanguage);
    setLanguageState(nextLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = 'ltr';
  }, [language]);

  const t = useCallback((key, replacements = {}) => {
    const value = lookup(translations[language], key) ?? lookup(translations.fr, key) ?? key;
    if (typeof value !== 'string') return value;
    return Object.entries(replacements).reduce((text, [name, replacement]) => text.replaceAll(`{{${name}}}`, String(replacement)), value);
  }, [language]);

  const categoryName = useCallback((categoryOrSlug, fallbackName) => {
    const slug = typeof categoryOrSlug === 'object' ? categoryOrSlug?.slug : categoryOrSlug;
    const fallback = fallbackName || (typeof categoryOrSlug === 'object' ? categoryOrSlug?.name : slug);
    return categoryTranslations[slug]?.[language] || fallback;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t, categoryName, languages: [
    { code: 'fr', label: 'Français', shortLabel: 'FR', flag: '🇫🇷' },
    { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧' },
  ] }), [language, setLanguage, t, categoryName]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
