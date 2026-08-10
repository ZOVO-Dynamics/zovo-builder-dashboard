import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import AdminPayouts from "./AdminPayouts";

export const dynamic = "force-dynamic";

export default async function AdminPayoutsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/marketplace/payouts");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    notFound();
  }

  const payouts = await prisma.sellerPayout.findMany({
    include: {
      seller: { select: { displayName: true, userId: true } },
    },
    orderBy: { requestedAt: "desc" },
    take: 100,
  });

  const serialized = payouts.map((p) => ({
    id: p.id,
    amountCents: p.amountCents,
    currency: p.currency,
    status: p.status,
    requestedAt: p.requestedAt.toISOString(),
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    seller: { displayName: p.seller.displayName },
  }));

  return <AdminPayouts initialPayouts={serialized} />;
}
