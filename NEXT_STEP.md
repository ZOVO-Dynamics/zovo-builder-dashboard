# ZOVO Builder V1.1 — Builder Engine

## Objectif

Transformer ZOVO Builder d'un générateur de texte en un générateur complet d'applications.

Pipeline cible :

Prompt
 ↓
Prompt Analyzer
 ↓
AI Planner
 ↓
Blueprint
 ↓
File Generator
 ↓
Workspace Creator
 ↓
Validator
 ↓
Preview
 ↓
Export
 ↓
Deploy

---

## Phase 1 — Prompt Analyzer

Entrée :

Créer une application de gestion de restaurant avec connexion et tableau de bord.

Sortie :

- Type du projet
- Framework
- Langage
- Fonctionnalités
- Base de données
- Authentification
- Déploiement

Exemple :

{
  "projectType":"web-app",
  "framework":"nextjs",
  "language":"typescript",
  "database":"postgres",
  "features":[
    "authentication",
    "dashboard",
    "crud"
  ]
}

---

## Phase 2 — AI Planner

Construire automatiquement un blueprint.

Déterminer :

- dossiers
- fichiers
- dépendances
- routes
- API
- base de données
- configuration

---

## Phase 3 — File Generator

Créer automatiquement :

package.json
README.md
.env.example
tsconfig.json
next.config.ts

/src
/app
/components
/lib
/api
/public
/prisma

Tous les fichiers doivent être générés automatiquement.

---

## Phase 4 — Workspace Creator

Créer :

/home/zovoaicore/workspaces/<project-name>/

Écrire tous les fichiers.

Retourner :

- chemin
- nombre de fichiers
- durée
- taille

---

## Phase 5 — Validator

Après génération :

- vérifier les imports
- vérifier TypeScript
- vérifier package.json
- vérifier la structure
- détecter les erreurs

Corriger automatiquement si possible.

---

## Phase 6 — Preview

Lancer automatiquement :

npm install

npm run dev

Retourner l'URL locale.

---

## Phase 7 — Export

Ajouter :

- Export ZIP
- Export GitHub
- Download

---

## Phase 8 — Deploy

Support :

- Cloudflare Pages
- Vercel
- Render

Déploiement en un clic.

---

Critères de réussite :

Un utilisateur écrit :

"Créer une application de gestion de restaurant"

Le Builder doit produire un projet complet, exécutable et prêt à être déployé, sans intervention manuelle.
