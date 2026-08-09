import { runEnvironmentDoctor, runCodeDoctor } from "./Doctor";
import { extractFileErrors, extractBuildFileErrors } from "./ErrorCollector";
import { runTypeCheck, runNextBuild } from "./BuildRunner";
export { extractFileErrors, extractBuildFileErrors };
export { runTypeCheck, runNextBuild };
import { execSync } from "child_process";
import fs from "fs";
import * as ts from "typescript";
import path from "path";
import { fixDirectives } from "./DirectiveFixer";

const AI_BRIDGE_URL = process.env.AI_BRIDGE_URL || "https://ai.zovo.ca/api/generate";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  fixedFiles: string[];
  attempts?: number;
}

function installDependencies(projectDir: string): boolean {
  try {
    execSync("npm install --no-audit --no-fund", {
      cwd: projectDir,
      stdio: "pipe",
      timeout: 120000,
      env: { ...process.env, PATH: process.env.PATH || "/usr/bin:/usr/local/bin" },
    });
    return true;
  } catch (err: unknown) {
    const e = err as { message?: string; stdout?: { toString(): string }; stderr?: { toString(): string } };
    console.error(
      "[Validator] npm install a échoué:",
      e?.message,
      "| stdout:", e?.stdout?.toString()?.slice(0, 500),
      "| stderr:", e?.stderr?.toString()?.slice(0, 500)
    );
    return false;
  }
}







function fixCommonHallucinations(projectDir: string): string[] {
  const fixedFiles: string[] = [];
  const srcDir = path.join(projectDir, "src");
  if (!fs.existsSync(srcDir)) return fixedFiles;

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(fullPath);
      } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
        let content = fs.readFileSync(fullPath, "utf-8");
        let changed = false;

        if (/from\s+["']next\/router["']/.test(content)) {
          content = content.replace(/from\s+["']next\/router["']/g, 'from "next/navigation"');
          changed = true;
        }

        const unguardedGlobal = /(?<!typeof\s)(?:z\.instanceof\(|:\s*)(FileList|File|Blob)\b/;
        if (unguardedGlobal.test(content) && !/typeof\s+(FileList|File|Blob)/.test(content)) {
          content = content.replace(
            /z\.instanceof\((FileList|File|Blob)\)/g,
            (_match, cls) =>
              `z.custom<${cls} | undefined>((val) => val === undefined || (typeof ${cls} !== "undefined" && val instanceof ${cls}), { message: "Fichier invalide" })`
          );
          changed = true;
        }

        if (changed) {
          fs.writeFileSync(fullPath, content, "utf-8");
          fixedFiles.push(path.relative(projectDir, fullPath));
        }
      }
    }
  }

  walk(srcDir);
  return fixedFiles;
}

const JSX_RETURN_PATTERN = /return\s*\(\s*<[A-Za-z]|return\s+<[A-Za-z]/;


function fixTsFilesContainingJsx(projectDir: string): string[] {
  const fixedFiles: string[] = [];
  const srcDir = path.join(projectDir, "src");
  if (!fs.existsSync(srcDir)) return fixedFiles;

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(fullPath);
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (JSX_RETURN_PATTERN.test(content)) {
          const newPath = fullPath.slice(0, -3) + ".tsx";
          fs.renameSync(fullPath, newPath);
          fixedFiles.push(path.relative(projectDir, newPath));
        }
      }
    }
  }

  walk(srcDir);
  return fixedFiles;
}

function fixMalformedPrismaSchema(projectDir: string): string[] {
  const fixedFiles: string[] = [];
  const schemaPath = path.join(projectDir, "prisma", "schema.prisma");
  if (!fs.existsSync(schemaPath)) return fixedFiles;

  const content = fs.readFileSync(schemaPath, "utf-8");
  const lines = content.split("\n");
  const filtered = lines.filter((line) => !/^\s*generator\s+"[^"]*"\s*$/.test(line));

  if (filtered.length !== lines.length) {
    const cleaned = filtered.join("\n").replace(/^\n+/, "");
    fs.writeFileSync(schemaPath, cleaned, "utf-8");
    fixedFiles.push(path.relative(projectDir, schemaPath));
  }

  return fixedFiles;
}

