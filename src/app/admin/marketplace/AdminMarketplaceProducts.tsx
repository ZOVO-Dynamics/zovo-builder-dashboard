"use client";

import { useState } from "react";

type Product = {
  id: string;
  title: string;
  slug: string;
  priceCents: number;
  currency: string;
  status: string;
  createdAt: string;
  seller: { displayName: string | null };
};

const STATUS_ACTIONS: { value: string; label: string }[] = [
  { value: "APPROVED", label: "Approuver" },
  { value: "REJECTED", label: "Rejeter" },
  { value: "SUSPENDED", label: "Suspendre" },
  { value: "PENDING_REVIEW", label: "Remettre en attente" },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "text-[#9B9B95]",
  PENDING_REVIEW: "text-[#C9A227]",
  APPROVED: "text-green-400",
  REJECTED: "text-red-400",
  SUSPENDED: "text-red-400",
  ARCHIVED: "text-[#9B9B95]",
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency }).format(
    cents / 100
  );
}

export default function AdminMarketplaceProducts({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  async function updateStatus(productId: string, status: string) {
    setLoadingId(productId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/marketplace/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la mise à jour");

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, status } : p))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingId(null);
    }
  }

  const visible = filter ? products.filter((p) => p.status === filter) : products;

  return (
    <div className="min-h-screen bg-[#0A0A0C] p-4 text-[#F5F1E8] sm:p-8">
      <h1 className="mb-4 text-2xl font-semibold">
        Modération Marketplace <span className="text-[#C9A227]">ZOVO</span>
      </h1>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {["", "PENDING_REVIEW", "APPROVED", "REJECTED", "SUSPENDED", "DRAFT"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-sm transition ${
              filter === s
                ? "border-[#C9A227] text-[#C9A227]"
                : "border-[#2A2A2E] text-[#9B9B95] hover:border-[#C9A227]"
            }`}
          >
            {s === "" ? "Tous" : s}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="space-y-2">
        {visible.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-[#9B9B95]">
                  {p.seller.displayName ?? "Vendeur inconnu"} ·{" "}
                  {formatPrice(p.priceCents, p.currency)}
                </p>
              </div>
              <span className={`text-sm font-medium ${STATUS_COLORS[p.status] ?? ""}`}>
                {p.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_ACTIONS.filter((a) => a.value !== p.status).map((action) => (
                <button
                  key={action.value}
                  onClick={() => updateStatus(p.id, action.value)}
                  disabled={loadingId === p.id}
                  className="rounded-md border border-[#2A2A2E] px-3 py-1.5 text-xs transition hover:border-[#C9A227] hover:text-[#E8C34A] disabled:opacity-50"
                >
                  {loadingId === p.id ? "..." : action.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {visible.length === 0 && (
          <p className="text-sm text-[#9B9B95]">Aucun produit dans ce statut.</p>
        )}
      </div>
    </div>
  );
}
