import { ProjectBlueprint } from "./PromptAnalyzer";

export interface BuildBlueprint {
  name: string;
  folders: string[];
  files: string[];
  components: string[];
  routes: string[];
  dependencies: string[];
}

export class BlueprintGenerator {

  generate(input: ProjectBlueprint): BuildBlueprint {

    const folders = [
      "src/app",
      "src/components",
      "src/lib",
      "src/types",
      "src/api",
      "public"
    ];

    const files = [
      "package.json",
      "README.md",
      "tsconfig.json",
      "next.config.ts",
      "src/app/page.tsx",
      "src/app/layout.tsx"
    ];

    const components = [];

    if (input.features.includes("dashboard")) {
      components.push("Dashboard");
    }

    if (input.features.includes("authentication")) {
      components.push("LoginForm");
      components.push("AuthProvider");
    }

    const routes = [
      "/",
      "/dashboard"
    ];

    const dependencies = [
      "next",
      "react",
      "typescript"
    ];

    if (input.database === "postgresql") {
      dependencies.push("prisma");
    }

    return {
      name: "zovo-generated-app",
      folders,
      files,
      components,
      routes,
      dependencies
    };
  }
}

export default new BlueprintGenerator();
