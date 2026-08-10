"use client";

import { useEffect, useState } from "react";

interface ValueEstimateResponse {
  estimatedValueCents: number;
  complexityTier: "simple" | "moyen" | "complexe";
  detectedFeatures: string[];
  fileCount: number;
}

const TIER_LABELS: Record<ValueEstimateResponse["complexityTier"], string> = {
  simple: "Simple",
  moyen: "Moyen",
  complexe: "Complexe",
};

interface ValueCounterProps {
  projectId: string | null;
}

export default function ValueCounter({ projectId }: ValueCounterProps) {
  const [estimate, setEstimate] = useState<ValueEstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        const data = await res.json();
        if (!cancelled) setEstimate(data?.valueEstimate ?? null);
      } catch {
        if (!cancelled) setEstimate(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!projectId) return null;
  if (loading) {
    return <p className="text-xs text-[#9B9B95]">Estimation de la valeur...</p>;
  }
  if (!estimate) return null;

  const dollars = (estimate.estimatedValueCents / 100).toFixed(0);

  return (
    <div className="rounded-lg border border-[#2A2A2E] bg-[#0A0A0C] p-3 flex items-center justify-between">
      <div>
        <p className="text-xs text-[#9B9B95]">💰 Valeur de revente estimée</p>
        <p className="text-xs text-[#9B9B95]">
          Complexité : {TIER_LABELS[estimate.complexityTier]}
          {estimate.detectedFeatures.length > 0 && ` · ${estimate.detectedFeatures.length} feature(s) détectée(s)`}
        </p>
      </div>
      <p className="text-lg font-bold text-[#E8C34A]">~{dollars} $ CAD</p>
    </div>
  );
}
