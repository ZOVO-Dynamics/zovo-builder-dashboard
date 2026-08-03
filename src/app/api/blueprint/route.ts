import { NextRequest, NextResponse } from "next/server";
import aiPromptAnalyzer from "@/core/AIPromptAnalyzer";
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

    const projectBlueprint = await aiPromptAnalyzer.analyze(effectivePrompt);
    const buildBlueprint = blueprintGenerator.generate(projectBlueprint);
    const { projectPath, filesCreated, fallbackFiles } = await projectWriter.write(
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
          degraded: fallbackFiles.length > 0,
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

    const entitlement = await checkGenerationEntitlement(user.id);

    if (!entitlement.allowed) {
      return NextResponse.json(
        {
          error: entitlement.reason || "Génération non autorisée",
          message: entitlement.reason === "Limite de générations atteinte pour cette période"
            ? `Vous avez utilisé ${entitlement.cap} générations pour cette période. Passez au plan supérieur ou attendez le prochain cycle.`
            : "Abonnez-vous à un plan ZOVO Builder pour générer des applications.",
          remaining: entitlement.remaining,
          cap: entitlement.cap,
        },
        { status: 429 }
      );
    }

    const { prompt, projectId } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
    }

    if (prompt.length > 2000) {
      return NextResponse.json({ error: "Prompt trop long (max 2000 caractères)" }, { status: 400 });
    }

    if (projectId) {
      const existingProject = await prisma.project.findUnique({ where: { id: projectId } });
      if (!existingProject || existingProject.userId !== user.id) {
        return NextResponse.json({ error: "Projet introuvable ou accès refusé" }, { status: 403 });
      }
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
