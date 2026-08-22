"use client";

import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface Signal {
  type: string;
  points: number;
  message: string;
}

interface Verification {
  id: string;
  identityStatus: "VERIFIED" | "VERIFIED_EXPIRED_DOCUMENT" | "NEEDS_REVIEW" | "REJECTED";
  identityEvidenceScore: number;
  expired: boolean;
  reviewRequired: boolean;
  signals: Signal[];
  createdAt: string;
  reviewedAt: string | null;
  user: { id: string; email: string; name: string | null; createdAt: string };
}

const STATUS_LABELS: Record<Verification["identityStatus"], string> = {
  VERIFIED: "Vérifié",
  VERIFIED_EXPIRED_DOCUMENT: "Vérifié (document expiré)",
  NEEDS_REVIEW: "À réviser",
  REJECTED: "Rejeté",
};

const STATUS_COLORS: Record<Verification["identityStatus"], string> = {
  VERIFIED: "text-emerald-400 border-emerald-800/60 bg-emerald-950/40",
  VERIFIED_EXPIRED_DOCUMENT: "text-amber-400 border-amber-800/60 bg-amber-950/40",
  NEEDS_REVIEW: "text-amber-400 border-amber-800/60 bg-amber-950/40",
  REJECTED: "text-red-400 border-red-800/60 bg-red-950/40",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  DRIVERS_LICENSE: "Permis de conduire",
  PASSPORT: "Passeport",
  GOVERNMENT_ID: "Carte d'identité gouvernementale",
  HEALTH_INSURANCE_CARD: "Carte d'assurance maladie",
  BIRTH_CERTIFICATE: "Certificat de naissance",
};

function signalDot(points: number): string {
  if (points > 0) return "🟢";
  return "🔴";
}

export default function AdminIdentityVerificationsPage() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("NEEDS_REVIEW");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => {
    const query = statusFilter ? `?status=${statusFilter}` : "";
    fetch(`/api/admin/identity-verifications${query}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || "Erreur");
        return res.json();
      })
      .then((data) => setVerifications(data.verifications))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id: string, decision: "VERIFIED" | "REJECTED") {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/identity-verifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erreur");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActingId(null);
    }
  }

  async function viewDocument(verificationId: string, documentType: string) {
    try {
      const res = await fetch(`/api/admin/identity-verifications/${verificationId}/document-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Erreur");
      const { token } = await res.json();
      window.open(
        `/api/admin/identity-verifications/${verificationId}/document/${documentType}?token=${encodeURIComponent(token)}`,
        "_blank"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <DashboardLayout>
      <div>
        <span style={{ fontFamily: "var(--font-mono)" }} className="text-xs text-[#E8C34A]">
          ADMIN
        </span>
        <h1 style={{ fontFamily: "var(--font-display)" }} className="mt-1 text-2xl font-bold text-[#F5F1E8]">
          Vérifications d&apos;identité
        </h1>
        <p className="mt-1 text-sm text-[#9B9B95]">
          Statut, preuve d&apos;identité et signaux détectés automatiquement. L&apos;expiration d&apos;un document
          n&apos;empêche jamais une vérification positive.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {(["NEEDS_REVIEW", "VERIFIED", "VERIFIED_EXPIRED_DOCUMENT", "REJECTED", ""] as const).map((s) => (
          <button
            key={s || "ALL"}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
              statusFilter === s
                ? "border-[#C9A227]/60 bg-[#1A1508] text-[#E8C34A]"
                : "border-[#2A2A2E] text-[#9B9B95] hover:border-[#C9A227]/30"
            }`}
          >
            {s ? STATUS_LABELS[s] : "Tous"}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-800/60 bg-red-950/40 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-[#9B9B95]">Chargement...</p>
      ) : verifications.length === 0 ? (
        <p className="mt-6 text-sm text-[#9B9B95]">Aucune vérification dans cette catégorie.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {verifications.map((v) => (
            <div key={v.id} className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#F5F1E8]">
                    {v.user.name ?? "Sans nom"} — {v.user.email}
                  </p>
                  <p className="text-xs text-[#6B6560]">
                    Compte créé le {new Date(v.user.createdAt).toLocaleDateString("fr-CA")} · Vérifié le{" "}
                    {new Date(v.createdAt).toLocaleString("fr-CA")}
                    {v.expired && " · document expiré"}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLORS[v.identityStatus]}`}>
                  Preuve : {v.identityEvidenceScore}/100 — {STATUS_LABELS[v.identityStatus]}
                </span>
              </div>

              {v.signals.length > 0 ? (
                <ul className="space-y-1 text-sm text-[#D8CBA3]">
                  {v.signals.map((s, i) => (
                    <li key={i}>
                      {signalDot(s.points)} {s.message}
                      {s.points > 0 && <span className="text-[#6B6560]"> (+{s.points})</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#9B9B95]">Aucun signal enregistré</p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([type, label]) => (
                  <button
                    key={type}
                    onClick={() => viewDocument(v.id, type)}
                    className="rounded-md border border-[#2A2A2E] px-3 py-1.5 text-xs text-[#9B9B95] hover:border-[#C9A227]/30 hover:text-[#F5F1E8]"
                  >
                    Voir : {label}
                  </button>
                ))}

                {v.identityStatus !== "VERIFIED" && (
                  <button
                    onClick={() => decide(v.id, "VERIFIED")}
                    disabled={actingId === v.id}
                    className="rounded-md bg-emerald-600/20 border border-emerald-800/60 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50"
                  >
                    Approuver
                  </button>
                )}
                {v.identityStatus !== "REJECTED" && (
                  <button
                    onClick={() => decide(v.id, "REJECTED")}
                    disabled={actingId === v.id}
                    className="rounded-md bg-red-600/20 border border-red-800/60 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/30 disabled:opacity-50"
                  >
                    Rejeter
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
