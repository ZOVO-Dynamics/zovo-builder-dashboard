import Link from "next/link";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display" });
const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-body" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

const PIPELINE = [
  { n: "01", title: "Prompt", desc: "Decrivez ce que vous voulez construire, en une phrase." },
  { n: "02", title: "Analyse", desc: "L'IA identifie les fonctionnalites necessaires." },
  { n: "03", title: "Blueprint", desc: "ZOVO dessine la structure technique du projet." },
  { n: "04", title: "Generation", desc: "Chaque fichier est ecrit par l'IA, un par un." },
  { n: "05", title: "Validation", desc: "Le code est verifie et corrige automatiquement." },
  { n: "06", title: "Apercu", desc: "Votre application tourne en direct, dans le navigateur." },
  { n: "07", title: "Export", desc: "Telechargez le code en ZIP, pret a deployer." },
];

const FEATURES = [
  { tag: "AUTH", title: "Authentification incluse", desc: "Comptes utilisateurs et connexion securisee des la generation." },
  { tag: "STRIPE", title: "Abonnements integres", desc: "Paiements recurrents branches automatiquement." },
  { tag: "IA", title: "Multi-fournisseurs", desc: "Bascule automatiquement vers un autre modele si un fournisseur est indisponible." },
  { tag: "APERCU", title: "Instantane", desc: "Ouvrez votre application generee en un clic, sans installation." },
  { tag: "QA", title: "Validation automatique", desc: "Le code est teste et corrige avant de vous etre livre." },
  { tag: "EXPORT", title: "ZIP en un clic", desc: "Recuperez l'integralite du projet, pret a deployer ou vous voulez." },
];

const TESTIMONIALS = [
  { name: "Marc-Andre L.", role: "Fondateur, agence web", quote: "J'ai genere le squelette complet d'une app client en moins de dix minutes. Ce qui prenait une journee de setup prend maintenant le temps d'un cafe." },
  { name: "Sophie T.", role: "Developpeuse independante", quote: "L'authentification et les paiements sont deja branches quand le projet arrive. Je pars directement sur les fonctionnalites qui comptent." },
  { name: "Julien R.", role: "Product manager", quote: "L'apercu en direct m'a permis de valider une idee avec mon equipe avant meme d'ecrire une ligne de code." },
];

const FAQ = [
  { q: "Ai-je besoin de savoir coder pour utiliser ZOVO ?", a: "Non. Decrivez votre application en langage naturel, ZOVO s'occupe de l'architecture et du code. Une base technique aide si vous voulez personnaliser le resultat." },
  { q: "Que se passe-t-il si je n'ai pas d'abonnement actif ?", a: "Vous pouvez acheter des credits a la carte, sans engagement. Chaque generation consomme un credit, utilisable a votre rythme." },
  { q: "Puis-je exporter mon code et l'heberger ailleurs ?", a: "Oui. Chaque projet genere peut etre telecharge en ZIP, avec le code source complet, pret a deployer ou vous le souhaitez." },
  { q: "Mes donnees et mon code sont-ils prives ?", a: "Vos projets generes vous appartiennent. Ils sont accessibles uniquement depuis votre compte." },
  { q: "Que couvre la validation automatique ?", a: "Chaque projet est verifie (typage, dependances, structure) et corrige automatiquement en cas d'erreur detectee avant de vous etre livre." },
];

