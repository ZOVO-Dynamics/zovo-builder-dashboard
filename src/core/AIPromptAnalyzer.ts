import promptAnalyzer, { ProjectBlueprint } from "./PromptAnalyzer";

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
  "features": ["dashboard", "authentication", "database", "api", "crud", "payments", "notifications", "search", "chat", "admin", "profile", "email", "analytics"],
  "database": "postgresql" ou "none",
  "authentication": true ou false,
  "deployment": "cloudflare"
}

Liste complète des features possibles (choisis UNIQUEMENT parmi celles-ci, celles qui sont vraiment pertinentes pour la demande) :
- authentication : connexion/inscription utilisateur
- dashboard : tableau de bord avec statistiques
- database : besoin de stocker des données persistantes
- api : endpoints API personnalisés
- crud : gestion create/read/update/delete d'entités
- payments : paiement, Stripe, abonnement, facturation, marketplace avec transactions
- notifications : alertes, notifications push ou in-app
- search : recherche/filtrage de contenu
- chat : messagerie, discussion en temps réel entre utilisateurs
- admin : panneau d'administration, gestion des utilisateurs
- profile : profil utilisateur, avatar, informations personnelles
- email : envoi d'emails transactionnels
- analytics : suivi et analyse de données d'usage

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
        authentication: !!parsed.authentication,
        deployment: parsed.deployment || "cloudflare",
      };

    } catch (err) {
      console.warn("[AIPromptAnalyzer] Fallback vers analyse par mots-clés:", err);
      return promptAnalyzer.analyze(prompt);
    }
  }
}

const aipromptanalyzerInstance = new AIPromptAnalyzer();
export default aipromptanalyzerInstance;
