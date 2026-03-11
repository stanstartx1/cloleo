# Cloléo - PRD (Product Requirements Document)

## Original Problem Statement
Cloléo - Marketplace e-commerce africaine Phase 1 Accélérée. Création d'une boutique professionnelle avec:
- 8 catégories principales avec sous-catégories
- 300+ produits réalistes
- Système de filtres et tri
- Panier fonctionnel
- Recherche
- Favoris

## Architecture

### Tech Stack
- **Frontend**: React 19, React Router, TailwindCSS, Radix UI, Sonner (toasts)
- **Backend**: FastAPI, Motor (MongoDB async driver)
- **Database**: MongoDB
- **State Management**: React Context (Cart, Favorites)

### Key Files
- `/app/backend/server.py` - API complet (catégories, produits, panier, favoris, recherche)
- `/app/frontend/src/App.js` - Routing principal
- `/app/frontend/src/context/CartContext.js` - Gestion panier global
- `/app/frontend/src/context/FavoritesContext.js` - Gestion favoris
- `/app/frontend/src/pages/*` - Pages (Home, Categories, Category, Product, Cart, Search, Favorites)
- `/app/frontend/src/components/*` - Composants réutilisables

## User Personas
1. **Acheteur africain** - Recherche produits authentiques locaux
2. **Diaspora africaine** - Achète en ligne depuis l'étranger (USD)
3. **Visiteur curieux** - Découvre l'artisanat africain

## Core Requirements (Static)
- [x] 8 catégories: Mode & Textile, Artisanat, Bijoux, Beauté, Électronique, Maison, Produits Locaux, Sport
- [x] 300+ produits avec noms réalistes en français
- [x] Prix en FCFA + conversion USD
- [x] Localisation vendeur (5 pays: CI, Sénégal, Nigeria, Cameroun, Ghana)
- [x] États produits (neuf, quasi-neuf, occasion)
- [x] Système de rating et avis
- [x] Stock et nombre de ventes

## What's Been Implemented

### ✅ Phase 1 Accélérée (11 Jan 2026)
- **Catégories**: 8 catégories avec images, descriptions, sous-catégories
- **Produits**: 315 produits générés avec données réalistes
- **Pages créées**:
  - `/` - Page d'accueil avec hero, catégories, tendances, nouveautés
  - `/categories` - Liste toutes les catégories
  - `/categories/[slug]` - Page catégorie avec filtres (prix, état, localisation, tri)
  - `/produit/[id]` - Fiche produit complète avec galerie, détails, produits similaires
  - `/panier` - Panier fonctionnel avec modification quantité, suppression, totaux
  - `/recherche` - Page de recherche
  - `/favoris` - Liste des favoris
- **Fonctionnalités**:
  - Ajout au panier avec toast de confirmation
  - Gestion quantité dans le panier
  - Favoris (ajout/suppression)
  - Recherche par nom, description, tags
  - Filtres: prix (slider), état, localisation
  - Tri: date, prix, popularité, note
  - Pagination
  - Navigation complète
  - Design africain vibrant (orange/ambre/vert)
  - Mobile-first responsive

## API Endpoints
- `GET /api/categories` - Liste catégories
- `GET /api/categories/{slug}` - Détail catégorie
- `GET /api/products` - Liste produits (filtres: category, condition, location, price, sort, pagination)
- `GET /api/products/{id}` - Détail produit
- `GET /api/products/{id}/similar` - Produits similaires
- `GET /api/products/{id}/also-bought` - Clients ont aussi acheté
- `GET /api/search?q=` - Recherche
- `POST /api/cart/add` - Ajouter au panier
- `GET /api/cart/{session_id}` - Voir panier
- `PUT /api/cart/{session_id}/{item_id}` - Modifier quantité
- `DELETE /api/cart/{session_id}/{item_id}` - Supprimer article
- `POST/DELETE /api/favorites/{session_id}/{product_id}` - Favoris

## Prioritized Backlog

### P0 (Critical) - ✅ DONE
- [x] Catégories avec images
- [x] Produits avec tous les champs
- [x] Panier fonctionnel
- [x] Navigation fluide

### P1 (High Priority) - Next Phase
- [ ] Authentification utilisateurs (inscription/connexion)
- [ ] Dashboard vendeur
- [ ] Intégration paiement (Wave, Orange Money, Stripe)
- [ ] Système d'abonnements vendeurs
- [ ] Vraies images produits via IA ou upload

### P2 (Medium Priority)
- [ ] Chat temps réel vendeur/acheteur
- [ ] Système de commandes et suivi
- [ ] Notifications push
- [ ] Système d'avis et commentaires
- [ ] Mode sombre
- [ ] App mobile React Native + Expo

### P3 (Low Priority)
- [ ] Recommandations IA personnalisées
- [ ] Analytics vendeur
- [ ] Programme de fidélité
- [ ] Wishlist partageable
- [ ] Comparaison produits

## Next Tasks
1. Authentification utilisateurs
2. Dashboard vendeur de base
3. Intégration paiement mobile money
4. Système de commandes

## Notes Techniques
- Session ID généré côté client (localStorage) pour panier anonyme
- Taux FCFA/USD: 0.0016 (fixe pour l'instant)
- Images produits via Unsplash (placeholder)
- MongoDB indexes recommandés sur category_slug, tags, price_fcfa