function resolveLocalImport(projectDir: string, fromFile: string, importPath: string): string | null {
  let basePath: string;
  if (importPath.startsWith("@/")) {
    basePath = path.join(projectDir, "src", importPath.slice(2));
  } else if (importPath.startsWith(".")) {
    basePath = path.join(path.dirname(fromFile), importPath);
  } else {
    return null; // package npm, pas un fichier local
  }

  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}/index.ts`,
    `${basePath}/index.tsx`,
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function isLocalImportPath(importPath: string): boolean {
  return importPath.startsWith("@/") || importPath.startsWith(".");
}

// Retourne les chemins d'import locaux (relatifs ou @/) présents dans le contenu qui ne
// résolvent vers AUCUN fichier réel — signe que l'IA a inventé un module.
function findInventedLocalImports(projectDir: string, filePath: string, content: string): string[] {
  const invented: string[] = [];
  const importMatches = content.matchAll(/from\s+["']([^"']+)["']/g);
  for (const match of importMatches) {
    const importPath = match[1];
    if (!isLocalImportPath(importPath)) continue;
    const resolved = resolveLocalImport(projectDir, filePath, importPath);
    if (!resolved) invented.push(importPath);
  }
  return [...new Set(invented)];
}

function readPackageDependencies(projectDir: string): string[] {
  const pkgPath = path.join(projectDir, "package.json");
  if (!fs.existsSync(pkgPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  } catch {
    return [];
  }
}

function getRelatedFilesContext(projectDir: string, filePath: string): string {
  if (!fs.existsSync(filePath)) return "";
  const content = fs.readFileSync(filePath, "utf-8");
  const importMatches = content.matchAll(/from\s+["']([^"']+)["']/g);
  const seen = new Set<string>();
  const sections: string[] = [];

  for (const match of importMatches) {
    const importPath = match[1];
    const resolved = resolveLocalImport(projectDir, filePath, importPath);
    if (resolved && !seen.has(resolved) && resolved !== filePath) {
      seen.add(resolved);
      const relatedContent = fs.readFileSync(resolved, "utf-8").slice(0, 1500);
      sections.push(`--- ${path.relative(projectDir, resolved)} ---\n${relatedContent}`);
    }
  }

  const schemaPath = path.join(projectDir, "prisma", "schema.prisma");
  if (fs.existsSync(schemaPath) && !seen.has(schemaPath)) {
    sections.push(`--- prisma/schema.prisma ---\n${fs.readFileSync(schemaPath, "utf-8").slice(0, 2000)}`);
  }

  const deps = readPackageDependencies(projectDir);
  const depsSection = deps.length > 0
    ? `\n\nDépendances npm réellement installées (n'importe AUCUN autre package) :\n${deps.join(", ")}`
    : "";

  if (sections.length === 0 && !depsSection) return "";
  return `\n\nFichiers réels qu'il importe (NE JAMAIS inventer un export ou un champ absent d'ici) :\n${sections.join("\n\n")}${depsSection}`;
}

