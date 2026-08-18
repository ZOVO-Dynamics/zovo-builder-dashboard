"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AmbientParticles, AmbientHalo } from "../../components/genesis/AmbientBackground";
import { NeuralOrb } from "../../components/genesis/NeuralOrb";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusiness, setIsBusiness] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!acceptedTerms) {
      setError("Tu dois accepter les conditions générales et la politique de confidentialité");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        isBusiness,
        companyName,
        website,
        acceptedTerms,
      }),
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
          Rejoins{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] via-[#D4AF37] to-[#B45309]">
            ZOVO
          </span>
          .
          <br />
          Bâtis ta vision, sans écrire une ligne de code.
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

            <h1 className="text-2xl font-bold text-center">Créer un compte</h1>

            <input
              type="text"
              placeholder="Nom complet et prénom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg bg-black/50 border border-zinc-700 p-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              required
            />
            <input
              type="email"
              placeholder="Courriel"
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
              minLength={8}
              required
            />

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={isBusiness}
                onChange={(e) => setIsBusiness(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              Compte entreprise
            </label>

            {isBusiness && (
              <div className="space-y-3 pl-1 border-l border-amber-500/20 ml-1.5">
                <input
                  type="text"
                  placeholder="Nom de l'entreprise"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full ml-3 rounded-lg bg-black/50 border border-zinc-700 p-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  style={{ width: "calc(100% - 0.75rem)" }}
                />
                <input
                  type="url"
                  placeholder="Site web (https://...)"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full ml-3 rounded-lg bg-black/50 border border-zinc-700 p-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                  style={{ width: "calc(100% - 0.75rem)" }}
                />
              </div>
            )}

            <label className="flex items-start gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
                className="h-4 w-4 mt-0.5 accent-amber-500"
              />
              <span>
                J&apos;ai lu et j&apos;accepte les{" "}
                <a href="/terms" className="text-amber-400 hover:text-amber-300 transition-colors">
                  conditions générales
                </a>{" "}
                et la{" "}
                <a href="/privacy" className="text-amber-400 hover:text-amber-300 transition-colors">
                  politique de confidentialité
                </a>
                .
              </span>
            </label>

            {error && (
              <div className="text-sm text-red-400">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 disabled:from-zinc-700 disabled:to-zinc-700 text-black font-semibold px-4 py-2.5 text-sm shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {loading ? "Création..." : "Créer mon compte"}
            </button>

            <p className="text-sm text-zinc-400 text-center">
              Déjà un compte ?{" "}
              <a href="/login" className="text-amber-400 hover:text-amber-300 transition-colors">
                Se connecter
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

            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900 hover:text-amber-400 px-4 py-2.5 text-sm font-medium border border-zinc-700 hover:border-amber-500/30 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11A11.99 11.99 0 0 0 12 24Z"/>
                <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.26A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.26 5.39l4.01-3.11Z"/>
                <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.61l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z"/>
              </svg>
              Continuer avec Google
            </button>

            <button
              type="button"
              onClick={() => signIn("apple", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900 hover:text-amber-400 px-4 py-2.5 text-sm font-medium border border-zinc-700 hover:border-amber-500/30 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16.36 1.34c.14 1.06-.29 2.11-.94 2.87-.68.79-1.79 1.4-2.87 1.32-.16-1.03.33-2.1.96-2.83.7-.81 1.9-1.42 2.85-1.36Zm2.83 6.6c-1.58-.09-2.92.9-3.68.9-.77 0-1.94-.86-3.2-.84-1.65.03-3.17.96-4.02 2.44-1.72 2.98-.44 7.4 1.23 9.82.82 1.19 1.79 2.52 3.07 2.47 1.23-.05 1.7-.79 3.19-.79 1.49 0 1.91.79 3.21.77 1.33-.02 2.17-1.2 2.98-2.4.94-1.36 1.32-2.68 1.34-2.75-.03-.01-2.58-.99-2.6-3.93-.03-2.46 2.01-3.64 2.1-3.7-1.15-1.7-2.94-1.9-3.57-1.94l-.05-.05Z"/></svg>
              Continuer avec Apple
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
