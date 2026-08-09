import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const job = await prisma.repairJob.findUnique({ where: { id }, include: { project: true } });

  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: "Réparation introuvable ou accès refusé" }, { status: 403 });
  }

  const actions = Array.isArray(job.fixedFilesSummary) ? (job.fixedFilesSummary as string[]) : [];

  if (job.status === "COMPLETED" && job.validationStatus === "OK") {
    return NextResponse.json({
      status: "VALIDATION_OK",
      title: "ZOVO Correction & Validation",
      summaryLine: "✅ VALIDATION OK",
      projectName: job.project.name,
      errorsDetected: job.errorsDetected ?? 0,
      errorsFixed: job.errorsFixed ?? 0,
      attempts: job.attempts,
      checks: {
        typescript: true,
        build: true,
        structure: true,
      },
      actions,
      message: "Votre projet est prêt.",
    });
  }

  if (job.status === "FAILED") {
    const remaining = Array.isArray(job.remainingErrors) ? (job.remainingErrors as string[]) : [];
    return NextResponse.json({
      status: "VALIDATION_FAILED",
      title: "ZOVO Correction & Validation",
      summaryLine: "❌ Validation non réussie",
      projectName: job.project.name,
      attempts: job.attempts,
      errorsDetected: job.errorsDetected ?? 0,
      errorsFixed: job.errorsFixed ?? 0,
      remainingErrorsCount: remaining.length,
      remainingErrors: remaining.slice(0, 10),
      failureReason: job.failureReason,
      actions,
      message:
        "ZOVO n'a pas pu obtenir une validation complète de votre projet. L'état stable précédent a été préservé quand c'était nécessaire. Notre support a accès aux détails techniques pour vous aider.",
    });
  }

  return NextResponse.json({
    status: job.status,
    title: "ZOVO Correction & Validation",
    message: "La réparation est encore en cours.",
  });
}
