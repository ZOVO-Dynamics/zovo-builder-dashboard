"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface PlanPriceOption {
  billingInterval: string;
  priceCents: number;
  isDefault: boolean;
  discountedPriceCents: number | null;
}

interface Plan {
  id: string;
  name: string;
  internalName: string;
  tier: string;
  currency: string;
  discountPercent: number | null;
  generationsLimit: number;
  features: {
    agents?: string[];
    export?: string[];
    autoFix?: string;
    memory?: string;
    priority?: boolean;
    multiProject?: boolean;
  };
  prices: PlanPriceOption[];
}

interface CreditPack {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  credits: number;
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function intervalLabel(interval: string): string {
  if (interval === "week") return "semaine";
  if (interval === "year") return "an";
  return "mois";
}

function intervalBadge(interval: string): string {
  if (interval === "week") return "Hebdomadaire";
  if (interval === "year") return "Annuel";
  return "Mensuel";
}

type BillingMode = "week" | "month" | "year";

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [creditPacks, setCreditPacks] = useState<CreditPack[]>([]);
  const [creditLoading, setCreditLoading] = useState<string | null>(null);
  const [billingMode, setBillingMode] = useState<BillingMode>("year");

  useEffect(() => {
    fetch("/api/credit-packs")
      .then((res) => res.json())
      .then((data) => setCreditPacks(data.packs || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => {
        setPlans(data.plans || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const hasAnyAnnual = plans.some((p) => p.prices.some((pr) => pr.billingInterval === "year"));

  const getSelectedPrice = (plan: Plan): PlanPriceOption | undefined => {
    return plan.prices.find((p) => p.billingInterval === billingMode);
  };

  const handleSubscribe = async (internalName: string, billingInterval: string) => {
    setCheckoutLoading(internalName);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: internalName, billingInterval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.assign(data.url);
      } else {
        setCheckoutLoading(null);
      }
    } catch {
      setCheckoutLoading(null);
    }
  };

  const handleBuyCredits = async (packId: string) => {
    setCreditLoading(packId);
    try {
      const res = await fetch("/api/checkout-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.assign(data.url);
      } else {
        setCreditLoading(null);
      }
    } catch {
      setCreditLoading(null);
    }
  };

  const visiblePlans = plans
    .map((plan) => ({ plan, price: getSelectedPrice(plan) }))
    .filter((entry): entry is { plan: Plan; price: PlanPriceOption } => entry.price !== undefined);

  return (
    <div className="min-h-screen bg-black text-[#F0E6D2]">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">
            ZOVO Builder
          </p>
          <h1 className="mt-4 text-4xl font-bold md:text-5xl">
            Choisissez votre puissance de generation
          </h1>
          <p className="mt-4 text-[#B8A87A]">
            Des agents IA complets, une architecture logicielle complete, generee depuis un simple prompt.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <div className="inline-flex rounded-full border border-[#D4AF37]/40 bg-[#141414] p-1">
            <button
              onClick={() => setBillingMode("week")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                billingMode === "week"
                  ? "bg-[#D4AF37] text-black"
                  : "text-[#B8A87A] hover:text-[#D4AF37]"
              }`}
            >
              Hebdomadaire
            </button>
            <button
              onClick={() => setBillingMode("month")}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                billingMode === "month"
                  ? "bg-[#D4AF37] text-black"
                  : "text-[#B8A87A] hover:text-[#D4AF37]"
              }`}
            >
              Mensuel
            </button>
            {hasAnyAnnual && (
              <button
                onClick={() => setBillingMode("year")}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  billingMode === "year"
                    ? "bg-[#D4AF37] text-black"
                    : "text-[#B8A87A] hover:text-[#D4AF37]"
                }`}
              >
                Annuel
              </button>
            )}
          </div>
        </div>

        {loading && (
          <p className="mt-16 text-center text-[#B8A87A]">Chargement des plans...</p>
        )}

        {!loading && (
          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {visiblePlans.map(({ plan, price: selectedPrice }) => {
              const hasDiscount = selectedPrice.discountedPriceCents !== null;
              return (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-b from-[#1a1a1a] to-black p-8 shadow-[0_0_40px_rgba(212,175,55,0.08)]"
                >
                  <span className="text-xs uppercase tracking-widest text-[#D4AF37]">
                    {intervalBadge(selectedPrice.billingInterval)}
                  </span>
                  <h2 className="mt-2 text-2xl font-bold">{plan.name}</h2>

                  <div className="mt-6">
                    {hasDiscount ? (
                      <div>
                        <span className="text-sm text-[#8A7B54] line-through">
                          {formatPrice(selectedPrice.priceCents, plan.currency)}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-[#D4AF37]">
                            {formatPrice(selectedPrice.discountedPriceCents!, plan.currency)}
                          </span>
                          <span className="text-sm text-[#B8A87A]">
                            / {intervalLabel(selectedPrice.billingInterval)}
                          </span>
                        </div>
                        <span className="mt-1 inline-block rounded-full bg-[#D4AF37]/10 px-3 py-1 text-xs font-medium text-[#D4AF37]">
                          -{plan.discountPercent}% ce mois-ci
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-[#D4AF37]">
                          {formatPrice(selectedPrice.priceCents, plan.currency)}
                        </span>
                        <span className="text-sm text-[#B8A87A]">
                          / {intervalLabel(selectedPrice.billingInterval)}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="mt-4 text-sm text-[#B8A87A]">
                    {plan.generationsLimit} generations de projets par {intervalLabel(selectedPrice.billingInterval)}
                  </p>

                  <ul className="mt-6 space-y-3 text-sm text-[#D8CBA3]">
                    <li>Tous les agents IA: {plan.features.agents?.join(", ")}</li>
                    <li>Export: {plan.features.export?.join(" et ")}</li>
                    <li>Corrections automatiques: {plan.features.autoFix === "advanced" ? "avancees" : "limitees"}</li>
                    <li>Memoire de projet: {plan.features.memory === "advanced" ? "avancee" : "standard"}</li>
                    {plan.features.priority && <li>Priorite de generation IA</li>}
                    {plan.features.multiProject && <li>Projets multiples</li>}
                  </ul>

                  <button
                    onClick={() => handleSubscribe(plan.internalName, selectedPrice.billingInterval)}
                    disabled={checkoutLoading === plan.internalName}
                    className="mt-8 w-full rounded-lg bg-[#D4AF37] px-6 py-3 font-semibold text-black transition hover:bg-[#E8C458] disabled:opacity-50"
                  >
                    {checkoutLoading === plan.internalName ? "Redirection..." : "S'abonner"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {creditPacks.length > 0 && (
          <div className="mt-24">
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-[#D4AF37]">
                Sans abonnement
              </p>
              <h2 className="mt-3 text-3xl font-bold">Credits a la carte</h2>
              <p className="mt-3 text-[#B8A87A]">
                Achetez des generations une seule fois, sans engagement mensuel.
              </p>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {creditPacks.map((pack) => (
                <div
                  key={pack.id}
                  className="rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-b from-[#161616] to-black p-6 text-center"
                >
                  <h3 className="text-lg font-semibold text-[#F0E6D2]">{pack.name}</h3>
                  <div className="mt-4 text-3xl font-bold text-[#D4AF37]">
                    {formatPrice(pack.priceCents, pack.currency)}
                  </div>
                  <p className="mt-2 text-sm text-[#B8A87A]">{pack.credits} generations</p>
                  <button
                    onClick={() => handleBuyCredits(pack.id)}
                    disabled={creditLoading === pack.id}
                    className="mt-6 w-full rounded-lg border border-[#D4AF37] px-6 py-3 font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black disabled:opacity-50"
                  >
                    {creditLoading === pack.id ? "Redirection..." : "Acheter"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16 text-center">
          <Link href="/" className="text-sm text-[#8A7B54] hover:text-[#D4AF37]">
            ← Retour a l&apos;accueil
          </Link>
          <div className="mt-4 flex justify-center gap-4 text-xs text-[#6B6560]">
            <Link href="/terms" className="hover:text-[#8A7B54]">Conditions d&apos;utilisation</Link>
            <Link href="/privacy" className="hover:text-[#8A7B54]">Politique de confidentialite</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