async function callAiBridge(prompt: string): Promise<string | null> {
  try {
    const response = await fetch(AI_BRIDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    let content: string = data.response || "";
    content = content.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();
    return content || null;
  } catch {
    return null;
  }
}

async function regenerateFile(
  projectDir: string,
  filePath: string,
  relativeFile: string,
  errors: string[],
  originalPrompt: string
): Promise<boolean> {
  const errorSummary = errors.join("\n");
  const relatedContext = getRelatedFilesContext(projectDir, filePath);

  const codePrompt = `Tu es ZOVO Builder AI. Le fichier "${relativeFile}" contient des erreurs. Corrige-le.

Contexte du projet original : ${originalPrompt}

Erreurs détectées :
${errorSummary}

Contenu actuel du fichier :
${fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "(fichier vide)"}
${relatedContext}

Règles strictes :
- Retourne UNIQUEMENT le code source corrigé du fichier, sans markdown, sans backticks, sans explication.
- Corrige les erreurs listées tout en gardant la logique et l'intention du fichier.
- N'importe QUE des modules/exports qui existent réellement dans les fichiers réels listés ci-dessus (s'il y en a) ou dans les dépendances npm listées. N'invente JAMAIS un nouveau fichier, un nouveau module, ou un export absent.
- Si tu as besoin d'une fonction utilitaire qui n'existe dans aucun fichier listé, écris-la directement DANS ce fichier plutôt que de l'importer d'un fichier qui n'existe pas.
- Le code doit être valide et complet.`;

  let content = await callAiBridge(codePrompt);
  if (!content) return false;

  // Anti-hallucination : vérifie que l'IA n'a pas inventé de nouveaux imports locaux
  // malgré l'instruction. Si oui, une seconde tentative explicite avant d'accepter.
  const invented = findInventedLocalImports(projectDir, filePath, content);
  if (invented.length > 0) {
    const retryPrompt = `${codePrompt}

ATTENTION : ta réponse précédente importait ces chemins qui N'EXISTENT PAS : ${invented.join(", ")}.
Corrige à nouveau en éliminant ces imports : soit tu inlines directement le code nécessaire dans ce fichier, soit tu retires la fonctionnalité qui en dépend. Ne réintroduis aucun de ces chemins ni aucun autre chemin inventé.`;

    const retryContent = await callAiBridge(retryPrompt);
    if (retryContent) {
      const stillInvented = findInventedLocalImports(projectDir, filePath, retryContent);
      if (stillInvented.length === 0) {
        content = retryContent;
      } else {
        console.warn(`[Validator] ${relativeFile} importe encore des chemins inventés après retry:`, stillInvented);
      }
    }
  }

  fs.writeFileSync(filePath, content + "\n", "utf-8");
  return true;
}


function routeExistsForSegments(projectDir: string, segments: string[]): boolean {
  let currentDir = path.join(projectDir, "src", "app", "api");
  for (const segment of segments) {
    if (!fs.existsSync(currentDir)) return false;
    const isDynamic = /^\$\{[^}]+\}$/.test(segment);
    if (isDynamic) {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      const paramDir = entries.find((e) => e.isDirectory() && /^\[.+\]$/.test(e.name));
      if (!paramDir) return false;
      currentDir = path.join(currentDir, paramDir.name);
    } else {
      const literalDir = path.join(currentDir, segment);
      if (!fs.existsSync(literalDir)) return false;
      currentDir = literalDir;
    }
  }
  return fs.existsSync(path.join(currentDir, "route.ts"));
}

function toRouteSegment(segment: string): string {
  const dynamicMatch = segment.match(/^\$\{([^}]+)\}$/);
  if (!dynamicMatch) return segment;
  const varExpr = dynamicMatch[1];
  const paramName = varExpr.split(".").pop() || "id";
  return `[${paramName}]`;
}

