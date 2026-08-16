# 🗺️ Guide d'Intégration OpenStreetMap - Clóleo

## 📋 Vue d'ensemble

Ce guide explique comment intégrer OpenStreetMap (OSM) dans le système Clóleo tout en utilisant Mapbox GL JS pour le rendu des cartes. Cette approche hybride permet de :

- **Réduire les coûts** : OSM est gratuit vs Mapbox payant
- **Maintenir la qualité** : Mapbox GL JS pour le rendu
- **Améliorer la performance** : Cache backend des tuiles
- **Assurer la fiabilité** : Fallback vers Mapbox si OSM échoue

## 🏗️ Architecture

### Backend

#### 1. **Services OSM** (`backend/core/osm_services.py`)
- **OSRM** : Routing moteur open-source (alternative à Mapbox Directions)
- **Nominatim** : Geocoding open-source (alternative à Mapbox Geocoding)
- **Tile Caching** : Système de cache MongoDB pour les tuiles OSM
- **Batch Geocoding** : Traitement en lot avec rate limiting

#### 2. **API Routes** (`backend/routes/osm_api.py`)
- `POST /api/osm/geocode` : Forward geocoding
- `POST /api/osm/reverse-geocode` : Reverse geocoding
- `POST /api/osm/batch-geocode` : Batch geocoding
- `POST /api/osm/directions` : Calcul d'itinéraire OSRM
- `POST /api/osm/optimize-route` : Optimisation multi-destinations
- `GET /api/osm/tile/{z}/{x}/{y}` : Tuiles OSM avec cache
- `POST /api/osm/cache/clear-expired` : Nettoyage cache
- `GET /api/osm/cache/stats` : Statistiques cache
- `GET /api/osm/health` : Health check services OSM

### Frontend

#### 1. **Services OSM** (`frontend/src/utils/osmServices.js`)
- Wrapper fonctions backend OSM
- Utilitaires de style OSM pour Mapbox GL JS
- Gestion hybride OSM/Mapbox
- Gestion du cache frontend

#### 2. **Integration Mapbox** (`frontend/src/utils/mapboxMap.js`)
- Configuration MAP_CONFIG pour choisir les providers
- Fallback automatique vers Mapbox si OSM échoue
- Route calculation hybride OSRM/Mapbox
- Geocoding hybride Nominatim/Mapbox

## 🚀 Installation

### 1. Installer les dépendances backend

```bash
cd backend
pip install aiohttp
```

### 2. Ajouter les routes au serveur

Déjà fait dans `backend/server.py` :
```python
from routes.osm_api import router as osm_router
api.include_router(osm_router)
```

### 3. Créer les index MongoDB (optionnel)

```bash
cd backend/scripts
python create_osm_indexes.py
```

```python
# create_osm_indexes.py
from core.database import db
import asyncio

async def create_indexes():
    await db.map_tiles.create_index([("tile_key", 1)], unique=True)
    await db.map_tiles.create_index([("expires_at", 1)])
    await db.locations.create_index([("location_id", 1)], unique=True)
    await db.locations.create_index([("latitude", 1), ("longitude", 1)])
    print("✅ OSM indexes created successfully")

if __name__ == "__main__":
    asyncio.run(create_indexes())
```

## 🔧 Configuration

### 1. Configuration Frontend

Dans `frontend/src/utils/mapboxMap.js` :

```javascript
export const MAP_CONFIG = {
  preferOSM: true,                    // Préférer OSM aux APIs Mapbox
  useOSMForDirections: true,          // Utiliser OSRM pour itinéraires
  useOSMForGeocoding: true,          // Utiliser Nominatim pour geocoding
  fallbackToMapbox: true,             // Fallback vers Mapbox si OSM échoue
};
```

### 2. Variables d'environnement

```bash
# Backend (optionnel)
OSRM_BASE_URL=http://router.project-osrm.org/route/v1/driving
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org/search
TILE_SERVER_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png

# Frontend (déjà existant)
REACT_APP_MAPBOX_ACCESS_TOKEN=votre_token_mapbox
REACT_APP_BACKEND_URL=https://cloleo.com
```

## 📊 Utilisation

### 1. Geocoding

```javascript
import { forwardGeocodeOSM, reverseGeocodeOSM } from '../utils/osmServices';

// Forward geocoding
const results = await forwardGeocodeOSM("Abidjan, Côte d'Ivoire", ['ci'], 5);

// Reverse geocoding
const address = await reverseGeocodeOSM(5.3599, -4.0083, 'fr');
```

