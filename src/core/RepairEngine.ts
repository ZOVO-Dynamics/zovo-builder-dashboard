import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import validator from "./Validator";
import { runTypeCheck } from "./BuildRunner";
import { extractFileErrors } from "./ErrorCollector";
import { ZOVO_REPAIR_MAX_ATTEMPTS } from "@/lib/repairConfig";

function log(jobId: string, message: string) {
  console.log(`[RepairJob: ${jobId}] ${message}`);
}

function shouldSkip(relPath: string): boolean {
  return /(^|[\\/])(node_modules|\.next)([\\/]|$)/.test(relPath);
}

// Copie récursive en excluant node_modules/.next (évite de gonfler inutilement
// la sauvegarde et respecte le principe "snapshot avant modification").
function copyProjectDir(fromDir: string, toDir: string) {
  fs.mkdirSync(/*turbopackIgnore: true*/ toDir, { recursive: true });
  for (const entry of fs.readdirSync(/*turbopackIgnore: true*/ fromDir, { withFileTypes: true })) {
    if (shouldSkip(entry.name)) continue;
    const src = path.join(fromDir, entry.name);
    const dest = path.join(toDir, entry.name);
    if (entry.isDirectory()) {
      copyProjectDir(src, dest);
    } else if (entry.isFile()) {
      fs.copyFileSync(src, dest);
    }
  }
}

function snapshotDir(projectDir: string, jobId: string): string {
  const backupDir = `${projectDir}.repair-backup-${jobId}`;
  if (fs.existsSync(/*turbopackIgnore: true*/ backupDir)) fs.rmSync(/*turbopackIgnore: true*/ backupDir, { recursive: true, force: true });
  copyProjectDir(projectDir, backupDir);
  return backupDir;
}

function archiveFailedState(projectDir: string, jobId: string): string {
  const failedDir = `${projectDir}.repair-failed-${jobId}`;
  if (fs.existsSync(/*turbopackIgnore: true*/ failedDir)) fs.rmSync(/*turbopackIgnore: true*/ failedDir, { recursive: true, force: true });
  copyProjectDir(projectDir, failedDir);
  return failedDir;
}

function restoreFromSnapshot(projectDir: string, backupDir: string) {
  fs.rmSync(/*turbopackIgnore: true*/ projectDir, { recursive: true, force: true });
  copyProjectDir(backupDir, projectDir);
}

function safeRemove(dir: string | null) {
  if (!dir) return;
  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ dir)) fs.rmSync(/*turbopackIgnore: true*/ dir, { recursive: true, force: true });
  } catch {
    // best-effort, ne doit jamais faire échouer le job
  }
}

// Compte le nombre total d'erreurs TypeScript (toutes les lignes d'erreur,
// pas seulement le nombre de fichiers concernés) pour le rapport client.
function countTsErrors(projectDir: string): number {
  const { ok, output } = runTypeCheck(projectDir);
  if (ok) return 0;
  const fileErrors = extractFileErrors(output);
  let total = 0;
  for (const errs of fileErrors.values()) total += errs.length;
  return total || 1; // au moins 1 si tsc a échoué sans qu'on ait pu parser une ligne précise
}

const CATEGORY_RULES: { test: (f: string) => boolean; label: string }[] = [
  { test: (f) => f.includes("prisma/schema.prisma"), label: "Correction du schéma de base de données" },
  { test: (f) => /src[\\/]app[\\/]api[\\/].*route\.tsx?$/.test(f), label: "Création ou correction de routes API manquantes" },
  { test: (f) => f.endsWith(".tsx"), label: "Correction de composants React" },
  { test: (f) => f.endsWith(".ts") && !f.includes("api"), label: "Correction de fichiers TypeScript" },
  { test: (f) => f.endsWith(".jsx") || f.endsWith(".js"), label: "Correction de fichiers JavaScript" },
];

// Traduit la liste technique de fichiers corrigés en résumé compréhensible
// pour un client non technique (spec section 11 : jamais afficher les logs bruts).
export function summarizeActions(fixedFiles: string[], valid: boolean): string[] {
  const labels = new Set<string>();
  for (const f of fixedFiles) {
    for (const rule of CATEGORY_RULES) {
      if (rule.test(f)) {
        labels.add(rule.label);
        break;
      }
    }
  }
  const summary = Array.from(labels);
  if (fixedFiles.length > 0) summary.push("Nouvelle compilation du projet");
  summary.push(valid ? "Validation finale réussie" : "Validation finale non concluante");
  return summary;
}

export interface RepairRunResult {
  ranAtAll: boolean;
  reason?: string;
}

/**
 * Orchestration complète d'une tâche ZOVO Correction & Validation :
 * ANALYZE -> SNAPSHOT -> FIX (Validator existant, réutilisé tel quel) -> VALIDATE -> RESTORE si échec total -> RAPPORT.
 * Idempotent au niveau statut : ne relance rien si le job n'est pas dans un état repartable.
 */
