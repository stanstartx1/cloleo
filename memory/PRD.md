# Cloléo - Marketplace E-commerce Africaine

## Description du Projet
Cloléo est une marketplace e-commerce complète conçue pour le marché africain, avec système de livraison en temps réel.

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

### Phase 3 ✅ (COMPLÉTÉ 28/03/2026)
- [x] Upload images produits et permis livreurs (stockage local)
- [x] Inscription et dashboard Livreur
- [x] Hero Section moderne avec animations
- [x] Carousels Spotlight et Featured Products
- [x] Page Checkout client avec Google Maps
- [x] **Système de livraison complet avec suivi temps réel**
  - Création de commandes avec coordonnées GPS
  - Livreur accepte/récupère/livre la commande
  - Suivi en direct sur carte (Admin, Vendeur, Client)
  - Mise à jour position livreur via GPS
  - Notifications en temps réel (WebSockets)
  - Historique des statuts de commande
- [x] **Refonte Dashboard Vendeur** (28/03/2026)
  - Menu latéral complet : Tableau de bord, Mes produits, Commandes, Suivi livraisons, Statistiques, Mon abonnement, Paramètres
  - Section Suivi livraisons avec carte Google Maps
  - Vue des commandes avec livreur assigné
- [x] **Refonte Dashboard Livreur** (28/03/2026)
  - Menu latéral : Carte & Navigation, Commandes, Historique, Mes gains, Mon profil
  - Sélecteur de statut (Disponible/Occupé/Hors ligne)
  - Carte Google Maps avec position livreur et destination client
  - Boutons d'action : Accepter, Récupérer colis, Démarrer livraison, Confirmer livraison
  - Lien "Ouvrir dans Google Maps" pour navigation externe

## Schéma de Base de Données

### Collection: orders
```json
{
  "id": "uuid",
  "order_number": "CLO-20260328-XXXXXX",
  "customer_id": "uuid | null",
  "customer_name": "string",
  "customer_phone": "string",
  "items": [
    {
      "product_id": "uuid",
      "product_name": "string",
      "quantity": "number",
      "unit_price_fcfa": "number",
      "vendor_id": "uuid"
    }
  ],
  "delivery_address": {
    "name": "string",
    "phone": "string",
    "street": "string",
    "city": "string",
    "latitude": "number",
    "longitude": "number"
  },
  "status": "pending | assigned | picked_up | in_transit | delivered | cancelled",
  "driver_id": "uuid | null",
  "driver_name": "string | null",
  "total_fcfa": "number"
}
```

## APIs Clés

### Système de Commandes
- `POST /api/orders` - Créer une commande
- `GET /api/orders/track/{order_id}` - Suivi public de commande
- `PUT /api/orders/{id}/accept` - Livreur accepte
- `PUT /api/orders/{id}/pickup` - Livreur récupère le colis
- `PUT /api/orders/{id}/in-transit` - Livreur en route
- `PUT /api/orders/{id}/deliver` - Livraison terminée
- `POST /api/driver/location/update` - Mise à jour position GPS

### WebSocket Endpoints
- `/ws/orders/order_{id}` - Suivi d'une commande spécifique
- `/ws/driver/{id}` - Nouvelles commandes pour livreur
- `/ws/orders/admin_tracking` - Suivi admin tous livreurs

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
