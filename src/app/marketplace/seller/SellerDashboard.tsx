"use client";

import { useState } from "react";
import Link from "next/link";
import SponsorButton from "./SponsorButton";
import PayoutButton from "./PayoutButton";
import AnalyticsTable from "./AnalyticsTable";

type Product = {
  id: string;
  title: string;
  slug: string;
  priceCents: number;
  currency: string;
  status: string;
  salesCount: number;
  createdAt: string;
};

type Seller = {
  id: string;
  displayName: string | null;
  tier: string;
  suspended: boolean;
  products: Product[];
  isBuyingAgency: boolean;
} | null;

type Category = { id: string; name: string };

type Stats = {
  totalSalesCount: number;
  grossRevenueCents: number;
  commissionCents: number;
  netRevenueCents: number;
  activeProducts: number;
  sponsoredProducts: number;
};

const TYPE_OPTIONS = [
  { value: "PLUGIN", label: "Plugin" },
  { value: "TEMPLATE", label: "Template" },
  { value: "APPLICATION", label: "Application" },
  { value: "COMPONENT", label: "Composant" },
  { value: "AI_AGENT", label: "Agent IA" },
  { value: "DEV_TOOL", label: "Outil développeur" },
  { value: "PROJECT", label: "Projet" },
  { value: "SERVICE", label: "Service" },
  { value: "DIGITAL_RESOURCE", label: "Ressource numérique" },
];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_REVIEW: "En attente de validation",
  APPROVED: "Approuvé",
  REJECTED: "Rejeté",
  SUSPENDED: "Suspendu",
  ARCHIVED: "Archivé",
};

function formatPrice(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency }).format(
    cents / 100
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4">
      <p className="text-xs text-[#9B9B95]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#F5F1E8]">{value}</p>
    </div>
  );
}

