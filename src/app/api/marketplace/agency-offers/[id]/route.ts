import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const decision = body?.decision as "accept" | "decline" | undefined;
  const signature = body?.signature as string | undefined;

  if (decision !== "accept" && decision !== "decline") {
    return NextResponse.json({ error: "decision doit être 'accept' ou 'decline'" }, { status: 400 });
  }

  const offer = await prisma.agencyOffer.findUnique({
    where: { id },
    include: { project: { include: { user: { select: { id: true, name: true } } } }, agencySeller: true },
  });

  if (!offer || offer.project.userId !== session.user.id) {
    return NextResponse.json({ error: "Offre introuvable ou accès refusé" }, { status: 404 });
  }

  if (offer.status !== "PENDING") {
    return NextResponse.json({ error: "Cette offre a déjà été traitée" }, { status: 409 });
  }

  if (decision === "decline") {
    const updated = await prisma.agencyOffer.update({
      where: { id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
    return NextResponse.json({ success: true, offer: updated });
  }

  // decision === "accept" : signature + acceptation des conditions requises avant tout paiement.
  if (!signature || typeof signature !== "string" || !signature.trim()) {
    return NextResponse.json(
      { error: "Une signature (nom complet) est requise pour accepter la vente" },
      { status: 400 }
    );
  }

  const ownerName = offer.project.user.name;
  if (!ownerName || signature.trim().toLowerCase() !== ownerName.trim().toLowerCase()) {
    return NextResponse.json(
      { error: "La signature ne correspond pas au nom associé à votre compte" },
      { status: 400 }
    );
  }

  const { stripeCustomerId, defaultPaymentMethodId } = offer.agencySeller;

  if (!stripeCustomerId || !defaultPaymentMethodId) {
    return NextResponse.json(
      { error: "L'agence n'a plus de carte de paiement valide enregistrée" },
      { status: 402 }
    );
  }

  await prisma.agencyOffer.update({
    where: { id },
    data: {
      status: "ACCEPTED",
      respondedAt: new Date(),
      signedAt: new Date(),
      signatureText: signature.trim(),
      termsVersion: "2026-08-17",
    },
  });

  try {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: offer.priceCents,
        currency: offer.currency.toLowerCase(),
        customer: stripeCustomerId,
        payment_method: defaultPaymentMethodId,
        off_session: true,
        confirm: true,
        metadata: { kind: "agency_offer", offerId: offer.id },
      },
      { idempotencyKey: `agency-offer-${offer.id}` }
    );

    // Le webhook payment_intent.succeeded est la source de verite pour PAID + credit du solde
    // (idempotent), mais on reflete l'etat immediat ici pour la reponse a l'utilisateur.
    if (paymentIntent.status === "succeeded") {
      const updated = await prisma.agencyOffer.update({
        where: { id },
        data: { stripePaymentIntentId: paymentIntent.id },
      });
      return NextResponse.json({ success: true, offer: updated });
    }

    return NextResponse.json({
      success: true,
      offer,
      warning: "Paiement en cours de confirmation",
    });
  } catch (err: unknown) {
    await prisma.agencyOffer.update({
      where: { id },
      data: { status: "PAYMENT_FAILED", respondedAt: new Date() },
    });

    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Paiement refusé : ${message}` },
      { status: 402 }
    );
  }
}
