import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const seller = await prisma.marketplaceSeller.findUnique({
    where: { userId: session.user.id },
  });

  if (!seller) {
    return NextResponse.json({ error: "Profil vendeur introuvable" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const isBuyingAgency = Boolean(body?.isBuyingAgency);

  const updated = await prisma.marketplaceSeller.update({
    where: { id: seller.id },
    data: { isBuyingAgency },
  });

  return NextResponse.json({ success: true, isBuyingAgency: updated.isBuyingAgency });
}
