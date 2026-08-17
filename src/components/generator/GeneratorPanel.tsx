"use client";

import { useEffect, useState, useRef } from "react";
import ValueCounter from "./ValueCounter";
import { AnimatePresence } from "framer-motion";
import { NeuralOrb } from "../genesis/NeuralOrb";
import { FloatingFileCard } from "../genesis/FloatingFileCard";
import { useGenesis } from "../../hooks/useGenesis";
import { ZovoBridgeClient } from "../../core/ZovoBridgeClient";

interface BlueprintResult {
  success: boolean;
  projectPath?: string;
  filesCreated?: string[];
  fallbackFiles?: string[];
  degraded?: boolean;
  validation?: { valid: boolean; errors?: string[] };
  error?: string;
  projectRecordId?: string;
  projectVersion?: number;
}

interface ProjectSummary {
  id: string;
  name: string;
  currentVersion: number;
}

export default function GeneratorPanel() {
  const { status, projectedFiles } = useGenesis();
  const bridgeRef = useRef<ZovoBridgeClient | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<BlueprintResult | null>(null);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const lastEffectivePromptRef = useRef<string>("");
  const notifiedMilestonesRef = useRef<{ [key: string]: Set<number> }>({
    generation: new Set(),
    preview: new Set(),
    deploy: new Set(),
  });

  function playNotifSound() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 880;
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch {
      // audio non disponible, on ignore silencieusement
    }
  }

  function notifyMilestone(kind: "generation" | "preview" | "deploy", percent: number, label: string) {
    const milestones = [25, 50, 75, 100];
    const reached = milestones.filter((m) => percent >= m && !notifiedMilestonesRef.current[kind].has(m));
    if (reached.length === 0) return;
    reached.forEach((m) => notifiedMilestonesRef.current[kind].add(m));
    const topMilestone = Math.max(...reached);
    setToastMessage(`${label} : ${topMilestone}%`);
    playNotifSound();
    setTimeout(() => setToastMessage(null), 3500);
  }
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployLabel, setDeployLabel] = useState<string | null>(null);
  const [deployPercent, setDeployPercent] = useState<number | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const deployPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLabel, setPreviewLabel] = useState("");
  const [previewPercent, setPreviewPercent] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("new");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [stuckJob, setStuckJob] = useState<{ jobId: string; prompt: string; projectId: string | null } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [pendingBlueprint, setPendingBlueprint] = useState<Record<string, unknown> | null>(null);
  const [pendingFeatures, setPendingFeatures] = useState<string[]>([]);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const ALL_FEATURES: { key: string; label: string; category: string }[] = [
    { key: "dashboard", label: "Tableau de bord", category: "Fondations" },
    { key: "database", label: "Base de données", category: "Fondations" },
    { key: "api", label: "API personnalisée", category: "Fondations" },
    { key: "crud", label: "Gestion create/read/update/delete", category: "Fondations" },
    { key: "file-upload", label: "Téléversement de fichiers/images", category: "Fondations" },
    { key: "search", label: "Recherche/filtrage", category: "Fondations" },
    { key: "authentication", label: "Authentification (connexion/inscription)", category: "Authentification & Sécurité" },
    { key: "oauth", label: "Connexion via Google/GitHub/etc.", category: "Authentification & Sécurité" },
    { key: "roles-permissions", label: "Rôles et permissions granulaires", category: "Authentification & Sécurité" },
    { key: "two-factor-auth", label: "Authentification à deux facteurs (2FA)", category: "Authentification & Sécurité" },
    { key: "audit-log", label: "Journal d'audit", category: "Authentification & Sécurité" },
    { key: "rate-limiting", label: "Limitation de débit (anti-abus)", category: "Authentification & Sécurité" },
    { key: "rest-api", label: "API REST publique documentée", category: "Données & API" },
    { key: "webhooks", label: "Webhooks entrants/sortants", category: "Données & API" },
    { key: "mcp-server", label: "Serveur MCP pour agents IA", category: "Données & API" },
    { key: "third-party-integration", label: "Intégration service externe", category: "Données & API" },
    { key: "realtime-sync", label: "Synchronisation temps réel", category: "Données & API" },
    { key: "data-export", label: "Export de données (CSV/PDF/JSON)", category: "Données & API" },
    { key: "payments", label: "Paiements (Stripe)", category: "Commerce" },
    { key: "marketplace", label: "Place de marché multi-vendeurs", category: "Commerce" },
    { key: "subscription-billing", label: "Facturation récurrente/abonnements", category: "Commerce" },
    { key: "invoicing", label: "Génération de factures", category: "Commerce" },
    { key: "notifications", label: "Notifications", category: "Communication" },
    { key: "email", label: "Emails transactionnels", category: "Communication" },
    { key: "chat", label: "Messagerie/chat", category: "Communication" },
    { key: "comments", label: "Commentaires", category: "Communication" },
    { key: "cms", label: "Gestion de contenu éditorial", category: "Contenu & Découverte" },
    { key: "media-gallery", label: "Galerie photo/vidéo", category: "Contenu & Découverte" },
    { key: "reviews-ratings", label: "Avis et notes", category: "Contenu & Découverte" },
    { key: "recommendations", label: "Recommandations personnalisées", category: "Contenu & Découverte" },
    { key: "multilingual", label: "Support multilingue", category: "Contenu & Découverte" },
    { key: "admin", label: "Panneau admin", category: "Collaboration & Admin" },
    { key: "profile", label: "Profil utilisateur", category: "Collaboration & Admin" },
    { key: "team-workspace", label: "Espaces de travail collaboratifs", category: "Collaboration & Admin" },
    { key: "calendar-scheduling", label: "Calendrier/prise de rendez-vous", category: "Collaboration & Admin" },
    { key: "analytics", label: "Analytique/statistiques d'usage", category: "Collaboration & Admin" },
    { key: "automated-tests", label: "Tests automatisés", category: "Qualité & Infrastructure" },
    { key: "ci-cd", label: "Intégration/déploiement continus", category: "Qualité & Infrastructure" },
    { key: "monitoring", label: "Surveillance/health checks", category: "Qualité & Infrastructure" },
    { key: "error-tracking", label: "Suivi des erreurs", category: "Qualité & Infrastructure" },
    { key: "backup-restore", label: "Sauvegarde et restauration", category: "Qualité & Infrastructure" },
    { key: "accessibility", label: "Accessibilité renforcée (a11y)", category: "Qualité & Infrastructure" },
  ];

  const FEATURE_CATEGORIES = [
    "Fondations",
    "Authentification & Sécurité",
    "Données & API",
    "Commerce",
    "Communication",
    "Contenu & Découverte",
    "Collaboration & Admin",
    "Qualité & Infrastructure",
  ];

  function toggleFeature(key: string) {
    setPendingFeatures((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  }

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProjects(data?.projects ?? []))
      .catch(() => setProjects([]));
  }, [result]);

  useEffect(() => {
    fetch("/api/blueprint/stuck")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.stuck) {
          setStuckJob({ jobId: data.jobId, prompt: data.prompt, projectId: data.projectId });
        }
      })
      .catch(() => {});
  }, []);

  async function handleResume() {
    if (!stuckJob) return;
    setPrompt(stuckJob.prompt);
    if (stuckJob.projectId) setSelectedProject(stuckJob.projectId);
    setStuckJob(null);
    setLoading(true);
    setResult(null);
    setPreviewUrl(null);
    setPreviewError(null);
    setProgressLabel("Reprise de la génération...");

    try {
      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: stuckJob.prompt,
          projectId: stuckJob.projectId || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.jobId) {
        setResult({ success: false, error: data.error || "Impossible de reprendre la génération" });
        setLoading(false);
        return;
      }

      const jobId = data.jobId;
      bridgeRef.current = new ZovoBridgeClient(jobId);
      let elapsed = 0;

      pollRef.current = setInterval(async () => {
        elapsed += 3;
        setProgressLabel(
          elapsed < 20
            ? "Analyse du prompt..."
            : elapsed < 45
            ? "Génération des fichiers..."
            : "Validation du projet..."
        );

        try {
          const statusRes = await fetch(`/api/blueprint/status/${jobId}`);
          const statusData = await statusRes.json();

          if (statusData.progress?.total) {
            const __genPct = Math.round((statusData.progress.current / statusData.progress.total) * 100);
            setProgressPercent(__genPct);
            notifyMilestone("generation", __genPct, "Génération");
          }

          if (statusData.status === "completed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setTimeout(() => { bridgeRef.current?.close(); bridgeRef.current = null; }, 2000);
            setResult(statusData.result);
            setLoading(false);
            setProgressPercent(null);
          } else if (statusData.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setTimeout(() => { bridgeRef.current?.close(); bridgeRef.current = null; }, 2000);
            setResult({ success: false, error: statusData.error || "La génération a échoué" });
            setLoading(false);
            setProgressPercent(null);
          }
        } catch {
          // On continue le polling
        }
      }, 3000);
    } catch (err: unknown) {
      setResult({ success: false, error: err instanceof Error ? err.message : String(err) });
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (previewPollRef.current) clearInterval(previewPollRef.current);
    };
  }, []);

  const projectId = result?.projectPath ? result.projectPath.split("/").pop() : null;

  async function handleAnalyze() {
    const effectivePrompt = prompt.trim() || "Continue la génération de ce projet, corrige les erreurs et complète les fonctionnalités manquantes.";
    if (!effectivePrompt) return;
    lastEffectivePromptRef.current = effectivePrompt;
    setAnalyzing(true);
    setAnalyzeError(null);
    setPendingBlueprint(null);
    setResult(null);

    try {
      const res = await fetch("/api/blueprint/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: effectivePrompt }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAnalyzeError(data.error || "Impossible d'analyser le prompt");
        setAnalyzing(false);
        return;
      }

      setPendingBlueprint(data.blueprint);
      setPendingFeatures(data.blueprint.features || []);
      setAnalyzing(false);
    } catch (err: unknown) {
      setAnalyzeError(err instanceof Error ? err.message : String(err));
      setAnalyzing(false);
    }
  }


  async function handleConfirmGenerate() {
    if (!pendingBlueprint) return;
    setLoading(true);
    setResult(null);
    setPreviewUrl(null);
    setPreviewError(null);
    notifiedMilestonesRef.current.generation = new Set();
    setProgressLabel("Démarrage de la génération...");

    const finalBlueprint = { ...pendingBlueprint, features: pendingFeatures };

    try {
      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: lastEffectivePromptRef.current || prompt,
          projectId: selectedProject !== "new" ? selectedProject : undefined,
          blueprint: finalBlueprint,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.jobId) {
        setResult({ success: false, error: data.error || "Impossible de démarrer la génération" });
        setLoading(false);
        return;
      }

      const jobId = data.jobId;
      bridgeRef.current = new ZovoBridgeClient(jobId);
      let elapsed = 0;
      setPendingBlueprint(null);

      pollRef.current = setInterval(async () => {
        elapsed += 3;
        setProgressLabel(
          elapsed < 20
            ? "Analyse du prompt..."
            : elapsed < 45
            ? "Génération des fichiers..."
            : "Validation du projet..."
        );

        try {
          const statusRes = await fetch(`/api/blueprint/status/${jobId}`);
          const statusData = await statusRes.json();

          if (statusData.progress?.total) {
            const __genPct = Math.round((statusData.progress.current / statusData.progress.total) * 100);
            setProgressPercent(__genPct);
            notifyMilestone("generation", __genPct, "Génération");
          }

          if (statusData.status === "completed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setTimeout(() => { bridgeRef.current?.close(); bridgeRef.current = null; }, 2000);
            setResult(statusData.result);
            setLoading(false);
            setProgressPercent(null);
          } else if (statusData.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setTimeout(() => { bridgeRef.current?.close(); bridgeRef.current = null; }, 2000);
            setResult({ success: false, error: statusData.error || "La génération a échoué" });
            setLoading(false);
            setProgressPercent(null);
          }
        } catch {
          // On continue le polling, une erreur réseau ponctuelle n'est pas fatale
        }
      }, 3000);
    } catch (err: unknown) {
      setResult({ success: false, error: err instanceof Error ? err.message : String(err) });
      setLoading(false);
    }
  }

  async function handleDeploy() {
    if (!projectId) return;
    setDeployLoading(true);
    setDeployError(null);
    setDeployUrl(null);
    setDeployLabel("Envoi vers Vercel...");
    notifiedMilestonesRef.current.deploy = new Set();
    setDeployPercent(10);
    notifyMilestone("deploy", 10, "Déploiement");

    try {
      const res = await fetch(`/api/deploy/${projectId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setDeployError(data.error || "Impossible de lancer le deploiement");
        setDeployLoading(false);
        setDeployPercent(null);
        return;
      }

      deployPollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/deploy/${projectId}`);
          const statusData = await statusRes.json();

          if (statusData.status === "queued") {
            setDeployLabel("En file d'attente...");
            setDeployPercent(30);
            notifyMilestone("deploy", 30, "Déploiement");
          } else if (statusData.status === "building") {
            setDeployLabel("Construction en cours...");
            setDeployPercent(65);
            notifyMilestone("deploy", 65, "Déploiement");
          } else if (statusData.status === "ready") {
            if (deployPollRef.current) clearInterval(deployPollRef.current);
            setDeployPercent(100);
            notifyMilestone("deploy", 100, "Déploiement");
            setDeployUrl(statusData.url);
            setDeployLoading(false);
          } else if (statusData.status === "error") {
            if (deployPollRef.current) clearInterval(deployPollRef.current);
            setDeployError(statusData.error || "Erreur de deploiement");
            setDeployLoading(false);
            setDeployPercent(null);
          }
        } catch {
          // erreur reseau ponctuelle, on continue le polling
        }
      }, 3000);
    } catch (err: unknown) {
      setDeployError(err instanceof Error ? err.message : String(err));
      setDeployLoading(false);
    }
  }

  async function handlePreview() {
    if (!projectId) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewUrl(null);
    setPreviewLabel("Démarrage...");
    notifiedMilestonesRef.current.preview = new Set();
    setPreviewPercent(10);
    notifyMilestone("preview", 10, "Preview");

    try {
      const res = await fetch(`/api/preview/${projectId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setPreviewError(data.error || "Impossible de demarrer la preview");
        setPreviewLoading(false);
        setPreviewPercent(null);
        return;
      }

      previewPollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/preview/${projectId}`);
          const statusData = await statusRes.json();

          if (statusData.status === "installing") {
            setPreviewLabel("Installation des dépendances...");
            setPreviewPercent(40);
            notifyMilestone("preview", 40, "Preview");
          } else if (statusData.status === "starting") {
            setPreviewLabel("Démarrage du serveur...");
            setPreviewPercent(75);
            notifyMilestone("preview", 75, "Preview");
          } else if (statusData.status === "ready") {
            if (previewPollRef.current) clearInterval(previewPollRef.current);
            setPreviewPercent(100);
            notifyMilestone("preview", 100, "Preview");
            setPreviewUrl(`/api/preview-proxy/${projectId}`);
            setPreviewLoading(false);
          } else if (statusData.status === "error") {
            if (previewPollRef.current) clearInterval(previewPollRef.current);
            setPreviewError(statusData.error || "Erreur au démarrage de la preview");
            setPreviewLoading(false);
            setPreviewPercent(null);
          }
        } catch {
          // erreur réseau ponctuelle, on continue le polling
        }
      }, 2000);
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : String(err));
      setPreviewLoading(false);
    }
  }

  function handleExport() {
    if (!projectId) return;
    window.open(`/api/export/${projectId}`, "_blank");
  }

  return (
    <div className="rounded-lg border border-[#2A2A2E] bg-[#16161A] p-6 space-y-4">
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-[#16161A] border border-[#C9A227] px-4 py-3 shadow-lg text-sm font-medium text-[#F5F1E8] animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}
      <div>
        <span style={{ fontFamily: "var(--font-mono)" }} className="text-xs text-[#E8C34A]">GENERATEUR</span>
        <h2 style={{ fontFamily: "var(--font-display)" }} className="mt-1 text-lg font-bold">Generer une application</h2>
      </div>
      <div className="relative rounded-xl border border-[#2A2A2E] bg-[#1D1D22] h-64 overflow-hidden flex items-center justify-center">
        <NeuralOrb status={status} />
        <AnimatePresence>
          {projectedFiles.slice(-4).map((file, i) => (
            <FloatingFileCard key={file.id} file={file} index={i} compact />
          ))}
        </AnimatePresence>
      </div>
      {stuckJob && (
        <div className="rounded-lg border border-amber-700/60 bg-amber-950/40 p-3 space-y-2">
          <p className="text-sm text-amber-300">
            Une generation precedente semble incomplete ou echouee.
          </p>
          <button
            onClick={handleResume}
            disabled={loading}
            className="rounded-md bg-[#C9A227] hover:bg-[#E8C34A] disabled:opacity-40 px-4 py-2 text-sm font-medium text-[#0A0A0C]"
          >
            Reprendre la generation
          </button>
        </div>
      )}

      {projects.length > 0 && (
        <div>
          <label className="mb-1 block text-xs text-[#9B9B95]">Projet</label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg bg-[#0A0A0C] border border-[#2A2A2E] p-2 text-sm text-[#F5F1E8] focus:border-[#C9A227] outline-none"
          >
            <option value="new">+ Nouveau projet</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (v{p.currentVersion})
              </option>
            ))}
          </select>
        </div>
      )}

      <ValueCounter projectId={selectedProject !== "new" ? selectedProject : null} />

      <div className="flex gap-2 items-stretch">
        <textarea
          autoComplete="off"
          rows={1}
          className="flex-1 rounded-lg bg-[#0A0A0C] border border-[#2A2A2E] p-3 text-sm min-h-[48px] max-h-[48px] resize-none text-[#F5F1E8] placeholder:text-[#9B9B95] focus:border-[#C9A227] outline-none"
          placeholder={
            selectedProject !== "new"
              ? "Decris ce que tu veux ajouter ou modifier..."
              : "Decris l'application que tu veux creer..."
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
        />

        <button
        onClick={handleAnalyze}
        disabled={analyzing || loading || Boolean(pendingBlueprint)}
        className="rounded-md bg-[#C9A227] hover:bg-[#E8C34A] disabled:bg-[#2A2A2E] disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-[#0A0A0C]"
      >
        {analyzing
          ? "Analyse du prompt..."
          : loading
          ? `${progressLabel || "Generation en cours..."}${progressPercent !== null ? ` (${progressPercent}%)` : ""}`
          : pendingBlueprint
          ? "En attente de confirmation..."
          : prompt.trim()
          ? "Analyser"
          : "Reprendre la Génération"}
      </button>
      </div>

      {analyzeError && (
        <div className="rounded-lg bg-red-950/40 border border-red-800/60 p-3 text-sm text-red-300">
          {analyzeError}
        </div>
      )}

      {pendingBlueprint && (
        <div className="rounded-lg border border-[#C9A227]/40 bg-[#0A0A0C] p-4 space-y-3">
          <p className="text-sm text-[#9B9B95]">
            Fonctionnalites detectees pour <strong className="text-[#F5F1E8]">{String(pendingBlueprint.projectName ?? "")}</strong> — decoche celles que tu ne veux pas :
          </p>
          <div className="space-y-4">
            {FEATURE_CATEGORIES.map((category) => (
              <div key={category}>
                <p className="text-xs uppercase tracking-wide text-[#C9A227] mb-1">{category}</p>
                <div className="space-y-2">
                  {ALL_FEATURES.filter((f) => f.category === category).map((feature) => (
                    <label key={feature.key} className="flex items-center gap-2 text-sm text-[#D8CBA3]">
                      <input
                        type="checkbox"
                        checked={pendingFeatures.includes(feature.key)}
                        onChange={() => toggleFeature(feature.key)}
                        className="accent-[#C9A227]"
                      />
                      {feature.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleConfirmGenerate}
            disabled={loading}
            className="w-full rounded-md bg-[#C9A227] hover:bg-[#E8C34A] disabled:bg-[#2A2A2E] disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-[#0A0A0C]"
          >
            {loading
              ? `${progressLabel || "Generation en cours..."}${progressPercent !== null ? ` (${progressPercent}%)` : ""}`
              : "Confirmer et generer"}
          </button>
        </div>
      )}

      {result && !result.success && (
        <div className="rounded-lg bg-red-950/40 border border-red-800/60 p-3 text-sm text-red-300">
          Erreur : {result.error}
        </div>
      )}

      {result && result.success && (
        <div className="rounded-lg bg-[#0A0A0C] border border-[#2A2A2E] p-4 space-y-3">
          <div className="text-sm text-[#9B9B95]">
            Projet : <span className="text-[#F5F1E8]">{projectId}</span>
            {result.projectVersion && (
              <span className="ml-2 text-[#E8C34A]">(version {result.projectVersion})</span>
            )}
          </div>
          <div className="text-sm text-[#9B9B95]">
            Fichiers crees : <span className="text-[#F5F1E8]">{result.filesCreated?.length ?? 0}</span>
          </div>
          <div className="text-sm">
            Validation :{" "}
            {result.validation?.valid ? (
              <span className="text-emerald-400">OK</span>
            ) : (
              <span className="text-[#E8C34A]">erreurs detectees</span>
            )}
          </div>

          {result.degraded && (() => {
            const fallbackCount = result.fallbackFiles?.length ?? 0;
            const totalFiles = result.filesCreated?.length ?? 1;
            const isSevere = fallbackCount >= 3 || fallbackCount / totalFiles > 0.2;

            return isSevere ? (
              <div className="rounded-lg bg-red-950/50 border-2 border-red-600 p-3 text-sm text-red-300">
                <strong>Attention avant de livrer ce projet :</strong> {fallbackCount} fichier(s) sur {totalFiles} sont simplifies (placeholders sans logique reelle), faute de capacite IA disponible au moment de la generation. Verifie la preview attentivement et regenere le projet avant de le remettre a un client.
              </div>
            ) : (
              <div className="rounded-lg bg-amber-950/40 border border-amber-700/60 p-3 text-sm text-amber-300">
                Generation partiellement degradee : {fallbackCount} fichier(s) simplifie(s) par manque de capacite IA disponible. Tu peux relancer une regeneration sur ce projet plus tard pour ameliorer ces fichiers.
              </div>
            );
          })()}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handlePreview}
              disabled={previewLoading}
              className="rounded-md border border-[#C9A227]/60 text-[#E8C34A] hover:bg-[#C9A227]/10 disabled:opacity-40 px-4 py-2 text-sm font-medium"
            >
              {previewLoading ? `${previewLabel || "Demarrage..."}${previewPercent !== null ? ` (${previewPercent}%)` : ""}` : "Preview"}
            </button>
            <button
              onClick={handleDeploy}
              disabled={deployLoading}
              className="rounded-md border border-[#C9A227]/60 text-[#E8C34A] hover:bg-[#C9A227]/10 disabled:opacity-40 px-4 py-2 text-sm font-medium"
            >
              {deployLoading ? `${deployLabel || "Deploiement..."}${deployPercent !== null ? ` (${deployPercent}%)` : ""}` : "ZOVO Deploy"}
            </button>
          </div>

          {deployError && (
            <div className="rounded-lg bg-red-950/40 border border-red-800/60 p-3 text-sm text-red-300">
              {deployError}
            </div>
          )}

          {deployUrl && (
            <div className="rounded-lg bg-emerald-950/40 border border-emerald-700/60 p-3 text-sm text-emerald-300">
              Deploye avec succes :{" "}
              <a href={deployUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {deployUrl}
              </a>
            </div>
          )}

          {previewError && (
            <div className="rounded-lg bg-red-950/40 border border-red-800/60 p-3 text-sm text-red-300">
              {previewError}
            </div>
          )}

          {previewUrl && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#9B9B95]">Apercu live</span>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#E8C34A] hover:underline"
                >
                  Ouvrir dans un nouvel onglet
                </a>
              </div>
              <iframe
                src={previewUrl}
                className="w-full h-[500px] rounded-lg border border-[#2A2A2E] bg-white"
                title="Preview du projet genere"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
