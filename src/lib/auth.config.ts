import type { NextAuthConfig } from "next-auth";

/**
 * This config must stay edge-safe: no database driver, no bcrypt.
 * It's consumed directly by middleware.ts for route protection, and
 * spread into the full config in auth.ts (which adds the Credentials
 * provider and the Drizzle adapter) for everything else.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtectedRoute = nextUrl.pathname.startsWith("/dashboard");

      if (isProtectedRoute) {
        return isLoggedIn;
      }

      if (isLoggedIn && ["/login", "/signup"].includes(nextUrl.pathname)) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
