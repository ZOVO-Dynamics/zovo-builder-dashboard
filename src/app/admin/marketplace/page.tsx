import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import AdminMarketplaceProducts from "./AdminMarketplaceProducts";

export const dynamic = "force-dynamic";

export default async function AdminMarketplacePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/marketplace");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    notFound();
  }

  const products = await prisma.marketplaceProduct.findMany({
    include: {
      seller: { select: { displayName: true, userId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    priceCents: p.priceCents,
    currency: p.currency,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
    seller: { displayName: p.seller.displayName },
  }));

  return <AdminMarketplaceProducts initialProducts={serialized} />;
}
