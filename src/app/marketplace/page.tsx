import { prisma } from "@/lib/prisma";
import MarketplaceBrowser from "./MarketplaceBrowser";

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const categories = await prisma.marketplaceCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Le Marketplace <span className="text-[#C9A227]">ZOVO</span>
        </h1>
        <p className="mt-2 max-w-2xl text-[#9B9B95]">
          Plugins, templates, applications, agents IA, outils développeurs et
          services — publiés par la communauté ZOVO.
        </p>
      </div>

      <MarketplaceBrowser categories={categories} />
    </div>
  );
}
