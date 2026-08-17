import promptAnalyzer, { ProjectBlueprint } from "./PromptAnalyzer";
import { computeComplexityTier } from "./ComplexityAnalyzer";

const AI_BRIDGE_URL = process.env.AI_BRIDGE_URL || "https://ai.zovo.ca/api/generate";

export class AIPromptAnalyzer {

  async analyze(prompt: string): Promise<ProjectBlueprint> {
    try {
      const aiPrompt = `Analyse cette demande de projet et réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact suivant :
{
  "projectName": "un-nom-court-en-kebab-case-decrivant-le-projet-ex-calculatrice-todo-app-blog-recettes",
  "projectType": "web-app",
  "framework": "nextjs",
  "language": "typescript",
  "features": ["dashboard", "authentication", "database", "api"],
  "database": "postgresql" ou "none",
  "authentication": true ou false,
  "deployment": "cloudflare"
}

Liste complète des features possibles (choisis UNIQUEMENT parmi celles-ci, celles qui sont vraiment pertinentes pour la demande) :

FONDATIONS :
- dashboard : tableau de bord avec statistiques
- database : besoin de stocker des données persistantes
- api : endpoints API personnalisés
- crud : gestion create/read/update/delete d'entités
- file-upload : téléversement et gestion de fichiers/images
- search : recherche/filtrage de contenu

AUTHENTIFICATION & SÉCURITÉ :
- authentication : connexion/inscription utilisateur
- oauth : connexion via Google/GitHub/autre fournisseur tiers
- roles-permissions : rôles et permissions granulaires (ex: éditeur, lecteur, propriétaire)
- two-factor-auth : authentification à deux facteurs (2FA)
- audit-log : journal d'audit des actions sensibles
- rate-limiting : limitation de débit contre les abus

DONNÉES & API :
- rest-api : API REST publique documentée
- webhooks : envoi ou réception de webhooks
- mcp-server : serveur MCP pour agents IA
- third-party-integration : intégration avec un service externe (ex: GitHub, Slack, Google)
- realtime-sync : synchronisation en temps réel (websockets, live updates)
- data-export : export de données (CSV, PDF, JSON)

COMMERCE :
- payments : paiement, Stripe, abonnement, facturation
- marketplace : place de marché multi-vendeurs avec transactions
- subscription-billing : facturation récurrente et gestion de plans
- invoicing : génération de factures

COMMUNICATION :
- notifications : alertes, notifications push ou in-app
- email : envoi d'emails transactionnels
- chat : messagerie, discussion en temps réel entre utilisateurs
- comments : commentaires sur du contenu

CONTENU & DÉCOUVERTE :
- cms : gestion de contenu éditorial (articles, pages)
- media-gallery : galerie d'images ou de vidéos
- reviews-ratings : avis et notes des utilisateurs
- recommendations : recommandations personnalisées
- multilingual : support multilingue (i18n)

COLLABORATION & ADMIN :
- admin : panneau d'administration, gestion des utilisateurs
- profile : profil utilisateur, avatar, informations personnelles
- team-workspace : espaces de travail collaboratifs multi-utilisateurs
- calendar-scheduling : calendrier et planification de rendez-vous
- analytics : suivi et analyse de données d'usage

QUALITÉ & INFRASTRUCTURE :
- automated-tests : suite de tests automatisés
- ci-cd : intégration et déploiement continus
- monitoring : surveillance et health checks
- error-tracking : suivi et journalisation des erreurs
- backup-restore : sauvegarde et restauration de données
- accessibility : accessibilité renforcée (a11y, WCAG)

N'inclus QUE les features réellement pertinentes pour la demande ci-dessous, pas toute la liste.

Demande à analyser : "${prompt}"`;

      const response = await fetch(AI_BRIDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!response.ok) {
        throw new Error(`AI bridge error: ${response.status}`);
      }

      const data = await response.json();
      const text: string = data.response || "";

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Aucun JSON trouvé dans la réponse IA");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed.features)) {
        throw new Error("Format IA invalide");
      }

      return {
        projectName: (typeof parsed.projectName === "string" && parsed.projectName.trim()) || "projet",
        projectType: parsed.projectType || "web-app",
        framework: parsed.framework || "nextjs",
        language: parsed.language || "typescript",
        features: parsed.features,
        database: parsed.database || "none",
        authentication: parsed.authentication === true || parsed.authentication === "true",
        deployment: parsed.deployment || "cloudflare",
        complexityTier: computeComplexityTier(parsed.features),
      };

    } catch (err) {
      console.warn("[AIPromptAnalyzer] Fallback vers analyse par mots-clés:", err);
      return promptAnalyzer.analyze(prompt);
    }
  }
}

const aipromptanalyzerInstance = new AIPromptAnalyzer();
export default aipromptanalyzerInstance;
