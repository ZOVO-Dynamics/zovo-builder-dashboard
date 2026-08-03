import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    include: { plan: true, usageLimits: true },
  });

  const lastGeneration = await prisma.generation.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const totalGenerations = await prisma.generation.count({
    where: { userId: session.user.id },
  });

  if (!subscription || !subscription.plan) {
    return NextResponse.json({
      hasSubscription: false,
      planName: null,
      used: 0,
      cap: 0,
      remaining: 0,
      totalGenerations,
      lastGeneration: lastGeneration?.prompt ?? null,
      lastGenerationAt: lastGeneration?.createdAt ?? null,
    });
  }

  const now = new Date();
  const currentLimit = subscription.usageLimits.find(
    (u) => u.periodStart <= now && u.periodEnd > now
  );

  const used = currentLimit?.generationsUsed ?? 0;
  const cap = currentLimit?.generationsCap ?? subscription.plan.generationsLimit;

  return NextResponse.json({
    hasSubscription: true,
    planName: subscription.plan.name,
    used,
    cap,
    remaining: Math.max(0, cap - used),
    totalGenerations,
    lastGeneration: lastGeneration?.prompt ?? null,
    lastGenerationAt: lastGeneration?.createdAt ?? null,
  });
}
