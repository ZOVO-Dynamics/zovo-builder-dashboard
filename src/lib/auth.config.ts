import type { NextAuthConfig } from "next-auth";

interface SessionUserWithAdmin {
  isAdmin?: boolean;
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
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
