export interface ProjectBlueprint {
  projectType: string;
  framework: string;
  language: string;
  features: string[];
  database: string;
  authentication: boolean;
  deployment: string;
}

export class PromptAnalyzer {

  analyze(prompt: string): ProjectBlueprint {

    const text = prompt.toLowerCase();

    const features: string[] = [];

    if (text.includes("login") || text.includes("connexion") || text.includes("auth")) {
      features.push("authentication");
    }

    if (text.includes("dashboard") || text.includes("tableau de bord")) {
      features.push("dashboard");
    }

    if (
      text.includes("database") ||
      text.includes("base de données") ||
      text.includes("crud")
    ) {
      features.push("database");
    }

    if (text.includes("api")) {
      features.push("api");
    }

    return {
      projectType: "web-app",
      framework: "nextjs",
      language: "typescript",
      features,
      database: features.includes("database")
        ? "postgresql"
        : "none",
      authentication: features.includes("authentication"),
      deployment: "cloudflare"
    };
  }
}

export default new PromptAnalyzer();
