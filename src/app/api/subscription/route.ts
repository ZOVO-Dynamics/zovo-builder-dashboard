import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    include: { plan: true },
  });

  if (!subscription) {
    return NextResponse.json({ hasSubscription: false });
  }

  const planPrice = subscription.stripePriceId
    ? await prisma.planPrice.findUnique({
        where: { stripePriceId: subscription.stripePriceId },
      })
    : null;

  return NextResponse.json({
    hasSubscription: true,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    currentPeriodEnd: subscription.currentPeriodEnd,
    planName: subscription.plan?.name || null,
    planInternalName: subscription.plan?.internalName || null,
    priceCents: planPrice?.priceCents ?? null,
    currency: subscription.plan?.currency || null,
    billingInterval: planPrice?.billingInterval ?? null,
  });
}
