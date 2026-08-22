import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import { discoverApiRoutes, routeFileToUrlPath } from "./RuntimeSmokeTest";

/**
 * Le demarrage reel d'un serveur next start (spawn systemd-run + polling)
 * n'est pas teste ici - infra lourde, hors de portee d'un test unitaire
 * rapide. Ces tests verrouillent la logique pure et deterministe : la
 * decouverte de routes API et la conversion chemin de fichier -> URL, qui
 * decident QUOI le smoke test va interroger.
 */

let tmpDir: string;

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeProject(routes: Record<string, string>): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zovo-smoketest-"));
  for (const [routePath, content] of Object.entries(routes)) {
    const fullDir = path.join(tmpDir, "src", "app", "api", routePath);
    fs.mkdirSync(fullDir, { recursive: true });
    fs.writeFileSync(path.join(fullDir, "route.ts"), content, "utf-8");
  }
  return tmpDir;
}

describe("routeFileToUrlPath", () => {
  it("segment statique simple -> URL identique", () => {
    expect(routeFileToUrlPath("auth/signup")).toBe("/auth/signup");
  });

  it("segment dynamique [id] -> substitue par une valeur de test", () => {
    expect(routeFileToUrlPath("projects/[id]")).toBe("/projects/smoketest");
  });

  it("groupe de routes (parentheses) -> exclu de l'URL", () => {
    expect(routeFileToUrlPath("(app)/dashboard")).toBe("/dashboard");
  });

  it("segment catch-all [...slug] -> null (trop ambigu pour un test generique)", () => {
    expect(routeFileToUrlPath("files/[...slug]")).toBeNull();
  });

  it("segment catch-all optionnel [[...slug]] -> null", () => {
    expect(routeFileToUrlPath("files/[[...slug]]")).toBeNull();
  });

  it("racine (chaine vide) -> racine de l'API", () => {
    expect(routeFileToUrlPath("")).toBe("/");
  });
});

describe("discoverApiRoutes", () => {
  it("aucun dossier api -> liste vide, pas d'erreur", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zovo-smoketest-"));
    expect(discoverApiRoutes(tmpDir)).toEqual([]);
  });

  it("route GET simple -> decouverte avec la bonne methode", () => {
    const project = makeProject({ "health": "export async function GET() { return Response.json({ok:true}); }" });
    const routes = discoverApiRoutes(project);
    expect(routes).toEqual([{ urlPath: "/api/health", method: "GET" }]);
  });

  it("route n'exportant que PUT/DELETE -> ignoree (rien de simple a tester sans etat existant)", () => {
    const project = makeProject({
      "projects/[id]": "export async function PUT() {} export async function DELETE() {}",
    });
    expect(discoverApiRoutes(project)).toEqual([]);
  });

  it("GET prefere a POST quand les deux sont exportes", () => {
    const project = makeProject({
      "items": "export async function GET() {} export async function POST() {}",
    });
    expect(discoverApiRoutes(project)).toEqual([{ urlPath: "/api/items", method: "GET" }]);
  });

  it("plusieurs routes imbriquees -> toutes decouvertes avec la bonne URL", () => {
    const project = makeProject({
      "auth/signup": "export async function POST() {}",
      "auth/login": "export async function POST() {}",
      "webhooks": "export async function POST() {}",
    });
    const urls = discoverApiRoutes(project).map((r) => r.urlPath).sort();
    expect(urls).toEqual(["/api/auth/login", "/api/auth/signup", "/api/webhooks"]);
  });

  it("route catch-all -> exclue de la decouverte", () => {
    const project = makeProject({
      "files/[...slug]": "export async function GET() {}",
      "health": "export async function GET() {}",
    });
    expect(discoverApiRoutes(project)).toEqual([{ urlPath: "/api/health", method: "GET" }]);
  });
});
