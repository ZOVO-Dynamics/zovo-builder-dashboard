import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface SessionUserWithAdmin {
  isAdmin?: boolean;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const session = await auth();

  if (!session?.user?.id || !(session.user as SessionUserWithAdmin).isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id, type } = await params;

  if (type !== "DRIVERS_LICENSE" && type !== "HEALTH_INSURANCE_CARD") {
    return NextResponse.json({ error: "Type de document invalide" }, { status: 400 });
  }

  const verification = await prisma.identityVerification.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!verification) {
    return NextResponse.json({ error: "Vérification introuvable" }, { status: 404 });
  }

  const document = await prisma.identityDocument.findUnique({
    where: { userId_type: { userId: verification.userId, type } },
  });
  if (!document) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(document.fileData), {
    headers: { "Content-Type": document.mimeType, "Cache-Control": "private, no-store" },
  });
}
