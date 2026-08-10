"use client";

import { useState } from "react";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(
    cents / 100
  );
}

export default function PayoutButton({ balanceCents }: { balanceCents: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const MINIMUM_PAYOUT_CENTS = 2000;
  const eligible = balanceCents >= MINIMUM_PAYOUT_CENTS;

  async function handleRequestPayout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/payouts", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la demande de retrait");
      setSuccess(true);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return <p className="text-sm text-green-400">Demande de retrait envoyée ✓</p>;
  }

  return (
    <div>
      <button
        onClick={handleRequestPayout}
        disabled={loading || !eligible}
        className="rounded-md border border-[#C9A227] px-3 py-1.5 text-sm text-[#C9A227] transition hover:bg-[#C9A227] hover:text-[#0A0A0C] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Envoi..." : "Demander un retrait"}
      </button>
      {!eligible && (
        <p className="mt-1 text-xs text-[#9B9B95]">
          Minimum {formatPrice(MINIMUM_PAYOUT_CENTS)} pour demander un retrait
        </p>
      )}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
