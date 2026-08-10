import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// Réservé aux admins. Traite une demande de retrait vendeur : effectue
// le vrai virement Stripe Connect (transfer) et marque PAID, ou marque
// FAILED sans jamais re-créditer automatiquement le solde (un solde géré
// à la main évite un double-crédit accidentel après un transfert échoué).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const action = body?.action;

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "action doit être 'approve' ou 'reject'" },
        { status: 400 }
      );
    }

    const payout = await prisma.sellerPayout.findUnique({
      where: { id },
      include: { seller: { include: { user: { include: { connectAccount: true } } } } },
    });

    if (!payout) {
      return NextResponse.json({ error: "Demande de retrait introuvable" }, { status: 404 });
    }

    if (payout.status !== "PENDING") {
      return NextResponse.json(
        { error: `Cette demande est déjà au statut ${payout.status}` },
        { status: 409 }
      );
    }

    if (action === "reject") {
      // Le solde n'a jamais été retransféré au vendeur - on le lui rend
      // puisque la demande est rejetée sans paiement.
      await prisma.$transaction([
        prisma.sellerPayout.update({
          where: { id: payout.id },
          data: { status: "FAILED" },
        }),
        prisma.marketplaceSeller.update({
          where: { id: payout.sellerId },
          data: { balanceCents: { increment: payout.amountCents } },
        }),
      ]);

      console.log(`[SellerPayout: ${payout.id}] rejeté par ${session.user.id}, solde restitué`);
      return NextResponse.json({ status: "FAILED" });
    }

    const connectAccountId = payout.seller.user.connectAccount?.stripeConnectAccountId;

    if (!connectAccountId || !payout.seller.user.connectAccount?.payoutsEnabled) {
      return NextResponse.json(
        { error: "Le vendeur n'a pas de compte Stripe Connect actif pour recevoir ce virement" },
        { status: 400 }
      );
    }

    await prisma.sellerPayout.update({
      where: { id: payout.id },
      data: { status: "PROCESSING" },
    });

    try {
      const transfer = await stripe.transfers.create({
        amount: payout.amountCents,
        currency: payout.currency.toLowerCase(),
        destination: connectAccountId,
        metadata: { payoutId: payout.id, sellerId: payout.sellerId },
      });

      await prisma.sellerPayout.update({
        where: { id: payout.id },
        data: { status: "PAID", stripeTransferId: transfer.id, paidAt: new Date() },
      });

      console.log(`[SellerPayout: ${payout.id}] transfert Stripe ${transfer.id} confirmé`);
      return NextResponse.json({ status: "PAID", transferId: transfer.id });
    } catch (transferError: unknown) {
      // Transfert Stripe échoué : le solde est restitué au vendeur pour
      // qu'il puisse retenter une demande plus tard, jamais perdu silencieusement.
      await prisma.$transaction([
        prisma.sellerPayout.update({
          where: { id: payout.id },
          data: { status: "FAILED" },
        }),
        prisma.marketplaceSeller.update({
          where: { id: payout.sellerId },
          data: { balanceCents: { increment: payout.amountCents } },
        }),
      ]);

      console.error(`[SellerPayout: ${payout.id}] transfert Stripe échoué:`, transferError);
      return NextResponse.json(
        {
          error:
            transferError instanceof Error
              ? transferError.message
              : "Le transfert Stripe a échoué",
        },
        { status: 502 }
      );
    }
  } catch (error: unknown) {
    console.error("ADMIN PAYOUT PATCH ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
