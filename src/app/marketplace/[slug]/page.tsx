import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import BuyButton from "./BuyButton";
import TrackEvent from "../TrackEvent";

export const dynamic = "force-dynamic";

const TYPE_LABELS: Record<string, string> = {
  PLUGIN: "Plugin",
  TEMPLATE: "Template",
  APPLICATION: "Application",
  COMPONENT: "Composant",
  AI_AGENT: "Agent IA",
  DEV_TOOL: "Outil développeur",
  PROJECT: "Projet",
  SERVICE: "Service",
  DIGITAL_RESOURCE: "Ressource numérique",
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency }).format(
    cents / 100
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.marketplaceProduct.findUnique({
    where: { slug },
    include: {
      seller: { select: { id: true, displayName: true, ratingAvg: true, ratingCount: true, tier: true } },
      category: { select: { name: true, slug: true } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { buyer: { select: { name: true } } },
      },
      placements: {
        where: { status: "ACTIVE" },
        select: { id: true, placementType: true },
      },
    },
  });

  // Un produit non approuvé (DRAFT/PENDING_REVIEW/REJECTED/SUSPENDED/ARCHIVED)
  // n'est jamais visible publiquement.
  if (!product || product.status !== "APPROVED") {
    notFound();
  }

  const isSponsored = product.placements.length > 0;
  const activePlacementId = product.placements[0]?.id;

  const similarProducts = await prisma.marketplaceProduct.findMany({
    where: {
      status: "APPROVED",
      categoryId: product.categoryId,
      id: { not: product.id },
    },
    take: 4,
    select: { slug: true, title: true, priceCents: true, currency: true },
  });

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <TrackEvent productId={product.id} type="VIEW" sponsoredPlacementId={activePlacementId} />
      <div className="lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          {isSponsored && (
            <span className="rounded-full bg-[#C9A227] px-3 py-1 text-xs font-semibold text-[#0A0A0C]">
              SPONSORISÉ
            </span>
          )}
          <span className="rounded-full border border-[#2A2A2E] px-3 py-1 text-xs text-[#9B9B95]">
            {TYPE_LABELS[product.type] ?? product.type}
          </span>
          {product.category && (
            <span className="text-xs text-[#9B9B95]">{product.category.name}</span>
          )}
        </div>

        <h1 className="mb-3 text-3xl font-semibold tracking-tight">{product.title}</h1>

        {Array.isArray(product.screenshots) && product.screenshots.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-2">
            {(product.screenshots as string[]).slice(0, 4).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt={`Aperçu ${i + 1} de ${product.title}`}
                className="aspect-video w-full rounded-md border border-[#2A2A2E] object-cover"
              />
            ))}
          </div>
        )}

        <p className="mb-6 whitespace-pre-wrap text-[#F5F1E8]/90">{product.description}</p>

        <dl className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-[#9B9B95]">Version</dt>
            <dd>{product.version ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[#9B9B95]">Compatibilité</dt>
            <dd>{product.compatibility ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[#9B9B95]">Licence</dt>
            <dd>{product.licenseType ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[#9B9B95]">Ventes</dt>
            <dd>{product.salesCount}</dd>
          </div>
        </dl>

        {product.changelog && (
          <div className="mb-6">
            <h2 className="mb-2 font-medium text-[#F5F1E8]">Changelog</h2>
            <p className="whitespace-pre-wrap text-sm text-[#9B9B95]">{product.changelog}</p>
          </div>
        )}

        <div>
          <h2 className="mb-3 font-medium text-[#F5F1E8]">
            Évaluations ({product.ratingCount})
          </h2>
          {product.reviews.length === 0 ? (
            <p className="text-sm text-[#9B9B95]">Aucune évaluation pour l&apos;instant.</p>
          ) : (
            <ul className="space-y-3">
              {product.reviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-md border border-[#2A2A2E] bg-[#16161A] p-3 text-sm"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium">{review.buyer.name ?? "Acheteur ZOVO"}</span>
                    <span className="text-[#C9A227]">{"★".repeat(review.rating)}</span>
                  </div>
                  {review.comment && <p className="text-[#9B9B95]">{review.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <div className="sticky top-24 rounded-lg border border-[#2A2A2E] bg-[#16161A] p-5">
          <p className="mb-4 text-3xl font-semibold text-[#C9A227]">
            {formatPrice(product.priceCents, product.currency)}
          </p>

          <BuyButton productId={product.id} />

          <div className="mt-4 border-t border-[#2A2A2E] pt-4 text-sm">
            <p className="mb-1 text-[#9B9B95]">Vendu par</p>
            <p className="font-medium">{product.seller.displayName ?? "Vendeur ZOVO"}</p>
            <p className="text-xs text-[#9B9B95]">
              {product.seller.ratingCount > 0
                ? `★ ${product.seller.ratingAvg.toFixed(1)} (${product.seller.ratingCount} avis)`
                : "Nouveau vendeur"}
            </p>
          </div>
        </div>

        {similarProducts.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 font-medium text-[#F5F1E8]">Produits similaires</h2>
            <ul className="space-y-2">
              {similarProducts.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/marketplace/${p.slug}`}
                    className="flex items-center justify-between rounded-md border border-[#2A2A2E] bg-[#16161A] p-3 text-sm transition hover:border-[#C9A227]"
                  >
                    <span>{p.title}</span>
                    <span className="text-[#C9A227]">{formatPrice(p.priceCents, p.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
