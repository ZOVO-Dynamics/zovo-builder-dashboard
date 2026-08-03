#!/bin/bash
set -e

PROJECT_DIR="/home/ubuntu/zovo-builder-dashboard"
DASHBOARD_LAYOUT="$PROJECT_DIR/src/components/layout/DashboardLayout.tsx"

if [ ! -f "$DASHBOARD_LAYOUT" ]; then
  echo "⚠️  Fichier introuvable : $DASHBOARD_LAYOUT"
  exit 1
fi

if grep -q "SupportChatWidget" "$DASHBOARD_LAYOUT"; then
  echo "ℹ️  SupportChatWidget déjà présent, rien changé."
  exit 0
fi

LAST_IMPORT_LINE=$(grep -n '^import ' "$DASHBOARD_LAYOUT" | tail -1 | cut -d: -f1)
if [ -n "$LAST_IMPORT_LINE" ]; then
  sed -i "${LAST_IMPORT_LINE}a import SupportChatWidget from \"../SupportChatWidget\";" "$DASHBOARD_LAYOUT"
  echo "✅ Import ajouté"
fi

if grep -q "UsageWidget" "$DASHBOARD_LAYOUT"; then
  sed -i '/<UsageWidget[^>]*\/>/a\      <SupportChatWidget />' "$DASHBOARD_LAYOUT"
  echo "✅ <SupportChatWidget /> ajouté après <UsageWidget />"
else
  echo "⚠️  UsageWidget introuvable — cherche la balise de fermeture principale du JSX pour insérer <SupportChatWidget /> à la main."
  echo "Aperçu du fichier :"
  cat -n "$DASHBOARD_LAYOUT"
fi
