import fs from "fs";
import path from "path";
import { BuildBlueprint } from "./BlueprintGenerator";
import { ProjectBlueprint } from "./PromptAnalyzer";

const GENERATED_ROOT = "/home/ubuntu/zovo-generated-projects";
const AI_BRIDGE_URL = process.env.AI_BRIDGE_URL || "https://ai.zovo.ca/api/generate";

const FIXED_FILES = new Set([
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  "src/app/layout.tsx",
  "src/components/AuthProvider.tsx",
  "src/components/LoginForm.tsx",
  "src/components/SignupForm.tsx",
]);

async function generateFileContent(
  file: string,
  blueprint: BuildBlueprint,
  originalPrompt: string
): Promise<{ content: string; usedFallback: boolean }> {
  const avatarRule = blueprint.components.includes("AvatarUpload")
    ? `\n- Le composant src/components/AvatarUpload.tsx doit accepter EXACTEMENT ces props, ni plus ni moins : { userId: string; currentAvatarUrl?: string | null; onUploadSuccess?: (url: string) => void }. Tout fichier qui utilise <AvatarUpload /> doit lui passer EXACTEMENT ces props, avec ces noms exacts. Le champ avatar de l'utilisateur s'appelle TOUJOURS "avatar" (jamais "avatarUrl" ni "avatarURL") ; importe son type ainsi : import { useAuth, type User } from "@/components/AuthProvider"; puis utilise user.avatar (jamais user.avatarUrl).`
    : "";

  const roleRule = blueprint.components.includes("AdminPanel") || blueprint.components.includes("UserTable")
    ? `\n- Le rôle de l'utilisateur (admin ou non) s'appelle TOUJOURS user.role (jamais user.isAdmin ni user.userRole) ; il fait partie du type User exporté par "@/components/AuthProvider" (import { useAuth, type User } from "@/components/AuthProvider").`
    : "";

  const stripeRule = blueprint.components.includes("CheckoutForm") || blueprint.components.includes("PricingTable")
    ? `\n- Pour Stripe, n'utilise QUE les packages "stripe" (côté serveur) et "@stripe/stripe-js" (côté client) s'ils sont dans la liste de dépendances ci-dessus ; n'importe JAMAIS "@stripe/react-stripe-js" ni aucun autre package Stripe sauf s'il apparaît explicitement dans cette liste. N'instancie JAMAIS toi-même "new Stripe(...)" dans un fichier autre que src/lib/stripe.ts (déjà responsable de la configuration Stripe) : dans TOUT AUTRE fichier serveur qui a besoin du client Stripe, importe-le ainsi : import { stripe } from "@/lib/stripe"; N'ajoute JAMAIS d'option apiVersion nulle part (laisse la valeur par défaut du SDK, pour éviter une incompatibilité de version). Pour rediriger vers le paiement, crée une session de paiement côté serveur (route API qui retourne { url }) puis redirige le navigateur avec window.location.href = url ; n'utilise JAMAIS stripe.redirectToCheckout (méthode obsolète, supprimée dans les versions récentes de @stripe/stripe-js).`
    : "";

  const searchRule = blueprint.components.includes("SearchBar") || blueprint.components.includes("SearchResults")
    ? `\n- Le composant src/components/SearchBar.tsx doit accepter EXACTEMENT ces props : { onSearch: (query: string) => void }, et appeler onSearch à chaque changement (ou à la soumission) sans gérer lui-même l'affichage des résultats. Le composant src/components/SearchResults.tsx doit accepter EXACTEMENT ces props : { query: string }, et effectuer lui-même la recherche (fetch vers une route API) en fonction de cette query, exactement comme ItemList.tsx récupère ses données lui-même. Tout fichier qui utilise ces composants doit leur passer EXACTEMENT ces props, avec ces noms exacts.`
    : "";

  const codePrompt = `Tu es ZOVO Builder AI. Génère UNIQUEMENT le code du fichier "${file}" pour un projet Next.js/TypeScript.

Contexte du projet :
- Demande originale : ${originalPrompt}
- Nom du projet : ${blueprint.name}
- Composants prévus : ${blueprint.components.join(", ") || "aucun"}
- Routes prévues : ${blueprint.routes.join(", ")}
- Dépendances : ${blueprint.dependencies.join(", ")}

Règles strictes :
- Retourne UNIQUEMENT le code source du fichier, sans markdown, sans backticks, sans explication.
- Le code doit être valide, complet et cohérent avec le rôle du fichier "${file}".
- N'invente pas d'imports vers des fichiers qui n'existent pas dans ce projet.
- N'utilise QUE les packages npm suivants (en plus de next/react/typescript déjà fournis) : ${blueprint.dependencies.join(", ") || "aucun package supplémentaire"}. N'importe JAMAIS un autre package externe (pas de axios, next-auth, jsonwebtoken, nookies, react-hook-form, zod, etc. sauf s'ils apparaissent explicitement dans cette liste). Utilise fetch natif, useState/useContext, et les API natives du navigateur/Node à la place.
- Si ce projet a de l'authentification (fichiers src/components/AuthProvider.tsx, LoginForm.tsx ou SignupForm.tsx présents dans le projet), ces 3 fichiers existent déjà et sont FIXES : n'en crée jamais de nouvelle version, n'importe JAMAIS de fichier situé à un autre chemin comme "../context/auth" ou "../contexts/AuthContext". Pour accéder à l'utilisateur connecté ou aux fonctions login/signup/logout, importe TOUJOURS exactement : import { useAuth } from "@/components/AuthProvider"; puis utilise const { user, loading, login, signup, logout } = useAuth();
- Si ce fichier est une route API (chemin contenant "app/api" et nommé "route.ts"), utilise EXCLUSIVEMENT la syntaxe App Router de Next.js : export async function GET(request: Request) / POST(request: Request) / etc., et retourne toujours NextResponse.json(...). N'utilise JAMAIS NextApiRequest ni NextApiResponse (ancien Pages Router), ni req.method/req.url sur l'objet request.
- Si ce fichier a besoin de vérifier la session de l'utilisateur côté serveur (route API protégée), n'utilise JAMAIS de service d'authentification tiers (next-auth, getServerSession, Clerk, @clerk/nextjs, Auth0, Supabase Auth, Firebase Auth, etc. — aucun n'est configuré dans ce projet, aucune route "/api/auth/[...nextauth]" n'existe) : lis directement le cookie de session avec l'API cookies() de "next/headers", qui est ASYNCHRONE dans cette version de Next.js et DOIT toujours être awaited : const cookieStore = await cookies(); const sessionToken = cookieStore.get("sessionToken")?.value; Utilise ensuite ce token pour retrouver l'utilisateur (via la base de données si Prisma est disponible), exactement comme le fait déjà src/lib/auth.ts pour la vérification côté client.
- Si ce fichier est prisma/schema.prisma et contient une relation entre deux modèles (ex: un champ de type Modele[] ou Modele?), déclare TOUJOURS le champ de relation opposé correspondant sur l'AUTRE modèle (avec @relation si plusieurs relations existent entre les deux mêmes modèles), sinon la validation du schéma échoue.
- Pour la navigation programmatique, importe TOUJOURS useRouter/usePathname/useSearchParams depuis "next/navigation" (App Router). N'importe JAMAIS depuis "next/router" (ancien Pages Router, incompatible).
- N'utilise JAMAIS directement les globals navigateur FileList, File, ou Blob dans un schéma de validation (ex: zod) évalué au niveau module, car ils causent un crash au prerendering serveur. Si nécessaire, garde-les avec typeof avant utilisation, ou valide côté client uniquement dans un handler d'événement.
- Si tu utilises react-hook-form avec zodResolver (ex: pour un formulaire), et que le schéma zod a un champ avec .optional() ou .default(...), type TOUJOURS useForm avec z.input<typeof leSchema> (jamais z.infer ni z.output), sinon le type attendu par zodResolver ne correspondra pas au type du formulaire et provoquera une erreur de type. Exemple : const form = useForm<z.input<typeof itemSchema>>({ resolver: zodResolver(itemSchema), ... });${avatarRule}${roleRule}${stripeRule}${searchRule}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180000);

  try {
    const response = await fetch(AI_BRIDGE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: codePrompt }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AI bridge error: ${response.status}`);
    }

    const data = await response.json();
    let content: string = typeof data.response === "string" ? data.response : "";

    content = content.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "").trim();

    if (!content) {
      throw new Error("Contenu vide retourné par l'IA");
    }

    return { content: content + "\n", usedFallback: false };
  } catch (err) {
    clearTimeout(timeoutId);
    const errName = err instanceof Error ? err.name : typeof err;
    const errMessage = err instanceof Error ? err.message : String(err);
    console.warn(`[ProjectWriter] Fallback placeholder pour ${file} | type=${errName} | message=${errMessage}`);
    return { content: fallbackContent(file, blueprint), usedFallback: true };
  }
}

