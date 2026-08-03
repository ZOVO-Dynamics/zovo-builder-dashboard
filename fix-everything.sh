#!/bin/bash

echo "⚡ Application du patch ultime anti-débordement..."

# 1. Génération du CSS de correction forcée
cat << 'CSSEOF' > ultimate-fix.css
/* ======================================================
   GARANTIE ANTI-OVERFLOW & BLANC SUR MOBILE
   ====================================================== */

/* 1. Blocage strict de la largeur du viewport */
html {
  width: 100% !important;
  max-width: 100vw !important;
  overflow-x: hidden !important;
}

body {
  width: 100% !important;
  max-width: 100vw !important;
  overflow-x: hidden !important;
  position: relative !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* 2. Forcer TOUS les conteneurs et divs à ne JAMAIS dépasser de l'écran */
*, *::before, *::after {
  max-width: 100vw !important;
  box-sizing: border-box !important;
}

/* 3. Désactiver les largeurs fixes en pixels sur le layout principal */
div, section, main, header, nav, footer, article, form {
  min-width: 0 !important; /* Débloque la contraction des Flexbox */
}

/* 4. Gestion spécifique des Flexbox / CSS Grid (Raison principale des bugs Next/React) */
[class*="flex"], [class*="grid"], .row, .col {
  max-width: 100% !important;
  box-sizing: border-box !important;
}

/* 5. Forcer le passage en colonne unique (Stack) sur petit écran */
@media screen and (max-width: 768px) {
  /* Éléments côte à côte forcés à passer l'un sous l'autre */
  div, main, section, nav, header {
    flex-direction: column !important;
    grid-template-columns: 1fr !important;
    width: 100% !important;
    left: 0 !important;
  }
  
  /* Masquer tout débordement de texte ou de tableaux larges */
  table, input, textarea, select, pre, code {
    max-width: 100% !important;
    word-break: break-word !important;
  }
}
CSSEOF

echo "✅ Fichier ultimate-fix.css généré !"

# 2. Injection automatique dans le Head / CSS principal selon le framework
# Injecte dans les fichiers HTML
for file in $(find . -type f -name "*.html" -not -path "*/node_modules/*"); do
  if ! grep -q "ultimate-fix.css" "$file"; then
    sed -i '' '/<\/head>/i\
  <link rel="stylesheet" href="ultimate-fix.css">
' "$file" 2>/dev/null || sed -i '/<\/head>/i\  <link rel="stylesheet" href="ultimate-fix.css">' "$file"
    echo "  -> Injecté dans HTML: $file"
  fi
done

# Injecte dans les CSS globaux (React/Next/Vue/Tailwind)
for file in $(find . -type f \( -name "globals.css" -o -name "app.css" -o -name "style.css" -o -name "index.css" \) -not -path "*/node_modules/*"); do
  if ! grep -q "GARANTIE ANTI-OVERFLOW" "$file"; then
    cat ultimate-fix.css >> "$file"
    echo "  -> Fusionné dans CSS Global: $file"
  fi
done

echo "🎉 TERMINÉ ! Relancez votre serveur et rafraîchissez l'écran mobile."
