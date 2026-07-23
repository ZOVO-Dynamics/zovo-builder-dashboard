"use client";

import { useState } from "react";

export default function GeneratePanel() {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setOutput("");
    setLoading(true);

    try {
      const response = await fetch("https://ai.zovo.ca/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No stream");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const rawEvent of events) {
          const lines = rawEvent.split("\n");
          let eventType = "message";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith(":")) continue;
            if (line.startsWith("event:")) {
              eventType = line.slice("event:".length).trim();
            } else if (line.startsWith("data:")) {
              dataStr += line.slice("data:".length).trim();
            }
          }

          if (!dataStr) continue;

          if (eventType === "chunk") {
            try {
              const parsed = JSON.parse(dataStr);
              if (typeof parsed.text === "string") {
                setOutput((prev) => prev + parsed.text);
              }
            } catch {
              // chunk invalide ignoré, ne casse pas le flux
            }
          } else if (eventType === "error") {
            try {
              const parsed = JSON.parse(dataStr);
              setOutput((prev) => prev + `\n[Erreur: ${parsed.error ?? "inconnue"}]`);
            } catch {
              setOutput((prev) => prev + "\n[Erreur de génération]");
            }
          }
          // eventType === "done" : rien à faire, la boucle se terminera avec le reader
        }
      }
    } catch (error) {
      setOutput((prev) => prev + "\nErreur réseau: " + String(error));
    }

    setLoading(false);
  }

  return (
    <div className="mt-8 rounded-xl border border-zinc-800 p-6">
      <h2 className="text-xl font-bold">🧠 AI Generator</h2>

      <textarea
        className="mt-4 w-full rounded bg-zinc-900 p-3"
        rows={5}
        placeholder="Décris l'application à créer..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button
        className="mt-4 rounded bg-white px-5 py-2 text-black"
        onClick={generate}
        disabled={loading}
      >
        {loading ? "Generation..." : "Generate"}
      </button>

      <pre className="mt-6 whitespace-pre-wrap text-sm text-zinc-300">
        {output}
      </pre>
    </div>
  );
}