export function findInventedApiRoutes(projectDir: string, content: string): string[] {
  const invented: string[] = [];
  const fetchMatches = content.matchAll(/fetch\(\s*[`"']\/api\/([^`"'\s?]+)/g);
  for (const match of fetchMatches) {
    const rawPath = match[1];
    const segments = rawPath.split("/").filter(Boolean);
    if (routeExistsForSegments(projectDir, segments)) continue;
    invented.push("/api/" + rawPath);
  }
  return [...new Set(invented)];
}

export async function generateMissingApiRoute(
  projectDir: string,
  apiPath: string,
  callerContext: string,
  originalPrompt: string
): Promise<boolean> {
  const segments = apiPath.replace(/^\/api\//, "").split("/").filter(Boolean).map(toRouteSegment);
  const routeDir = path.join(projectDir, "src", "app", "api", ...segments);
  const routeFile = path.join(routeDir, "route.ts");
  if (fs.existsSync(routeFile)) return false;

  const schemaPath = path.join(projectDir, "prisma", "schema.prisma");
  const schemaContext = fs.existsSync(schemaPath)
    ? `\n\nSchéma Prisma réel du projet (n'invente aucun champ absent d'ici) :\n${fs.readFileSync(schemaPath, "utf-8").slice(0, 2000)}`
    : "";
  const deps = readPackageDependencies(projectDir);
  const depsContext = deps.length > 0 ? `\n\nDépendances npm installées : ${deps.join(", ")}` : "";

  const prompt = `Tu es ZOVO Builder AI. La route API Next.js App Router "${apiPath}" est appelée par du code client mais n'existe pas encore. Crée-la.

Contexte du projet original : ${originalPrompt}

Extrait du code appelant (pour déduire la méthode HTTP, le corps envoyé, et la réponse attendue) :
${callerContext}
${schemaContext}${depsContext}

Règles strictes :
- Retourne UNIQUEMENT le code source du fichier route.ts, sans markdown, sans backticks, sans explication.
- Utilise le App Router Next.js (export async function GET/POST/PATCH/DELETE selon la méthode utilisée par l'appelant).
- Utilise Prisma pour toute persistance, avec les modèles réels du schéma listé ci-dessus. N'invente aucun champ ni modèle absent du schéma.
- Retourne des réponses JSON via NextResponse.json() cohérentes avec ce que le code appelant attend de lire.
- N'importe QUE des modules/exports qui existent réellement dans les dépendances npm listées ci-dessus.
- Le code doit être valide et complet.`;

  const content = await callAiBridge(prompt);
  if (!content) return false;

  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(routeFile, content + "\n", "utf-8");
  return true;
}

function extractCallerContext(content: string, apiPath: string): string {
  const lines = content.split("\n");
  const idx = lines.findIndex((l) => l.includes(apiPath));
  if (idx === -1) return content.slice(0, 800);
  const start = Math.max(0, idx - 15);
  const end = Math.min(lines.length, idx + 15);
  return lines.slice(start, end).join("\n");
}

function fixMissingDatasource(projectDir: string): string[] {
  const fixed: string[] = [];
  const schemaPath = path.join(projectDir, "prisma", "schema.prisma");
  if (!fs.existsSync(schemaPath)) return fixed;
  let content = fs.readFileSync(schemaPath, "utf-8");

  const generatorBlocks = content.match(/generator\s+\w+\s*{[^}]*}/g) || [];
  const datasourceBlocks = content.match(/datasource\s+\w+\s*{[^}]*}/g) || [];
  let changed = false;

  if (datasourceBlocks.length === 0) {
    content = `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\n` + content;
    changed = true;
  } else if (datasourceBlocks.length > 1) {
    let count = 0;
    content = content.replace(/datasource\s+\w+\s*{[^}]*}/g, (m) => (++count === 1 ? m : ""));
    changed = true;
  }

  if (generatorBlocks.length === 0) {
    content = `generator client {\n  provider = "prisma-client-js"\n}\n\n` + content;
    changed = true;
  } else if (generatorBlocks.length > 1) {
    let count = 0;
    content = content.replace(/generator\s+\w+\s*{[^}]*}/g, (m) => (++count === 1 ? m : ""));
    changed = true;
  }

  if (changed) {
    content = content.replace(/\n{3,}/g, "\n\n");
    fs.writeFileSync(schemaPath, content, "utf-8");
    fixed.push("prisma/schema.prisma");
  }
  return fixed;
}

function fixMismatchedPrismaModelNames(projectDir: string): string[] {
  const fixed: string[] = [];
  const schemaPath = path.join(projectDir, "prisma", "schema.prisma");
  if (!fs.existsSync(schemaPath)) return fixed;
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  const modelNames = new Set<string>();
  const modelRegex = /model\s+(\w+)\s*{/g;
  let m;
  while ((m = modelRegex.exec(schemaContent)) !== null) modelNames.add(m[1]);
  if (modelNames.size === 0) return fixed;

  const lowerToReal = new Map<string, string>();
  for (const name of modelNames) lowerToReal.set(name.charAt(0).toLowerCase() + name.slice(1), name);

  const srcDir = path.join(projectDir, "src");
  if (!fs.existsSync(srcDir)) return fixed;

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(fullPath);
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        let content = fs.readFileSync(fullPath, "utf-8");
        let changed = false;
        content = content.replace(/prisma\.(\w+)\./g, (match, accessor) => {
          if (lowerToReal.has(accessor)) return match;
          for (const [validLower] of lowerToReal) {
            if (validLower.toLowerCase() === accessor.toLowerCase()) {
              changed = true;
              return `prisma.${validLower}.`;
            }
          }
          return match;
        });
        if (changed) {
          fs.writeFileSync(fullPath, content, "utf-8");
          fixed.push(path.relative(projectDir, fullPath));
        }
      }
    }
  }
  walk(srcDir);
  return fixed;
}

