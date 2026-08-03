#!/bin/bash

echo "🚀 Application du correctif d'affichage responsive..."

# 1. Création du fichier de correctif CSS (fix-responsive.css)
cat << 'CSSEOF' > fix-responsive.css
/* ============================================================
   CORRECTIF D'AFFICHAGE MOBILE / RESPONSIVE (ZOVO DASHBOARD)
   ============================================================ */

/* Force le respect des dimensions de l'écran */
html, body {
  width: 100% !important;
  max-width: 100vw !important;
  overflow-x: hidden !important; /* Supression de l'espace blanc à droite */
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  -webkit-text-size-adjust: 100%;
}

*, *::before, *::after {
  box-sizing: border-box !important;
}

/* Forcer les conteneurs et sections à être adaptatifs */
div, main, section, header, nav, footer, article, form {
  max-width: 100% !important;
}

/* Correction des éléments à largeur fixe qui font tout déborder */
[class*="container"],
[class*="wrapper"],
[class*="dashboard"],
[class*="card"],
[class*="main"] {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

/* Gestion du contenu large (tableaux, code, formulaires) */
table, .table, pre, code {
  display: block !important;
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: auto !important; /* Permet de scroller uniquement l'élément si nécessaire */
  white-space: pre-wrap !important;
}

/* S'assurer que les images et médias ne dépassent jamais */
img, video, canvas, svg {
  max-width: 100% !important;
  height: auto !important;
}
CSSEOF

echo "✅ Fichier 'fix-responsive.css' créé avec succès."

# 2. Injection automatique du meta viewport et du CSS dans les fichiers HTML
echo "🔍 Recherche et mise à jour des fichiers HTML..."

for file in $(find . -type f -name "*.html" -not -path "*/node_modules/*"); do
    # Vérifier et ajouter la balise meta viewport si elle n'existe pas
    if ! grep -q "name=\"viewport\"" "$file"; then
        sed -i '' '/<head>/a\
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
' "$file" 2>/dev/null || sed -i '/<head>/a\  <meta name="viewport" content="width=device-width, initial-scale=1.0">' "$file"
        echo "   -> Meta viewport ajouté à : $file"
    fi

    # Injecter le fichier CSS dans le head
    if ! grep -q "fix-responsive.css" "$file"; then
        sed -i '' '/<\/head>/i\
  <link rel="stylesheet" href="fix-responsive.css">
' "$file" 2>/dev/null || sed -i '/<\/head>/i\  <link rel="stylesheet" href="fix-responsive.css">' "$file"
        echo "   -> Lien CSS ajouté à : $file"
    fi
done

echo "🎉 Patch terminé ! Rechargez votre page mobile pour constater le résultat."
