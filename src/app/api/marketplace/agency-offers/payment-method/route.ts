import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// Crée (ou réutilise) un Customer Stripe pour l'agence, puis un SetupIntent
// pour enregistrer une carte réutilisable en paiement off-session futur.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const seller = await prisma.marketplaceSeller.findUnique({
    where: { userId: session.user.id },
  });

  if (!seller?.isBuyingAgency) {
    return NextResponse.json(
      { error: "Seules les agences acheteuses peuvent enregistrer une carte" },
      { status: 403 }
    );
  }

  let customerId = seller.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email || undefined,
      metadata: { marketplaceSellerId: seller.id, userId: session.user.id },
    });
    customerId = customer.id;
    await prisma.marketplaceSeller.update({
      where: { id: seller.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: { marketplaceSellerId: seller.id },
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}

// Vérifie l'état actuel (carte déjà enregistrée ou non)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const seller = await prisma.marketplaceSeller.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    hasPaymentMethod: Boolean(seller?.defaultPaymentMethodId),
  });
}
