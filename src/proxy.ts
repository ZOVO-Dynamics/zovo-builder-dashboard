import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/login",
  "/signup",
  "/gate",
  "/terms",
  "/privacy",
];

const PUBLIC_API_PREFIXES = [
  "/api/auth",
  "/api/register",
  "/api/webhooks",
  "/api/plans",
  "/api/gate",
];

const GATE_EXEMPT_PATHS = ["/gate",
  "/terms",
  "/privacy", "/api/gate"];

interface SessionUserWithAdmin {
  isAdmin?: boolean;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isGateExempt = GATE_EXEMPT_PATHS.some((p) => pathname.startsWith(p));

  if (!isGateExempt && process.env.SITE_GATE_PASSWORD) {
    const gateCookie = req.cookies.get("zovo_gate")?.value;
    if (gateCookie !== process.env.SITE_GATE_PASSWORD) {
      return Response.redirect(new URL("/gate", req.url));
    }
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  const isPublicApi = PUBLIC_API_PREFIXES.some(
    (prefix) => pathname.startsWith(prefix)
  );

  if (isPublicRoute || isPublicApi) {
    return;
  }

  if (!req.auth) {
    return Response.redirect(
      new URL("/login", req.url)
    );
  }

  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isAdminRoute && !(req.auth.user as SessionUserWithAdmin)?.isAdmin) {
    return Response.redirect(
      new URL("/dashboard", req.url)
    );
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
