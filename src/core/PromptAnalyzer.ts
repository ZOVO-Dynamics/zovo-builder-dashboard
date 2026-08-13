import { computeComplexityTier, ComplexityTier } from "./ComplexityAnalyzer";

export interface ProjectBlueprint {
  projectType: string;
  projectName: string;
  framework: string;
  language: string;
  features: string[];
  database: string;
  authentication: boolean;
  deployment: string;
  complexityTier?: ComplexityTier;
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

    let projectType = "web-app";
    if (text.includes("e-commerce") || text.includes("ecommerce") || text.includes("boutique") || text.includes("shop")) {
      projectType = "e-commerce";
    } else if (text.includes("blog")) {
      projectType = "blog";
    } else if (text.includes("dashboard") || text.includes("tableau de bord")) {
      projectType = "dashboard";
    } else if (text.includes("api-only") || text.includes("api pure") || text.includes("backend")) {
      projectType = "api-only";
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
      projectType,
      projectName: slugName,
      framework: "nextjs",
      language: "typescript",
      features,
      database: features.includes("database")
        ? "postgresql"
        : "none",
      authentication: features.includes("authentication"),
      deployment: "cloudflare",
      complexityTier: computeComplexityTier(features)
    };
  }
}

const promptanalyzerInstance = new PromptAnalyzer();
export default promptanalyzerInstance;