export function fixInconsistentComponentProps(projectDir: string): string[] {
  const fixed: string[] = [];
  const srcDir = path.join(projectDir, "src");
  if (!fs.existsSync(srcDir)) return fixed;

  const componentFiles: string[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(fullPath);
      } else if (/\.tsx$/.test(entry.name)) {
        componentFiles.push(fullPath);
      }
    }
  }
  walk(srcDir);

  function getParamCount(params: readonly ts.ParameterDeclaration[]): number {
    if (params.length === 0) return 0;
    const first = params[0];
    if (ts.isObjectBindingPattern(first.name) && first.name.elements.length === 0) return 0;
    return params.length;
  }

  const acceptsProps = new Map<string, boolean>();

  for (const filePath of componentFiles) {
    const src = fs.readFileSync(filePath, "utf-8");
    const baseName = path.basename(filePath, path.extname(filePath));
    const sourceFile = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    let exportedName: string | null = null;
    let exportedParams: readonly ts.ParameterDeclaration[] | null = null;

    sourceFile.forEachChild(function visit(node: ts.Node) {
      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        node.modifiers?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
      ) {
        exportedParams = node.parameters;
      }
      if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) {
        exportedName = node.expression.text;
      }
      ts.forEachChild(node, visit);
    });

    if (!exportedParams && exportedName) {
      const target = exportedName;
      sourceFile.forEachChild(function find(node: ts.Node) {
        if (
          ts.isVariableDeclaration(node) &&
          ts.isIdentifier(node.name) &&
          node.name.text === target &&
          node.initializer &&
          (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
        ) {
          exportedParams = node.initializer.parameters;
        }
        if (ts.isFunctionDeclaration(node) && node.name?.text === target) {
          exportedParams = node.parameters;
        }
        ts.forEachChild(node, find);
      });
    }

    if (exportedParams) {
      acceptsProps.set(baseName, getParamCount(exportedParams) > 0);
    }
  }

  for (const filePath of componentFiles) {
    const src = fs.readFileSync(filePath, "utf-8");
    const sourceFile = ts.createSourceFile(filePath, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const edits: { start: number; end: number; text: string }[] = [];

    function visitJsx(node: ts.Node) {
      if (ts.isJsxElement(node)) {
        const tagName = node.openingElement.tagName.getText(sourceFile);
        const hasProps = acceptsProps.get(tagName);
        if (hasProps === false) {
          edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), text: `<${tagName} />` });
          return;
        }
      }
      if (ts.isJsxSelfClosingElement(node)) {
        const tagName = node.tagName.getText(sourceFile);
        const hasProps = acceptsProps.get(tagName);
        if (hasProps === false && node.attributes.properties.length > 0) {
          edits.push({ start: node.getStart(sourceFile), end: node.getEnd(), text: `<${tagName} />` });
        }
      }
      ts.forEachChild(node, visitJsx);
    }
    visitJsx(sourceFile);

    if (edits.length > 0) {
      edits.sort((a, b) => b.start - a.start);
      let content = src;
      for (const e of edits) {
        content = content.slice(0, e.start) + e.text + content.slice(e.end);
      }
      fs.writeFileSync(filePath, content, "utf-8");
      fixed.push(path.relative(projectDir, filePath));
    }
  }
  return fixed;
}


export class Validator {

