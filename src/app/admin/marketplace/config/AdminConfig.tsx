"use client";

import { useState } from "react";

type CommissionRate = { tier: string; rate: number; active: boolean };
type SponsoredPrice = { placementType: string; priceCents: number; currency: string; active: boolean };

const TIER_LABELS: Record<string, string> = {
  STANDARD: "Standard",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

const PLACEMENT_LABELS: Record<string, string> = {
  HOUR_24: "24 heures",
  DAYS_7: "7 jours",
  DAYS_30: "30 jours",
  FEATURED: "Produit vedette",
  HOMEPAGE: "Page d'accueil",
};

export default function AdminConfig({
  initialCommissionRates,
  initialSponsoredPrices,
}: {
  initialCommissionRates: CommissionRate[];
  initialSponsoredPrices: SponsoredPrice[];
}) {
  const [rates, setRates] = useState(initialCommissionRates);
  const [prices, setPrices] = useState(initialSponsoredPrices);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveCommission(tier: string, ratePercent: string) {
    const rate = parseFloat(ratePercent) / 100;
    if (isNaN(rate) || rate < 0 || rate > 1) {
      setError("Taux invalide (0-100%)");
      return;
    }

    setSavingKey(`commission-${tier}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketplace/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "commission", tier, rate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      setRates((prev) => prev.map((r) => (r.tier === tier ? { ...r, rate } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingKey(null);
    }
  }

  async function saveSponsoredPrice(placementType: string, priceDollars: string) {
    const priceCents = Math.round(parseFloat(priceDollars) * 100);
    if (isNaN(priceCents) || priceCents <= 0) {
      setError("Prix invalide");
      return;
    }

    setSavingKey(`sponsored-${placementType}`);
    setError(null);
    try {
      const res = await fetch("/api/admin/marketplace/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "sponsoredPrice", placementType, priceCents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      setPrices((prev) =>
        prev.map((p) => (p.placementType === placementType ? { ...p, priceCents } : p))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] p-4 text-[#F5F1E8] sm:p-8">
      <h1 className="mb-6 text-2xl font-semibold">
        Configuration Marketplace <span className="text-[#C9A227]">ZOVO</span>
      </h1>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9B9B95]">
          Taux de commission par palier
        </h2>
        <div className="space-y-2">
          {rates.map((r) => (
            <div
              key={r.tier}
              className="flex items-center gap-3 rounded-lg border border-[#2A2A2E] bg-[#16161A] p-3"
            >
              <span className="w-32 text-sm">{TIER_LABELS[r.tier] ?? r.tier}</span>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                defaultValue={(r.rate * 100).toFixed(1)}
                onBlur={(e) => saveCommission(r.tier, e.target.value)}
                disabled={savingKey === `commission-${r.tier}`}
                className="w-24 rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-2 py-1 text-sm focus:border-[#C9A227] focus:outline-none disabled:opacity-50"
              />
              <span className="text-sm text-[#9B9B95]">%</span>
              {savingKey === `commission-${r.tier}` && (
                <span className="text-xs text-[#C9A227]">Enregistrement...</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-[#9B9B95]">
          Prix des placements sponsorisés
        </h2>
        <div className="space-y-2">
          {prices.map((p) => (
            <div
              key={p.placementType}
              className="flex items-center gap-3 rounded-lg border border-[#2A2A2E] bg-[#16161A] p-3"
            >
              <span className="w-40 text-sm">
                {PLACEMENT_LABELS[p.placementType] ?? p.placementType}
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={(p.priceCents / 100).toFixed(2)}
                onBlur={(e) => saveSponsoredPrice(p.placementType, e.target.value)}
                disabled={savingKey === `sponsored-${p.placementType}`}
                className="w-24 rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-2 py-1 text-sm focus:border-[#C9A227] focus:outline-none disabled:opacity-50"
              />
              <span className="text-sm text-[#9B9B95]">{p.currency}</span>
              {savingKey === `sponsored-${p.placementType}` && (
                <span className="text-xs text-[#C9A227]">Enregistrement...</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
