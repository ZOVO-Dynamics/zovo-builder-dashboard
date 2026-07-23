"use client";

import { useState } from "react";

interface ProjectBlueprint {
  projectType: string;
  framework: string;
  language: string;
  features: string[];
  database: string;
  authentication: boolean;
  deployment: string;
}

interface BuildBlueprint {
  name: string;
  folders: string[];
  files: string[];
  components: string[];
  routes: string[];
  dependencies: string[];
}

interface BlueprintResponse {
  success: boolean;
  projectBlueprint: ProjectBlueprint;
  buildBlueprint: BuildBlueprint;
  error?: string;
}

export default function BlueprintPanel() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BlueprintResponse | null>(null);
  const [error, setError] = useState("");

  async function generateBlueprint() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status})`);
      }

      const data: BlueprintResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erreur inconnue");
      }

      setResult(data);
    } catch (err) {
      setError("Erreur: " + String(err));
    }

    setLoading(false);
  }

  return (
    <div className="mt-8 rounded-xl border border-zinc-800 p-6">
      <h2 className="text-xl font-bold">🧩 Blueprint Generator</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Décris ton projet, on détecte les besoins et on génère la structure.
      </p>

      <textarea
        className="mt-4 w-full rounded bg-zinc-900 p-3"
        rows={4}
        placeholder="Ex: Je veux un dashboard avec login et une base de données"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button
        className="mt-4 rounded bg-white px-5 py-2 text-black disabled:opacity-50"
        onClick={generateBlueprint}
        disabled={loading || !prompt.trim()}
      >
        {loading ? "Analyse..." : "Générer le blueprint"}
      </button>

      {error && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}

      {result && (
        <div className="mt-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-zinc-400">Features détectées</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.projectBlueprint.features.length === 0 && (
                <span className="text-sm text-zinc-500">Aucune feature détectée</span>
              )}
              {result.projectBlueprint.features.map((f) => (
                <span
                  key={f}
                  className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-200"
                >
                  {f}
                </span>
              ))}
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Framework: {result.projectBlueprint.framework} · DB: {result.projectBlueprint.database} · Auth: {result.projectBlueprint.authentication ? "oui" : "non"}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-400">Structure générée</h3>
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <BlueprintList title="Dossiers" items={result.buildBlueprint.folders} />
              <BlueprintList title="Fichiers" items={result.buildBlueprint.files} />
              <BlueprintList title="Composants" items={result.buildBlueprint.components} />
              <BlueprintList title="Routes" items={result.buildBlueprint.routes} />
              <BlueprintList title="Dépendances" items={result.buildBlueprint.dependencies} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BlueprintList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-zinc-900 p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {title}
      </h4>
      {items.length === 0 ? (
        <p className="mt-1 text-xs text-zinc-600">—</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {items.map((item) => (
            <li key={item} className="text-xs text-zinc-300">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
