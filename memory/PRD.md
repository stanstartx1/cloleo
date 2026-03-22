# Cloléo - PRD (Product Requirements Document)

## Original Problem Statement
Cloléo - Marketplace e-commerce africaine
- **Phase 1**: Boutique publique avec 8 catégories, 300+ produits, panier, favoris, recherche
- **Phase 2**: Dashboard Admin, Dashboard Vendeur, Système d'abonnements avec Stripe
- **Phase 3**: Correction upload images, Sidebar Admin complète, Système Livreur complet

## Architecture

### Tech Stack
- **Frontend**: React 19, React Router, TailwindCSS, Radix UI, Sonner (toasts)
- **Backend**: FastAPI, Motor (MongoDB async), JWT Auth, aiofiles (file uploads)
- **Database**: MongoDB
- **Payments**: Stripe via emergentintegrations library
- **File Storage**: Local storage (/app/backend/uploads/)
- **State Management**: React Context (Auth, Cart, Favorites)

### Key Files
- `/app/backend/server.py` - API complet (auth, abonnements, vendeurs, admin, livreurs, uploads)
- `/app/frontend/src/context/AuthContext.js` - Authentification JWT (customer, vendor, admin, driver)
- `/app/frontend/src/pages/AdminDashboard.js` - Dashboard administrateur avec sidebar 9 onglets
- `/app/frontend/src/pages/VendorDashboard.js` - Dashboard vendeur
- `/app/frontend/src/pages/VendorAddProduct.js` - Ajout produit avec upload images
- `/app/frontend/src/pages/DriverRegisterPage.js` - Inscription livreur
- `/app/frontend/src/pages/DriverDashboard.js` - Dashboard livreur
- `/app/frontend/src/components/ImageUpload.js` - Composant réutilisable d'upload

## User Personas
1. **Acheteur** - Parcours boutique, panier, favoris
2. **Vendeur** - Gestion boutique, produits, abonnement
3. **Admin** - Validation produits, gestion vendeurs/livreurs, analytics
4. **Livreur** - Gestion des livraisons, statut de disponibilité

## What's Been Implemented

### ✅ Phase 1 (Boutique publique) - COMPLETED
- 8 catégories avec images et sous-catégories
- 300+ produits générés avec données réalistes
- Pages: accueil, catégories, produit, panier, recherche, favoris
- Filtres: prix, état, localisation, tri
- Panier fonctionnel avec toasts

### ✅ Phase 2 (Admin & Vendeur) - COMPLETED
- **Authentification JWT** (inscription, connexion, rôles)
- **Dashboard Admin** (/admin) - Stats et gestion
- **Dashboard Vendeur** (/vendeur) - Stats personnelles
- **Gestion Produits** (/vendeur/produits)
- **Abonnements Stripe** (/vendeur/abonnement) - 4 plans

### ✅ Phase 3 (Upload, Admin Sidebar, Livreurs) - COMPLETED (22 Mars 2026)
- **Upload d'images local** - Endpoint `/api/upload` et `/api/upload/multiple`
- **Composant ImageUpload** - Drag & drop, multi-fichiers, prévisualisation
- **Admin Sidebar complète** avec 9 onglets:
  1. Vendeurs - Liste et gestion des vendeurs
  2. Livreurs - Liste et vérification des livreurs
  3. Produits - Tous les produits (filtrable par statut)
  4. Stats - Statistiques globales
  5. Transactions - Historique des paiements
  6. Trajet livreurs - Placeholder (temps réel reporté)
  7. Paramètres vendeurs - Configuration vendeurs
  8. Paramètres livreurs - Configuration livreurs
  9. Paramètre général - Configuration site
- **Système Livreur complet**:
  - Inscription (/devenir-livreur) avec upload permis
  - Dashboard livreur (/livreur)
  - Gestion statut (disponible, occupé, hors ligne)
  - Mise à jour localisation
  - Vérification admin requise pour activation

## API Endpoints

### Auth
- `POST /api/auth/register` - Inscription (customer, vendor)
- `POST /api/auth/register/driver` - Inscription livreur
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur

### File Upload
- `POST /api/upload` - Upload fichier unique
- `POST /api/upload/multiple` - Upload multiple fichiers
- `GET /api/uploads/{filename}` - Récupérer fichier

### Driver
- `GET /api/driver/dashboard` - Stats livreur
- `PUT /api/driver/status` - Mettre à jour statut
- `PUT /api/driver/location` - Mettre à jour position
- `POST /api/driver/upload-license` - Upload permis
- `GET /api/driver/deliveries` - Mes livraisons

### Admin - Drivers
- `GET /api/admin/drivers` - Liste livreurs
- `PUT /api/admin/drivers/{id}/verify` - Vérifier livreur
- `PUT /api/admin/drivers/{id}/toggle` - Activer/désactiver

### Admin - Settings
- `GET /api/admin/settings/{type}` - Récupérer paramètres (vendor, delivery, platform)
- `PUT /api/admin/settings/{type}` - Modifier paramètres

## Test Credentials

### Admin
- **Email**: admin@cloleo.com
- **Password**: admin123
- **Access**: /admin - Dashboard complet avec sidebar 9 onglets

### Vendeur Test
- **Email**: testvendor@cloleo.com
- **Password**: test123
- **Access**: /vendeur - Dashboard, /vendeur/produits/nouveau - Ajout avec upload

### Stripe Test
- Carte de test: 4242 4242 4242 4242, date future, CVC quelconque

## Routes Frontend

| Route | Accès | Description |
|-------|-------|-------------|
| / | Public | Accueil |
| /categories | Public | Liste catégories |
| /produit/:id | Public | Détail produit |
| /panier | Public | Panier |
| /favoris | Public | Favoris |
| /connexion | Public | Login/Register |
| /devenir-livreur | Public | Inscription livreur |
| /vendeur | Vendor | Dashboard vendeur |
| /vendeur/produits | Vendor | Mes produits |
| /vendeur/produits/nouveau | Vendor | Ajouter produit |
| /vendeur/abonnement | Vendor | Plans Stripe |
| /admin | Admin | Dashboard admin |
| /livreur | Driver | Dashboard livreur |

## Prioritized Backlog

### P0 (Done) ✅
- [x] Dashboard Admin avec sidebar 9 onglets
- [x] Système livreur complet (inscription + dashboard)
- [x] Upload d'images local fonctionnel
- [x] Paramètres admin (vendeurs, livreurs, plateforme)

### P1 (Next)
- [ ] Système de commandes et paiements clients
- [ ] Attribution livraisons aux livreurs
- [ ] Notifications (email ou in-app)

### P2 (Future)
- [ ] Suivi temps réel livreurs (WebSockets)
- [ ] Chat vendeur/acheteur
- [ ] App mobile React Native

## Notes Techniques
- JWT Token expire après 7 jours
- Upload max: 10 MB par fichier
- Types acceptés: JPEG, PNG, WebP, GIF, PDF
- Livreurs doivent être vérifiés par admin pour être actifs
- Taux FCFA/USD: 0.0016 (fixe)
