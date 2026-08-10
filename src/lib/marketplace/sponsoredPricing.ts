import { prisma } from "@/lib/prisma";
import { SponsoredPlacementType } from "@prisma/client";

const DEFAULT_PRICES_CENTS: Record<SponsoredPlacementType, number> = {
  HOUR_24: 499,
  DAYS_7: 1999,
  DAYS_30: 4999,
  FEATURED: 2999,
  HOMEPAGE: 7999,
};

const DEFAULT_DURATION_HOURS: Record<SponsoredPlacementType, number> = {
  HOUR_24: 24,
  DAYS_7: 24 * 7,
  DAYS_30: 24 * 30,
  FEATURED: 24 * 7,
  HOMEPAGE: 24 * 7,
};

let cache: { data: Record<string, number>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

async function loadPrices(): Promise<Record<string, number>> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  const rows = await prisma.marketplaceSponsoredPrice.findMany({
    where: { active: true },
  });

  const prices: Record<string, number> = { ...DEFAULT_PRICES_CENTS };
  for (const row of rows) {
    prices[row.placementType] = row.priceCents;
  }

  cache = { data: prices, expiresAt: Date.now() + CACHE_TTL_MS };
  return prices;
}

export async function getSponsoredPriceCents(
  type: SponsoredPlacementType
): Promise<number> {
  const prices = await loadPrices();
  return prices[type] ?? DEFAULT_PRICES_CENTS[type];
}

export function getPlacementDurationHours(type: SponsoredPlacementType): number {
  return DEFAULT_DURATION_HOURS[type];
}

export function invalidateSponsoredPriceCache() {
  cache = null;
}
