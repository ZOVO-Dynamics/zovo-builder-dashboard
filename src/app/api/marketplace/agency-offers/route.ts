import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AGENCY_COMMISSION_RATE = 0.10;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const seller = await prisma.marketplaceSeller.findUnique({
    where: { userId: session.user.id },
  });

  if (seller?.isBuyingAgency) {
    const offers = await prisma.agencyOffer.findMany({
      where: { agencySellerId: seller.id },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ role: "agency", offers });
  }

  const offers = await prisma.agencyOffer.findMany({
    where: { project: { userId: session.user.id } },
    include: {
      project: { select: { id: true, name: true } },
      agencySeller: { select: { displayName: true, ratingAvg: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ role: "owner", offers });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const seller = await prisma.marketplaceSeller.findUnique({
    where: { userId: session.user.id },
  });

  if (!seller?.isBuyingAgency) {
    return NextResponse.json(
      { error: "Seules les agences acheteuses peuvent faire une offre" },
      { status: 403 }
    );
  }

  if (!seller.defaultPaymentMethodId) {
    return NextResponse.json(
      { error: "Enregistre une carte de paiement avant de faire une offre" },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { projectId, type, priceCents, message } = body as {
    projectId?: string;
    type?: "PROJECT_PURCHASE" | "CONTACT_RIGHT";
    priceCents?: number;
    message?: string;
  };

  if (!projectId || !type || !priceCents || priceCents <= 0) {
    return NextResponse.json({ error: "projectId, type et priceCents (>0) requis" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const commissionCents = Math.round(priceCents * AGENCY_COMMISSION_RATE);

  const offer = await prisma.agencyOffer.create({
    data: {
      projectId,
      agencySellerId: seller.id,
      type,
      priceCents,
      commissionCents,
      message: message ?? null,
    },
  });

  return NextResponse.json({ success: true, offer });
}
