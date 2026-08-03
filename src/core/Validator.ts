import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const AI_BRIDGE_URL = process.env.AI_BRIDGE_URL || "https://ai.zovo.ca/api/generate";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  fixedFiles: string[];
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

function runTypeCheck(projectDir: string): { ok: boolean; output: string } {
  try {
    execSync("./node_modules/.bin/tsc --noEmit --skipLibCheck", {
      cwd: projectDir,
      stdio: "pipe",
      timeout: 60000,
    });
    return { ok: true, output: "" };
  } catch (err: unknown) {
    const e = err as { stdout?: { toString(): string }; stderr?: { toString(): string } };
    const output = (e.stdout?.toString() || "") + (e.stderr?.toString() || "");
    return { ok: false, output };
  }
}

export function extractFileErrors(tscOutput: string): Map<string, string[]> {
  const fileErrors = new Map<string, string[]>();
  const lines = tscOutput.split("\n");

  for (const line of lines) {
    const match = line.match(/^(.+?\.tsx?)\(\d+,\d+\):\s*(error.+)$/);
    if (match) {
      const [, file, error] = match;
      const cleanFile = file.trim();
      if (!fileErrors.has(cleanFile)) {
        fileErrors.set(cleanFile, []);
      }
      fileErrors.get(cleanFile)!.push(error.trim());
    }
  }

  return fileErrors;
}

// Supprime les directives "use client" malformées (sans guillemets, ex: "use client;"
// au lieu de '"use client";') laissées telles quelles par l'IA — syntaxe invalide en TS
// qui provoque TS1434 (Unexpected keyword or identifier).
function stripMalformedUseClientDirective(projectDir: string): string[] {
  const fixedFiles: string[] = [];
  const srcDir = path.join(projectDir, "src");
  if (!fs.existsSync(srcDir)) return fixedFiles;

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(fullPath);
      } else if (/\.(tsx|jsx|ts)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");
        const filtered = lines.filter((line) => !/^use client;?\s*$/.test(line.trim()));

        if (filtered.length !== lines.length) {
          const cleaned = filtered.join("\n").replace(/\n{3,}/g, "\n\n");
          fs.writeFileSync(fullPath, cleaned, "utf-8");
          fixedFiles.push(path.relative(projectDir, fullPath));
        }
      }
    }
  }

  walk(srcDir);
  return fixedFiles;
}

const REACT_HOOKS_PATTERN = /\b(useState|useEffect|useRef|useReducer|useContext|useMemo|useCallback|useLayoutEffect|useTransition|useDeferredValue|useImperativeHandle|useSyncExternalStore|useId)\s*\(/;

function fixMissingUseClientDirective(projectDir: string): string[] {
  const fixedFiles: string[] = [];
  const srcDir = path.join(projectDir, "src");
  if (!fs.existsSync(srcDir)) return fixedFiles;

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        walk(fullPath);
      } else if (/\.(tsx|jsx)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const trimmed = content.trimStart();
        const alreadyHasDirective = /^["']use client["'];?/.test(trimmed);
        const usesHooks = REACT_HOOKS_PATTERN.test(content);

        if (usesHooks && !alreadyHasDirective) {
          const fixed = '"use client";\n\n' + content;
          fs.writeFileSync(fullPath, fixed, "utf-8");
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

async function regenerateFile(
  filePath: string,
  relativeFile: string,
  errors: string[],
  originalPrompt: string
): Promise<boolean> {
  const errorSummary = errors.join("\n");

  const codePrompt = `Tu es ZOVO Builder AI. Le fichier "${relativeFile}" contient des erreurs TypeScript. Corrige-le.

Contexte du projet original : ${originalPrompt}

Erreurs TypeScript détectées :
${errorSummary}

Contenu actuel du fichier :
${fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "(fichier vide)"}

Règles strictes :
- Retourne UNIQUEMENT le code source corrigé du fichier, sans markdown, sans backticks, sans explication.
- Corrige les erreurs listées tout en gardant la logique et l'intention du fichier.
- Le code doit être valide TypeScript complet.`;

  try {
    const response = await fetch(AI_BRIDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: codePrompt }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    let content: string = data.response || "";
    content = content.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();

    if (!content) return false;

    fs.writeFileSync(filePath, content + "\n", "utf-8");
    return true;
  } catch {
    return false;
  }
}

export class Validator {

  async validate(
    projectDir: string,
    originalPrompt: string,
    maxAttempts: number = 2
  ): Promise<ValidationResult> {
    const fixedFiles: string[] = [];

    const installed = installDependencies(projectDir);
    if (!installed) {
      return { valid: false, errors: ["Échec de l'installation des dépendances (npm install)"], fixedFiles };
    }

    const jsxExtensionFixes = fixTsFilesContainingJsx(projectDir);
    fixedFiles.push(...jsxExtensionFixes);

    const malformedDirectiveFixes = stripMalformedUseClientDirective(projectDir);
    fixedFiles.push(...malformedDirectiveFixes);

    const useClientFixes = fixMissingUseClientDirective(projectDir);
    fixedFiles.push(...useClientFixes);

    let attempt = 0;

    while (attempt <= maxAttempts) {
      const repeatedJsxExtensionFixes = fixTsFilesContainingJsx(projectDir);
      fixedFiles.push(...repeatedJsxExtensionFixes);

      const repeatedMalformedDirectiveFixes = stripMalformedUseClientDirective(projectDir);
      fixedFiles.push(...repeatedMalformedDirectiveFixes);

      const repeatedUseClientFixes = fixMissingUseClientDirective(projectDir);
      fixedFiles.push(...repeatedUseClientFixes);

      const { ok, output } = runTypeCheck(projectDir);

      if (ok) {
        return { valid: true, errors: [], fixedFiles };
      }

      const fileErrors = extractFileErrors(output);

      if (fileErrors.size === 0 || attempt === maxAttempts) {
        return {
          valid: false,
          errors: fileErrors.size > 0
            ? Array.from(fileErrors.entries()).map(([file, errs]) => `${file}: ${errs.join("; ")}`)
            : [output.slice(0, 500) || "Erreur tsc inconnue"],
          fixedFiles,
        };
      }

      for (const [relativeFile, errors] of fileErrors) {
        const filePath = path.join(projectDir, relativeFile);
        const success = await regenerateFile(filePath, relativeFile, errors, originalPrompt);
        if (success) fixedFiles.push(relativeFile);
      }

      attempt++;
    }

    return { valid: false, errors: ["Validation abandonnée après plusieurs tentatives"], fixedFiles };
  }
}

const validatorInstance = new Validator();
export default validatorInstance;
