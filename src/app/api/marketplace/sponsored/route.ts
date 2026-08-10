import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { SponsoredPlacementType } from "@prisma/client";
import {
  getSponsoredPriceCents,
  getPlacementDurationHours,
} from "@/lib/marketplace/sponsoredPricing";

const VALID_PLACEMENT_TYPES: string[] = Object.values(SponsoredPlacementType);

// Crée un SponsoredPlacement PENDING_PAYMENT + une session Stripe Checkout.
// Le prix est TOUJOURS recalculé depuis MarketplaceSponsoredPrice en base,
// jamais depuis le navigateur.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const { productId, placementType } = body ?? {};

    if (typeof productId !== "string") {
      return NextResponse.json({ error: "productId requis" }, { status: 400 });
    }

    if (
      typeof placementType !== "string" ||
      !VALID_PLACEMENT_TYPES.includes(placementType)
    ) {
      return NextResponse.json(
        {
          error: `placementType invalide. Valeurs acceptées: ${VALID_PLACEMENT_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const seller = await prisma.marketplaceSeller.findUnique({
      where: { userId: session.user.id },
    });

    if (!seller) {
      return NextResponse.json(
        { error: "Profil vendeur introuvable" },
        { status: 403 }
      );
    }

    const product = await prisma.marketplaceProduct.findUnique({
      where: { id: productId },
      select: { id: true, title: true, sellerId: true, status: true },
    });

    if (!product || product.sellerId !== seller.id) {
      return NextResponse.json(
        { error: "Produit introuvable ou ne vous appartenant pas" },
        { status: 404 }
      );
    }

    if (product.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Seul un produit approuvé peut être sponsorisé" },
        { status: 400 }
      );
    }

    // Prix réel depuis MarketplaceSponsoredPrice (jamais celui envoyé par le client).
    const priceCents = await getSponsoredPriceCents(
      placementType as SponsoredPlacementType
    );

    const baseUrl = process.env.AUTH_URL || "https://www.zovo.ca";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: `Placement sponsorisé (${placementType}) — ${product.title}`,
            },
            unit_amount: priceCents,
          },
          quantity: 1,
        },
      ],
      managed_payments: { enabled: false },
      allow_promotion_codes: true,
      customer_email: session.user.email || undefined,
      success_url: `${baseUrl}/marketplace/seller?sponsored=success`,
      cancel_url: `${baseUrl}/marketplace/seller?sponsored=cancelled`,
      metadata: {
        kind: "sponsored_placement",
        productId: product.id,
        sellerId: seller.id,
        placementType,
      },
    });

    await prisma.sponsoredPlacement.create({
      data: {
        productId: product.id,
        sellerId: seller.id,
        placementType: placementType as SponsoredPlacementType,
        priceCents,
        currency: "CAD",
        stripeCheckoutSessionId: checkoutSession.id,
        status: "PENDING_PAYMENT",
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: unknown) {
    console.error("SPONSORED PLACEMENT CHECKOUT ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
