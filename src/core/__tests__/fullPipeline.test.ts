import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import path from "path";
import blueprintGenerator from "../BlueprintGenerator";
import { fixMissingRoutePages, detectMismatchedPageContent } from "../Validator";
import type { ProjectBlueprint } from "../PromptAnalyzer";

// Mixage volontaire de toutes les features pour stresser le pipeline en une fois
const MIXED_INPUT: ProjectBlueprint = {
  database: "postgresql",
  features: [
    "dashboard",
    "authentication",
    "database",
    "crud",
    "search",
    "profile",
    "admin",
    "notifications",
  ],
  language: "typescript",
  framework: "nextjs",
  deployment: "cloudflare",
  projectName: "test-mixed-app",
  projectType: "web-app",
  authentication: true,
  complexityTier: "complexe",
};

const TEST_PROJECT_DIR = path.join("/tmp", "zovo-test-mixed-pipeline");

describe("Pipeline complet - mixage de toutes les features", () => {
  let blueprint: ReturnType<typeof blueprintGenerator.generate>;

  beforeAll(() => {
    blueprint = blueprintGenerator.generate(MIXED_INPUT);

    if (fs.existsSync(TEST_PROJECT_DIR)) {
      fs.rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_PROJECT_DIR, { recursive: true });

    fs.mkdirSync(path.join(TEST_PROJECT_DIR, "src/components"), { recursive: true });
    for (const component of blueprint.components) {
      fs.writeFileSync(
        path.join(TEST_PROJECT_DIR, "src/components", `${component}.tsx`),
        `export default function ${component}() { return <div>${component}</div>; }`
      );
    }
  });

  afterAll(() => {
    if (fs.existsSync(TEST_PROJECT_DIR)) {
      fs.rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
    }
  });

  it("génère un blueprint avec toutes les routes attendues", () => {
    const expectedRoutes = [
      "/", "/dashboard", "/login", "/signup",
      "/items", "/search", "/profile", "/admin",
    ];
    for (const route of expectedRoutes) {
      expect(blueprint.routes).toContain(route);
    }
  });

  it("chaque route (sauf /) a un fichier page.tsx correspondant dans files[]", () => {
    const nonRootRoutes = blueprint.routes.filter((r) => r !== "/");
    for (const route of nonRootRoutes) {
      const expectedFile = `src/app${route}/page.tsx`;
      expect(blueprint.files).toContain(expectedFile);
    }
  });

  it("chaque composant listé a son fichier .tsx correspondant dans files[]", () => {
    for (const component of blueprint.components) {
      expect(blueprint.files).toContain(`src/components/${component}.tsx`);
    }
  });

  it("aucun fichier dupliqué dans la liste files[]", () => {
    const unique = new Set(blueprint.files);
    expect(unique.size).toBe(blueprint.files.length);
  });

  it("fixMissingRoutePages crée physiquement tous les page.tsx manquants sur disque", () => {
    const created = fixMissingRoutePages(TEST_PROJECT_DIR, {
      routes: blueprint.routes,
      components: blueprint.components,
    });

    const nonRootRoutes = blueprint.routes.filter((r) => r !== "/");
    expect(created.length).toBeGreaterThan(0);

    for (const route of nonRootRoutes) {
      const pagePath = path.join(TEST_PROJECT_DIR, "src/app", route, "page.tsx");
      expect(fs.existsSync(pagePath)).toBe(true);
    }
  });

  it("chaque page.tsx généré n'importe que des composants qui existent réellement sur disque", () => {
    const nonRootRoutes = blueprint.routes.filter((r) => r !== "/");
    for (const route of nonRootRoutes) {
      const pagePath = path.join(TEST_PROJECT_DIR, "src/app", route, "page.tsx");
      if (!fs.existsSync(pagePath)) continue;

      const content = fs.readFileSync(pagePath, "utf-8");
      const importMatches = content.matchAll(/from ["']@\/components\/(\w+)["']/g);

      for (const match of importMatches) {
        const importedComponent = match[1];
        const componentPath = path.join(
          TEST_PROJECT_DIR,
          "src/components",
          `${importedComponent}.tsx`
        );
        expect(
          fs.existsSync(componentPath),
          `${route}/page.tsx importe ${importedComponent} qui n'existe pas sur disque`
        ).toBe(true);
      }
    }
  });

  it("le blueprint inclut toutes les dépendances requises par les features combinées", () => {
    if (MIXED_INPUT.features?.includes("authentication")) {
      expect(blueprint.dependencies).toContain("bcryptjs");
    }
    if (MIXED_INPUT.features?.includes("profile")) {
      expect(blueprint.dependencies).toContain("react-hook-form");
      expect(blueprint.dependencies).toContain("zod");
    }
    if (MIXED_INPUT.features?.includes("database")) {
      expect(blueprint.dependencies).toContain("prisma");
      expect(blueprint.dependencies).toContain("@prisma/client");
    }
  });

  it("BASE_FILES essentiels sont toujours présents même avec un mixage complexe", () => {
    const essentials = [
      "package.json",
      "tsconfig.json",
      "next.config.ts",
      "src/app/page.tsx",
      "src/app/layout.tsx",
    ];
    for (const file of essentials) {
      expect(blueprint.files).toContain(file);
    }
  });

  it("aucune page ne contient du contenu incohérent avec sa route (détection hallucination)", () => {
    const suspicious = detectMismatchedPageContent(TEST_PROJECT_DIR, blueprint.routes);
    expect(suspicious).toEqual([]);
  });

});
