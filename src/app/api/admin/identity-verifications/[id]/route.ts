import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface SessionUserWithAdmin {
  isAdmin?: boolean;
}

const ALLOWED_DECISIONS = ["PASSED", "REJECTED_FRAUD"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id || !(session.user as SessionUserWithAdmin).isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const { decision } = await req.json().catch(() => ({}));

  if (!ALLOWED_DECISIONS.includes(decision)) {
    return NextResponse.json({ error: "Décision invalide (PASSED ou REJECTED_FRAUD)" }, { status: 400 });
  }

  const verification = await prisma.identityVerification.findUnique({ where: { id } });
  if (!verification) {
    return NextResponse.json({ error: "Vérification introuvable" }, { status: 404 });
  }

  const updated = await prisma.identityVerification.update({
    where: { id },
    data: {
      status: decision,
      reviewedByUserId: session.user.id,
      reviewedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, verification: updated });
}