function fallbackContent(file: string, blueprint: BuildBlueprint): string {
  if (file === "package.json") {
    return JSON.stringify({
      name: blueprint.name,
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: blueprint.dependencies.includes("prisma") ? "prisma generate && next build" : "next build",
        start: "next start"
      },
      dependencies: Object.fromEntries(
        blueprint.dependencies.map((dep) => [
          dep,
          dep === "typescript"
            ? "^5.7.0"
            : dep === "next"
              ? "^16.1.0"
              : dep === "prisma" || dep === "@prisma/client"
                ? "^5.20.0"
                : "latest",
        ])
      )
    }, null, 2);
  }
  if (file === "tsconfig.json") {
    return JSON.stringify({
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: true,
        skipLibCheck: true,
        strict: false,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "preserve",
        incremental: true,
        paths: { "@/*": ["./src/*"] }
      },
      include: ["**/*.ts", "**/*.tsx"],
      exclude: ["node_modules"]
    }, null, 2);
  }
  if (file === "next.config.ts") {
    return `import type { NextConfig } from "next";\n\nconst nextConfig: NextConfig = {};\n\nexport default nextConfig;\n`;
  }
  if (file === "README.md") {
    return `# ${blueprint.name}\n\nProjet généré automatiquement par ZOVO Builder.\n\n## Composants\n${blueprint.components.map(c => `- ${c}`).join("\n")}\n\n## Routes\n${blueprint.routes.map(r => `- ${r}`).join("\n")}\n`;
  }
  if (file === "src/app/layout.tsx") {
    const hasAuth = blueprint.components.includes("AuthProvider");
    const bodyContent = hasAuth
      ? '<AuthProvider>{children}</AuthProvider>'
      : '{children}';
    const authImport = hasAuth
      ? 'import { AuthProvider } from "@/components/AuthProvider";\n'
      : '';
    return `import type { Metadata } from "next";\nimport type { ReactNode } from "react";\n${authImport}\nexport const metadata: Metadata = {\n  title: "${blueprint.name}",\n  description: "Application générée par ZOVO Builder",\n};\n\nexport default function RootLayout({\n  children,\n}: {\n  children: ReactNode;\n}) {\n  return (\n    <html lang="fr">\n      <body>${bodyContent}</body>\n    </html>\n  );\n}\n`;
  }
  if (file === "src/components/AuthProvider.tsx") {
    const hasAvatar = blueprint.components.includes("AvatarUpload") || blueprint.components.includes("ProfileForm");
    const hasRole = blueprint.components.includes("AdminPanel") || blueprint.components.includes("UserTable");
    return `"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface User {
  id: string;
  email: string;
  name: string;${hasAvatar ? "\n  avatar: string | null;" : ""}${hasRole ? "\n  role: string;" : ""}
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/check", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Login failed");
      }
      const data = await res.json();
      setUser(data.user);
      await router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function signup(name: string, email: string, password: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Signup failed");
      }
      const data = await res.json();
      setUser(data.user);
      await router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    setUser(null);
    await router.push("/");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
`;
  }
  if (file === "src/components/LoginForm.tsx") {
    return `"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

export default function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Connexion</h2>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full rounded border px-3 py-2"
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="w-full rounded border px-3 py-2"
      />
      <button type="submit" disabled={submitting} className="w-full rounded bg-black text-white py-2">
        {submitting ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
`;
  }
  if (file === "src/components/SignupForm.tsx") {
    return `"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

export default function SignupForm() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'inscription");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Inscription</h2>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <input
        type="text"
        placeholder="Nom"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="w-full rounded border px-3 py-2"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full rounded border px-3 py-2"
      />
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="w-full rounded border px-3 py-2"
      />
      <button type="submit" disabled={submitting} className="w-full rounded bg-black text-white py-2">
        {submitting ? "Inscription..." : "S'inscrire"}
      </button>
    </form>
  );
}
`;
  }
  if (file.endsWith(".tsx")) {
    return `// Fichier généré automatiquement par ZOVO Builder (fallback)\nexport default function Component() {\n  return <div>${file}</div>;\n}\n`;
  }
  return `// Généré automatiquement pour ${blueprint.name}\n`;
}