  async validate(
    projectDir: string,
    originalPrompt: string,
    maxAttempts: number = 2
  ): Promise<ValidationResult> {
    const fixedFiles: string[] = [];
    const envReport = runEnvironmentDoctor();
    if (!envReport.ok) {
      const fatalIssues = envReport.issues.filter((i: { fatal: boolean }) => i.fatal).map((i: { message: string }) => i.message);
      return { valid: false, errors: fatalIssues, fixedFiles: [], attempts: 0 };
    }


    const installed = installDependencies(projectDir);
    if (!installed) {
      return { valid: false, errors: ["Échec de l'installation des dépendances (npm install)"], fixedFiles, attempts: 0 };
    }


    const doctorFixes = runCodeDoctor(projectDir);
    fixedFiles.push(...doctorFixes);

    const jsxExtensionFixes = fixTsFilesContainingJsx(projectDir);
    fixedFiles.push(...jsxExtensionFixes);

    const malformedDirectiveFixes = fixDirectives(projectDir);
    fixedFiles.push(...malformedDirectiveFixes.map((r) => r.file));

    const hallucinationFixes = fixCommonHallucinations(projectDir);
    fixedFiles.push(...hallucinationFixes);


    const prismaSchemaFixes = fixMalformedPrismaSchema(projectDir);
    fixedFiles.push(...prismaSchemaFixes);

    const datasourceFixes = fixMissingDatasource(projectDir);
    fixedFiles.push(...datasourceFixes);
    const modelNameFixes = fixMismatchedPrismaModelNames(projectDir);
    fixedFiles.push(...modelNameFixes);

    const srcDirForApi = path.join(projectDir, "src");
    if (fs.existsSync(srcDirForApi)) {
      const apiScanFiles: string[] = [];
      function walkForApi(dir: string) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name === "node_modules" || entry.name === ".next") continue;
            walkForApi(fullPath);
          } else if (/\.(tsx|ts)$/.test(entry.name) && !fullPath.includes(path.sep + "api" + path.sep)) {
            apiScanFiles.push(fullPath);
          }
        }
      }
      walkForApi(srcDirForApi);

      const seenRoutes = new Set<string>();
      for (const filePath of apiScanFiles) {
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const inventedRoutes = findInventedApiRoutes(projectDir, fileContent);
        for (const apiPath of inventedRoutes) {
          if (seenRoutes.has(apiPath)) continue;
          seenRoutes.add(apiPath);
          const callerContext = extractCallerContext(fileContent, apiPath);
          const created = await generateMissingApiRoute(projectDir, apiPath, callerContext, originalPrompt);
          if (created) {
            fixedFiles.push("src/app/api" + apiPath.replace(/^\/api/, "") + "/route.ts");
          }
        }
      }
    }
    const propFixes = fixInconsistentComponentProps(projectDir);
    fixedFiles.push(...propFixes);

    let blueprintForRoutes: any = {};
    try {
      const bpPath = path.join(projectDir, ".zovo-blueprint.json");
      if (fs.existsSync(bpPath)) {
        blueprintForRoutes = JSON.parse(fs.readFileSync(bpPath, "utf-8"));
      }
    } catch {}
    const fixedRoutes = fixMissingRoutePages(projectDir, blueprintForRoutes);
    if (fixedRoutes.length > 0) {
      console.log(`Pages générées automatiquement: ${fixedRoutes.join(", ")}`);
      fixedFiles.push(...fixedRoutes.map((r) => `src/app${r}/page.tsx`));
    }

    let attempt = 0;

    while (attempt <= maxAttempts) {
      const repeatedJsxExtensionFixes = fixTsFilesContainingJsx(projectDir);
      fixedFiles.push(...repeatedJsxExtensionFixes);

      const repeatedMalformedDirectiveFixes = fixDirectives(projectDir);
      fixedFiles.push(...repeatedMalformedDirectiveFixes.map((r) => r.file));

      const repeatedHallucinationFixes = fixCommonHallucinations(projectDir);
      fixedFiles.push(...repeatedHallucinationFixes);


      const repeatedPrismaSchemaFixes = fixMalformedPrismaSchema(projectDir);
      fixedFiles.push(...repeatedPrismaSchemaFixes);

      const repeatedDatasourceFixes = fixMissingDatasource(projectDir);
      fixedFiles.push(...repeatedDatasourceFixes);
      const repeatedModelNameFixes = fixMismatchedPrismaModelNames(projectDir);
      fixedFiles.push(...repeatedModelNameFixes);
      const repeatedPropFixes = fixInconsistentComponentProps(projectDir);
      fixedFiles.push(...repeatedPropFixes);

      const { ok, output } = runTypeCheck(projectDir);

      if (ok) {
        const buildResult = runNextBuild(projectDir);
        if (buildResult.ok) {
          return { valid: true, errors: [], fixedFiles, attempts: attempt };
        }

        const buildFileErrors = extractBuildFileErrors(buildResult.output);

        if (buildFileErrors.size === 0 || attempt === maxAttempts) {
          return {
            valid: false,
            errors: buildFileErrors.size > 0
              ? Array.from(buildFileErrors.entries()).map(([file, errs]) => `${file}: ${errs.join("; ")}`)
              : [buildResult.output.slice(0, 500) || "Erreur de build inconnue"],
            fixedFiles,
            attempts: attempt,
          };
        }

        for (const [relativeFile, errors] of buildFileErrors) {
          const filePath = path.join(projectDir, relativeFile);
          const success = await regenerateFile(projectDir, filePath, relativeFile, errors, originalPrompt);
          if (success) fixedFiles.push(relativeFile);
        }

        attempt++;
        continue;
      }

      const fileErrors = extractFileErrors(output);

      if (fileErrors.size === 0 || attempt === maxAttempts) {
        return {
          valid: false,
          errors: fileErrors.size > 0
            ? Array.from(fileErrors.entries()).map(([file, errs]) => `${file}: ${errs.join("; ")}`)
            : [output.slice(0, 500) || "Erreur tsc inconnue"],
          fixedFiles,
          attempts: attempt,
        };
      }

      for (const [relativeFile, errors] of fileErrors) {
        const filePath = path.join(projectDir, relativeFile);
        const success = await regenerateFile(projectDir, filePath, relativeFile, errors, originalPrompt);
        if (success) fixedFiles.push(relativeFile);
      }

      attempt++;
    }

    return { valid: false, errors: ["Validation abandonnée après plusieurs tentatives"], fixedFiles, attempts: attempt };
  }
}

