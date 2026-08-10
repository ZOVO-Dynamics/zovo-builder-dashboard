import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MarketplaceAnalyticsEventType } from "@prisma/client";

const VALID_TYPES: string[] = Object.values(MarketplaceAnalyticsEventType);

// Route publique (pas d'auth requise) — un visiteur anonyme génère des
// vues/clics. Volontairement minimaliste : pas de vérification de
// propriété puisqu'un événement de vue/clic n'affecte jamais l'argent
// ou les données sensibles, contrairement aux commandes/paiements.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, type, sponsoredPlacementId } = body ?? {};

    if (typeof productId !== "string") {
      return NextResponse.json({ error: "productId requis" }, { status: 400 });
    }

    if (typeof type !== "string" || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type invalide. Valeurs acceptées: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // SALE ne doit jamais être loggé depuis le client — uniquement par
    // le webhook Stripe côté serveur, pour éviter un faux positif de vente.
    if (type === "SALE") {
      return NextResponse.json(
        { error: "Le type SALE ne peut pas être créé via cette route" },
        { status: 403 }
      );
    }

    const product = await prisma.marketplaceProduct.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    await prisma.marketplaceAnalyticsEvent.create({
      data: {
        productId,
        type: type as MarketplaceAnalyticsEventType,
        sponsoredPlacementId:
          typeof sponsoredPlacementId === "string" ? sponsoredPlacementId : null,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: unknown) {
    console.error("MARKETPLACE EVENT LOG ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
