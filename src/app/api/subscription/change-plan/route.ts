import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const limitResult = rateLimit(`subscription-change:${session.user.id}`, 5, 10 * 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json({ error: "Trop de tentatives. Réessaie plus tard." }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const internalName = body?.plan;
    const billingInterval = body?.billingInterval as string | undefined;

    if (!internalName || (internalName !== "weekly_pro" && internalName !== "monthly_pro")) {
      return NextResponse.json(
        { error: "Plan non reconnu. Utilisez 'weekly_pro' ou 'monthly_pro'." },
        { status: 400 }
      );
    }

    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { internalName },
      include: { prices: true },
    });

    if (!newPlan || newPlan.prices.length === 0) {
      return NextResponse.json({ error: "Plan introuvable ou non configuré côté Stripe" }, { status: 404 });
    }

    const newPlanPrice = billingInterval
      ? newPlan.prices.find((p) => p.billingInterval === billingInterval)
      : newPlan.prices.find((p) => p.isDefault) ?? newPlan.prices[0];

    if (!newPlanPrice) {
      return NextResponse.json({ error: "Aucun prix trouvé pour cet intervalle de facturation" }, { status: 404 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (!subscription?.stripeSubscriptionId) {
      return NextResponse.json({ error: "Aucun abonnement actif trouvé" }, { status: 404 });
    }

    if (subscription.stripePriceId === newPlanPrice.stripePriceId) {
      return NextResponse.json({ error: "Tu es déjà sur ce plan." }, { status: 400 });
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    const currentItemId = stripeSubscription.items.data[0]?.id;

    if (!currentItemId) {
      return NextResponse.json({ error: "Impossible de localiser l'abonnement Stripe" }, { status: 500 });
    }

    const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      items: [{ id: currentItemId, price: newPlanPrice.stripePriceId }],
      proration_behavior: "create_prorations",
      cancel_at_period_end: false,
    });

    await prisma.subscription.update({
      where: { userId: session.user.id },
      data: {
        planId: newPlan.id,
        stripePriceId: newPlanPrice.stripePriceId,
        status: updated.status,
        cancelAtPeriodEnd: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Ton plan a été changé pour ${newPlan.name}.`,
      plan: newPlan.internalName,
      billingInterval: newPlanPrice.billingInterval,
    });
  } catch (error: unknown) {
    console.error("SUBSCRIPTION CHANGE PLAN ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
