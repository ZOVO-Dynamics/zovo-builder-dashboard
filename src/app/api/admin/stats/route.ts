import { NextResponse } from "next/server";
interface SessionUserWithAdmin {
  isAdmin?: boolean;
}
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id || !(session.user as SessionUserWithAdmin).isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const totalUsers = await prisma.user.count();

  const usersByPlan = await prisma.user.groupBy({
    by: ["plan"],
    _count: true,
  });

  const activeSubscriptions = await prisma.subscription.count({
    where: { status: "active" },
  });

  const activeSubs = await prisma.subscription.findMany({
    where: { status: "active" },
    select: { stripePriceId: true },
  });

  const allPlanPrices = await prisma.planPrice.findMany();
  const priceByStripeId = new Map(allPlanPrices.map((p) => [p.stripePriceId, p]));

  let monthlyRecurringRevenueCents = 0;
  for (const sub of activeSubs) {
    const planPrice = sub.stripePriceId ? priceByStripeId.get(sub.stripePriceId) : null;
    if (!planPrice) continue;
    const monthlyEquivalent =
      planPrice.billingInterval === "week"
        ? planPrice.priceCents * 4.33
        : planPrice.billingInterval === "year"
        ? planPrice.priceCents / 12
        : planPrice.priceCents;
    monthlyRecurringRevenueCents += monthlyEquivalent;
  }

  const creditPurchases = await prisma.creditTransaction.findMany({
    where: { type: "PURCHASE" },
    select: { amount: true, stripePaymentIntentId: true },
  });

  const creditPacks = await prisma.creditPack.findMany();
  const packByCredits = new Map(creditPacks.map((p) => [p.credits, p]));

  let creditRevenueCents = 0;
  for (const tx of creditPurchases) {
    const pack = packByCredits.get(tx.amount);
    if (pack) creditRevenueCents += pack.priceCents;
  }

  const totalGenerations = await prisma.generation.count();

  return NextResponse.json({
    totalUsers,
    usersByPlan: usersByPlan.map((g) => ({ plan: g.plan, count: g._count })),
    activeSubscriptions,
    monthlyRecurringRevenueCents: Math.round(monthlyRecurringRevenueCents),
    creditRevenueCents,
    totalGenerations,
  });
}
