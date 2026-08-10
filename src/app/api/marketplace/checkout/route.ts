import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { computeOrderAmounts } from "@/lib/marketplace/commission";

// Crée une commande PENDING + une session Stripe Checkout pour l'achat
// d'un produit Marketplace. Le prix et la commission sont TOUJOURS
// recalculés depuis la base de données ici, jamais depuis le navigateur.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const productId = body?.productId;

    if (typeof productId !== "string") {
      return NextResponse.json({ error: "productId requis" }, { status: 400 });
    }

    const product = await prisma.marketplaceProduct.findUnique({
      where: { id: productId },
      include: { seller: true },
    });

    if (!product || product.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Produit introuvable ou non disponible à l'achat" },
        { status: 404 }
      );
    }

    if (product.seller.suspended) {
      return NextResponse.json(
        { error: "Ce vendeur est actuellement suspendu" },
        { status: 403 }
      );
    }

    if (product.seller.userId === session.user.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas acheter votre propre produit" },
        { status: 400 }
      );
    }

    // Montant réel enregistré en base, jamais celui envoyé par le client.
    const { commissionRate, commissionCents, sellerAmountCents } =
      await computeOrderAmounts(product.priceCents, product.seller.tier);

    const baseUrl = process.env.AUTH_URL || "https://www.zovo.ca";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: product.currency.toLowerCase(),
            product_data: { name: product.title },
            unit_amount: product.priceCents,
          },
          quantity: 1,
        },
      ],
      managed_payments: { enabled: false },
      allow_promotion_codes: true,
      customer_email: session.user.email || undefined,
      success_url: `${baseUrl}/marketplace/${product.slug}?purchase=success`,
      cancel_url: `${baseUrl}/marketplace/${product.slug}?purchase=cancelled`,
      metadata: {
        kind: "marketplace_order",
        productId: product.id,
        buyerId: session.user.id,
        sellerId: product.sellerId,
      },
    });

    await prisma.marketplaceOrder.create({
      data: {
        productId: product.id,
        buyerId: session.user.id,
        sellerId: product.sellerId,
        priceCents: product.priceCents,
        currency: product.currency,
        commissionRate,
        commissionCents,
        sellerAmountCents,
        stripeCheckoutSessionId: checkoutSession.id,
        status: "PENDING",
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: unknown) {
    console.error("MARKETPLACE CHECKOUT ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
