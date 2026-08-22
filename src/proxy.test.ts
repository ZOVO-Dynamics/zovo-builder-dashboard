import { describe, it, expect, vi } from "vitest";

/**
 * Le middleware (proxy.ts) est la seule barriere qui empeche un utilisateur
 * non verifie d'atteindre les pages/API protegees, quelle que soit sa
 * methode de connexion (OAuth Google/GitHub/etc. ou identifiants). On mocke
 * NextAuth pour isoler la logique de routage (gate mot de passe, gate
 * marketplace, gate identite, gate admin) du mecanisme de session reel.
 */
vi.mock("next-auth", () => ({
  default: (config: unknown) => ({
    auth: (handler: (req: unknown) => unknown) => handler,
  }),
}));

function makeRequest(pathname: string, authUser: Record<string, unknown> | null, cookies: Record<string, string> = {}) {
  return {
    nextUrl: { pathname },
    url: `https://app.example.com${pathname}`,
    cookies: { get: (name: string) => (cookies[name] !== undefined ? { value: cookies[name] } : undefined) },
    auth: authUser ? { user: authUser } : null,
  };
}

function locationOf(response: unknown): string | null {
  if (!response) return null;
  const res = response as Response;
  return res.headers?.get ? res.headers.get("location") : (res as unknown as { url?: string }).url ?? null;
}

describe("proxy (middleware) - gate de verification d'identite", () => {
  it("utilisateur OAuth fraichement inscrit (aucune verification, non grand-pere) -> redirige vers /complete-profile", async () => {
    delete process.env.SITE_GATE_PASSWORD;
    delete process.env.MARKETPLACE_GATE_PASSWORD;
    const { default: proxy } = await import("./proxy");

    const req = makeRequest("/dashboard", { id: "u1", identityVerified: false });
    const res = await proxy(req as never, {} as never);

    expect(locationOf(res)).toContain("/complete-profile");
  });

  it("utilisateur non authentifie -> redirige vers /login, jamais directement laisse passer", async () => {
    const { default: proxy } = await import("./proxy");
    const req = makeRequest("/dashboard", null);
    const res = await proxy(req as never, {} as never);

    expect(locationOf(res)).toContain("/login");
  });

  it("utilisateur verifie (identityVerified true) -> aucun redirect, acces autorise", async () => {
    const { default: proxy } = await import("./proxy");
    const req = makeRequest("/dashboard", { id: "u1", identityVerified: true });
    const res = await proxy(req as never, {} as never);

    expect(res).toBeUndefined();
  });

  it("route exemptee (/complete-profile) reste accessible meme sans verification, pour ne pas bloquer le flux lui-meme", async () => {
    const { default: proxy } = await import("./proxy");
    const req = makeRequest("/complete-profile", { id: "u1", identityVerified: false });
    const res = await proxy(req as never, {} as never);

    expect(res).toBeUndefined();
  });

  it("API d'upload de document (/api/identity-documents) reste exemptee du gate identite", async () => {
    const { default: proxy } = await import("./proxy");
    const req = makeRequest("/api/identity-documents", { id: "u1", identityVerified: false });
    const res = await proxy(req as never, {} as never);

    expect(res).toBeUndefined();
  });

  it("utilisateur non verifie tentant d'acceder a une route admin -> bloque par le gate identite avant meme le gate admin", async () => {
    const { default: proxy } = await import("./proxy");
    const req = makeRequest("/admin", { id: "u1", identityVerified: false, isAdmin: true });
    const res = await proxy(req as never, {} as never);

    expect(locationOf(res)).toContain("/complete-profile");
  });

  it("utilisateur verifie mais non admin tentant d'acceder a /admin -> redirige vers /dashboard", async () => {
    const { default: proxy } = await import("./proxy");
    const req = makeRequest("/admin", { id: "u1", identityVerified: true, isAdmin: false });
    const res = await proxy(req as never, {} as never);

    expect(locationOf(res)).toContain("/dashboard");
  });

  it("routes publiques (/, /login, /signup, /changelog) restent accessibles sans session", async () => {
    const { default: proxy } = await import("./proxy");
    for (const pathname of ["/", "/login", "/signup", "/changelog", "/pricing"]) {
      const req = makeRequest(pathname, null);
      const res = await proxy(req as never, {} as never);
      expect(res, `pathname=${pathname}`).toBeUndefined();
    }
  });

  it("champ identityVerified absent du token (undefined) -> traite comme non verifie (fail closed)", async () => {
    const { default: proxy } = await import("./proxy");
    const req = makeRequest("/dashboard", { id: "u1" });
    const res = await proxy(req as never, {} as never);

    expect(locationOf(res)).toContain("/complete-profile");
  });
});
