export interface ProjectBlueprint {
  projectType: string;
  projectName: string;
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

    const slugName = prompt
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 4)
      .join("-") || "projet";

    return {
      projectType: "web-app",
      projectName: slugName,
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

const promptanalyzerInstance = new PromptAnalyzer();
export default promptanalyzerInstance;
