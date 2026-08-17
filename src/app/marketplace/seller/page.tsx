import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SellerDashboard from "./SellerDashboard";

export const dynamic = "force-dynamic";

export default async function SellerPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/marketplace/seller");
  }

  const sellerRecord = await prisma.marketplaceSeller.findUnique({
    where: { userId: session.user.id },
    include: {
      products: { orderBy: { createdAt: "desc" } },
    },
  });

  const sellerWithAgency = sellerRecord
    ? { ...sellerRecord, isBuyingAgency: sellerRecord.isBuyingAgency }
    : null;

  const categories = await prisma.marketplaceCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  let stats = {
    totalSalesCount: 0,
    grossRevenueCents: 0,
    commissionCents: 0,
    netRevenueCents: 0,
    activeProducts: 0,
    sponsoredProducts: 0,
  };

  if (sellerRecord) {
    const [orderAgg, activeProducts, sponsoredCount] = await Promise.all([
      prisma.marketplaceOrder.aggregate({
        where: { sellerId: sellerRecord.id, status: "PAID" },
        _sum: { priceCents: true, commissionCents: true, sellerAmountCents: true },
        _count: { _all: true },
      }),
      prisma.marketplaceProduct.count({
        where: { sellerId: sellerRecord.id, status: "APPROVED" },
      }),
      prisma.sponsoredPlacement.count({
        where: { sellerId: sellerRecord.id, status: "ACTIVE" },
      }),
    ]);

    stats = {
      totalSalesCount: orderAgg._count._all,
      grossRevenueCents: orderAgg._sum.priceCents ?? 0,
      commissionCents: orderAgg._sum.commissionCents ?? 0,
      netRevenueCents: orderAgg._sum.sellerAmountCents ?? 0,
      activeProducts,
      sponsoredProducts: sponsoredCount,
    };
  }

  // Sérialisation : les composants client ne peuvent pas recevoir d'objets Date
  // directement depuis un Server Component, on convertit en ISO string.
  const seller = sellerRecord
    ? {
        id: sellerRecord.id,
        displayName: sellerRecord.displayName,
        tier: sellerRecord.tier,
        suspended: sellerRecord.suspended,
        isBuyingAgency: sellerRecord.isBuyingAgency,
        products: sellerRecord.products.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          priceCents: p.priceCents,
          currency: p.currency,
          status: p.status,
          salesCount: p.salesCount,
          createdAt: p.createdAt.toISOString(),
        })),
      }
    : null;

  return (
    <SellerDashboard
      seller={seller}
      categories={categories}
      stats={stats}
      balanceCents={sellerRecord?.balanceCents ?? 0}
    />
  );
}
