"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface Stats {
  totalUsers: number;
  usersByPlan: { plan: string; count: number }[];
  activeSubscriptions: number;
  monthlyRecurringRevenueCents: number;
  creditRevenueCents: number;
  totalGenerations: number;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  isAdmin: boolean;
  creditsBalance: number;
  monthlyUsage: number;
  createdAt: string;
  subscription: {
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    plan: { name: string; internalName: string } | null;
  } | null;
  _count: { generations: number };
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Erreur");
        return res.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pattern standard: init loading avant fetch
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);

    fetch(`/api/admin/users?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Erreur");
        return res.json();
      })
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search]);

  function formatCents(cents: number) {
    return (cents / 100).toFixed(2);
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="rounded-lg border border-red-800/60 bg-red-950/40 p-4 text-red-300">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-semibold text-[#F5F1E8]" style={{ fontFamily: "var(--font-display)" }}>
        Administration
      </h1>

      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="blueprint-corner rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4">
            <p className="text-xs text-[#9B9B95]">Utilisateurs</p>
            <p className="text-2xl font-semibold text-[#F5F1E8]">{stats.totalUsers}</p>
          </div>
          <div className="blueprint-corner rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4">
            <p className="text-xs text-[#9B9B95]">Abonnements actifs</p>
            <p className="text-2xl font-semibold text-[#F5F1E8]">{stats.activeSubscriptions}</p>
          </div>
          <div className="blueprint-corner rounded-lg border border-[#C9A227]/40 bg-[#16161A] p-4">
            <p className="text-xs text-[#9B9B95]">MRR estimé</p>
            <p className="text-2xl font-semibold text-[#E8C34A]">
              {formatCents(stats.monthlyRecurringRevenueCents)} $
            </p>
          </div>
          <div className="blueprint-corner rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4">
            <p className="text-xs text-[#9B9B95]">Générations totales</p>
            <p className="text-2xl font-semibold text-[#F5F1E8]">{stats.totalGenerations}</p>
          </div>
          <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4 md:col-span-2">
            <p className="text-xs text-[#9B9B95]">Répartition par plan</p>
            <div className="mt-2 flex gap-4">
              {stats.usersByPlan.map((g) => (
                <span key={g.plan} className="text-sm text-[#9B9B95]">
                  {g.plan}: <span className="font-medium text-[#F5F1E8]">{g.count}</span>
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-[#C9A227]/40 bg-[#16161A] p-4 md:col-span-2">
            <p className="text-xs text-[#9B9B95]">Revenus crédits (total)</p>
            <p className="text-xl font-semibold text-[#E8C34A]">
              {formatCents(stats.creditRevenueCents)} $
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-[#F5F1E8]">Utilisateurs ({total})</h2>
        <input
          type="text"
          placeholder="Rechercher par email ou nom..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-3 py-1.5 text-sm text-[#F5F1E8] placeholder-[#9B9B95] focus:border-[#C9A227]/60 focus:outline-none"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#2A2A2E]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#16161A] text-[#9B9B95]">
            <tr>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Abonnement</th>
              <th className="px-4 py-2">Crédits</th>
              <th className="px-4 py-2">Générations</th>
              <th className="px-4 py-2">Inscrit le</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[#9B9B95]">
                  Chargement...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-[#9B9B95]">
                  Aucun utilisateur trouvé.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-[#2A2A2E] bg-[#0A0A0C]">
                  <td className="px-4 py-2 text-[#F5F1E8]">
                    {u.email}
                    {u.isAdmin && (
                      <span className="ml-2 rounded-full border border-[#C9A227]/50 bg-[#1A1508] px-2 py-0.5 text-xs text-[#E8C34A]">
                        admin
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-[#9B9B95]">{u.plan}</td>
                  <td className="px-4 py-2 text-[#9B9B95]">
                    {u.subscription ? (
                      <span>
                        {u.subscription.plan?.name || "—"} ({u.subscription.status}
                        {u.subscription.cancelAtPeriodEnd ? ", annulation prévue" : ""})
                      </span>
                    ) : (
                      "Aucun"
                    )}
                  </td>
                  <td className="px-4 py-2 text-[#9B9B95]">{u.creditsBalance}</td>
                  <td className="px-4 py-2 text-[#9B9B95]">{u._count.generations}</td>
                  <td className="px-4 py-2 text-[#9B9B95]">
                    {new Date(u.createdAt).toLocaleDateString("fr-CA")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-[#2A2A2E] bg-[#16161A] px-3 py-1 text-sm text-[#F5F1E8] transition-colors hover:border-[#C9A227]/40 disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-sm text-[#9B9B95]">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-[#2A2A2E] bg-[#16161A] px-3 py-1 text-sm text-[#F5F1E8] transition-colors hover:border-[#C9A227]/40 disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
