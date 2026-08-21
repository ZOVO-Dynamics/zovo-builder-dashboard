"use client";

import { useState } from "react";
import { AmbientParticles, AmbientHalo } from "@/components/genesis/AmbientBackground";

export default function GatePage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erreur");
        return;
      }
      window.location.href = "/";
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6">
      <AmbientParticles />
      <AmbientHalo className="w-[30rem] h-[30rem] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="relative z-10 w-full max-w-sm rounded-lg border border-[#2A2A2E] bg-[#16161A]/90 p-8 text-center backdrop-blur-sm">
        <h1 className="text-xl font-bold text-[#E8C34A]">ZOVO Builder</h1>
        <p className="mt-2 text-sm text-[#9B9B95]">Site en construction. Accès réservé.</p>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Mot de passe"
          className="mt-6 w-full rounded-md border border-[#2A2A2E] bg-[#0A0A0C] p-3 text-sm text-[#F5F1E8] placeholder:text-[#9B9B95] focus:border-[#C9A227] outline-none"
        />

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading || !password}
          className="mt-4 w-full rounded-md bg-[#C9A227] hover:bg-[#E8C34A] disabled:opacity-40 px-4 py-2 text-sm font-medium text-[#0A0A0C]"
        >
          {loading ? "..." : "Entrer"}
        </button>
      </div>
    </div>
  );
}
