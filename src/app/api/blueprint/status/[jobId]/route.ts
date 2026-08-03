import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { jobId } = await params;

  const job = await prisma.generationJob.findUnique({ where: { id: jobId } });

  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: "Job introuvable ou accès refusé" }, { status: 403 });
  }

  const progress =
    job.status === "running" && job.result
      ? (job.result as { progress?: { current: number; total: number } }).progress ?? null
      : null;

  return NextResponse.json({
    status: job.status,
    result: job.status === "completed" ? job.result : null,
    progress,
    error: job.status === "failed" ? job.error : null,
  });
}
