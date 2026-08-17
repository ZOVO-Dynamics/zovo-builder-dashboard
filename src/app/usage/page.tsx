"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface UsageData {
  hasSubscription: boolean;
  planName: string | null;
  used: number;
  cap: number;
  remaining: number;
  totalGenerations: number;
  lastGeneration: string | null;
  lastGenerationAt: string | null;
}

export default function UsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((d) => setData(d))
      .catch(() => setError("Impossible de charger les donnees d'usage."));
  }, []);

  const percent = data && data.cap > 0 ? Math.min(100, Math.round((data.used / data.cap) * 100)) : 0;

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div>
        <span style={{ fontFamily: "var(--font-mono)" }} className="text-xs text-[#E8C34A]">USAGE</span>
        <h1 style={{ fontFamily: "var(--font-display)" }} className="mt-1 text-2xl font-bold text-[#F5F1E8]">
          Ton utilisation
        </h1>
        <p className="mt-1 text-sm text-[#9B9B95]">
          Suivi de tes generations et de ton plan actuel.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/40 border border-red-800/60 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!error && data === null && (
        <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-6 text-sm text-[#9B9B95]">
          Chargement...
        </div>
      )}

      {!error && data && !data.hasSubscription && (
        <div className="rounded-lg border border-[#C9A227]/40 bg-[#16161A] p-6 space-y-3">
          <p className="text-sm text-[#F5F1E8]">Tu n'as pas d'abonnement actif.</p>
          <Link
            href="/pricing"
            className="inline-block rounded-md bg-[#C9A227] hover:bg-[#E8C34A] px-4 py-2 text-sm font-medium text-[#0A0A0C]"
          >
            Voir les plans
          </Link>
        </div>
      )}

      {!error && data && data.hasSubscription && (
        <>
          <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#9B9B95]">Plan actuel</span>
              <span className="text-sm font-medium text-[#E8C34A]">{data.planName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#9B9B95]">Generations ce mois-ci</span>
              <span className="text-sm text-[#F5F1E8]">
                {data.used} / {data.cap}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#2A2A2E] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#C9A227] to-[#E8C34A]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-[#6B6560]">{data.remaining} generation(s) restante(s) ce mois-ci</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4">
              <p className="text-xs uppercase tracking-wide text-[#6B6560]">Total genere</p>
              <p className="mt-1 text-lg font-bold text-[#F5F1E8]">{data.totalGenerations}</p>
              <p className="text-xs text-[#9B9B95]">depuis la creation du compte</p>
            </div>
            <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4">
              <p className="text-xs uppercase tracking-wide text-[#6B6560]">Derniere generation</p>
              <p className="mt-1 text-sm text-[#F5F1E8] break-words">
                {data.lastGeneration ?? "Aucune"}
              </p>
              {data.lastGenerationAt && (
                <p className="text-xs text-[#9B9B95]">
                  {new Date(data.lastGenerationAt).toLocaleDateString("fr-CA")}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
