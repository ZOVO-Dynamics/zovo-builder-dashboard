"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email ou mot de passe incorrect");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6 rounded-xl border border-zinc-800">
        <h1 className="text-2xl font-bold">Connexion</h1>

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
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <p className="text-sm text-zinc-400 text-center">
          Pas de compte ? <a href="/signup" className="text-blue-400 hover:underline">S&apos;inscrire</a>
        </p>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-500">ou</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <button
          type="button"
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-sm font-medium border border-zinc-700"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.42 7.86 10.96.57.1.78-.25.78-.55v-2.1c-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.78 2.72 1.26 3.38.97.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.2-3.08-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.2 1.18a11.06 11.06 0 0 1 5.83 0c2.22-1.49 3.19-1.18 3.19-1.18.64 1.6.24 2.77.12 3.06.75.8 1.2 1.82 1.2 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.05.78 2.12v3.14c0 .3.2.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
          Continuer avec GitHub
        </button>
      </form>
    </div>
  );
}
