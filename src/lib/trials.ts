/**
 * Trial por convite — pacote fechado de crédito, não assinatura.
 *
 * O convite grava em users: trialPlan (role emprestado), trialPreviousRole (o
 * role para onde voltar), trialStartedAt/trialEndsAt e trialCredits (memoriais
 * do pacote). Quando vence, o usuário volta ao role anterior.
 *
 * Roda em DOIS lugares de propósito: no cron /api/jobs/trials e no callback jwt
 * de auth.ts. Se o cron falhar, ninguém segue em plano pago de graça.
 */
import { db, users } from "@/src/db";
import { and, eq, isNotNull, lte } from "drizzle-orm";

export async function grantTrial(input: {
  userId: number;
  plan: string;
  days: number;
  credits: number;
}): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!user) throw new Error(`Usuário ${input.userId} não encontrado`);

  // Não rebaixa quem já paga: trial nunca pode piorar o acesso de um assinante.
  if (user.role !== "free") return;

  const now = new Date();
  const ends = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);

  await db
    .update(users)
    .set({
      role: input.plan,
      trialPlan: input.plan,
      trialPreviousRole: user.role,
      trialStartedAt: now,
      trialEndsAt: ends,
      trialCredits: input.credits,
    })
    .where(eq(users.id, input.userId));
}

/** Rebaixa um usuário cujo trial venceu. Idempotente. */
export async function expireTrialIfDue(userId: number): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.trialPlan || !user.trialEndsAt) return false;
  if (user.trialEndsAt.getTime() > Date.now()) return false;

  await db
    .update(users)
    .set({
      role: user.trialPreviousRole ?? "free",
      trialPlan: null,
      trialPreviousRole: null,
      trialStartedAt: null,
      trialEndsAt: null,
      trialCredits: null,
    })
    .where(eq(users.id, userId));
  return true;
}

/** Varredura em lote — usada pelo cron diário. Retorna quantos expiraram. */
export async function expireDueTrials(): Promise<number> {
  const due = await db
    .select({ id: users.id })
    .from(users)
    .where(and(isNotNull(users.trialPlan), lte(users.trialEndsAt, new Date())));

  let n = 0;
  for (const { id } of due) {
    if (await expireTrialIfDue(id)) n++;
  }
  return n;
}
