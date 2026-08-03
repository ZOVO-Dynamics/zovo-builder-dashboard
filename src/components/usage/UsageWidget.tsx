"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface UsageData {
  hasSubscription: boolean;
  planName: string | null;
  used: number;
  cap: number;
  remaining: number;
}

export default function UsageWidget() {
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setData(json))
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  const noPlan = !data.hasSubscription;
  const pct = noPlan || !data.cap ? 0 : Math.min(100, (data.used / data.cap) * 100);
  const atLimit = !noPlan && data.remaining <= 0;

  return (
    <div className="mb-6 rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#9B9B95]">Generations ce mois-ci</span>
        <span className="font-medium text-[#F5F1E8]">
          {noPlan ? "Aucun abonnement" : `${data.used} / ${data.cap}`}
        </span>
      </div>
      {!noPlan && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-[#2A2A2E]">
          <div
            className={`h-1.5 rounded-full ${atLimit ? "bg-red-500" : "bg-[#C9A227]"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {atLimit && (
        <p className="mt-2 text-xs text-red-400">
          Quota atteint. <Link href="/#tarifs" className="text-[#E8C34A] underline">Passez au plan Pro</Link> pour continuer.
        </p>
      )}
    </div>
  );
}