export class ProjectWriter {

  async write(
    blueprint: BuildBlueprint,
    projectBlueprint?: ProjectBlueprint,
    originalPrompt?: string,
    onProgress?: (current: number, total: number, file?: string) => Promise<void> | void
  ): Promise<{ projectPath: string; filesCreated: string[]; fallbackFiles: string[] }> {
    const timestamp = Date.now();
    const projectDir = path.join(GENERATED_ROOT, `${blueprint.name}-${timestamp}`);

    fs.mkdirSync(projectDir, { recursive: true });

    for (const folder of blueprint.folders) {
      fs.mkdirSync(path.join(projectDir, folder), { recursive: true });
    }

    const filesCreated: string[] = [];
    const fallbackFiles: string[] = [];
    const prompt = originalPrompt || blueprint.name;

    for (const file of blueprint.files) {
      const filePath = path.join(projectDir, file);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      let content: string;
      if (FIXED_FILES.has(file)) {
        content = fallbackContent(file, blueprint);
      } else {
        const result = await generateFileContent(file, blueprint, prompt);
        content = result.content;
        if (result.usedFallback) {
          fallbackFiles.push(file);
        }
      }

      fs.writeFileSync(filePath, content, "utf-8");
      filesCreated.push(file);

      if (onProgress) {
        await onProgress(filesCreated.length, blueprint.files.length, file);
      }
    }

    if (fallbackFiles.length > 0) {
      console.warn(`[ProjectWriter] Génération dégradée pour ${blueprint.name} : ${fallbackFiles.length}/${filesCreated.length} fichier(s) en fallback -> ${fallbackFiles.join(", ")}`);
    }

    return { projectPath: projectDir, filesCreated, fallbackFiles };
  }
}

const projectwriterInstance = new ProjectWriter();
export default projectwriterInstance;
