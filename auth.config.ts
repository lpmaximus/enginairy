import type { NextAuthConfig } from "next-auth";

/**
 * Config "edge-safe" — SEM imports de banco (Neon/Drizzle).
 *
 * Usada pelo proxy.ts (Edge Runtime), onde qualquer módulo que abra conexão
 * com o Postgres no topo do arquivo quebra com "No database connection string
 * was provided to neon()". A config completa (provider Credentials + callbacks
 * que tocam o banco) fica em auth.ts, que estende esta apenas no runtime Node.
 */
export const authConfig: NextAuthConfig = {
  providers: [],

  session: { strategy: "jwt" },

  callbacks: {
    async session({ session, token }) {
      if (token) {
        const u = session.user as unknown as { id: string; role: string };
        u.id = token.id as string;
        u.role = token.role as string;
        session.user.isInternalTester = token.isInternalTester === true;
      }
      return session;
    },
  },

  pages: {
    signIn: "/entrar",
    signOut: "/",
    error: "/entrar",
  },
};
