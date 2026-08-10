import { prisma } from "@/lib/prisma";
import { SellerTier } from "@prisma/client";

// Valeurs de repli si la table de config est vide/inaccessible.
// La source de vérité reste la table MarketplaceCommissionConfig (éditable admin).
const DEFAULT_RATES: Record<SellerTier, number> = {
  STANDARD: 0.15,
  PRO: 0.1,
  ENTERPRISE: 0.075,
};

let cache: { data: Record<string, number>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function loadRates(): Promise<Record<string, number>> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  const rows = await prisma.marketplaceCommissionConfig.findMany({
    where: { active: true },
  });

  const rates: Record<string, number> = { ...DEFAULT_RATES };
  for (const row of rows) {
    rates[row.tier] = row.rate;
  }

  cache = { data: rates, expiresAt: Date.now() + CACHE_TTL_MS };
  return rates;
}

export async function getCommissionRate(tier: SellerTier): Promise<number> {
  const rates = await loadRates();
  return rates[tier] ?? DEFAULT_RATES.STANDARD;
}

/**
 * Calcule la commission ZOVO et le montant vendeur à partir du prix RÉEL
 * enregistré côté serveur (produit en base). Ne jamais appeler avec un prix
 * venant directement du navigateur.
 */
export async function computeOrderAmounts(priceCents: number, tier: SellerTier) {
  if (!Number.isInteger(priceCents) || priceCents <= 0) {
    throw new Error("priceCents invalide");
  }

  const commissionRate = await getCommissionRate(tier);
  const commissionCents = Math.round(priceCents * commissionRate);
  const sellerAmountCents = priceCents - commissionCents;

  return { commissionRate, commissionCents, sellerAmountCents };
}

export function invalidateCommissionCache() {
  cache = null;
}
