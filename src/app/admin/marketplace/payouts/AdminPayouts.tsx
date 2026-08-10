"use client";

import { useState } from "react";

type Payout = {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  requestedAt: string;
  paidAt: string | null;
  seller: { displayName: string | null };
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-[#C9A227]",
  PROCESSING: "text-[#C9A227]",
  PAID: "text-green-400",
  FAILED: "text-red-400",
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency }).format(
    cents / 100
  );
}

export default function AdminPayouts({ initialPayouts }: { initialPayouts: Payout[] }) {
  const [payouts, setPayouts] = useState(initialPayouts);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("PENDING");

  async function handleAction(payoutId: string, action: "approve" | "reject") {
    setLoadingId(payoutId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/marketplace/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors du traitement");

      setPayouts((prev) =>
        prev.map((p) => (p.id === payoutId ? { ...p, status: data.status } : p))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingId(null);
    }
  }

  const visible = filter ? payouts.filter((p) => p.status === filter) : payouts;

  return (
    <div className="min-h-screen bg-[#0A0A0C] p-4 text-[#F5F1E8] sm:p-8">
      <h1 className="mb-4 text-2xl font-semibold">
        Demandes de retrait <span className="text-[#C9A227]">ZOVO</span>
      </h1>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {["", "PENDING", "PROCESSING", "PAID", "FAILED"].map((s) => (
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
          <div key={p.id} className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {p.seller.displayName ?? "Vendeur inconnu"} —{" "}
                  {formatPrice(p.amountCents, p.currency)}
                </p>
                <p className="text-xs text-[#9B9B95]">
                  Demandé le {new Date(p.requestedAt).toLocaleString("fr-CA")}
                </p>
              </div>
              <span className={`text-sm font-medium ${STATUS_COLORS[p.status] ?? ""}`}>
                {p.status}
              </span>
            </div>

            {p.status === "PENDING" && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(p.id, "approve")}
                  disabled={loadingId === p.id}
                  className="rounded-md bg-[#C9A227] px-3 py-1.5 text-xs font-medium text-[#0A0A0C] transition hover:bg-[#E8C34A] disabled:opacity-50"
                >
                  {loadingId === p.id ? "..." : "Approuver et virer"}
                </button>
                <button
                  onClick={() => handleAction(p.id, "reject")}
                  disabled={loadingId === p.id}
                  className="rounded-md border border-red-900/50 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-950/20 disabled:opacity-50"
                >
                  Rejeter
                </button>
              </div>
            )}
          </div>
        ))}

        {visible.length === 0 && (
          <p className="text-sm text-[#9B9B95]">Aucune demande dans ce statut.</p>
        )}
      </div>
    </div>
  );
}
