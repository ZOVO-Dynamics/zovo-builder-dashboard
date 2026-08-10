import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import AdminConfig from "./AdminConfig";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/marketplace/config");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    notFound();
  }

  const [commissionRates, sponsoredPrices] = await Promise.all([
    prisma.marketplaceCommissionConfig.findMany({ orderBy: { tier: "asc" } }),
    prisma.marketplaceSponsoredPrice.findMany({ orderBy: { placementType: "asc" } }),
  ]);

  return (
    <AdminConfig
      initialCommissionRates={commissionRates}
      initialSponsoredPrices={sponsoredPrices}
    />
  );
}