export async function runRepairJob(jobId: string): Promise<RepairRunResult> {
  const job = await prisma.repairJob.findUnique({ where: { id: jobId }, include: { project: true } });

  if (!job) {
    log(jobId, "Job introuvable, abandon.");
    return { ranAtAll: false, reason: "job introuvable" };
  }

  const REPARABLE_STATUSES = ["PAID", "QUEUED", "FAILED"];
  if (!REPARABLE_STATUSES.includes(job.status)) {
    log(jobId, `Statut actuel "${job.status}" ne permet pas de (re)lancer la réparation.`);
    return { ranAtAll: false, reason: `statut non repartable: ${job.status}` };
  }

  const projectDir = job.project.projectPath;

  if (!fs.existsSync(/*turbopackIgnore: true*/ projectDir) || !fs.statSync(/*turbopackIgnore: true*/ projectDir).isDirectory()) {
    await prisma.repairJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        validationStatus: "FAILED",
        failureReason: "Répertoire du projet introuvable sur le serveur",
        completedAt: new Date(),
      },
    });
    log(jobId, "Répertoire du projet introuvable, échec.");
    return { ranAtAll: false, reason: "projet introuvable sur disque" };
  }

  try {
    await prisma.repairJob.update({
      where: { id: jobId },
      data: { status: "ANALYZING", startedAt: job.startedAt ?? new Date() },
    });
    log(jobId, "Analysis started");

    let backupDir: string | null = null;
    try {
      backupDir = snapshotDir(projectDir, jobId);
    } catch (err: unknown) {
      log(jobId, `Snapshot impossible, poursuite sans filet de sécurité: ${err instanceof Error ? err.message : String(err)}`);
    }

    const errorsDetected = countTsErrors(projectDir);
    log(jobId, `${errorsDetected} errors detected`);

    const latestVersion = await prisma.projectVersion.findFirst({
      where: { projectId: job.projectId },
      orderBy: { versionNumber: "desc" },
    });
    const originalPrompt = latestVersion?.prompt || job.project.name;

    await prisma.repairJob.update({ where: { id: jobId }, data: { status: "FIXING" } });

    const validation = await validator.validate(projectDir, originalPrompt, ZOVO_REPAIR_MAX_ATTEMPTS);

    await prisma.repairJob.update({ where: { id: jobId }, data: { status: "VALIDATING" } });
    log(jobId, `Attempt ${validation.attempts ?? 0}`);

    const fixedFilesSummary = summarizeActions(validation.fixedFiles, validation.valid);

    if (validation.valid) {
      safeRemove(backupDir);
      await prisma.repairJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          validationStatus: "OK",
          attempts: validation.attempts ?? 0,
          errorsDetected,
          errorsFixed: errorsDetected,
          fixedFilesSummary: fixedFilesSummary as unknown as object,
          remainingErrors: [] as unknown as object,
          completedAt: new Date(),
        },
      });
      log(jobId, "Validation OK");
      return { ranAtAll: true };
    }

    const remainingErrors = countTsErrors(projectDir);
    const errorsFixed = Math.max(0, errorsDetected - remainingErrors);

    // Échec complet (aucun progrès réel) : on restaure le dernier état stable
    // plutôt que de laisser le projet dans un état potentiellement pire qu'avant,
    // tout en archivant l'état échoué pour le support (jamais perdu).
    const madeNoProgress = validation.fixedFiles.length === 0 || remainingErrors >= errorsDetected;

    if (backupDir && madeNoProgress) {
      try {
        archiveFailedState(projectDir, jobId);
        restoreFromSnapshot(projectDir, backupDir);
        log(jobId, "Aucun progrès réel — état stable restauré, état échoué archivé pour le support");
      } catch (err: unknown) {
        log(jobId, `Restauration impossible: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        safeRemove(backupDir);
      }
    } else {
      safeRemove(backupDir);
    }

    await prisma.repairJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        validationStatus: "FAILED",
        attempts: validation.attempts ?? 0,
        errorsDetected,
        errorsFixed,
        fixedFilesSummary: fixedFilesSummary as unknown as object,
        remainingErrors: validation.errors.slice(0, 50) as unknown as object,
        failureReason: validation.errors.slice(0, 5).join(" | ").slice(0, 1000),
        completedAt: new Date(),
      },
    });
    log(jobId, `Validation failed: ${remainingErrors} errors remaining`);
    return { ranAtAll: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log(jobId, `Erreur inattendue: ${message}`);
    await prisma.repairJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        validationStatus: "FAILED",
        failureReason: message.slice(0, 1000),
        completedAt: new Date(),
      },
    }).catch(() => {
      // si même la mise à jour échoue, on ne peut rien faire de plus ici
    });
    return { ranAtAll: false, reason: message };
  }
}
