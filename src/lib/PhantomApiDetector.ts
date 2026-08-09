import fs from "fs";
import path from "path";

export interface GeneratedFileLike {
  path: string;
  content: string;
}

export interface PhantomApiCall {
  filePath: string;
  apiPath: string;
  method: string;
  routeFilePath: string;
}

/**
 * Normalise les segments dynamiques d'un chemin fetch (ex: /api/tasks/${id})
 * vers la convention de dossier Next.js App Router (/api/tasks/[id]).
 */
function normalizeApiSegment(rawSegment: string): string {
  return rawSegment
    .split("/")
    .map((part) => {
      // ${id}, ${task.id}, ${params.id}, etc -> [param]
      if (/^\$\{[^}]+\}$/.test(part)) return "[param]";
      return part;
    })
    .join("/");
}

/**
 * Scanne tous les fichiers générés pour trouver des fetch("/api/...")
 * qui ne correspondent à aucun fichier route.ts réel sous src/app/api.
 */
export function findPhantomApiCalls(
  files: GeneratedFileLike[],
  projectPath: string
): PhantomApiCall[] {
  const results: PhantomApiCall[] = [];
  // capture: fetch("/api/xxx", { method: "POST", ... }) ou fetch(`/api/xxx`)
  const fetchRegex =
    /fetch\(\s*[`'"]\/api\/([^`'"]+)[`'"]\s*(?:,\s*\{[^}]*?method\s*:\s*[`'"](\w+)[`'"])?/g;

  for (const file of files) {
    if (!/\.(ts|tsx|js|jsx)$/.test(file.path)) continue;

    let match: RegExpExecArray | null;
    fetchRegex.lastIndex = 0;
    while ((match = fetchRegex.exec(file.content)) !== null) {
      const rawSegment = match[1].split(/[?#]/)[0]; // retire query/hash
      const method = (match[2] || "GET").toUpperCase();
      const normalizedSegment = normalizeApiSegment(rawSegment);

      const routeDir = path.join(projectPath, "src/app/api", normalizedSegment);
      const routeFilePath = path.join(routeDir, "route.ts");

      // Si le dossier exact n'existe pas, on vérifie aussi les dossiers [param]
      // au même niveau (cas où le segment dynamique a été mal normalisé)
      const routeExists =
        fs.existsSync(routeFilePath) || dirHasParamRouteFallback(projectPath, rawSegment);

      if (!routeExists) {
        results.push({
          filePath: file.path,
          apiPath: `/api/${rawSegment}`,
          method,
          routeFilePath,
        });
      }
    }
  }

  return results;
}

/**
 * Fallback : si /api/tasks/abc123/route.ts n'existe pas mais que
 * /api/tasks/[id]/route.ts existe, on considère que la route existe
 * (le segment dynamique n'a pas été détecté correctement par la regex).
 */
function dirHasParamRouteFallback(projectPath: string, rawSegment: string): boolean {
  const parts = rawSegment.split("/");
  if (parts.length < 2) return false;
  const parentParts = parts.slice(0, -1);
  const parentDir = path.join(projectPath, "src/app/api", ...parentParts);
  if (!fs.existsSync(parentDir)) return false;

  const entries = fs.readdirSync(parentDir, { withFileTypes: true });
  return entries.some(
    (e) => e.isDirectory() && /^\[.+\]$/.test(e.name) && fs.existsSync(path.join(parentDir, e.name, "route.ts"))
  );
}

/**
 * Regroupe les appels fantômes par fichier de route attendu
 * (plusieurs méthodes/fichiers peuvent viser la même route).
 */
export function groupPhantomCallsByRoute(
  calls: PhantomApiCall[]
): Map<string, PhantomApiCall[]> {
  const grouped = new Map<string, PhantomApiCall[]>();
  for (const call of calls) {
    const existing = grouped.get(call.routeFilePath) || [];
    existing.push(call);
    grouped.set(call.routeFilePath, existing);
  }
  return grouped;
}

/**
 * Extrait de courts extraits de code autour de chaque appel fetch pour
 * donner du contexte à l'IA (corps envoyé, traitement de la réponse).
 */
export function getCallerSnippets(
  calls: PhantomApiCall[],
  files: GeneratedFileLike[],
  contextLines = 8
): string[] {
  const snippets: string[] = [];
  for (const call of calls) {
    const file = files.find((f) => f.path === call.filePath);
    if (!file) continue;
    const lines = file.content.split("\n");
    const idx = lines.findIndex((l) => l.includes(call.apiPath.split("/").pop() || ""));
    const start = Math.max(0, idx - contextLines);
    const end = Math.min(lines.length, idx + contextLines);
    snippets.push(
      `// Extrait de ${call.filePath} (méthode ${call.method}):\n` +
        lines.slice(start, end).join("\n")
    );
  }
  return snippets;
}
