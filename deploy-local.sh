#!/bin/bash
# Script de déploiement local - se connecte au VPS et exécute le déploiement
# À exécuter depuis votre machine locale

set -euo pipefail

# Configuration - MODIFIEZ CES VALEURS
VPS_HOST="vps120466"  # Remplacez par l'IP de votre VPS
VPS_USER="root"       # Remplacez par votre utilisateur VPS
VPS_PATH="/var/www/cloleo"

echo "🚀 Déploiement local vers VPS"
echo "=================================="
echo "VPS: $VPS_USER@$VPS_HOST"
echo "Chemin: $VPS_PATH"
echo ""

# Optionnel: demander confirmation
read -p "Continuer le déploiement ? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Annulé"
    exit 1
fi

echo "📤 Envoi du script de déploiement vers le VPS..."
scp deploy.sh $VPS_USER@$VPS_HOST:$VPS_PATH/

echo "🔧 Exécution du déploiement sur le VPS..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && bash deploy.sh"

echo ""
echo "✅ Déploiement terminé"
echo "=================================="