import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runRepairJob } from "@/core/RepairEngine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const job = await prisma.repairJob.findUnique({ where: { id } });

  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: "Réparation introuvable ou accès refusé" }, { status: 403 });
  }

  const RESUMABLE = ["PAID", "QUEUED", "FAILED"];
  if (!RESUMABLE.includes(job.status)) {
    return NextResponse.json(
      { error: `Impossible de relancer une réparation au statut "${job.status}"` },
      { status: 409 }
    );
  }

  await prisma.repairJob.update({ where: { id: job.id }, data: { status: "QUEUED" } });

  runRepairJob(job.id).catch((err) => {
    console.error(`[RepairJob: ${job.id}] runRepairJob unhandled error:`, err);
  });

  return NextResponse.json({ success: true, id: job.id, status: "QUEUED" });
}
