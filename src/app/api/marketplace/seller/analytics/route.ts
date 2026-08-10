import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Agrège les événements analytics par produit pour le vendeur connecté :
// vues, impressions sponsorisées, clics sponsorisés, ventes, taux de
// conversion (ventes / vues). Calculé à la demande, pas de table dédiée.
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const seller = await prisma.marketplaceSeller.findUnique({
      where: { userId: session.user.id },
      include: { products: { select: { id: true, title: true } } },
    });

    if (!seller) {
      return NextResponse.json({ analytics: [] });
    }

    const productIds = seller.products.map((p) => p.id);

    if (productIds.length === 0) {
      return NextResponse.json({ analytics: [] });
    }

    const events = await prisma.marketplaceAnalyticsEvent.groupBy({
      by: ["productId", "type"],
      where: { productId: { in: productIds } },
      _count: { _all: true },
    });

    const analytics = seller.products.map((product) => {
      const countFor = (type: string) =>
        events.find((e) => e.productId === product.id && e.type === type)?._count._all ?? 0;

      const views = countFor("VIEW");
      const sales = countFor("SALE");
      const sponsoredImpressions = countFor("SPONSORED_IMPRESSION");
      const sponsoredClicks = countFor("SPONSORED_CLICK");

      return {
        productId: product.id,
        title: product.title,
        views,
        sales,
        sponsoredImpressions,
        sponsoredClicks,
        conversionRate: views > 0 ? sales / views : 0,
        sponsoredCtr: sponsoredImpressions > 0 ? sponsoredClicks / sponsoredImpressions : 0,
      };
    });

    return NextResponse.json({ analytics });
  } catch (error: unknown) {
    console.error("SELLER ANALYTICS ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
