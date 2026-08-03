"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface SubscriptionData {
  hasSubscription: boolean;
  status?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string | null;
  planName?: string | null;
  planInternalName?: string | null;
  priceCents?: number | null;
  currency?: string | null;
  billingInterval?: string | null;
}

export default function BillingPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    let cancelled = false;

    setLoading(true);
    fetch("/api/subscription")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() gère lui-même son cleanup via un flag "cancelled"
    const cleanup = load();

    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) {
      setMessage("Paiement confirmé, merci pour ton abonnement !");
    } else if (params.get("canceled")) {
      setMessage("Le paiement a été annulé.");
    }

    return cleanup;
  }, []);

  async function runAction(action: "cancel" | "reactivate", label: string) {
    setActionLoading(action);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/subscription/${action}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Une erreur est survenue.");
      } else {
        setMessage(json.message || `${label} effectué avec succès.`);
        load();
      }
    } catch {
      setError("Une erreur réseau est survenue.");
    } finally {
      setActionLoading(null);
    }
  }

  async function changePlan(plan: "weekly_pro" | "monthly_pro") {
    setActionLoading("change-plan");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/subscription/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Une erreur est survenue.");
      } else {
        setMessage(json.message || "Plan changé avec succès.");
        load();
      }
    } catch {
      setError("Une erreur réseau est survenue.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-semibold text-[#F5F1E8]" style={{ fontFamily: "var(--font-display)" }}>
        Facturation
      </h1>

      {message && (
        <div className="mb-4 rounded-lg border border-emerald-800/60 bg-emerald-950/40 p-3 text-sm text-emerald-300">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-800/60 bg-red-950/40 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && <p className="text-[#9B9B95]">Chargement...</p>}

      {!loading && data && !data.hasSubscription && (
        <div className="blueprint-corner rounded-lg border border-[#2A2A2E] bg-[#16161A] p-6">
          <p className="text-[#9B9B95]">Tu n&apos;as pas encore d&apos;abonnement actif.</p>
          <a
            href="/pricing"
            className="mt-4 inline-block rounded-md border border-[#C9A227] bg-transparent px-4 py-2 text-sm font-medium text-[#E8C34A] transition-colors hover:bg-[#C9A227]/10"
          >
            Voir les plans
          </a>
        </div>
      )}

      {!loading && data && data.hasSubscription && (
        <div className="blueprint-corner rounded-lg border border-[#2A2A2E] bg-[#16161A] p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#9B9B95]">Plan actuel</p>
              <p className="text-xl font-medium text-[#F5F1E8]">{data.planName || "—"}</p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                data.status === "active"
                  ? "border-[#C9A227]/50 bg-[#1A1508] text-[#E8C34A]"
                  : "border-[#2A2A2E] bg-[#0A0A0C] text-[#9B9B95]"
              }`}
            >
              {data.status}
            </span>
          </div>

          {data.priceCents != null && (
            <p className="mt-2 text-sm text-[#9B9B95]">
              {(data.priceCents / 100).toFixed(2)} {data.currency} / {data.billingInterval === "week" ? "semaine" : "mois"}
            </p>
          )}

          {data.currentPeriodEnd && (
            <p className="mt-1 text-sm text-[#9B9B95]">
              {data.cancelAtPeriodEnd
                ? `Se termine le ${new Date(data.currentPeriodEnd).toLocaleDateString("fr-CA")}`
                : `Prochain renouvellement le ${new Date(data.currentPeriodEnd).toLocaleDateString("fr-CA")}`}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {!data.cancelAtPeriodEnd ? (
              <button
                onClick={() => runAction("cancel", "Annulation")}
                disabled={actionLoading !== null}
                className="rounded-md border border-red-800/60 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:bg-red-900/40 disabled:opacity-50"
              >
                {actionLoading === "cancel" ? "..." : "Annuler l'abonnement"}
              </button>
            ) : (
              <button
                onClick={() => runAction("reactivate", "Réactivation")}
                disabled={actionLoading !== null}
                className="rounded-md border border-emerald-800/60 bg-emerald-950/40 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-900/40 disabled:opacity-50"
              >
                {actionLoading === "reactivate" ? "..." : "Réactiver l'abonnement"}
              </button>
            )}

            {data.planInternalName !== "monthly_pro" && (
              <button
                onClick={() => changePlan("monthly_pro")}
                disabled={actionLoading !== null}
                className="rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-4 py-2 text-sm font-medium text-[#F5F1E8] transition-colors hover:border-[#C9A227]/40 disabled:opacity-50"
              >
                {actionLoading === "change-plan" ? "..." : "Passer au plan mensuel"}
              </button>
            )}

            {data.planInternalName !== "weekly_pro" && (
              <button
                onClick={() => changePlan("weekly_pro")}
                disabled={actionLoading !== null}
                className="rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-4 py-2 text-sm font-medium text-[#F5F1E8] transition-colors hover:border-[#C9A227]/40 disabled:opacity-50"
              >
                {actionLoading === "change-plan" ? "..." : "Passer au plan hebdomadaire"}
              </button>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
