# Cloléo - Marketplace E-commerce Africaine

## Description du Projet
Cloléo est une marketplace e-commerce complète conçue pour le marché africain, avec système de livraison en temps réel et module de dropshipping.

## Architecture Technique
- **Frontend**: React 18, Tailwind CSS, React Router, Context API
- **Backend**: FastAPI, PyJWT, Motor (MongoDB async)
- **Base de données**: MongoDB
- **Cartes**: Google Maps API
- **Temps réel**: WebSockets (FastAPI natif)

## Fonctionnalités Implémentées

### Phase 1 ✅
- [x] Boutique publique avec 8 catégories
- [x] 300+ produits réalistes
- [x] Panier fonctionnel
- [x] Recherche de produits
- [x] Système de favoris

### Phase 2 ✅
- [x] Dashboard Admin complet (sidebar, gestion vendeurs/livreurs/produits)
- [x] Dashboard Vendeur
- [x] Plans d'abonnement Stripe pour vendeurs
- [x] Système de validation Admin pour vendeurs et livreurs
- [x] Système de produits mis en avant (featured)

### Phase 3 ✅
- [x] Upload images produits et permis livreurs (stockage local)
- [x] Inscription et dashboard Livreur
- [x] Hero Section moderne avec animations
- [x] Carousels Spotlight et Featured Products
- [x] Page Checkout client avec Google Maps
- [x] Système de livraison complet avec suivi temps réel
- [x] Refonte Dashboard Vendeur avec sidebar

### Phase 4 ✅ (COMPLÉTÉ 24/04/2026)
- [x] **Module Dropshipping Complet**
  - [x] Inscription Dropshipper (/devenir-dropshipper)
  - [x] Dashboard Dropshipper avec sidebar (/dropshipper)
  - [x] Catalogue produits avec recherche
  - [x] Personnalisation produits (description, prix de vente)
  - [x] Calcul automatique marge 50/50 (dropshipper/admin)
  - [x] Boutique publique dropshipper (/boutique/{shop_slug})
  - [x] Commandes via boutique dropshipper
  - [x] Section Admin Dropshipping (stats, transactions, gestion)
  - [x] Page d'inscription avec 4 rôles (Acheteur, Vendeur, Dropshipper, Livreur)

### Phase 5 ✅ (COMPLÉTÉ 24/04/2026)
- [x] **99 nouveaux produits variés** ajoutés dans toutes les catégories
- [x] **Animations CSS avancées** (fadeIn, slideIn, hover-lift, scale, shimmer, float, heartbeat)
- [x] **ProductCard améliorée** avec animations hover (lift, scale, add-to-cart slide)
- [x] **Suivi livraisons temps réel pour Dropshipper**
  - [x] Onglet "Suivi livraisons" dans le dashboard
  - [x] Stats cards (Total, En cours, Livrées, En livraison)
  - [x] Liste commandes actives
  - [x] Carte Google Maps avec position livreur
  - [x] WebSocket pour mises à jour temps réel
- [x] Navbar avec liens Dropshipper

## Schéma de Base de Données

### Collection: users (role: dropshipper)
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "role": "dropshipper",
  "shop_name": "string",
  "shop_slug": "string (auto-generated)",
  "shop_description": "string",
  "is_active": true,
  "is_verified": true,
  "total_earnings": 0,
  "total_sales": 0
}
```

### Collection: dropshipped_products
```json
{
  "id": "uuid",
  "dropshipper_id": "uuid",
  "original_product_id": "uuid",
  "original_price_fcfa": "number",
  "selling_price_fcfa": "number",
  "custom_description": "string",
  "margin_fcfa": "number",
  "dropshipper_share_fcfa": "number (50%)",
  "admin_share_fcfa": "number (50%)",
  "is_active": true
}
```

### Collection: dropshipper_earnings
```json
{
  "id": "uuid",
  "order_id": "uuid",
  "dropshipper_id": "uuid",
  "total_margin": "number",
  "dropshipper_share": "number",
  "admin_share": "number",
  "vendor_amount": "number"
}
```

## APIs Clés - Dropshipping

### Authentification
- `POST /api/auth/register/dropshipper` - Inscription dropshipper

### Dropshipper Dashboard
- `GET /api/dropshipper/dashboard` - Stats et aperçu
- `GET /api/dropshipper/catalog` - Catalogue produits disponibles
- `POST /api/dropshipper/products` - Ajouter produit personnalisé
- `GET /api/dropshipper/products` - Liste produits
- `PUT /api/dropshipper/products/{id}` - Modifier produit
- `DELETE /api/dropshipper/products/{id}` - Supprimer produit
- `GET /api/dropshipper/orders` - Commandes
- `GET /api/dropshipper/earnings` - Historique gains

### Boutique publique
- `GET /api/shop/{shop_slug}` - Boutique dropshipper
- `POST /api/shop/order` - Commander (calcul automatique marge)

### Admin
- `GET /api/admin/dropshippers` - Liste dropshippers
- `PUT /api/admin/dropshippers/{id}/toggle` - Activer/désactiver
- `GET /api/admin/dropshipping/stats` - Statistiques
- `GET /api/admin/dropshipping/transactions` - Transactions

## Pages Frontend

### Dropshipper
- `/devenir-dropshipper` - Inscription
- `/dropshipper` - Dashboard (protégé)
- `/boutique/{shop_slug}` - Boutique publique

### Routes App.js
```javascript
<Route path="/devenir-dropshipper" element={<DropshipperRegisterPage />} />
<Route path="/dropshipper" element={
  <ProtectedRoute requireDropshipper>
    <DropshipperDashboard />
  </ProtectedRoute>
} />
<Route path="/boutique/:shopSlug" element={<DropshipperShopPage />} />
```

## Tâches à Venir

### P1 - Priorité Haute
- [ ] Intégration paiement Stripe pour clients
- [ ] Attribution automatique des commandes aux livreurs
- [ ] Notifications push mobiles

### P2 - Priorité Moyenne
- [ ] Chat en temps réel vendeur/client
- [ ] Système de notation/avis
- [ ] Historique des commandes client

### P3 - Backlog
- [ ] Application mobile (React Native)
- [ ] Multi-langues (EN, Wolof, etc.)
- [ ] Analytics avancées

## Comptes de Test
- **Admin**: admin@cloleo.com / admin123
- **Vendeur**: testvendor@cloleo.com / test123
- **Livreur**: testdriver@cloleo.com / driver123
- **Dropshipper**: testdrop3@cloleo.com / drop123

## Variables d'Environnement
```
# Frontend
REACT_APP_BACKEND_URL=https://cloleo-shop.preview.emergentagent.com
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyCyze4WaCmpwGGOB2GkpwH-pTNc04DrEKQ

# Backend
MONGO_URL=mongodb://localhost:27017
DB_NAME=cloleo
STRIPE_API_KEY=sk_test_emergent
```
