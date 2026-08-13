import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { ComplexityTier } from "@/core/ComplexityAnalyzer";

export interface EntitlementCheck {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  cap?: number;
  source?: "subscription" | "credits";
  isPro?: boolean;
}

/**
 * Calcule la fenêtre de période courante (semaine ou mois) selon l'intervalle du plan.
 */
function getCurrentPeriod(billingInterval: string, referenceStart: Date): { start: Date; end: Date } {
  const start = new Date(referenceStart);
  const end = new Date(start);

  if (billingInterval === "week") {
    end.setDate(end.getDate() + 7);
  } else {
    const expectedMonth = (start.getMonth() + 1) % 12;
    end.setMonth(end.getMonth() + 1);
    if (end.getMonth() !== expectedMonth) {
      end.setDate(0);
    }
  }

  return { start, end };
}

/**
 * Vérifie si un utilisateur peut lancer une nouvelle génération.
 * Priorité : abonnement actif (logique existante, inchangée) ;
 * sinon, solde de crédits prépayés.
 * Si complexityTier est fourni et vaut "complexe", bloque les utilisateurs
 * sans abonnement Pro actif (levier de conversion).
 * TOUJOURS appelé côté serveur avant de lancer une génération.
 */
export async function checkGenerationEntitlement(
  userId: string,
  complexityTier?: ComplexityTier
): Promise<EntitlementCheck> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true, usageLimits: true },
  });

  const hasActiveSubscription =
    subscription && subscription.status === "active" && subscription.plan &&
    !(subscription.currentPeriodEnd && subscription.currentPeriodEnd < new Date());

  // Levier de conversion : un projet complexe (auth/payments/chat/admin) nécessite
  // un abonnement Pro actif, peu importe le solde de crédits ou générations restantes.
  if (complexityTier === "complexe" && !hasActiveSubscription) {
    return {
      allowed: false,
      reason: "Ce projet nécessite un abonnement Pro ou le Pack Premium",
      source: "credits",
      isPro: false,
    };
  }

  if (hasActiveSubscription) {
    const now = new Date();
    let usageLimit = subscription!.usageLimits.find(
      (u) => u.periodStart <= now && u.periodEnd > now
    );

    if (!usageLimit) {
      const referenceStart = subscription!.currentPeriodStart || now;

      const planPrice = subscription!.stripePriceId
        ? await prisma.planPrice.findUnique({
            where: { stripePriceId: subscription!.stripePriceId },
          })
        : null;

      const billingInterval = planPrice?.billingInterval ?? "month";
      const { start, end } = getCurrentPeriod(billingInterval, referenceStart);

      usageLimit = await prisma.usageLimit.create({
        data: {
          subscriptionId: subscription!.id,
          periodStart: start,
          periodEnd: end,
          generationsUsed: 0,
          generationsCap: subscription!.plan!.generationsLimit,
        },
      });
    }

    const remaining = usageLimit.generationsCap - usageLimit.generationsUsed;

    if (remaining <= 0) {
      return {
        allowed: false,
        reason: "Limite de générations atteinte pour cette période",
        remaining: 0,
        cap: usageLimit.generationsCap,
        source: "subscription",
        isPro: true,
      };
    }

    return { allowed: true, remaining, cap: usageLimit.generationsCap, source: "subscription", isPro: true };
  }

  // Pas d'abonnement actif : on vérifie le solde de crédits prépayés
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || user.creditsBalance <= 0) {
    return {
      allowed: false,
      reason: "Solde de crédits insuffisant",
      remaining: user?.creditsBalance ?? 0,
      source: "credits",
      isPro: false,
    };
  }

  return { allowed: true, remaining: user.creditsBalance, source: "credits", isPro: false };
}

/**
 * Enregistre une génération APRÈS un succès confirmé.
 * Débite selon la source déterminée par checkGenerationEntitlement
 * (abonnement : compteur usageLimit ; hors-forfait : solde de crédits).
 */
export async function recordGeneration(userId: string, prompt: string, metadata?: Record<string, unknown>) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { usageLimits: true },
  });

  const now = new Date();
  const usageLimit = subscription?.usageLimits.find(
    (u) => u.periodStart <= now && u.periodEnd > now
  );

  const hasActiveSubscription = subscription && subscription.status === "active" && usageLimit;

  if (hasActiveSubscription) {
    await prisma.usageLimit.update({
      where: { id: usageLimit!.id },
      data: { generationsUsed: { increment: 1 } },
    });
  } else {
    // Débite 1 crédit hors-forfait
    await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: { creditsBalance: { decrement: 1 } },
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            type: "CONSUMPTION",
            amount: -1,
            balanceAfter: user.creditsBalance,
          },
        });
      },
      { timeout: 15000 }
    );
  }

  return prisma.generation.create({
    data: {
      userId,
      subscriptionId: subscription?.id,
      prompt,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });
}