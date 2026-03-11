# Cloléo - PRD (Product Requirements Document)

## Original Problem Statement
Cloléo - Marketplace e-commerce africaine
- **Phase 1**: Boutique publique avec 8 catégories, 300+ produits, panier, favoris, recherche
- **Phase 2**: Dashboard Admin, Dashboard Vendeur, Système d'abonnements avec Stripe

## Architecture

### Tech Stack
- **Frontend**: React 19, React Router, TailwindCSS, Radix UI, Sonner (toasts)
- **Backend**: FastAPI, Motor (MongoDB async), JWT Auth
- **Database**: MongoDB
- **Payments**: Stripe via emergentintegrations library
- **State Management**: React Context (Auth, Cart, Favorites)

### Key Files
- `/app/backend/server.py` - API complet (auth, abonnements, vendeurs, admin, produits)
- `/app/frontend/src/context/AuthContext.js` - Authentification JWT
- `/app/frontend/src/pages/AdminDashboard.js` - Dashboard administrateur
- `/app/frontend/src/pages/VendorDashboard.js` - Dashboard vendeur
- `/app/frontend/src/pages/VendorSubscription.js` - Page abonnements Stripe

## User Personas
1. **Acheteur** - Parcours boutique, panier, favoris
2. **Vendeur** - Gestion boutique, produits, abonnement
3. **Admin** - Validation produits, gestion vendeurs, analytics

## Subscription Plans (Phase 2)

| Plan | Prix | Commission | Produits Max | Badge |
|------|------|-----------|--------------|-------|
| 🌱 Débutant | Gratuit | 10% | 3 | - |
| 🎨 Artisan | 5 000 FCFA/mois (~$8) | 7% | 25 | Vérifié |
| 🏪 Commerçant | 15 000 FCFA/mois (~$24) | 5% | 100 | Pro |
| 🏢 Entreprise | 35 000 FCFA/mois (~$56) | 3% | Illimité | Premium |

## What's Been Implemented

### ✅ Phase 1 (Boutique publique)
- 8 catégories avec images et sous-catégories
- 300+ produits générés avec données réalistes
- Pages: accueil, catégories, produit, panier, recherche, favoris
- Filtres: prix, état, localisation, tri
- Panier fonctionnel avec toasts

### ✅ Phase 2 (Admin & Vendeur)
- **Authentification JWT** (inscription, connexion, rôles)
- **Dashboard Admin** (/admin)
  - Stats globales (utilisateurs, vendeurs, produits, revenus)
  - Liste des vendeurs avec statut abonnement
  - Produits en attente de validation
  - Approbation/Rejet de produits
  - Activation/Désactivation vendeurs
- **Dashboard Vendeur** (/vendeur)
  - Stats personnelles (produits, ventes, revenus)
  - Statut abonnement actuel
  - Jauge limite produits
  - Actions rapides
- **Gestion Produits** (/vendeur/produits)
  - Liste avec filtres par statut
  - Ajout/Modification/Suppression
  - Statuts: pending, approved, rejected
- **Abonnements Stripe** (/vendeur/abonnement)
  - 4 plans avec détails complets
  - Intégration Stripe Checkout
  - Polling status après paiement
  - Activation automatique

## API Endpoints

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur

### Subscriptions
- `GET /api/subscriptions/plans` - Liste des plans
- `POST /api/subscriptions/checkout` - Créer session Stripe
- `GET /api/subscriptions/status/{session_id}` - Vérifier paiement

### Vendor
- `GET /api/vendor/dashboard` - Stats vendeur
- `GET /api/vendor/products` - Mes produits
- `POST /api/vendor/products` - Créer produit
- `PUT /api/vendor/products/{id}` - Modifier produit
- `DELETE /api/vendor/products/{id}` - Supprimer produit

### Admin
- `GET /api/admin/dashboard` - Stats admin
- `GET /api/admin/vendors` - Liste vendeurs
- `GET /api/admin/products/pending` - Produits en attente
- `POST /api/admin/products/{id}/approve` - Approuver
- `POST /api/admin/products/{id}/reject` - Rejeter

## Test Credentials

### Admin
- **Email**: admin@cloleo.com
- **Password**: admin123
- **Access**: /admin - Dashboard complet

### Vendeur Test
- **Email**: ama@test.com
- **Password**: test123
- **Access**: /vendeur - Dashboard vendeur, /vendeur/abonnement - Plans

### Stripe Test
- Les paiements utilisent le mode test Stripe
- Carte de test: 4242 4242 4242 4242, date future, CVC quelconque

## Comment Tester

### 1. Se connecter en Admin
1. Aller sur https://cloleo-shop.preview.emergentagent.com/connexion
2. Email: admin@cloleo.com, Password: admin123
3. Accéder au dashboard admin avec stats et gestion

### 2. Créer un compte Vendeur
1. Aller sur /connexion → onglet "Inscription"
2. Sélectionner "Vendeur"
3. Remplir le formulaire et soumettre
4. Redirection vers le dashboard vendeur

### 3. Payer un abonnement
1. Connecté en vendeur, aller sur /vendeur/abonnement
2. Choisir un plan payant (ex: Artisan à 5 000 FCFA)
3. Cliquer "Souscrire" → Stripe Checkout
4. Carte test: 4242 4242 4242 4242
5. Paiement confirmé → Plan activé

### 4. Ajouter un produit (Vendeur)
1. Dashboard vendeur → "Ajouter un produit"
2. Remplir le formulaire avec images
3. Soumettre → Produit en attente de validation

### 5. Valider un produit (Admin)
1. Dashboard admin → onglet "Produits en attente"
2. Cliquer "Approuver" ou "Rejeter"
3. Produit visible sur la boutique si approuvé

## Prioritized Backlog

### P0 (Done) ✅
- [x] Dashboard Admin
- [x] Dashboard Vendeur
- [x] Système abonnements Stripe
- [x] Validation produits

### P1 (Next)
- [ ] Système de commandes et paiements clients
- [ ] Notifications email (SendGrid)
- [ ] Chat vendeur/acheteur temps réel

### P2 (Future)
- [ ] App mobile React Native + Expo
- [ ] Analytics avancés vendeurs
- [ ] Programme de fidélité

## Notes Techniques
- JWT Token expire après 7 jours
- Session ID client (localStorage) pour panier anonyme
- Produits vendeur = status "pending" par défaut
- Webhook Stripe: `/api/webhook/stripe`
- Taux FCFA/USD: 0.0016 (fixe)
