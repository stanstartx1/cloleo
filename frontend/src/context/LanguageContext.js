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
  },
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

  const value = useMemo(() => ({ language, setLanguage, t, languages: [
    { code: 'fr', label: 'Français', shortLabel: 'FR', flag: '🇫🇷' },
    { code: 'en', label: 'English', shortLabel: 'EN', flag: '🇬🇧' },
  ] }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
