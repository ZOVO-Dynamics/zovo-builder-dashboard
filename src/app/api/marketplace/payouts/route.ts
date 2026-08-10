import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MINIMUM_PAYOUT_CENTS = 2000; // 20$ CAD minimum, évite les micro-retraits

// Le vendeur demande un retrait de son solde disponible.
// Ne transfère jamais l'argent directement ici (Stripe Connect payout
// réel viendra en Phase 6/admin) — crée juste la demande et gèle le
// montant du solde pour éviter un double retrait.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const seller = await prisma.marketplaceSeller.findUnique({
      where: { userId: session.user.id },
      include: { user: { select: { connectAccount: true } } },
    });

    if (!seller) {
      return NextResponse.json({ error: "Profil vendeur introuvable" }, { status: 403 });
    }

    if (seller.suspended) {
      return NextResponse.json({ error: "Compte vendeur suspendu" }, { status: 403 });
    }

    if (!seller.user.connectAccount?.payoutsEnabled) {
      return NextResponse.json(
        {
          error:
            "Onboarding Stripe Connect incomplet — les paiements sortants ne sont pas encore activés sur votre compte",
        },
        { status: 400 }
      );
    }

    if (seller.balanceCents < MINIMUM_PAYOUT_CENTS) {
      return NextResponse.json(
        {
          error: `Solde insuffisant. Minimum de retrait : ${(MINIMUM_PAYOUT_CENTS / 100).toFixed(2)}$ CAD`,
        },
        { status: 400 }
      );
    }

    // Vérifie qu'aucune demande n'est déjà en cours pour éviter les doublons.
    const pendingPayout = await prisma.sellerPayout.findFirst({
      where: { sellerId: seller.id, status: { in: ["PENDING", "PROCESSING"] } },
    });

    if (pendingPayout) {
      return NextResponse.json(
        { error: "Une demande de retrait est déjà en cours de traitement" },
        { status: 409 }
      );
    }

    // Transaction atomique : gèle le solde immédiatement pour empêcher
    // un second retrait du même montant avant que celui-ci soit traité.
    const [payout] = await prisma.$transaction([
      prisma.sellerPayout.create({
        data: {
          sellerId: seller.id,
          amountCents: seller.balanceCents,
          currency: "CAD",
          status: "PENDING",
        },
      }),
      prisma.marketplaceSeller.update({
        where: { id: seller.id },
        data: { balanceCents: 0 },
      }),
    ]);

    console.log(`[SellerPayout: ${payout.id}] demande créée pour ${seller.id}, montant ${payout.amountCents} cents`);

    return NextResponse.json({ payout }, { status: 201 });
  } catch (error: unknown) {
    console.error("MARKETPLACE PAYOUT CREATE ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Historique des demandes de retrait du vendeur connecté.
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const seller = await prisma.marketplaceSeller.findUnique({
      where: { userId: session.user.id },
    });

    if (!seller) {
      return NextResponse.json({ payouts: [] });
    }

    const payouts = await prisma.sellerPayout.findMany({
      where: { sellerId: seller.id },
      orderBy: { requestedAt: "desc" },
    });

    return NextResponse.json({ payouts });
  } catch (error: unknown) {
    console.error("MARKETPLACE PAYOUT LIST ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
