"use client";

import { useState } from "react";

export default function StripeOnboardButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOnboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/connect/onboard", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Impossible de démarrer l'inscription Stripe");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/20 p-4">
      <p className="text-sm font-medium text-red-300">Paiements sortants non activés</p>
      <p className="mt-1 text-xs text-[#9B9B95]">
        Complétez l&apos;inscription Stripe (identité, compte bancaire) pour pouvoir recevoir vos retraits.
        Votre solde reste accumulé entre-temps.
      </p>
      <button
        onClick={handleOnboard}
        disabled={loading}
        className="mt-3 rounded-md bg-[#C9A227] px-4 py-2 text-sm font-medium text-[#0A0A0C] transition hover:bg-[#E8C34A] disabled:opacity-60"
      >
        {loading ? "Redirection..." : "Compléter l'inscription Stripe"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
