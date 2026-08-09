"use client";

import { useEffect, useRef, useState } from "react";

interface RepairStatusResponse {
  id?: string;
  status: string;
  validationStatus?: string;
  attempts?: number;
  errorsDetected?: number;
  errorsFixed?: number;
  failureReason?: string | null;
}

interface RepairReport {
  status: "VALIDATION_OK" | "VALIDATION_FAILED" | string;
  summaryLine: string;
  projectName: string;
  errorsDetected: number;
  errorsFixed: number;
  attempts?: number;
  actions: string[];
  message: string;
  remainingErrorsCount?: number;
  remainingErrors?: string[];
  failureReason?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_WEBHOOK: "Confirmation du paiement...",
  PAID: "Paiement confirmé, mise en file...",
  QUEUED: "En file d'attente...",
  ANALYZING: "🔍 Analyse du projet...",
  FIXING: "🤖 Correction en cours...",
  VALIDATING: "🧪 Validation...",
};

const TERMINAL_STATUSES = ["COMPLETED", "FAILED", "CANCELLED"];

interface RepairCardProps {
  /** Id du projet ZOVO (prisma.project.id), requis pour proposer le déclenchement. */
  projectId?: string | null;
  /** true si la dernière validation du projet a échoué — condition d'affichage du bouton. */
  validationFailed?: boolean;
}

export default function RepairCard({ projectId, validationFailed }: RepairCardProps) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  // Retour de Stripe Checkout : la page est un rechargement complet, donc on
  // détecte la session en attente une seule fois, à l'initialisation du state,
  // directement depuis l'URL plutôt que via un effet qui déclencherait un re-render en cascade.
  const [trackingRef] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("repairSession");
  });
  const [statusData, setStatusData] = useState<RepairStatusResponse | null>(null);
  const [report, setReport] = useState<RepairReport | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!trackingRef) return;

    async function poll() {
      try {
        const res = await fetch(`/api/repair/${trackingRef}`);
        const data: RepairStatusResponse = await res.json();

        if (res.status === 202) {
          setStatusData({ status: "PENDING_WEBHOOK" });
          return;
        }

        setStatusData(data);

        if (data.id && TERMINAL_STATUSES.includes(data.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
          const reportRes = await fetch(`/api/repair/${data.id}/report`);
          const reportData = await reportRes.json();
          setReport(reportData);
        }
      } catch {
        // erreur réseau ponctuelle, on continue le polling
      }
    }

    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [trackingRef]);

  async function handleStartRepair() {
    if (!projectId) return;
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const res = await fetch("/api/repair/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.url) {
        setCheckoutError(data.error || "Impossible de démarrer la correction");
        setCheckoutLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : String(err));
      setCheckoutLoading(false);
    }
  }

  // --- Mode rapport final (succès ou échec) ---
  if (report) {
    if (report.status === "VALIDATION_OK") {
      return (
        <div className="rounded-lg border-2 border-emerald-600 bg-emerald-950/30 p-5 space-y-3">
          <pre className="text-emerald-300 text-xs leading-tight whitespace-pre-wrap" style={{ fontFamily: "var(--font-mono)" }}>
{`╔════════════════════════════╗
║     ZOVO VALIDATION        ║
║                            ║
║          ✅ OK             ║
║                            ║
║ Projet validé              ║
╚════════════════════════════╝`}
          </pre>
          <div className="text-sm text-[#F5F1E8] space-y-1">
            <p className="font-medium">ZOVO Correction & Validation</p>
            <p>Statut : <span className="text-emerald-400">✅ VALIDATION OK</span></p>
            <p>Erreurs détectées : {report.errorsDetected}</p>
            <p>Erreurs corrigées : {report.errorsFixed}</p>
            <p>Tentatives : {report.attempts ?? 0}</p>
          </div>
          <div className="text-sm text-[#9B9B95]">
            <p className="text-[#F5F1E8] font-medium mb-1">Ce que ZOVO a fait</p>
            <ul className="list-disc list-inside space-y-0.5">
              {report.actions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-emerald-300">{report.message}</p>
        </div>
      );
    }

    return (
      <div className="rounded-lg border-2 border-red-700 bg-red-950/30 p-5 space-y-3">
        <p className="text-red-300 font-medium">❌ Validation non réussie</p>
        <div className="text-sm text-[#F5F1E8] space-y-1">
          <p>Tentatives : {report.attempts ?? 0}</p>
          <p>Erreurs détectées : {report.errorsDetected}</p>
          <p>Erreurs corrigées : {report.errorsFixed}</p>
          <p>Erreurs restantes : {report.remainingErrorsCount ?? 0}</p>
        </div>
        {report.actions.length > 0 && (
          <div className="text-sm text-[#9B9B95]">
            <p className="text-[#F5F1E8] font-medium mb-1">Ce que ZOVO a fait</p>
            <ul className="list-disc list-inside space-y-0.5">
              {report.actions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-sm text-red-300">{report.message}</p>
      </div>
    );
  }

  // --- Mode suivi en cours (après retour de Stripe, avant terminaison) ---
  if (trackingRef && statusData) {
    return (
      <div className="rounded-lg border border-[#C9A227]/40 bg-[#0A0A0C] p-4 space-y-2">
        <p className="text-sm font-medium text-[#E8C34A]">ZOVO Correction & Validation</p>
        <p className="text-sm text-[#F5F1E8]">
          {STATUS_LABELS[statusData.status] || statusData.status}
        </p>
      </div>
    );
  }

  // --- Mode déclenchement (validation échouée, pas de réparation en cours) ---
  if (!validationFailed || !projectId) return null;

  return (
    <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-5 space-y-3">
      <p className="text-sm font-medium text-[#F5F1E8]">🛠️ Correction & Validation</p>
      <p className="text-sm text-[#9B9B95]">
        Votre projet contient des erreurs ? ZOVO peut analyser et corriger automatiquement votre projet.
        Aucune connaissance en programmation nécessaire.
      </p>
      <p className="text-lg font-bold text-[#E8C34A]">29,99 $ CAD</p>
      <button
        onClick={handleStartRepair}
        disabled={checkoutLoading}
        className="rounded-md bg-[#C9A227] hover:bg-[#E8C34A] disabled:opacity-40 px-4 py-2 text-sm font-medium text-[#0A0A0C]"
      >
        {checkoutLoading ? "Redirection vers le paiement..." : "Corriger & Valider — 29,99 $ CAD"}
      </button>
      {checkoutError && (
        <div className="rounded-lg bg-red-950/40 border border-red-800/60 p-3 text-sm text-red-300">
          {checkoutError}
        </div>
      )}
    </div>
  );
}
