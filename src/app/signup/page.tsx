"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Erreur lors de l'inscription");
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Compte créé, mais la connexion automatique a échoué. Essaie de te connecter.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6 rounded-xl border border-zinc-800">
        <h1 className="text-2xl font-bold">Créer un compte</h1>

        <input
          type="text"
          placeholder="Nom (optionnel)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700 p-3 text-sm"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700 p-3 text-sm"
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-zinc-900 border border-zinc-700 p-3 text-sm"
          minLength={8}
          required
        />

        {error && (
          <div className="text-sm text-red-400">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 px-4 py-2 text-sm font-medium"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>

        <p className="text-sm text-zinc-400 text-center">
          Déjà un compte ? <a href="/login" className="text-blue-400 hover:underline">Se connecter</a>
        </p>
      </form>
    </div>
  );
}
