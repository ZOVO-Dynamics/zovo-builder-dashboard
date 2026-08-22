#!/usr/bin/env bash
# Garde-fou CI : toute PR qui modifie du code doit accompagner le changement
# d'un bump de version (package.json) ET d'une nouvelle entree dans le
# journal des mises a jour (src/lib/changelog.ts), affiche depuis la page
# d'accueil (section #changelog) et depuis /changelog.
set -euo pipefail

BASE_REF="${GITHUB_BASE_SHA:?GITHUB_BASE_SHA manquant}"
HEAD_REF="${GITHUB_HEAD_SHA:?GITHUB_HEAD_SHA manquant}"

CHANGED_FILES=$(git diff --name-only "$BASE_REF" "$HEAD_REF")

# Fichiers qui ne constituent pas un "changement de code" au sens de cette
# regle : workflows, documentation, lockfile seul, et les fichiers memes
# du mecanisme de version/changelog (sinon on ne pourrait jamais les
# modifier isolement pour corriger une entree).
NON_CODE_PATTERN='^(\.github/|.*\.md$|package-lock\.json$|src/lib/changelog\.ts$|package\.json$)'

CODE_CHANGED=false
while IFS= read -r file; do
  [ -z "$file" ] && continue
  if ! echo "$file" | grep -qE "$NON_CODE_PATTERN"; then
    CODE_CHANGED=true
    break
  fi
done <<< "$CHANGED_FILES"

if [ "$CODE_CHANGED" = false ]; then
  echo "Aucun changement de code detecte (docs/workflow/lockfile uniquement) - pas de bump requis."
  exit 0
fi

VERSION_CHANGED=false
if echo "$CHANGED_FILES" | grep -q '^package\.json$'; then
  OLD_VERSION=$(git show "$BASE_REF:package.json" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).version')
  NEW_VERSION=$(git show "$HEAD_REF:package.json" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).version')
  if [ "$OLD_VERSION" != "$NEW_VERSION" ]; then
    VERSION_CHANGED=true
  fi
fi

CHANGELOG_CHANGED=false
if echo "$CHANGED_FILES" | grep -q '^src/lib/changelog\.ts$'; then
  CHANGELOG_CHANGED=true
fi

if [ "$VERSION_CHANGED" = false ] || [ "$CHANGELOG_CHANGED" = false ]; then
  echo "Cette PR modifie du code sans mettre a jour la version et/ou le journal des mises a jour."
  echo ""
  [ "$VERSION_CHANGED" = false ] && echo "  - package.json : le champ \"version\" doit etre incremente."
  [ "$CHANGELOG_CHANGED" = false ] && echo "  - src/lib/changelog.ts : une nouvelle entree CHANGELOG doit etre ajoutee."
  echo ""
  echo "Chaque changement de code est une mise a jour du site et doit etre trace dans le journal des mises a jour visible depuis la page d'accueil."
  exit 1
fi

echo "Version et journal des mises a jour a jour."
