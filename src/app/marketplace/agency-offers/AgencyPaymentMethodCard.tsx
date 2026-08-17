"use client";

import { useEffect, useState } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe-client";

function InnerForm({ onSaved }: { onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Erreur de validation");
      setSubmitting(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Carte refusée");
      setSubmitting(false);
      return;
    }

    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="rounded-md bg-[#C9A227] hover:bg-[#E8C34A] disabled:opacity-50 px-4 py-2 text-sm font-medium text-[#0A0A0C]"
      >
        {submitting ? "Enregistrement..." : "Enregistrer la carte"}
      </button>
    </form>
  );
}

export default function AgencyPaymentMethodCard() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [hasCard, setHasCard] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/marketplace/agency-offers/payment-method")
      .then((res) => res.json())
      .then((data) => setHasCard(Boolean(data?.hasPaymentMethod)));
  }, []);

  async function startSetup() {
    const res = await fetch("/api/marketplace/agency-offers/payment-method", {
      method: "POST",
    });
    const data = await res.json();
    if (data?.clientSecret) setClientSecret(data.clientSecret);
  }

  if (hasCard === null) return null;

  if (saved || hasCard) {
    return (
      <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4 text-sm text-[#9B9B95]">
        Carte de paiement enregistrée pour les offres agence.
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4 space-y-2">
        <p className="text-sm text-[#9B9B95]">
          Aucune carte enregistrée. Une carte valide est requise pour faire des offres.
        </p>
        <button
          onClick={startSetup}
          className="rounded-md bg-[#C9A227] hover:bg-[#E8C34A] px-4 py-2 text-sm font-medium text-[#0A0A0C]"
        >
          Enregistrer une carte
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4">
      <Elements stripe={getStripe()} options={{ clientSecret }}>
        <InnerForm onSaved={() => setSaved(true)} />
      </Elements>
    </div>
  );
}
