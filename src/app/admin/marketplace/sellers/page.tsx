import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import AdminSellers from "./AdminSellers";

export const dynamic = "force-dynamic";

export default async function AdminSellersPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/marketplace/sellers");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    notFound();
  }

  const sellers = await prisma.marketplaceSeller.findMany({
    include: {
      user: { select: { email: true } },
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized = sellers.map((s) => ({
    id: s.id,
    displayName: s.displayName,
    tier: s.tier,
    suspended: s.suspended,
    balanceCents: s.balanceCents,
    ratingAvg: s.ratingAvg,
    ratingCount: s.ratingCount,
    productCount: s._count.products,
    email: s.user.email,
  }));

  return <AdminSellers initialSellers={serialized} />;
}
