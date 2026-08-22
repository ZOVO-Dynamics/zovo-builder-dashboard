import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateDocumentViewToken } from "@/lib/identity/security/signedUrl";

interface SessionUserWithAdmin {
  isAdmin?: boolean;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id || !(session.user as SessionUserWithAdmin).isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const { documentType } = await req.json().catch(() => ({}));

  if (documentType !== "DRIVERS_LICENSE" && documentType !== "PASSPORT" && documentType !== "GOVERNMENT_ID" && documentType !== "HEALTH_INSURANCE_CARD" && documentType !== "BIRTH_CERTIFICATE") {
    return NextResponse.json({ error: "Type de document invalide" }, { status: 400 });
  }

  const token = generateDocumentViewToken(id, documentType);
  return NextResponse.json({ token, expiresInSeconds: 300 });
}
