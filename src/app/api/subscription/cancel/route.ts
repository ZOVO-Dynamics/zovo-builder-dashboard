import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const limitResult = rateLimit(`subscription-cancel:${session.user.id}`, 5, 10 * 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json({ error: "Trop de tentatives. Réessaie plus tard." }, { status: 429 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json({ error: "Aucun abonnement actif trouvé" }, { status: 404 });
    }

    const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await prisma.subscription.update({
      where: { userId: session.user.id },
      data: { cancelAtPeriodEnd: true },
    });

    return NextResponse.json({
      success: true,
      message: "Ton abonnement sera annulé à la fin de la période en cours.",
      currentPeriodEnd: (updated as unknown as { current_period_end?: number }).current_period_end
        ? new Date((updated as unknown as { current_period_end?: number }).current_period_end! * 1000)
        : subscription.currentPeriodEnd,
    });
  } catch (error: unknown) {
    console.error("SUBSCRIPTION CANCEL ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
