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

  // Juste après le retour de Stripe Checkout, le frontend ne connaît que
  // l'id de session Stripe (le RepairJob n'existe qu'une fois le webhook
  // traité) — on accepte donc l'un ou l'autre identifiant ici.
  const job = await prisma.repairJob.findFirst({
    where: {
      OR: [{ id }, { stripeCheckoutSessionId: id }],
    },
  });

  if (!job) {
    // Peut simplement signifier que le webhook Stripe n'a pas encore été traité.
    return NextResponse.json({ status: "PENDING_WEBHOOK" }, { status: 202 });
  }

  if (job.userId !== session.user.id) {
    return NextResponse.json({ error: "Accès refusé à cette réparation" }, { status: 403 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    validationStatus: job.validationStatus,
    attempts: job.attempts,
    errorsDetected: job.errorsDetected,
    errorsFixed: job.errorsFixed,
    failureReason: job.status === "FAILED" ? job.failureReason : null,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
}
