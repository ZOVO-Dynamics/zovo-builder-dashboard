import { NextRequest, NextResponse } from "next/server";
import aiPromptAnalyzer from "@/core/AIPromptAnalyzer";
import promptAnalyzer from "@/core/PromptAnalyzer";
import blueprintGenerator from "@/core/BlueprintGenerator";
import projectWriter from "@/core/ProjectWriter";
import validator from "@/core/Validator";
import generationHistory from "@/core/GenerationHistory";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkGenerationEntitlement, recordGeneration } from "@/lib/entitlements";
import { rateLimit } from "@/lib/rate-limit";

async function runGenerationJob(
  jobId: string,
  userId: string,
  prompt: string,
  projectId: string | null
) {
  try {
    let existingProject = null;
    if (projectId) {
      existingProject = await prisma.project.findUnique({ where: { id: projectId } });
    }

    const effectivePrompt = existingProject
      ? `Contexte du projet existant : ${existingProject.name}. Historique : ${existingProject.currentVersion} version(s) précédente(s).\n\nNouvelle demande : ${prompt}`
      : prompt;

    const isRepairMode =
      Boolean(existingProject) &&
      prompt.trim().startsWith("Continue la génération de ce projet");

    let projectPath: string;
    let filesCreated: string[] = [];
    let fallbackFiles: string[] = [];
    let projectBlueprint;
    let buildBlueprint;

    if (isRepairMode && existingProject) {
      // Mode réparation : on ne réécrit rien, on valide/corrige directement les fichiers existants
      projectPath = existingProject.projectPath;
      projectBlueprint = await aiPromptAnalyzer.analyze(effectivePrompt);
      buildBlueprint = blueprintGenerator.generate(projectBlueprint);
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { result: { progress: { current: 1, total: 1 } } as never },
      });
    } else {
      projectBlueprint = await aiPromptAnalyzer.analyze(effectivePrompt);
      buildBlueprint = blueprintGenerator.generate(projectBlueprint);
      const writeResult = await projectWriter.write(
        buildBlueprint,
        projectBlueprint,
        prompt,
        async (current, total) => {
          await prisma.generationJob.update({
            where: { id: jobId },
            data: { result: { progress: { current, total } } as never },
          });
        }
      );
      projectPath = writeResult.projectPath;
      filesCreated = writeResult.filesCreated;
      fallbackFiles = writeResult.fallbackFiles;
    }

    const { fixMissingRoutePages, detectHallucinationWithAiFallback } = await import("@/core/Validator");
    const fixedRoutes = fixMissingRoutePages(projectPath, buildBlueprint);
    if (fixedRoutes.length > 0) {
      console.log(`Pages generees automatiquement: ${fixedRoutes.join(", ")}`);
    }

    const aiBridgeUrl = process.env.AI_BRIDGE_URL || "http://localhost:4000/api/generate";
    const hallucinations = await detectHallucinationWithAiFallback(
      projectPath,
      buildBlueprint.routes,
      {},
      aiBridgeUrl
    );
    if (hallucinations.length > 0) {
      console.warn(`[route.ts] Hallucinations detectees: ${hallucinations.join(" | ")}`);
    }
    const hasHallucinations = hallucinations.length > 0;

    const validation = await validator.validate(projectPath, prompt, 2);

    const historyEntry = generationHistory.add({
      prompt,
      projectPath,
      features: projectBlueprint.features,
      userId,
    });

    await recordGeneration(userId, prompt, {
      projectPath,
      features: projectBlueprint.features,
    });

    let project;
    if (existingProject) {
      project = await prisma.project.update({
        where: { id: existingProject.id },
        data: { currentVersion: { increment: 1 }, updatedAt: new Date() },
      });
      await prisma.projectVersion.create({
        data: {
          projectId: project.id,
          versionNumber: project.currentVersion,
          prompt,
          blueprint: buildBlueprint as never,
        },
      });
    } else {
      project = await prisma.project.create({
        data: {
          userId,
          name: projectBlueprint.projectName || projectBlueprint.projectType || "Projet sans nom",
          projectPath,
          currentVersion: 1,
        },
      });
      await prisma.projectVersion.create({
        data: {
          projectId: project.id,
          versionNumber: 1,
          prompt,
          blueprint: buildBlueprint as never,
        },
      });
    }

    await prisma.generation.updateMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - 5000) } },
      data: { projectId: project.id },
    });

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        result: {
          success: true,
          projectBlueprint,
          buildBlueprint,
          projectPath,
          filesCreated,
          fallbackFiles,
          degraded: fallbackFiles.length > 0 || hasHallucinations,
          hallucinations,
          validation,
          historyId: historyEntry.id,
          projectRecordId: project.id,
          projectVersion: project.currentVersion,
        } as never,
      },
    });
  } catch (error: unknown) {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const limitResult = rateLimit(`blueprint:${session.user.id}`, 5, 10 * 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Trop de générations en peu de temps. Réessaie dans quelques minutes." },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const { prompt, projectId } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
    }

    if (prompt.length > 2000) {
      return NextResponse.json({ error: "Prompt trop long (max 2000 caractères)" }, { status: 400 });
    }

    let existingProject = null;
    if (projectId) {
      existingProject = await prisma.project.findUnique({ where: { id: projectId } });
      if (!existingProject || existingProject.userId !== user.id) {
        return NextResponse.json({ error: "Projet introuvable ou accès refusé" }, { status: 403 });
      }
    }

    // Pré-calcul rapide (mots-clés, synchrone) du tier de complexité pour l'entitlement.
    // L'analyse IA précise (dans runGenerationJob) reste la source de vérité pour le blueprint final.
    const quickBlueprint = promptAnalyzer.analyze(prompt);

    const entitlement = await checkGenerationEntitlement(user.id, quickBlueprint.complexityTier);

    if (!entitlement.allowed) {
      return NextResponse.json(
        {
          error: entitlement.reason || "Génération non autorisée",
          message:
            entitlement.reason === "Ce projet nécessite un abonnement Pro ou le Pack Premium"
              ? "Ce type de projet (authentification, paiements, chat ou admin) nécessite un abonnement Pro ou le Pack Premium."
              : entitlement.reason === "Limite de générations atteinte pour cette période"
              ? `Vous avez utilisé ${entitlement.cap} générations pour cette période. Passez au plan supérieur ou attendez le prochain cycle.`
              : "Abonnez-vous à un plan ZOVO Builder pour générer des applications.",
          remaining: entitlement.remaining,
          cap: entitlement.cap,
        },
        { status: 429 }
      );
    }

    // Limite plan gratuit : pas de régénération sur un projet existant, Pro illimité.
    if (existingProject && existingProject.currentVersion >= 1 && !entitlement.isPro) {
      return NextResponse.json(
        {
          error: "Régénération réservée aux abonnés Pro",
          message: "Le plan gratuit ne permet pas de régénérer un projet existant. Passez à Pro pour itérer sur vos projets.",
        },
        { status: 403 }
      );
    }

    const job = await prisma.generationJob.create({
      data: {
        userId: user.id,
        projectId: projectId || null,
        prompt,
        status: "running",
      },
    });

    runGenerationJob(job.id, user.id, prompt, projectId || null).catch((err) => {
      console.error("runGenerationJob unhandled error:", err);
    });

    return NextResponse.json({ success: true, jobId: job.id });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
