"use client";

import { useEffect, useState } from "react";

type ProductAnalytics = {
  productId: string;
  title: string;
  views: number;
  sales: number;
  sponsoredImpressions: number;
  sponsoredClicks: number;
  conversionRate: number;
  sponsoredCtr: number;
};

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export default function AnalyticsTable() {
  const [analytics, setAnalytics] = useState<ProductAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/marketplace/seller/analytics")
      .then((res) => {
        if (!res.ok) throw new Error("Impossible de charger les analytics");
        return res.json();
      })
      .then((data) => setAnalytics(data.analytics ?? []))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-[#9B9B95]">Chargement des statistiques...</p>;
  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (analytics.length === 0) {
    return <p className="text-sm text-[#9B9B95]">Aucune donnée pour l&apos;instant.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[#2A2A2E]">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#16161A] text-[#9B9B95]">
          <tr>
            <th className="px-4 py-3">Produit</th>
            <th className="px-4 py-3">Vues</th>
            <th className="px-4 py-3">Ventes</th>
            <th className="px-4 py-3">Conversion</th>
            <th className="px-4 py-3">Impressions sponsorisées</th>
            <th className="px-4 py-3">Clics sponsorisés</th>
            <th className="px-4 py-3">CTR sponsorisé</th>
          </tr>
        </thead>
        <tbody>
          {analytics.map((a) => (
            <tr key={a.productId} className="border-t border-[#2A2A2E]">
              <td className="px-4 py-3">{a.title}</td>
              <td className="px-4 py-3">{a.views}</td>
              <td className="px-4 py-3">{a.sales}</td>
              <td className="px-4 py-3">{formatPercent(a.conversionRate)}</td>
              <td className="px-4 py-3">{a.sponsoredImpressions}</td>
              <td className="px-4 py-3">{a.sponsoredClicks}</td>
              <td className="px-4 py-3">
                {a.sponsoredImpressions > 0 ? formatPercent(a.sponsoredCtr) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
