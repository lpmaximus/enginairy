import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db, users } from "@/src/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { expireTrialIfDue } from "@/src/lib/trials";
import { track } from "@/src/lib/activity";
import { isInternalTestEmail } from "@/src/lib/internalTest";

/** Conta impedida de logar: suspensa, banida ou em processo de exclusão. */
function isLoginBlocked(u: { status?: string | null; deletionScheduledAt?: Date | null }): boolean {
  return u.status === "blocked" || u.status === "banned" || Boolean(u.deletionScheduledAt);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;
        if (isLoginBlocked(user)) return null;
        return { id: String(user.id), email: user.email, name: user.name, role: user.role };
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const [existing] = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email!))
          .limit(1);

        if (!existing) {
          await db.insert(users).values({
            email: user.email!,
            name: user.name ?? null,
            image: user.image ?? null,
            provider: "google",
            providerId: user.id,
            role: "free",
          });
        } else if (isLoginBlocked(existing)) {
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user || trigger === "update") {
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, token.email!))
          .limit(1);
        if (dbUser) {
          token.id = String(dbUser.id);
          token.isInternalTester = isInternalTestEmail(dbUser.email);
          if (user) void track(dbUser.id, "login");
          // Trial vencido rebaixa aqui também, não só no cron: garante que
          // ninguém siga em plano pago se /api/jobs/trials falhar.
          if (dbUser.trialPlan && dbUser.trialEndsAt && dbUser.trialEndsAt.getTime() <= Date.now()) {
            await expireTrialIfDue(dbUser.id);
            token.role = dbUser.trialPreviousRole ?? "free";
          } else {
            token.role = dbUser.role;
          }
        }
      }
      return token;
    },
  },
});
