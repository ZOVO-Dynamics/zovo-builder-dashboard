"use client";

import { useState } from "react";

type Seller = {
  id: string;
  displayName: string | null;
  tier: string;
  suspended: boolean;
  balanceCents: number;
  ratingAvg: number;
  ratingCount: number;
  productCount: number;
  email: string;
};

const TIER_OPTIONS = [
  { value: "STANDARD", label: "Standard (15%)" },
  { value: "PRO", label: "Pro (10%)" },
  { value: "ENTERPRISE", label: "Enterprise (7.5%)" },
];

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(
    cents / 100
  );
}

export default function AdminSellers({ initialSellers }: { initialSellers: Seller[] }) {
  const [sellers, setSellers] = useState(initialSellers);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function updateSeller(sellerId: string, data: { suspended?: boolean; tier?: string }) {
    setLoadingId(sellerId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/marketplace/sellers/${sellerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erreur lors de la mise à jour");

      setSellers((prev) =>
        prev.map((s) => (s.id === sellerId ? { ...s, ...data } : s))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingId(null);
    }
  }

  const visible = search
    ? sellers.filter(
        (s) =>
          s.displayName?.toLowerCase().includes(search.toLowerCase()) ||
          s.email.toLowerCase().includes(search.toLowerCase())
      )
    : sellers;

  return (
    <div className="min-h-screen bg-[#0A0A0C] p-4 text-[#F5F1E8] sm:p-8">
      <h1 className="mb-4 text-2xl font-semibold">
        Vendeurs <span className="text-[#C9A227]">ZOVO</span>
      </h1>

      <input
        type="text"
        placeholder="Rechercher par nom ou email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-md border border-[#2A2A2E] bg-[#16161A] px-3 py-2 text-sm placeholder:text-[#9B9B95] focus:border-[#C9A227] focus:outline-none"
      />

      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

      <div className="space-y-2">
        {visible.map((s) => (
          <div key={s.id} className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{s.displayName ?? "Vendeur sans nom"}</p>
                <p className="text-xs text-[#9B9B95]">{s.email}</p>
                <p className="text-xs text-[#9B9B95]">
                  {s.productCount} produit{s.productCount === 1 ? "" : "s"} · Solde{" "}
                  {formatPrice(s.balanceCents)} ·{" "}
                  {s.ratingCount > 0 ? `★ ${s.ratingAvg.toFixed(1)}` : "Pas d'évaluation"}
                </p>
              </div>
              {s.suspended && (
                <span className="rounded-full bg-red-950/40 px-2 py-0.5 text-xs text-red-400">
                  SUSPENDU
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={s.tier}
                onChange={(e) => updateSeller(s.id, { tier: e.target.value })}
                disabled={loadingId === s.id}
                className="rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-2 py-1 text-xs focus:border-[#C9A227] focus:outline-none disabled:opacity-50"
              >
                {TIER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => updateSeller(s.id, { suspended: !s.suspended })}
                disabled={loadingId === s.id}
                className={`rounded-md border px-3 py-1 text-xs transition disabled:opacity-50 ${
                  s.suspended
                    ? "border-green-900/50 text-green-400 hover:bg-green-950/20"
                    : "border-red-900/50 text-red-400 hover:bg-red-950/20"
                }`}
              >
                {loadingId === s.id ? "..." : s.suspended ? "Réactiver" : "Suspendre"}
              </button>
            </div>
          </div>
        ))}

        {visible.length === 0 && (
          <p className="text-sm text-[#9B9B95]">Aucun vendeur trouvé.</p>
        )}
      </div>
    </div>
  );
}
