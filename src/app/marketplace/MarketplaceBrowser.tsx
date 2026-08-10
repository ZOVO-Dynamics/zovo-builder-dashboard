"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Category = { id: string; name: string; slug: string };

type Product = {
  id: string;
  title: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  type: string;
  salesCount: number;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  isSponsored: boolean;
  activePlacementId: string | null;
  seller: { displayName: string | null; ratingAvg: number; tier: string };
  category: { name: string; slug: string } | null;
};

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

type SortOption = "recent" | "popular" | "price_asc" | "price_desc" | "rating";

const SPONSORED_SORT_BOOST = 0.15;

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function logEvent(
  productId: string,
  type: "SPONSORED_IMPRESSION" | "SPONSORED_CLICK",
  sponsoredPlacementId?: string | null
) {
  fetch("/api/marketplace/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId,
      type,
      sponsoredPlacementId: sponsoredPlacementId ?? undefined,
    }),
  }).catch(() => {
    // silencieux : un échec de log analytics ne doit jamais perturber l'utilisateur
  });
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/marketplace/${product.slug}`}
      onClick={() => {
        if (product.isSponsored) {
          logEvent(product.id, "SPONSORED_CLICK", product.activePlacementId);
        }
      }}
      className="group relative rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4 transition hover:border-[#C9A227]"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {product.isSponsored && (
            <span className="rounded-full bg-[#C9A227] px-2 py-0.5 text-xs font-semibold text-[#0A0A0C]">
              SPONSORISÉ
            </span>
          )}
          <span className="rounded-full border border-[#2A2A2E] px-2 py-0.5 text-xs text-[#9B9B95]">
            {TYPE_LABELS[product.type] ?? product.type}
          </span>
        </div>
        {product.category && (
          <span className="text-xs text-[#9B9B95]">{product.category.name}</span>
        )}
      </div>

      <h3 className="mb-1 font-medium text-[#F5F1E8] group-hover:text-[#E8C34A]">
        {product.title}
      </h3>
      <p className="mb-3 line-clamp-2 text-sm text-[#9B9B95]">{product.description}</p>

      <div className="flex items-center justify-between">
        <span className="font-semibold text-[#C9A227]">
          {formatPrice(product.priceCents, product.currency)}
        </span>
        <span className="text-xs text-[#9B9B95]">
          {product.ratingCount > 0
            ? `★ ${product.ratingAvg.toFixed(1)} (${product.ratingCount})`
            : "Aucune évaluation"}
        </span>
      </div>

      <div className="mt-2 text-xs text-[#9B9B95]">
        par {product.seller.displayName ?? "Vendeur ZOVO"} · {product.salesCount} vente
        {product.salesCount === 1 ? "" : "s"}
      </div>
    </Link>
  );
}

export default function MarketplaceBrowser({ categories }: { categories: Category[] }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [sort, setSort] = useState<SortOption>("recent");

  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryId) params.set("categoryId", categoryId);
    if (type) params.set("type", type);

    setLoading(true);
    setError(null);

    fetch(`/api/marketplace/products?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Impossible de charger les produits");
        return res.json();
      })
      .then((data) => setProducts(data.products ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [categoryId, type]);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, search]);

  const sponsoredSpotlight = useMemo(
    () => filtered.filter((p) => p.isSponsored).slice(0, 4),
    [filtered]
  );

  // Log une impression sponsorisée UNE fois par produit affiché dans le
  // spotlight, quand la liste change réellement (pas à chaque re-render).
  useEffect(() => {
    sponsoredSpotlight.forEach((p) => {
      logEvent(p.id, "SPONSORED_IMPRESSION", p.activePlacementId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsoredSpotlight.map((p) => p.id).join(",")]);

  const rankedProducts = useMemo(() => {
    const scored = filtered.map((p) => {
      let score: number;
      switch (sort) {
        case "popular":
          score = p.salesCount;
          break;
        case "rating":
          score = p.ratingAvg;
          break;
        case "price_asc":
          score = -p.priceCents;
          break;
        case "price_desc":
          score = p.priceCents;
          break;
        default:
          score = new Date(p.createdAt).getTime();
      }

      const boosted = p.isSponsored ? score * (1 + SPONSORED_SORT_BOOST) : score;
      return { product: p, score: boosted };
    });

    return scored.sort((a, b) => b.score - a.score).map((s) => s.product);
  }, [filtered, sort]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Rechercher un produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-[#2A2A2E] bg-[#16161A] px-4 py-2.5 text-sm text-[#F5F1E8] placeholder:text-[#9B9B95] focus:border-[#C9A227] focus:outline-none sm:max-w-sm"
        />

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-[#2A2A2E] bg-[#16161A] px-3 py-2.5 text-sm text-[#F5F1E8] focus:border-[#C9A227] focus:outline-none"
        >
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-[#2A2A2E] bg-[#16161A] px-3 py-2.5 text-sm text-[#F5F1E8] focus:border-[#C9A227] focus:outline-none"
        >
          <option value="">Tous types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-md border border-[#2A2A2E] bg-[#16161A] px-3 py-2.5 text-sm text-[#F5F1E8] focus:border-[#C9A227] focus:outline-none"
        >
          <option value="recent">Plus récents</option>
          <option value="popular">Plus populaires</option>
          <option value="rating">Mieux notés</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
        </select>
      </div>

      {loading && <p className="text-[#9B9B95]">Chargement...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {!loading && !error && sponsoredSpotlight.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9B9B95]">
            Sponsorisé
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sponsoredSpotlight.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {!loading && !error && rankedProducts.length === 0 && (
        <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-8 text-center text-[#9B9B95]">
          Aucun produit ne correspond à ces critères pour le moment.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rankedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
