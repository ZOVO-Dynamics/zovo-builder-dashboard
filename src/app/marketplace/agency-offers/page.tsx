"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AgencyPaymentMethodCard from "./AgencyPaymentMethodCard";

type Offer = {
  id: string;
  type: "PROJECT_PURCHASE" | "CONTACT_RIGHT";
  priceCents: number;
  currency: string;
  status: string;
  message: string | null;
  createdAt: string;
  project: { id: string; name: string };
  agencySeller?: { displayName: string | null; ratingAvg: number };
};

type OffersResponse = { role: "agency" | "owner"; offers: Offer[] };

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency }).format(cents / 100);
}

const TYPE_LABELS: Record<string, string> = {
  PROJECT_PURCHASE: "Achat du projet",
  CONTACT_RIGHT: "Droit de contact",
};

export default function AgencyOffersPage() {
  const [data, setData] = useState<OffersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [signOffer, setSignOffer] = useState<Offer | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");

  function load() {
    fetch("/api/marketplace/agency-offers")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then(setData)
      .catch(() => setError("Impossible de charger les offres."));
  }

  useEffect(() => {
    load();
  }, []);

  function openSignModal(offer: Offer) {
    setSignOffer(offer);
    setAgreed(false);
    setSignature("");
  }

  function closeSignModal() {
    setSignOffer(null);
    setAgreed(false);
    setSignature("");
  }

  async function respond(offerId: string, decision: "accept" | "decline", signatureValue?: string) {
    setRespondingId(offerId);
    try {
      const res = await fetch(`/api/marketplace/agency-offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, ...(signatureValue ? { signature: signatureValue } : {}) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Impossible de traiter cette offre");
      }
      closeSignModal();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div>
        <span style={{ fontFamily: "var(--font-mono)" }} className="text-xs text-[#E8C34A]">OFFRES</span>
        <h1 style={{ fontFamily: "var(--font-display)" }} className="mt-1 text-2xl font-bold text-[#F5F1E8]">
          Offres d&apos;agences
        </h1>
        <p className="mt-1 text-sm text-[#9B9B95]">
          {data?.role === "agency"
            ? "Les offres que tu as proposees."
            : "Les offres recues sur tes projets."}
        </p>
      </div>

      {data?.role === "agency" && <AgencyPaymentMethodCard />}

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

      {!error && data && data.offers.length === 0 && (
        <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-6 text-sm text-[#9B9B95]">
          Aucune offre pour l&apos;instant.
        </div>
      )}

      {!error && data && data.offers.length > 0 && (
        <div className="space-y-4">
          {data.offers.map((offer) => (
            <div key={offer.id} className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/dashboard?projectId=${offer.project.id}`} className="text-sm font-medium text-[#F5F1E8] hover:text-[#E8C34A]">
                    {offer.project.name}
                  </Link>
                  <p className="text-xs text-[#9B9B95]">{TYPE_LABELS[offer.type] ?? offer.type}</p>
                </div>
                <span className="rounded-full border border-[#C9A227]/40 px-2 py-0.5 text-[10px] text-[#E8C34A] shrink-0">
                  {offer.status}
                </span>
              </div>

              <p className="text-lg font-semibold text-[#C9A227]">
                {formatPrice(offer.priceCents, offer.currency)}
              </p>

              {offer.message && <p className="text-sm text-[#9B9B95]">{offer.message}</p>}

              {data.role === "agency" && offer.agencySeller && (
                <p className="text-xs text-[#9B9B95]">
                  Par {offer.agencySeller.displayName ?? "Agence"}
                </p>
              )}

              {data.role === "owner" && offer.status === "PENDING" && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => openSignModal(offer)}
                    disabled={respondingId === offer.id}
                    className="rounded-md bg-[#C9A227] hover:bg-[#E8C34A] disabled:opacity-50 px-4 py-2 text-sm font-medium text-[#0A0A0C]"
                  >
                    Accepter
                  </button>
                  <button
                    onClick={() => respond(offer.id, "decline")}
                    disabled={respondingId === offer.id}
                    className="rounded-md border border-[#2A2A2E] hover:border-red-800/60 hover:text-red-400 disabled:opacity-50 px-4 py-2 text-sm font-medium text-[#9B9B95]"
                  >
                    Refuser
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {signOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#2A2A2E] bg-[#16161A] p-6 space-y-4">
            <div>
              <h2 style={{ fontFamily: "var(--font-display)" }} className="text-lg font-bold text-[#F5F1E8]">
                Confirmer la vente
              </h2>
              <p className="mt-1 text-sm text-[#9B9B95]">
                {signOffer.project.name} — {formatPrice(signOffer.priceCents, signOffer.currency)}
              </p>
            </div>

            <div className="rounded-md border border-[#2A2A2E] bg-[#0A0A0C] p-3 text-xs text-[#9B9B95] space-y-2">
              <p>
                En acceptant cette offre, vous vendez votre projet à l&apos;agence acheteuse pour le montant
                indiqué. Une fois le paiement confirmé, vous perdrez définitivement la propriété et l&apos;accès
                à ce projet.
              </p>
              <p>
                Cette vente est régie par les{" "}
                <Link href="/terms" target="_blank" className="text-[#E8C34A] underline">
                  conditions de mise en vente
                </Link>{" "}
                et la{" "}
                <Link href="/terms" target="_blank" className="text-[#E8C34A] underline">
                  politique de paiement
                </Link>{" "}
                de ZOVO.
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm text-[#F5F1E8]">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1"
              />
              <span>
                J&apos;ai lu et j&apos;accepte les conditions de mise en vente et la politique de paiement, et je
                reconnais que je ne serai plus propriétaire de ce projet une fois la vente conclue.
              </span>
            </label>

            <div>
              <label className="block text-xs text-[#9B9B95] mb-1">
                Tapez votre nom complet pour signer
              </label>
              <input
                type="text"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Nom complet"
                className="w-full rounded-md border border-[#2A2A2E] bg-[#0A0A0C] px-3 py-2 text-sm text-[#F5F1E8] outline-none focus:border-[#C9A227]"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => respond(signOffer.id, "accept", signature)}
                disabled={!agreed || !signature.trim() || respondingId === signOffer.id}
                className="flex-1 rounded-md bg-[#C9A227] hover:bg-[#E8C34A] disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-[#0A0A0C]"
              >
                {respondingId === signOffer.id ? "Traitement..." : "Signer et vendre"}
              </button>
              <button
                onClick={closeSignModal}
                disabled={respondingId === signOffer.id}
                className="rounded-md border border-[#2A2A2E] px-4 py-2 text-sm text-[#9B9B95] hover:text-[#F5F1E8]"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
