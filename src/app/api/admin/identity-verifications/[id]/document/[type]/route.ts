import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { decryptDocument } from "@/lib/identity/security/encryption";
import { verifyDocumentViewToken } from "@/lib/identity/security/signedUrl";

interface SessionUserWithAdmin {
  isAdmin?: boolean;
}

const VALID_TYPES = ["DRIVERS_LICENSE", "PASSPORT", "GOVERNMENT_ID", "HEALTH_INSURANCE_CARD", "BIRTH_CERTIFICATE"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const session = await auth();

  if (!session?.user?.id || !(session.user as SessionUserWithAdmin).isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id, type } = await params;

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Type de document invalide" }, { status: 400 });
  }

  // URL temporaire : un jeton signe, valide 5 minutes, est requis en plus
  // de la session admin - genere via POST .../document-token.
  const token = req.nextUrl.searchParams.get("token");
  if (!token || !verifyDocumentViewToken(token, id, type)) {
    return NextResponse.json({ error: "Lien expiré ou invalide - régénère un lien depuis le panneau admin" }, { status: 403 });
  }

  const verification = await prisma.identityVerification.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!verification) {
    return NextResponse.json({ error: "Vérification introuvable" }, { status: 404 });
  }

  const document = await prisma.identityDocument.findUnique({
    where: { userId_type: { userId: verification.userId, type: type as never } },
  });
  if (!document || document.fileData.length === 0) {
    return NextResponse.json({ error: "Document introuvable ou purgé" }, { status: 404 });
  }

  const decrypted = decryptDocument(Buffer.from(document.fileData));

  return new NextResponse(new Uint8Array(decrypted), {
    headers: { "Content-Type": document.mimeType, "Cache-Control": "private, no-store" },
  });
}
