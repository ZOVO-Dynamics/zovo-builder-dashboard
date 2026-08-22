"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [driversLicense, setDriversLicense] = useState<File | null>(null);
  const [healthInsuranceCard, setHealthInsuranceCard] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!driversLicense || !healthInsuranceCard) {
      setError("Les deux documents sont requis pour continuer.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("driversLicense", driversLicense);
    formData.append("healthInsuranceCard", healthInsuranceCard);

    const res = await fetch("/api/identity-documents", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Erreur lors de l'envoi des documents");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/20 bg-neutral-900/60 p-8 backdrop-blur-md">
        <h1 className="text-2xl font-bold text-center">Vérification d&apos;identité</h1>
        <p className="mt-2 text-sm text-zinc-400 text-center">
          Pour finaliser ton compte, dépose une pièce d&apos;identité et ta carte d&apos;assurance
          maladie. Les documents expirés sont acceptés.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Permis de conduire</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setDriversLicense(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg bg-black/50 border border-zinc-700 p-3 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-black file:font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Carte d&apos;assurance maladie</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setHealthInsuranceCard(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg bg-black/50 border border-zinc-700 p-3 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-black file:font-medium"
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 disabled:from-zinc-700 disabled:to-zinc-700 text-black font-semibold px-4 py-2.5 text-sm transition-all"
          >
            {loading ? "Envoi..." : "Continuer"}
          </button>
        </form>
      </div>
    </div>
  );
}
