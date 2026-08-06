import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STUCK_THRESHOLD_MINUTES = 5;

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const stuckSince = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000);

  const job = await prisma.generationJob.findFirst({
    where: {
      userId: session.user.id,
      OR: [
        { status: "failed" },
        { status: "running", updatedAt: { lt: stuckSince } },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!job) {
    return NextResponse.json({ stuck: false });
  }

  return NextResponse.json({
    stuck: true,
    jobId: job.id,
    prompt: job.prompt,
    projectId: job.projectId,
    status: job.status,
  });
}