const validatorInstance = new Validator();
export default validatorInstance;

const ROUTE_COMPONENT_MAP: Record<string, string[]> = {
  "/dashboard": ["Dashboard", "DashboardStats"],
  "/login": ["LoginForm"],
  "/signup": ["SignupForm"],
  "/items": ["ItemList", "ItemForm"],
  "/search": ["SearchBar", "SearchResults"],
  "/profile": ["ProfileForm", "AvatarUpload"],
  "/admin": ["AdminPanel", "UserTable"],
};

export function fixMissingRoutePages(
  projectPath: string,
  blueprint: { routes?: string[]; components?: string[] }
): string[] {
  const fs = require("fs");
  const path = require("path");
  const created: string[] = [];
  const routes = (blueprint.routes || []).filter((r) => r !== "/");

  for (const route of routes) {
    const pagePath = path.join(projectPath, "src/app", route.slice(1), "page.tsx");
    if (fs.existsSync(pagePath)) continue;

    const wantedComponents = ROUTE_COMPONENT_MAP[route] || [];
    const availableComponents = wantedComponents.filter((c) =>
      (blueprint.components || []).includes(c)
    );

    if (availableComponents.length === 0) continue;

    const imports = availableComponents
      .map((c) => `import ${c} from "@/components/${c}";`)
      .join("\n");
    const jsx = availableComponents.map((c) => `      <${c} />`).join("\n");

    const content = `${imports}

export default function Page() {
  return (
    <div>
${jsx}
    </div>
  );
}
`;

    fs.mkdirSync(path.dirname(pagePath), { recursive: true });
    fs.writeFileSync(pagePath, content, "utf-8");
    created.push(route);
  }

  return created;
}

const ROUTE_FORBIDDEN_KEYWORDS: Record<string, string[]> = {
  "/": ["ProfilePage", "handleDeleteAccount", "Supprimer le compte", "AdminPanel", "UserTable"],
  "/login": ["ProfilePage", "AdminPanel", "handleDeleteAccount"],
  "/signup": ["ProfilePage", "AdminPanel", "handleDeleteAccount"],
  "/admin": ["LoginForm", "SignupForm", "handleDeleteAccount"],
  "/dashboard": ["LoginForm", "SignupForm"],
};

export function detectMismatchedPageContent(
  projectDir: string,
  routes: string[]
): string[] {
  const suspicious: string[] = [];

  for (const route of routes) {
    const routeSegment = route === "/" ? "" : route.slice(1);
    const pagePath = path.join(projectDir, "src/app", routeSegment, "page.tsx");
    if (!fs.existsSync(pagePath)) continue;

    const content = fs.readFileSync(pagePath, "utf-8");
    const forbidden = ROUTE_FORBIDDEN_KEYWORDS[route] || [];

    for (const keyword of forbidden) {
      if (content.includes(keyword)) {
        suspicious.push(
          `${route}/page.tsx contient "${keyword}", incohérent avec cette route`
        );
      }
    }
  }

  return suspicious;
}

// Mots-clés sémantiques attendus dans le texte visible de chaque route (couche 2)
const ROUTE_EXPECTED_SEMANTICS: Record<string, string[]> = {
  "/": ["bienvenue", "accueil", "connecter", "inscrire"],
  "/login": ["connexion", "email", "mot de passe", "connecter"],
  "/signup": ["inscription", "créer", "compte"],
  "/admin": ["admin", "utilisateur", "gestion"],
  "/profile": ["profil", "compte", "paramètre"],
  "/dashboard": ["tableau", "dashboard", "statistique"],
  "/search": ["recherche", "résultat"],
};

interface HallucinationCheckResult {
  route: string;
  reasons: string[];
  needsAiReview: boolean;
}

