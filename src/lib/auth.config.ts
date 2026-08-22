import type { NextAuthConfig } from "next-auth";

interface SessionUserWithAdmin {
  isAdmin?: boolean;
  identityVerified?: boolean;
}

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as SessionUserWithAdmin).isAdmin = Boolean(token.isAdmin);
        (session.user as SessionUserWithAdmin).identityVerified = Boolean(token.identityVerified);
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
