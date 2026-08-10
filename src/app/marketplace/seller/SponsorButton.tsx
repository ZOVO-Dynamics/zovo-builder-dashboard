"use client";

import { useState } from "react";

const PLACEMENT_OPTIONS = [
  { value: "HOUR_24", label: "24 heures" },
  { value: "DAYS_7", label: "7 jours" },
  { value: "DAYS_30", label: "30 jours" },
  { value: "FEATURED", label: "Produit vedette (1 semaine)" },
  { value: "HOMEPAGE", label: "Page d'accueil (1 semaine)" },
];

export default function SponsorButton({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false);
  const [placementType, setPlacementType] = useState("HOUR_24");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSponsor() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/sponsored", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, placementType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création du paiement");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#C9A227] hover:text-[#E8C34A]"
      >
        Sponsoriser
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-[#2A2A2E] bg-[#0A0A0C] p-2">
      <select
        value={placementType}
        onChange={(e) => setPlacementType(e.target.value)}
        className="rounded-md border border-[#2A2A2E] bg-[#16161A] px-2 py-1 text-xs focus:border-[#C9A227] focus:outline-none"
      >
        {PLACEMENT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleSponsor}
        disabled={loading}
        className="rounded-md bg-[#C9A227] px-3 py-1 text-xs font-medium text-[#0A0A0C] transition hover:bg-[#E8C34A] disabled:opacity-60"
      >
        {loading ? "..." : "Payer"}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-[#9B9B95] hover:text-[#F5F1E8]"
      >
        Annuler
      </button>
      {error && <p className="w-full text-xs text-red-400">{error}</p>}
    </div>
  );
}
