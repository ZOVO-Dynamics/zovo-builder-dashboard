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

export default function DashboardStats() {
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <>
      <div className="rounded-xl border border-[#2A2A2E] p-6 flex flex-col items-center">
        <div className="text-xs uppercase tracking-widest text-[#9B9B95]">Plan actuel</div>
        {data?.hasSubscription ? (
          <>
            <div className="mt-2 text-lg font-semibold">{data.planName}</div>
            <div className="mt-1 text-sm text-[#9B9B95]">
              {data.remaining} generation{data.remaining !== 1 ? "s" : ""} restante{data.remaining !== 1 ? "s" : ""} ({data.used}/{data.cap})
            </div>
          </>
        ) : (
          <>
            <div className="mt-2 text-lg font-semibold">Aucun abonnement</div>
            <Link href="/pricing" className="mt-1 inline-block text-sm text-[#E8C34A] hover:underline">
              Voir les plans →
            </Link>
          </>
        )}
      </div>

      <div className="rounded-xl border border-[#2A2A2E] p-6 flex flex-col items-center">
        <div className="text-xs uppercase tracking-widest text-[#9B9B95]">Projets generes</div>
        <div className="mt-2 text-lg font-semibold">{data?.totalGenerations ?? 0} au total</div>
        <div className="mt-1 text-sm text-[#9B9B95]">Depuis la creation de votre compte</div>
      </div>

      <div className="rounded-xl border border-[#2A2A2E] p-6 flex flex-col items-center">
        <div className="text-xs uppercase tracking-widest text-[#9B9B95]">Dernier projet</div>
        {data?.lastGeneration ? (
          <>
            <div className="mt-2 truncate text-lg font-semibold" title={data.lastGeneration}>
              {data.lastGeneration}
            </div>
            <div className="mt-1 text-sm text-[#9B9B95]">
              {data.lastGenerationAt ? new Date(data.lastGenerationAt).toLocaleDateString("fr-CA") : ""}
            </div>
          </>
        ) : (
          <div className="mt-2 text-sm text-[#9B9B95]">Aucun projet genere encore</div>
        )}
      </div>
    </>
  );
}
