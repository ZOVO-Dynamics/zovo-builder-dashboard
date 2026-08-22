"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DOCUMENT_TYPE_OPTIONS = [
  { value: "DRIVERS_LICENSE", label: "Permis de conduire" },
  { value: "PASSPORT", label: "Passeport" },
  { value: "GOVERNMENT_ID", label: "Carte d'identité gouvernementale" },
  { value: "HEALTH_INSURANCE_CARD", label: "Carte d'assurance maladie" },
  { value: "BIRTH_CERTIFICATE", label: "Certificat de naissance (complémentaire)" },
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const [documentType, setDocumentType] = useState("DRIVERS_LICENSE");
  const [document, setDocument] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expiredNotice, setExpiredNotice] = useState(false);
  const [needsSecondDocument, setNeedsSecondDocument] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!document) {
      setError("Un document est requis pour continuer.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("documentType", documentType);
    formData.append("document", document);

    const res = await fetch("/api/identity-documents", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Erreur lors de l'envoi du document");
      return;
    }

    if (data.identityStatus === "NEEDS_REVIEW" && !needsSecondDocument) {
      setNeedsSecondDocument(true);
      setDocument(null);
      return;
    }

    if (data.expired) {
      setExpiredNotice(true);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (expiredNotice) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-amber-500/20 bg-neutral-900/60 p-8 text-center backdrop-blur-md">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-2xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold">Document expiré</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Ce document est expiré. Il peut néanmoins être utilisé pour confirmer ton identité. Une vérification
            supplémentaire peut être demandée.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 text-black font-semibold px-4 py-2.5 text-sm transition-all"
          >
            Continuer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/20 bg-neutral-900/60 p-8 backdrop-blur-md">
        <h1 className="text-2xl font-bold text-center">Vérification d&apos;identité</h1>
        <p className="mt-2 text-sm text-zinc-400 text-center">
          {needsSecondDocument
            ? "Une confirmation supplémentaire est requise. Ajoute un deuxième document pour renforcer la vérification."
            : "Pour finaliser ton compte, dépose une pièce d'identité. Les documents expirés sont acceptés."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Type de document</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full rounded-lg bg-black/50 border border-zinc-700 p-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            >
              {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Photo du document</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
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

          {needsSecondDocument && (
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Continuer sans document supplémentaire (révision manuelle requise)
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
