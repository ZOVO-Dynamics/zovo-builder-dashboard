"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AmbientParticles, AmbientHalo } from "../../components/genesis/AmbientBackground";
import { NeuralOrb } from "../../components/genesis/NeuralOrb";
import { APP_VERSION } from "../../lib/version";

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
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden flex flex-col lg:flex-row">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_40%,_var(--tw-gradient-stops))] from-[#0A0A0A] via-transparent to-transparent opacity-70"></div>
      </div>
      <AmbientParticles />

      <a
        href="/"
        className="absolute top-6 left-6 z-20 text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-amber-400 transition-colors"
      >
        &larr; Retour à l&apos;accueil
      </a>

      {/* COLONNE GAUCHE - Marque & Visuels (au-dessus sur mobile) */}
      <div className="relative z-10 w-full lg:w-1/2 flex flex-col items-center justify-center gap-8 px-6 py-20 lg:py-0 lg:min-h-screen">
        <AmbientHalo className="w-[26rem] h-[26rem] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="relative flex items-center justify-center w-full h-64">
          <NeuralOrb status="idle" />
        </div>
        <h2 className="relative text-2xl md:text-3xl font-black tracking-tight text-center max-w-sm">
          Bienvenue sur{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] via-[#D4AF37] to-[#B45309]">
            ZOVO
          </span>
          .
          <br />
          Là où la vision se matérialise.
        </h2>
      </div>

      {/* COLONNE DROITE - Formulaire */}
      <div className="relative z-10 w-full lg:w-1/2 flex items-center justify-center px-6 py-16 lg:py-0 lg:min-h-screen lg:border-l lg:border-amber-500/10">
        <div className="w-full max-w-md">
          <form
            onSubmit={handleSubmit}
            className="w-full space-y-4 p-8 rounded-2xl bg-neutral-900/60 backdrop-blur-md border border-amber-500/20 hover:border-amber-500/40 transition-all"
          >
            <div className="flex flex-col items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-[#D4AF37] rounded-xl flex items-center justify-center font-black italic text-xl text-[#0A0A0A] shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                Z
              </div>
              <span className="text-lg font-bold tracking-[0.2em] uppercase">
                Zovo<span className="text-[#D4AF37]">.ca</span>
              </span>
            </div>

            <h1 className="text-2xl font-bold text-center">Connexion</h1>

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-black/50 border border-zinc-700 p-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              required
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-black/50 border border-zinc-700 p-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              required
            />

            {error && (
              <div className="text-sm text-red-400">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 disabled:from-zinc-700 disabled:to-zinc-700 text-black font-semibold px-4 py-2.5 text-sm shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>

            <p className="text-sm text-zinc-400 text-center">
              Pas de compte ?{" "}
              <a href="/signup" className="text-amber-400 hover:text-amber-300 transition-colors">
                S&apos;inscrire
              </a>
            </p>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-xs text-zinc-500">ou</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            <button
              type="button"
              onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900 hover:text-amber-400 px-4 py-2.5 text-sm font-medium border border-zinc-700 hover:border-amber-500/30 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.42 7.86 10.96.57.1.78-.25.78-.55v-2.1c-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.17.08 1.78 1.2 1.78 1.2 1.03 1.78 2.72 1.26 3.38.97.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.2-3.08-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.2 1.18a11.06 11.06 0 0 1 5.83 0c2.22-1.49 3.19-1.18 3.19-1.18.64 1.6.24 2.77.12 3.06.75.8 1.2 1.82 1.2 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.05.78 2.12v3.14c0 .3.2.66.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"/></svg>
              Continuer avec GitHub
            </button>
          </form>

          <p className="mt-4 text-center text-[10px] text-zinc-700">
            Version {APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}
