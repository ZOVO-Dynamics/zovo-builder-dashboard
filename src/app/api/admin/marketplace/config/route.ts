import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SellerTier, SponsoredPlacementType } from "@prisma/client";
import { invalidateCommissionCache } from "@/lib/marketplace/commission";
import { invalidateSponsoredPriceCache } from "@/lib/marketplace/sponsoredPricing";

const VALID_TIERS: string[] = Object.values(SellerTier);
const VALID_PLACEMENT_TYPES: string[] = Object.values(SponsoredPlacementType);

// Lecture de toute la configuration Marketplace pour l'admin (taux de
// commission par palier + prix des placements sponsorisés).
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const [commissionRates, sponsoredPrices] = await Promise.all([
      prisma.marketplaceCommissionConfig.findMany({ orderBy: { tier: "asc" } }),
      prisma.marketplaceSponsoredPrice.findMany({ orderBy: { placementType: "asc" } }),
    ]);

    return NextResponse.json({ commissionRates, sponsoredPrices });
  } catch (error: unknown) {
    console.error("ADMIN CONFIG GET ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Met à jour un taux de commission (par palier) ou un prix de placement
// sponsorisé (par type). Invalide le cache en mémoire pour que le
// changement soit immédiatement pris en compte par les prochains achats.
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const body = await req.json();
    const { kind } = body ?? {};

    if (kind === "commission") {
      const { tier, rate } = body;

      if (typeof tier !== "string" || !VALID_TIERS.includes(tier)) {
        return NextResponse.json(
          { error: `tier invalide. Valeurs acceptées: ${VALID_TIERS.join(", ")}` },
          { status: 400 }
        );
      }

      if (typeof rate !== "number" || rate < 0 || rate > 1) {
        return NextResponse.json(
          { error: "rate doit être un nombre entre 0 et 1 (ex: 0.15 pour 15%)" },
          { status: 400 }
        );
      }

      const updated = await prisma.marketplaceCommissionConfig.upsert({
        where: { tier: tier as SellerTier },
        create: { tier: tier as SellerTier, rate, active: true },
        update: { rate },
      });

      invalidateCommissionCache();

      console.log(`[ADMIN] Taux de commission ${tier} mis à jour à ${rate} par ${session.user.id}`);

      return NextResponse.json({ commissionRate: updated });
    }

    if (kind === "sponsoredPrice") {
      const { placementType, priceCents } = body;

      if (typeof placementType !== "string" || !VALID_PLACEMENT_TYPES.includes(placementType)) {
        return NextResponse.json(
          { error: `placementType invalide. Valeurs acceptées: ${VALID_PLACEMENT_TYPES.join(", ")}` },
          { status: 400 }
        );
      }

      if (!Number.isInteger(priceCents) || priceCents <= 0) {
        return NextResponse.json(
          { error: "priceCents doit être un entier positif (en cents)" },
          { status: 400 }
        );
      }

      const updated = await prisma.marketplaceSponsoredPrice.upsert({
        where: { placementType: placementType as SponsoredPlacementType },
        create: { placementType: placementType as SponsoredPlacementType, priceCents, currency: "CAD", active: true },
        update: { priceCents },
      });

      invalidateSponsoredPriceCache();

      console.log(`[ADMIN] Prix sponsoring ${placementType} mis à jour à ${priceCents} cents par ${session.user.id}`);

      return NextResponse.json({ sponsoredPrice: updated });
    }

    return NextResponse.json(
      { error: "kind doit être 'commission' ou 'sponsoredPrice'" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("ADMIN CONFIG PATCH ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
