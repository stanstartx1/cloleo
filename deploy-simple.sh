#!/bin/bash
# Script de déploiement simplifié pour Cloléo
# À exécuter sur le VPS

set -e

echo "🚀 Déploiement Cloléo..."
cd /var/www/cloleo

echo "📦 Mise à jour du code..."
git pull origin main

echo "🔧 Backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate

echo "🎨 Frontend..."
cd ../frontend
rm -f .env.production
echo "REACT_APP_BACKEND_URL=https://cloleo.com" > .env.production
# Si vous avez un token Mapbox, ajoutez cette ligne:
# echo "REACT_APP_MAPBOX_ACCESS_TOKEN=votre_token" >> .env.production
npm install
npm run build

echo "🔄 Services..."
systemctl restart cloleo-backend
systemctl reload apache2

echo "✅ Déploiement terminé !"