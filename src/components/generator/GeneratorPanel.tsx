"use client";

import { useEffect, useState, useRef } from "react";

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
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [result, setResult] = useState<BlueprintResult | null>(null);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployLabel, setDeployLabel] = useState<string | null>(null);
  const [deployUrl, setDeployUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const deployPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLabel, setPreviewLabel] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("new");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProjects(data?.projects ?? []))
      .catch(() => setProjects([]));
  }, [result]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (previewPollRef.current) clearInterval(previewPollRef.current);
    };
  }, []);

  const projectId = result?.projectPath ? result.projectPath.split("/").pop() : null;

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    setPreviewUrl(null);
    setPreviewError(null);
    setProgressLabel("Démarrage de la génération...");

    try {
      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          projectId: selectedProject !== "new" ? selectedProject : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success || !data.jobId) {
        setResult({ success: false, error: data.error || "Impossible de démarrer la génération" });
        setLoading(false);
        return;
      }

      const jobId = data.jobId;
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
            setProgressPercent(
              Math.round((statusData.progress.current / statusData.progress.total) * 100)
            );
          }

          if (statusData.status === "completed") {
            if (pollRef.current) clearInterval(pollRef.current);
            setResult(statusData.result);
            setLoading(false);
            setProgressPercent(null);
          } else if (statusData.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
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

    try {
      const res = await fetch(`/api/deploy/${projectId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setDeployError(data.error || "Impossible de lancer le deploiement");
        setDeployLoading(false);
        return;
      }

      deployPollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/deploy/${projectId}`);
          const statusData = await statusRes.json();

          if (statusData.status === "building" || statusData.status === "queued") {
            setDeployLabel("Construction en cours...");
          } else if (statusData.status === "ready") {
            if (deployPollRef.current) clearInterval(deployPollRef.current);
            setDeployUrl(statusData.url);
            setDeployLoading(false);
          } else if (statusData.status === "error") {
            if (deployPollRef.current) clearInterval(deployPollRef.current);
            setDeployError(statusData.error || "Erreur de deploiement");
            setDeployLoading(false);
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

    try {
      const res = await fetch(`/api/preview/${projectId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        setPreviewError(data.error || "Impossible de demarrer la preview");
        setPreviewLoading(false);
        return;
      }

      previewPollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/preview/${projectId}`);
          const statusData = await statusRes.json();

          if (statusData.status === "installing") {
            setPreviewLabel("Installation des dépendances...");
          } else if (statusData.status === "starting") {
            setPreviewLabel("Démarrage du serveur...");
          } else if (statusData.status === "ready") {
            if (previewPollRef.current) clearInterval(previewPollRef.current);
            setPreviewUrl(`/api/preview-proxy/${projectId}`);
            setPreviewLoading(false);
          } else if (statusData.status === "error") {
            if (previewPollRef.current) clearInterval(previewPollRef.current);
            setPreviewError(statusData.error || "Erreur au démarrage de la preview");
            setPreviewLoading(false);
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
      <div>
        <span style={{ fontFamily: "var(--font-mono)" }} className="text-xs text-[#E8C34A]">GENERATEUR</span>
        <h2 style={{ fontFamily: "var(--font-display)" }} className="mt-1 text-lg font-bold">Generer une application</h2>
      </div>

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

      <textarea
        autoComplete="off"
        className="w-full rounded-lg bg-[#0A0A0C] border border-[#2A2A2E] p-3 text-sm min-h-[100px] text-[#F5F1E8] placeholder:text-[#9B9B95] focus:border-[#C9A227] outline-none"
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
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="rounded-md bg-[#C9A227] hover:bg-[#E8C34A] disabled:bg-[#2A2A2E] disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-[#0A0A0C]"
      >
        {loading
          ? `${progressLabel || "Generation en cours..."}${progressPercent !== null ? ` (${progressPercent}%)` : ""}`
          : "Generer"}
      </button>

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
              {previewLoading ? (previewLabel || "Demarrage...") : "Preview"}
            </button>
            <button
              onClick={handleExport}
              className="rounded-md bg-[#C9A227] hover:bg-[#E8C34A] px-4 py-2 text-sm font-medium text-[#0A0A0C]"
            >
              Export ZIP
            </button>
            <button
              onClick={handleDeploy}
              disabled={deployLoading}
              className="rounded-md border border-[#C9A227]/60 text-[#E8C34A] hover:bg-[#C9A227]/10 disabled:opacity-40 px-4 py-2 text-sm font-medium"
            >
              {deployLoading ? (deployLabel || "Deploiement...") : "ZOVO Deploy"}
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
