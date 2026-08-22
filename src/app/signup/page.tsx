"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AmbientParticles, AmbientHalo } from "../../components/genesis/AmbientBackground";
import { NeuralOrb } from "../../components/genesis/NeuralOrb";
import { PRIMARY_SOCIAL_PROVIDERS, SECONDARY_SOCIAL_PROVIDERS } from "../../components/auth/SocialProviders";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusiness, setIsBusiness] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [driversLicense, setDriversLicense] = useState<File | null>(null);
  const [healthInsuranceCard, setHealthInsuranceCard] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!acceptedTerms) {
      setError("Tu dois accepter les conditions générales et la politique de confidentialité");
      return;
    }

    if (!driversLicense || !healthInsuranceCard) {
      setError("Le permis de conduire et la carte d'assurance maladie sont requis (les documents expirés sont acceptés).");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("isBusiness", String(isBusiness));
    formData.append("companyName", companyName);
    formData.append("website", website);
    formData.append("acceptedTerms", String(acceptedTerms));
    formData.append("driversLicense", driversLicense);
    formData.append("healthInsuranceCard", healthInsuranceCard);

    const res = await fetch("/api/register", {
      method: "POST",
      body: formData,
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

            <div className="space-y-3 rounded-lg border border-amber-500/20 p-3">
              <p className="text-xs text-zinc-400">
                Vérification d&apos;identité requise (les documents expirés sont acceptés) :
              </p>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Permis de conduire</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setDriversLicense(e.target.files?.[0] ?? null)}
                  className="w-full rounded-lg bg-black/50 border border-zinc-700 p-2 text-xs text-white file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-black file:font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Carte d&apos;assurance maladie</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setHealthInsuranceCard(e.target.files?.[0] ?? null)}
                  className="w-full rounded-lg bg-black/50 border border-zinc-700 p-2 text-xs text-white file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-black file:font-medium"
                  required
                />
              </div>
            </div>

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

            {PRIMARY_SOCIAL_PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => signIn(p.id, { callbackUrl: "/dashboard" })}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900 hover:text-amber-400 px-4 py-2.5 text-sm font-medium border border-zinc-700 hover:border-amber-500/30 transition-colors"
              >
                {p.icon}
                Continuer avec {p.label}
              </button>
            ))}

            <div className="grid grid-cols-5 gap-2">
              {SECONDARY_SOCIAL_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => signIn(p.id, { callbackUrl: "/dashboard" })}
                  title={`Continuer avec ${p.label}`}
                  aria-label={`Continuer avec ${p.label}`}
                  className="flex items-center justify-center rounded-lg bg-zinc-900 p-2.5 border border-zinc-700 hover:border-amber-500/30 transition-colors"
                >
                  {p.icon}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