export default function LandingPage() {
  return (
    <div className={`${display.variable} ${body.variable} ${mono.variable} min-h-screen bg-[#0B1B33] text-[#EDF3FB]`} style={{ fontFamily: "var(--font-body)" }}>
      <style>{`
        .zovo-draw rect, .zovo-draw line, .zovo-draw circle {
          stroke-dasharray: 900;
          stroke-dashoffset: 900;
          animation: zovoDraw 1.8s ease forwards;
        }
        @keyframes zovoDraw { to { stroke-dashoffset: 0; } }
        .zovo-fill { opacity: 0; animation: zovoFadeIn .6s ease forwards; animation-delay: 1.6s; }
        @keyframes zovoFadeIn { to { opacity: 1; } }
        .zovo-grid {
          background-image: linear-gradient(#3E6FA822 1px, transparent 1px), linear-gradient(90deg, #3E6FA822 1px, transparent 1px);
          background-size: 32px 32px;
        }
      `}</style>

      <header className="sticky top-0 z-10 border-b border-[#3E6FA8]/30 bg-[#0B1B33]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span style={{ fontFamily: "var(--font-mono)" }} className="text-lg tracking-tight">ZOVO</span>
          <nav className="hidden gap-8 text-sm text-[#7C93B8] md:flex">
            <a href="#pipeline" className="hover:text-[#EDF3FB]">Comment ca marche</a>
            <a href="#fonctionnalites" className="hover:text-[#EDF3FB]">Fonctionnalites</a>
            <Link href="/pricing" className="hover:text-[#EDF3FB]">Tarifs</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-[#7C93B8] hover:text-[#EDF3FB]">Se connecter</Link>
            <Link href="/pricing" className="rounded-md bg-[#FF8A3D] px-4 py-2 text-sm font-medium text-[#0B1B33] hover:bg-[#FFA05C]">
              Commencer
            </Link>
          </div>
        </div>
      </header>

      <section className="zovo-grid relative overflow-hidden px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p style={{ fontFamily: "var(--font-mono)" }} className="text-xs uppercase tracking-widest text-[#FF8A3D]">
            De l&apos;idee a l&apos;application
          </p>
          <h1 style={{ fontFamily: "var(--font-display)" }} className="mt-4 max-w-2xl text-4xl font-bold leading-tight md:text-6xl">
            Decrivez votre application.<br />ZOVO la construit.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[#7C93B8]">
            Un prompt, une application complete : authentification, tableau de bord, base de donnees et paiements inclus. Testez-la en direct avant de l&apos;exporter.
          </p>
          <div className="mt-8 flex gap-4">
            <Link href="/pricing" className="rounded-md bg-[#FF8A3D] px-6 py-3 font-medium text-[#0B1B33] hover:bg-[#FFA05C]">
              Voir les plans
            </Link>
            <a href="#pipeline" className="rounded-md border border-[#3E6FA8] px-6 py-3 font-medium text-[#EDF3FB] hover:border-[#5CC8FF]">
              Voir comment ca marche
            </a>
          </div>

          <div className="mt-16 rounded-xl border border-[#3E6FA8]/50 bg-[#12294B] p-6">
            <div style={{ fontFamily: "var(--font-mono)" }} className="mb-4 text-sm text-[#5CC8FF]">
              $ zovo generate &quot;une app de gestion de clients avec authentification et facturation&quot;
            </div>
            <svg viewBox="0 0 640 380" className="zovo-draw w-full" fill="none" stroke="#5CC8FF" strokeWidth="1.5">
              <rect x="8" y="8" width="624" height="364" rx="10" />
              <line x1="8" y1="48" x2="632" y2="48" />
              <circle cx="30" cy="28" r="5" />
              <circle cx="48" cy="28" r="5" />
              <circle cx="66" cy="28" r="5" />
              <rect x="32" y="72" width="180" height="280" rx="6" />
              <rect x="228" y="72" width="380" height="120" rx="6" />
              <rect x="228" y="204" width="380" height="88" rx="6" />
              <rect x="472" y="308" width="136" height="34" rx="6" className="zovo-fill" fill="#FF8A3D" stroke="none" />
            </svg>
          </div>
        </div>
      </section>

      <section id="pipeline" className="border-t border-[#3E6FA8]/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-bold">Comment ca marche</h2>
          <p className="mt-4 max-w-2xl text-[#7C93B8]">Chaque generation traverse la meme chaine technique, du texte brut au projet deployable. Aucune etape n&apos;est sautee, aucune surprise a la sortie.</p>
          <div className="mt-12 grid gap-8 md:grid-cols-7">
            {PIPELINE.map((step) => (
              <div key={step.n} className="border-t-2 border-[#3E6FA8] pt-4">
                <span style={{ fontFamily: "var(--font-mono)" }} className="text-sm text-[#FF8A3D]">{step.n}</span>
                <h3 className="mt-2 font-medium">{step.title}</h3>
                <p className="mt-1 text-sm text-[#7C93B8]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="border-t border-[#3E6FA8]/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-bold">Fonctionnalites</h2>
          <p className="mt-4 max-w-2xl text-[#7C93B8]">Tout ce qu&apos;une application moderne exige d&apos;habitude en semaines de configuration est present des la premiere generation.</p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.tag} className="rounded-lg border border-[#3E6FA8]/40 bg-[#12294B] p-6">
                <span style={{ fontFamily: "var(--font-mono)" }} className="text-xs text-[#5CC8FF]">{f.tag}</span>
                <h3 className="mt-2 font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-[#7C93B8]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#3E6FA8]/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-bold">A quoi ca ressemble</h2>
          <p className="mt-4 max-w-2xl text-[#7C93B8]">Le tableau de bord ou vous suivez vos generations, votre solde et vos projets en un coup d&apos;oeil.</p>

          <div className="mt-10 rounded-xl border border-[#3E6FA8]/50 bg-[#12294B] p-6">
            <svg viewBox="0 0 640 340" className="w-full" fill="none" stroke="#5CC8FF" strokeWidth="1.5">
              <rect x="8" y="8" width="624" height="324" rx="10" />
              <rect x="24" y="24" width="140" height="292" rx="6" />
              <line x1="24" y1="64" x2="164" y2="64" />
              <rect x="40" y="80" width="108" height="10" rx="2" fill="#3E6FA8" stroke="none" />
              <rect x="40" y="104" width="108" height="10" rx="2" fill="#3E6FA855" stroke="none" />
              <rect x="40" y="128" width="108" height="10" rx="2" fill="#3E6FA855" stroke="none" />
              <rect x="184" y="24" width="432" height="80" rx="6" />
              <rect x="200" y="44" width="140" height="12" rx="2" fill="#FF8A3D" stroke="none" />
              <rect x="200" y="66" width="90" height="10" rx="2" fill="#7C93B8" stroke="none" />
              <rect x="184" y="116" width="208" height="200" rx="6" />
              <rect x="404" y="116" width="212" height="200" rx="6" />
              <rect x="200" y="140" width="176" height="10" rx="2" fill="#5CC8FF55" stroke="none" />
              <rect x="200" y="160" width="120" height="10" rx="2" fill="#5CC8FF33" stroke="none" />
              <rect x="420" y="140" width="180" height="10" rx="2" fill="#5CC8FF55" stroke="none" />
              <rect x="420" y="160" width="130" height="10" rx="2" fill="#5CC8FF33" stroke="none" />
            </svg>
          </div>
        </div>
      </section>

      <section className="border-t border-[#3E6FA8]/30 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-bold">Ce qu&apos;on en dit</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-lg border border-[#3E6FA8]/40 bg-[#12294B] p-6">
                <p className="text-sm text-[#EDF3FB]">&quot;{t.quote}&quot;</p>
                <p style={{ fontFamily: "var(--font-mono)" }} className="mt-4 text-xs text-[#5CC8FF]">{t.name}</p>
                <p className="text-xs text-[#7C93B8]">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#3E6FA8]/30 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-bold">Questions frequentes</h2>
          <div className="mt-10 space-y-6">
            {FAQ.map((item) => (
              <div key={item.q} className="border-b border-[#3E6FA8]/30 pb-6">
                <h3 className="font-medium text-[#EDF3FB]">{item.q}</h3>
                <p className="mt-2 text-sm text-[#7C93B8]">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tarifs" className="border-t border-[#3E6FA8]/30 px-6 py-20">
        <div className="mx-auto max-w-6xl text-center">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-bold">Tarifs</h2>
          <p className="mt-4 text-[#7C93B8]">Des plans Weekly et Monthly Pro avec des generations illimitees selon votre rythme.</p>
          <Link href="/pricing" className="mt-8 inline-block rounded-md bg-[#FF8A3D] px-8 py-3 font-medium text-[#0B1B33] hover:bg-[#FFA05C]">
            Voir les plans et tarifs
          </Link>
        </div>
      </section>

      <section className="border-t border-[#3E6FA8]/30 px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 style={{ fontFamily: "var(--font-display)" }} className="text-3xl font-bold">Votre prochaine application commence par une phrase</h2>
          <Link href="/pricing" className="mt-8 inline-block rounded-md bg-[#FF8A3D] px-8 py-3 font-medium text-[#0B1B33] hover:bg-[#FFA05C]">
            Voir les plans
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#3E6FA8]/30 px-6 py-8">
        <div style={{ fontFamily: "var(--font-mono)" }} className="mx-auto flex max-w-6xl items-center justify-between text-xs text-[#7C93B8]">
          <span>ZOVO</span>
          <span>&copy; 2026</span>
        </div>
      </footer>
    </div>
  );
}
