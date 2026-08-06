#!/bin/bash
# Script de diagnostic de déploiement pour Cloléo
# À exécuter sur le VPS

echo "🔍 Diagnostic de déploiement Cloléo"
echo "=================================="

cd /var/www/cloleo

echo "📦 Statut Git:"
git status
git log --oneline -3

echo ""
echo "🔧 Directories d'upload:"
ls -la backend/uploads/chat/ 2>/dev/null || echo "Directory backend/uploads/chat/ n'existe pas"
mkdir -p backend/uploads/chat/images backend/uploads/chat/documents backend/uploads/chat/audio
echo "✅ Directories créées/vérifiées"

echo ""
echo "🎨 Frontend build:"
ls -la frontend/build/ 2>/dev/null | head -5 || echo "Build frontend introuvable"

echo ""
echo "🔄 Services:"
systemctl status cloleo-backend --no-pager | head -10
systemctl status apache2 --no-pager | head -5

echo ""
echo "📋 Logs backend récents:"
journalctl -u cloleo-backend -n 20 --no-pager

echo ""
echo "=================================="
echo "Diagnostic terminé"