export default function SellerDashboard({
  seller,
  categories,
  stats,
  balanceCents,
}: {
  seller: Seller;
  categories: Category[];
  stats: Stats;
  balanceCents: number;
}) {
  const [creating, setCreating] = useState(false);
  const [becomingS, setBecomingS] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleBecomeSeller() {
    setBecomingS(true);
    try {
      const res = await fetch("/api/marketplace/seller", { method: "POST" });
      if (!res.ok) throw new Error("Impossible de créer le profil vendeur");
      window.location.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
      setBecomingS(false);
    }
  }

  async function handleToggleAgency() {
    try {
      const res = await fetch("/api/marketplace/seller/agency", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBuyingAgency: !seller?.isBuyingAgency }),
      });
      if (!res.ok) throw new Error("Impossible de mettre a jour le statut d'agence");
      window.location.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleCreateProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setCreating(true);

    const form = new FormData(e.currentTarget);
    const priceInDollars = parseFloat(String(form.get("price")));

    try {
      const res = await fetch("/api/marketplace/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          type: form.get("type"),
          priceCents: Math.round(priceInDollars * 100),
          categoryId: form.get("categoryId") || undefined,
          version: form.get("version") || undefined,
          compatibility: form.get("compatibility") || undefined,
          licenseType: form.get("licenseType") || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création");

      window.location.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  if (!seller) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-[#2A2A2E] bg-[#16161A] p-8 text-center">
        <h1 className="mb-2 text-2xl font-semibold">Devenir vendeur ZOVO</h1>
        <p className="mb-6 text-[#9B9B95]">
          Créez votre profil vendeur pour publier des produits sur le Marketplace ZOVO.
        </p>
        <button
          onClick={handleBecomeSeller}
          disabled={becomingS}
          className="rounded-md bg-[#C9A227] px-5 py-2.5 font-medium text-[#0A0A0C] transition hover:bg-[#E8C34A] disabled:opacity-60"
        >
          {becomingS ? "Création..." : "Créer mon profil vendeur"}
        </button>
        {formError && <p className="mt-3 text-sm text-red-400">{formError}</p>}
      </div>
    );
  }

  if (seller.suspended) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-red-900/50 bg-red-950/20 p-8 text-center">
        <h1 className="mb-2 text-xl font-semibold text-red-400">Compte vendeur suspendu</h1>
        <p className="text-[#9B9B95]">
          Contactez le support ZOVO pour plus d&apos;informations.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {seller.displayName ?? "Mon espace vendeur"}
          </h1>
          <p className="text-sm text-[#9B9B95]">
            Palier{" "}
            <span className="text-[#C9A227]">
              {seller.tier === "STANDARD" ? "Standard" : seller.tier}
            </span>
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-[#C9A227] px-4 py-2 font-medium text-[#0A0A0C] transition hover:bg-[#E8C34A]"
        >
          {showForm ? "Annuler" : "+ Nouveau produit"}
        </button>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4">
        <div>
          <p className="text-sm font-medium">Agence acheteuse</p>
          <p className="text-xs text-[#9B9B95]">Rejoins le pool d&apos;agences notifiees pour les projets complexes.</p>
        </div>
        <button
          onClick={handleToggleAgency}
          className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition ${seller.isBuyingAgency ? "bg-[#C9A227] text-[#0A0A0C] hover:bg-[#E8C34A]" : "border border-[#2A2A2E] text-[#9B9B95] hover:border-[#C9A227]/40"}`}
        >
          {seller.isBuyingAgency ? "Activee" : "Activer"}
        </button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Ventes" value={String(stats.totalSalesCount)} />
        <StatCard label="Revenus bruts" value={formatPrice(stats.grossRevenueCents)} />
        <StatCard label="Commission ZOVO" value={formatPrice(stats.commissionCents)} />
        <StatCard label="Revenus nets" value={formatPrice(stats.netRevenueCents)} />
        <StatCard label="Produits actifs" value={String(stats.activeProducts)} />
        <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4">
          <p className="text-xs text-[#9B9B95]">Solde disponible</p>
          <p className="mt-1 mb-2 text-xl font-semibold text-[#F5F1E8]">
            {formatPrice(balanceCents)}
          </p>
          <PayoutButton balanceCents={balanceCents} />
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreateProduct}
          className="mb-8 rounded-lg border border-[#2A2A2E] bg-[#16161A] p-5"
        >
          <h2 className="mb-4 font-medium">Nouveau produit</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              name="title"
              placeholder="Titre du produit"
              required
              minLength={3}
              className="rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-3 py-2 text-sm placeholder:text-[#9B9B95] focus:border-[#C9A227] focus:outline-none sm:col-span-2"
            />
            <textarea
              name="description"
              placeholder="Description (10 caractères minimum)"
              required
              minLength={10}
              rows={3}
              className="rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-3 py-2 text-sm placeholder:text-[#9B9B95] focus:border-[#C9A227] focus:outline-none sm:col-span-2"
            />
            <select
              name="type"
              required
              defaultValue=""
              className="rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-3 py-2 text-sm focus:border-[#C9A227] focus:outline-none"
            >
              <option value="" disabled>
                Type de produit
              </option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              name="categoryId"
              className="rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-3 py-2 text-sm focus:border-[#C9A227] focus:outline-none"
            >
              <option value="">Catégorie (optionnel)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Prix en CAD (ex: 29.99)"
              required
              className="rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-3 py-2 text-sm placeholder:text-[#9B9B95] focus:border-[#C9A227] focus:outline-none"
            />
            <input
              name="version"
              placeholder="Version (ex: 1.0.0)"
              className="rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-3 py-2 text-sm placeholder:text-[#9B9B95] focus:border-[#C9A227] focus:outline-none"
            />
            <input
              name="compatibility"
              placeholder="Compatibilité (ex: Next.js 15+)"
              className="rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-3 py-2 text-sm placeholder:text-[#9B9B95] focus:border-[#C9A227] focus:outline-none"
            />
            <input
              name="licenseType"
              placeholder="Licence (ex: MIT, usage unique)"
              className="rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-3 py-2 text-sm placeholder:text-[#9B9B95] focus:border-[#C9A227] focus:outline-none"
            />
          </div>

          {formError && <p className="mt-3 text-sm text-red-400">{formError}</p>}

          <button
            type="submit"
            disabled={creating}
            className="mt-4 rounded-md bg-[#C9A227] px-4 py-2 font-medium text-[#0A0A0C] transition hover:bg-[#E8C34A] disabled:opacity-60"
          >
            {creating ? "Création..." : "Créer en brouillon"}
          </button>
          <p className="mt-2 text-xs text-[#9B9B95]">
            Le produit sera créé en statut Brouillon. Il devra être soumis puis approuvé
            par l&apos;administration avant d&apos;apparaître publiquement.
          </p>
        </form>
      )}

      <div>
        <h2 className="mb-3 font-medium">Mes produits ({seller.products.length})</h2>
        {seller.products.length === 0 ? (
          <p className="text-sm text-[#9B9B95]">Aucun produit pour l&apos;instant.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#2A2A2E]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#16161A] text-[#9B9B95]">
                <tr>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Prix</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Ventes</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {seller.products.map((p) => (
                  <tr key={p.id} className="border-t border-[#2A2A2E]">
                    <td className="px-4 py-3">{p.title}</td>
                    <td className="px-4 py-3">{formatPrice(p.priceCents, p.currency)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          p.status === "APPROVED"
                            ? "text-green-400"
                            : p.status === "REJECTED" || p.status === "SUSPENDED"
                            ? "text-red-400"
                            : "text-[#C9A227]"
                        }
                      >
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{p.salesCount}</td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "APPROVED" && (
                        <div className="flex flex-col items-end gap-1">
                          <Link
                            href={`/marketplace/${p.slug}`}
                            className="text-[#C9A227] hover:text-[#E8C34A]"
                          >
                            Voir
                          </Link>
                          <SponsorButton productId={p.id} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-medium">Performance des produits</h2>
        <AnalyticsTable />
      </div>
    </div>
  );
}
