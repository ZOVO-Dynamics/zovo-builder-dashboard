import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export interface DoctorIssue {
  code: string;
  message: string;
  fatal: boolean;
}

export interface EnvironmentReport {
  ok: boolean;
  issues: DoctorIssue[];
}

export function runEnvironmentDoctor(): EnvironmentReport {
  const issues: DoctorIssue[] = [];

  try {
    const memInfo = fs.readFileSync("/proc/meminfo", "utf-8");
    const availMatch = memInfo.match(/MemAvailable:\s+(\d+)\s+kB/);
    const availMB = availMatch ? Math.floor(parseInt(availMatch[1], 10) / 1024) : null;
    if (availMB !== null && availMB < 500) {
      issues.push({
        code: "LOW_MEMORY",
        message: `Mémoire disponible faible sur l'hôte: ${availMB}MB (< 500MB requis pour un build Next.js/Turbopack)`,
        fatal: true,
      });
    }
  } catch {
    issues.push({ code: "MEMINFO_UNREADABLE", message: "Impossible de lire /proc/meminfo", fatal: false });
  }

  try {
    execSync("systemd-run --scope --property=MemoryMax=64M -- true", { stdio: "pipe", timeout: 5000 });
  } catch (err: unknown) {
    const e = err as { stderr?: { toString(): string } };
    issues.push({
      code: "SYSTEMD_RUN_UNAVAILABLE",
      message: `systemd-run indisponible ou échoue: ${e.stderr?.toString().slice(0, 300) || "raison inconnue"}`,
      fatal: true,
    });
  }

  for (const bin of ["node", "npm", "npx"]) {
    try {
      execSync(`command -v ${bin}`, { stdio: "pipe", timeout: 3000 });
    } catch {
      issues.push({ code: "MISSING_BIN", message: `'${bin}' introuvable dans le PATH`, fatal: true });
    }
  }

  if (!process.env.DATABASE_URL) {
    issues.push({
      code: "MISSING_DATABASE_URL",
      message: "DATABASE_URL absent de l'environnement du service — prisma generate/build peut échouer silencieusement",
      fatal: false,
    });
  }

  try {
    const df = execSync("df -Pk . | tail -1", { cwd: process.cwd(), stdio: "pipe", timeout: 3000 }).toString();
    const parts = df.trim().split(/\s+/);
    const availKB = parseInt(parts[3], 10);
    if (!isNaN(availKB) && availKB < 1024 * 1024) {
      issues.push({
        code: "LOW_DISK",
        message: `Espace disque faible: ${Math.floor(availKB / 1024)}MB disponible (< 1GB)`,
        fatal: true,
      });
    }
  } catch {
    // non fatal si df échoue
  }

  return { ok: !issues.some((i: DoctorIssue) => i.fatal), issues };
}

export function fixPrismaSchemaWrapper(projectDir: string): boolean {
  const schemaPath = path.join(projectDir, "prisma", "schema.prisma");
  if (!fs.existsSync(schemaPath)) return false;

  let content = fs.readFileSync(schemaPath, "utf-8");
  const wrapperPattern = /^\s*generator\s*\(\s*\{\s*schema\s*:\s*`([\s\S]*)`\s*\}\s*\)\s*;?\s*$/;
  const match = content.match(wrapperPattern);
  if (match) {
    content = match[1];
    fs.writeFileSync(schemaPath, content, "utf-8");
    return true;
  }
  return false;
}

export function fixZodDefaultConflict(filePath: string): boolean {
  if (!/\.(ts|tsx)$/.test(filePath) || !fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, "utf-8");

  const hasDefaultValues = /useForm\s*\(\s*\{[^}]*defaultValues\s*:/.test(content);
  if (!hasDefaultValues) return false;

  const defaultCallPattern = /(z\.[a-zA-Z]+\([^)]*\))\.default\([^)]*\)/g;
  if (!defaultCallPattern.test(content)) return false;

  content = content.replace(defaultCallPattern, "$1");
  fs.writeFileSync(filePath, content, "utf-8");
  return true;
}

export function runCodeDoctor(projectDir: string): string[] {
  const applied: string[] = [];

  if (fixPrismaSchemaWrapper(projectDir)) {
    applied.push("fixPrismaSchemaWrapper");
  }

  const walk = (dir: string): string[] => {
    let files: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) files = files.concat(walk(full));
      else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(full);
    }
    return files;
  };

  try {
    const allFiles = walk(projectDir);
    for (const file of allFiles) {
      if (fixZodDefaultConflict(file)) {
        applied.push(`fixZodDefaultConflict: ${path.relative(projectDir, file)}`);
      }
    }
  } catch {
    // silencieux si la structure de dossier est inattendue
  }

  return applied;
}
