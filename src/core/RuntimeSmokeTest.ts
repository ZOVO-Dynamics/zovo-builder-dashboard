import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

/**
 * La validation s'arretait jusqu'ici a `next build` : un projet peut
 * compiler sans jamais avoir ete execute une seule fois (inscription qui
 * echoue en base, route API qui plante des le premier appel reel...).
 * Ce module demarre le projet genere en mode production (apres un build
 * deja reussi) et verifie qu'aucune route decouverte ne plante (5xx/reseau),
 * plus un test de persistance explicite quand une paire signup/login existe.
 *
 * Ce n'est PAS une verification fonctionnelle complete (on ne connait pas
 * la logique metier de chaque route generee) - seulement "le serveur
 * demarre et rien ne s'effondre au premier contact", et "un compte cree
 * via /api/auth/signup peut ensuite se connecter".
 */

const PORT_RANGE_START = 5100;
const PORT_RANGE_END = 5120;
const READY_TIMEOUT_MS = 45000;
const ROUTE_REQUEST_TIMEOUT_MS = 6000;
const MAX_ROUTES_CHECKED = 25;

const portsInUse = new Set<number>();

export interface RuntimeSmokeResult {
  ok: boolean;
  issues: string[];
  routesChecked: number;
}

function findFreePort(): number | null {
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (!portsInUse.has(port)) return port;
  }
  return null;
}

export interface DiscoveredRoute {
  urlPath: string;
  method: "GET" | "POST";
}

/** Convertit un chemin de fichier route.ts App Router en URL, en substituant les segments dynamiques simples. */
export function routeFileToUrlPath(relativeDir: string): string | null {
  const segments = relativeDir.split(path.sep).filter(Boolean);
  const urlSegments: string[] = [];
  for (const seg of segments) {
    if (seg.startsWith("(") && seg.endsWith(")")) continue; // groupe de routes, pas dans l'URL
    if (seg.startsWith("[...") || seg.startsWith("[[...")) return null; // catch-all : trop ambigu pour un test generique
    if (seg.startsWith("[") && seg.endsWith("]")) {
      urlSegments.push("smoketest");
      continue;
    }
    urlSegments.push(seg);
  }
  return "/" + urlSegments.join("/");
}

export function discoverApiRoutes(projectDir: string): DiscoveredRoute[] {
  const apiRoot = path.join(projectDir, "src", "app", "api");
  if (!fs.existsSync(apiRoot)) return [];

  const routes: DiscoveredRoute[] = [];

  function walk(dir: string) {
    if (routes.length >= MAX_ROUTES_CHECKED) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (routes.length >= MAX_ROUTES_CHECKED) return;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.name !== "route.ts" && entry.name !== "route.tsx") continue;

      const relativeDir = path.relative(apiRoot, dir);
      const urlPath = routeFileToUrlPath(relativeDir);
      if (!urlPath) continue;

      const content = fs.readFileSync(fullPath, "utf-8");
      const method: "GET" | "POST" | null = /export\s+(async\s+)?function\s+GET\b/.test(content)
        ? "GET"
        : /export\s+(async\s+)?function\s+POST\b/.test(content)
          ? "POST"
          : null;
      if (!method) continue; // seule methode exportee non testable simplement (PUT/PATCH/DELETE necessitent un etat existant)

      routes.push({ urlPath: "/api" + urlPath, method });
    }
  }

  walk(apiRoot);
  return routes;
}

async function waitForReady(port: number, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.status < 500) return true;
    } catch {
      // pas encore pret
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function killProcessGroup(child: ChildProcess) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    // deja termine
  }
}

export async function runRuntimeSmokeTest(projectDir: string, projectId: string): Promise<RuntimeSmokeResult> {
  const issues: string[] = [];
  const routes = discoverApiRoutes(projectDir);

  const port = findFreePort();
  if (port === null) {
    // Aucun creneau libre : ne bloque pas la generation pour une contrainte de capacite locale,
    // mais on le signale distinctement d'un vrai echec applicatif.
    return { ok: true, issues: ["Vérification runtime ignorée (aucun port de test disponible)"], routesChecked: 0 };
  }
  portsInUse.add(port);

  let child: ChildProcess | null = null;

  try {
    child = spawn(
      "systemd-run",
      ["--user", "--scope", "--property=MemoryMax=300M", "npx", "next", "start", "-p", String(port), "-H", "0.0.0.0"],
      { cwd: projectDir, detached: true, stdio: "ignore" }
    );
    child.unref();

    const ready = await waitForReady(port, READY_TIMEOUT_MS);
    if (!ready) {
      return {
        ok: false,
        issues: ["Le serveur ne démarre pas en mode production (`next start`) alors que `next build` a réussi"],
        routesChecked: 0,
      };
    }

    let routesChecked = 0;
    for (const route of routes) {
      routesChecked++;
      try {
        const res = await fetchWithTimeout(
          `http://localhost:${port}${route.urlPath}`,
          {
            method: route.method,
            headers: { "content-type": "application/json" },
            body: route.method === "POST" ? "{}" : undefined,
          },
          ROUTE_REQUEST_TIMEOUT_MS
        );
        if (res.status >= 500) {
          issues.push(`${route.method} ${route.urlPath} répond ${res.status} (erreur serveur non gérée)`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        issues.push(`${route.method} ${route.urlPath} injoignable ou expirée (${msg})`);
      }
    }

    // Test de persistance explicite : une inscription qui "reussit" (200) mais
    // ne persiste rien est exactement le cas signale dans l'audit - une simple
    // verification de statut HTTP sur /signup seul ne l'aurait jamais detecte.
    const hasSignup = routes.some((r) => r.urlPath === "/api/auth/signup" && r.method === "POST");
    const hasLogin = routes.some((r) => r.urlPath === "/api/auth/login" && r.method === "POST");
    if (hasSignup && hasLogin) {
      const testEmail = `smoketest-${Date.now()}@zovo-internal.test`;
      const testPassword = "SmokeTest!2026";
      try {
        const signupRes = await fetchWithTimeout(
          `http://localhost:${port}/api/auth/signup`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "Smoke Test", email: testEmail, password: testPassword }),
          },
          ROUTE_REQUEST_TIMEOUT_MS
        );
        if (signupRes.status >= 200 && signupRes.status < 300) {
          const loginRes = await fetchWithTimeout(
            `http://localhost:${port}/api/auth/login`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email: testEmail, password: testPassword }),
            },
            ROUTE_REQUEST_TIMEOUT_MS
          );
          if (loginRes.status < 200 || loginRes.status >= 300) {
            issues.push(
              `L'inscription (/api/auth/signup) répond succès mais la connexion immédiate avec les mêmes identifiants échoue (${loginRes.status}) — le compte ne semble pas persisté`
            );
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        issues.push(`Test d'inscription/connexion impossible à exécuter (${msg})`);
      }
    }

    return { ok: issues.length === 0, issues, routesChecked };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, issues: [`Vérification runtime impossible à exécuter (${msg})`], routesChecked: 0 };
  } finally {
    if (child) killProcessGroup(child);
    portsInUse.delete(port);
  }
}
