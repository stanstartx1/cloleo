#!/bin/bash
# Script de déploiement manuel pour Cloléo
# À exécuter sur le VPS dans /var/www/cloleo

set -euo pipefail

echo "🚀 Déploiement manuel Cloléo - $(date)"
echo "=================================="

cd /var/www/cloleo

echo "📦 Vérification du code source..."
git status
git log --oneline -3

echo ""
echo "🔧 Backend - Installation des dépendances..."
cd backend
source venv/bin/activate || python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate

echo ""
echo "🎨 Frontend - Build..."
cd ../frontend

# Configuration de l'environnement de production
echo "Setting up production environment..."
rm -f .env.production
echo "REACT_APP_BACKEND_URL=https://cloleo.com" > .env.production

# Chercher le token Mapbox dans l'environnement ou un fichier
if [ -f /var/www/cloleo/.env.mapbox ]; then
  echo "Using Mapbox token from file"
  cat /var/www/cloleo/.env.mapbox >> .env.production
elif [ -n "${MAPBOX_TOKEN:-}" ]; then
  echo "Using Mapbox token from environment"
  echo "REACT_APP_MAPBOX_ACCESS_TOKEN=$MAPBOX_TOKEN" >> .env.production
else
  echo "⚠️ WARNING: No Mapbox token found, using placeholder"
  echo "REACT_APP_MAPBOX_ACCESS_TOKEN=pk.placeholder" >> .env.production
fi

# Installation et build
npm ci --prefer-offline || npm install
npm run build

echo "✅ Frontend built successfully"

echo ""
echo "🔄 Redémarrage des services..."
cd /var/www/cloleo

systemctl restart cloleo-backend
systemctl is-active --quiet cloleo-backend && echo "✅ Backend actif" || echo "❌ Backend erreur"

# Vérification que le backend fonctionne
if curl --fail --silent --show-error --retry 3 --retry-connrefused \
  http://127.0.0.1:8000/api/openapi.json | grep --quiet '"/auth-page-settings"'; then
  echo "✅ Backend répond correctement"
else
  echo "❌ Backend ne répond pas correctement"
  exit 1
fi

if systemctl is-active --quiet apache2; then
  systemctl reload apache2
  echo "✅ Apache rechargé"
else
  echo "⚠️ Apache non géré par systemd"
fi

echo ""
echo "✅ Déploiement terminé avec succès - $(date)"
echo "=================================="