import type { Discount } from "@prisma/client";
import { prisma } from "./prisma";
import { stripe } from "./stripe";

const POSSIBLE_PERCENTAGES = [10, 15, 20, 25, 30];

function pickRandomPercentage(): number {
  const index = Math.floor(Math.random() * POSSIBLE_PERCENTAGES.length);
  return POSSIBLE_PERCENTAGES[index];
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Génère une réduction aléatoire pour Monthly Pro pour le mois courant,
 * si elle n'existe pas déjà. Idempotent : un seul discount par mois.
 */
export async function generateMonthlyDiscount(): Promise<{ created: boolean; discount: Discount }> {
  const now = new Date();
  const monthKey = getMonthKey(now);
  const code = `MONTHLY_PRO_${monthKey}`;

  const existing = await prisma.discount.findUnique({ where: { code } });
  if (existing) {
    return { created: false, discount: existing };
  }

  const percentOff = pickRandomPercentage();

  const validFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const validUntil = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const stripeCoupon = await stripe.coupons.create({
    percent_off: percentOff,
    duration: "once",
    name: `Réduction ${monthKey}`,
  });

  const discount = await prisma.discount.create({
    data: {
      code,
      percentOff,
      appliesToTier: "MONTHLY_PRO",
      validFrom,
      validUntil,
      stripeCouponId: stripeCoupon.id,
    },
  });

  return { created: true, discount };
}

/**
 * Retourne la réduction active pour un tier donné, si elle existe.
 */
export async function getActiveDiscount(tier: "WEEKLY_PRO" | "MONTHLY_PRO") {
  const now = new Date();
  return prisma.discount.findFirst({
    where: {
      appliesToTier: tier,
      validFrom: { lte: now },
      validUntil: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Calcule le prix affiché (avant/après réduction) pour un plan.
 */
export function computeDiscountedPrice(priceCents: number, percentOff: number): number {
  return Math.round(priceCents * (1 - percentOff / 100));
}
