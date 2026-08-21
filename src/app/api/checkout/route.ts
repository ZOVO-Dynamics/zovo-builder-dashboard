import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const limitResult = rateLimit(`checkout:${session.user.id}`, 10, 5 * 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessaie dans quelques minutes." },
        { status: 429 }
      );
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

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { internalName },
      include: { prices: true },
    });

    if (!plan || plan.prices.length === 0) {
      return NextResponse.json(
        { error: "Plan introuvable ou non configuré côté Stripe" },
        { status: 404 }
      );
    }

    const planPrice = billingInterval
      ? plan.prices.find((p) => p.billingInterval === billingInterval)
      : plan.prices.find((p) => p.isDefault) ?? plan.prices[0];

    if (!planPrice) {
      return NextResponse.json(
        { error: "Aucun prix trouvé pour cet intervalle de facturation" },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      allow_promotion_codes: true,
      managed_payments: { enabled: false },
      line_items: [
        {
          price: planPrice.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.AUTH_URL}/dashboard?success=true`,
      cancel_url: `${process.env.AUTH_URL}/dashboard?canceled=true`,
      metadata: {
        userId: user.id,
        planId: plan.id,
        internalName: plan.internalName,
        planPriceId: planPrice.id,
        billingInterval: planPrice.billingInterval,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planId: plan.id,
          internalName: plan.internalName,
          planPriceId: planPrice.id,
          billingInterval: planPrice.billingInterval,
        },
      },
    });

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
    });
  } catch (error: unknown) {
    console.error("ZOVO CHECKOUT ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