### 2. Itinéraires

```javascript
import { getOSRMDirections, optimizeMultiDestinations } from '../utils/osmServices';

// Simple route
const route = await getOSRMDirections(
  5.3599, -4.0083,  // Abidjan
  5.3699, -4.0183,  // Yopougon
  false             // alternatives
);

// Multi-destination optimization
const optimized = await optimizeMultiDestinations(
  5.3599, -4.0083,  // Origin
  [
    { latitude: 5.3699, longitude: -4.0183 },
    { latitude: 5.3799, longitude: -4.0283 },
    { latitude: 5.3899, longitude: -4.0383 }
  ]
);
```

### 3. Utilisation dans les composants existants

```javascript
import { setRouteLine } from '../utils/mapboxMap';

// La fonction setRouteLine utilise maintenant automatiquement OSRM
// si MAP_CONFIG.useOSMForDirections est true
await setRouteLine(map, 'route-1', driverLocation, customerLocation, '#4f46e5');
```

## 🔍 Monitoring et Maintenance

### 1. Health Check

```bash
curl https://cloleo.com/api/osm/health
```

Résultat attendu :
```json
{
  "status": "healthy",
  "services": {
    "osrm": "healthy",
    "nominatim": "healthy",
    "tile_server": "healthy"
  }
}
```

### 2. Cache Statistics

```bash
curl https://cloleo.com/api/osm/cache/stats
```

### 3. Nettoyage Cache (automatisé)

```bash
# Manuel
curl -X POST https://cloleo.com/api/osm/cache/clear-expired

# Automatisé (cron job)
0 2 * * * curl -X POST https://cloleo.com/api/osm/cache/clear-expired
```

## 💰 Économies de Coûts

### Avant (Mapbox uniquement) :
- **Directions API** : ~$0.50 per 1,000 requests
- **Geocoding API** : ~$0.05 per 1,000 requests  
- **Tile usage** : ~$5.00 per 50,000 loads

### Après (Hybride OSM) :
- **Directions API** : $0 (OSRM gratuit)
- **Geocoding API** : $0 (Nominatim gratuit)
- **Tile usage** : $0 (OSM gratuit)
- **Mapbox GL JS** : Utilisé uniquement pour le rendu (coût minimal)

**Économie estimée** : ~80-90% sur les coûts cartographiques

## ⚡ Performance

### Cache Backend MongoDB :
- **Hit rate** : ~95% pour les tuiles populaires
- **TTL** : 24 heures par défaut
- **Storage** : ~50KB par tuile

### Rate Limiting :
- **Nominatim** : 1 requête/seconde (respecté)
- **OSRM** : Pas de limites strictes
- **Tile Server** : Pas de limites strictes

## 🔄 Migration Progressive

### Phase 1 : Test (actuel)
- API OSM activées en parallèle
- MAP_CONFIG = { preferOSM: false }
- Monitoring des performances

### Phase 2 : Basculement progressif
- MAP_CONFIG = { preferOSM: true }
- Fallback Mapbox activé
- Monitoring des erreurs

### Phase 3 : Full OSM
- MAP_CONFIG = { fallbackToMapbox: false }
- Surveillance health check
- Optimisation cache

## 🐛 Dépannage

### Problème : OSM services unavailable
**Solution** : Activez fallback vers Mapbox dans MAP_CONFIG

### Problème : Rate limiting Nominatim
**Solution** : Augmentez le délai entre requêtes dans batch_geocode

### Problème : Tuiles ne s'affichent pas
**Solution** : Vérifiez health check et cache stats

### Problème : Routes incorrectes
**Solution** : Comparez OSRM vs Mapbox pour debug

## 📝 Tâches Futures

1. **Tuiles Vectorielles** : Utiliser MapTiler pour tuiles vectorielles
2. **Offline Support** : PWA avec Service Workers pour tuiles offline
3. **Custom Styles** : Styles personnalisés basés sur les données
4. **Analytics** : Analytics d'utilisation des services OSM
5. **Auto-scaling** : Auto-scaling des tuiles basé sur la demande

## 🎯 Conclusion

Cette architecture hybride offre le meilleur des deux mondes :
- **OSM** : Gratuit, open-source, communauté active
- **Mapbox GL JS** : Rendu performant, API documentée
- **Cache Backend** : Performance optimale
- **Fallback** : Fiabilité maximale

Le système est conçu pour être évolutif et s'adapter aux besoins futurs de Clóleo.