export function detectHallucinatedPageContent(
  projectDir: string,
  routes: string[],
  pageComponentMap: Record<string, string[]> = {}
): HallucinationCheckResult[] {
  const results: HallucinationCheckResult[] = [];

  for (const route of routes) {
    if (route === "/") continue;
    const routeSegment = route.slice(1);
    const pagePath = path.join(projectDir, "src/app", routeSegment, "page.tsx");
    if (!fs.existsSync(pagePath)) continue;

    const content = fs.readFileSync(pagePath, "utf-8");
    const reasons: string[] = [];

    // Couche 1 : vérification structurelle des imports vs blueprint
    const actualImports = [...content.matchAll(/from ["']@\/components\/(\w+)["']/g)].map((m) => m[1]);
    const expectedComponents = pageComponentMap[route] || [];
    if (expectedComponents.length > 0 && actualImports.length > 0) {
      const unexpected = actualImports.filter((c) => !expectedComponents.includes(c));
      if (unexpected.length > 0) {
        reasons.push(
          `importe ${unexpected.join(", ")} au lieu des composants attendus (${expectedComponents.join(", ")})`
        );
      }
    }

    // Couche 2 : vérification sémantique légère du texte visible
    const expectedWords = ROUTE_EXPECTED_SEMANTICS[route];
    if (expectedWords) {
      const lowerContent = content.toLowerCase();
      const hasAnyExpectedWord = expectedWords.some((w) => lowerContent.includes(w));
      if (!hasAnyExpectedWord && content.length > 200) {
        reasons.push(
          `aucun mot-clé attendu pour cette route trouvé (${expectedWords.join("/")})`
        );
      }
    }

    if (reasons.length > 0) {
      results.push({ route, reasons, needsAiReview: true });
    }
  }

  return results;
}

// Couche 3 : relecture IA, appelée UNIQUEMENT sur les fichiers déjà suspects (coût minimal)
export async function aiReviewSuspiciousPage(
  route: string,
  pageContent: string,
  aiBridgeUrl: string
): Promise<{ isHallucinated: boolean; explanation: string }> {
  try {
    const prompt = `Voici le contenu d'un fichier page.tsx qui doit correspondre à la route "${route}" d'une application web.

Vérifie si ce code semble cohérent avec cette route, ou s'il contient par erreur le contenu d'une AUTRE page (ex: une page de login qui contient du code de profil utilisateur).

Réponds UNIQUEMENT en JSON strict, sans markdown : {"isHallucinated": true ou false, "explanation": "raison courte"}

Code à analyser :
${pageContent.slice(0, 3000)}`;

    const response = await fetch(aiBridgeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return { isHallucinated: false, explanation: "Revue IA indisponible, validation ignorée" };
    }

    const data = await response.json();
    let raw = (data.response || "").trim();
    raw = raw.replace(/^```json\n?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(raw);

    return {
      isHallucinated: Boolean(parsed.isHallucinated),
      explanation: parsed.explanation || "",
    };
  } catch {
    return { isHallucinated: false, explanation: "Erreur lors de la revue IA, validation ignorée" };
  }
}

// Fonction combinée : couches 1+2 d'abord, puis couche 3 seulement si nécessaire
export async function detectHallucinationWithAiFallback(
  projectDir: string,
  routes: string[],
  pageComponentMap: Record<string, string[]> = {},
  aiBridgeUrl?: string
): Promise<string[]> {
  const structuralHits = detectHallucinatedPageContent(projectDir, routes, pageComponentMap);
  if (structuralHits.length === 0) return [];

  const confirmed: string[] = [];

  for (const hit of structuralHits) {
    if (!aiBridgeUrl) {
      // Sans AI bridge configuré, on se fie uniquement aux couches 1+2
      confirmed.push(`${hit.route}: ${hit.reasons.join("; ")}`);
      continue;
    }

    const routeSegment = hit.route.slice(1);
    const pagePath = path.join(projectDir, "src/app", routeSegment, "page.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");

    const aiResult = await aiReviewSuspiciousPage(hit.route, content, aiBridgeUrl);
    if (aiResult.isHallucinated) {
      confirmed.push(`${hit.route}: ${hit.reasons.join("; ")} [confirmé par IA: ${aiResult.explanation}]`);
    }
    // Si l'IA dit que ce n'est pas une hallucination, on ne le signale pas (faux positif des couches 1+2 filtré)
  }

  return confirmed;
}
