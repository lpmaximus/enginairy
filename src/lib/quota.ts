/**
 * Cota de emissão de memoriais (ADR-ENG-003).
 *
 * Limites públicos por tier — o usuário sabe o que compra:
 *   Free 2 · Pro 30 · Escritório 100 · Enterprise 500 por ciclo.
 *
 * Janela de contagem:
 *  - Trial por convite com cota própria (users.trialCredits != null): a janela
 *    é o TRIAL INTEIRO (desde trialStartedAt) e o limite é o do convite. É um
 *    pacote fechado de créditos, não reseta no aniversário da conta.
 *  - Plano pago (assinatura ativa): o ciclo da assinatura
 *    (subscriptions.currentPeriodStart).
 *  - Free (sem assinatura): aniversário mensal da conta (users.createdAt
 *    projetado no mês corrente) — evita reset em massa no dia 1º e é justo com
 *    quem entra no fim do mês.
 *
 * Conta só jobs de emissão na janela que NÃO estejam 'failed'. Recalcular o
 * mesmo projeto sem emitir documento NÃO consome cota: o que custa e o que se
 * vende é o memorial emitido.
 */
import { db, processingJobs, users, subscriptions } from "@/src/db";
import { and, eq, gte, ne, sql, desc } from "drizzle-orm";

export const FREE_MONTHLY_LIMIT = 2;
export const PRO_MONTHLY_LIMIT = 30;
export const ESCRITORIO_MONTHLY_LIMIT = 100;
export const ENTERPRISE_MONTHLY_LIMIT = 500;
export const ADMIN_MONTHLY_LIMIT = 5000; // teto anti-abuso; admin não trava na prática

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing"]);

export function monthlyLimitForRole(role?: string): number {
  if (role === "admin") return ADMIN_MONTHLY_LIMIT;
  if (role === "enterprise") return ENTERPRISE_MONTHLY_LIMIT;
  if (role === "escritorio") return ESCRITORIO_MONTHLY_LIMIT;
  if (role === "pro") return PRO_MONTHLY_LIMIT;
  return FREE_MONTHLY_LIMIT;
}

/**
 * Aniversário mensal da conta: a ocorrência mais recente do dia de `createdAt`
 * em/antes de `now` (UTC). Meses curtos são "clampados" (conta criada dia 31 →
 * dia 28/30 nos meses sem dia 31).
 */
export function monthlyAnniversaryStart(createdAt: Date, now: Date = new Date()): Date {
  const day = createdAt.getUTCDate();
  const h = createdAt.getUTCHours();
  const m = createdAt.getUTCMinutes();
  const s = createdAt.getUTCSeconds();

  const clampDay = (y: number, mo: number, d: number) =>
    Math.min(d, new Date(Date.UTC(y, mo + 1, 0)).getUTCDate());

  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  let candidate = new Date(Date.UTC(year, month, clampDay(year, month, day), h, m, s));

  if (candidate.getTime() > now.getTime()) {
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    candidate = new Date(Date.UTC(year, month, clampDay(year, month, day), h, m, s));
  }
  return candidate;
}

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  windowStart: Date;
  source: "trial" | "subscription" | "anniversary";
}

/** Situação de cota do usuário. Chamada autoritativa antes de criar o job. */
export async function getQuotaStatus(userId: number): Promise<QuotaStatus> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error(`Usuário ${userId} não encontrado`);

  let windowStart: Date;
  let limit: number;
  let source: QuotaStatus["source"];

  const trialAtivo =
    user.trialCredits != null &&
    user.trialStartedAt != null &&
    (!user.trialEndsAt || user.trialEndsAt.getTime() > Date.now());

  if (trialAtivo) {
    windowStart = user.trialStartedAt!;
    limit = user.trialCredits!;
    source = "trial";
  } else {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (sub && ACTIVE_SUB_STATUSES.has(sub.status) && sub.currentPeriodStart) {
      windowStart = sub.currentPeriodStart;
      limit = monthlyLimitForRole(user.role);
      source = "subscription";
    } else {
      windowStart = monthlyAnniversaryStart(user.createdAt);
      limit = monthlyLimitForRole(user.role);
      source = "anniversary";
    }
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(processingJobs)
    .where(
      and(
        eq(processingJobs.userId, userId),
        eq(processingJobs.kind, "memorial"),
        ne(processingJobs.status, "failed"),
        gte(processingJobs.createdAt, windowStart),
      ),
    );

  const used = row?.count ?? 0;
  return { used, limit, remaining: Math.max(0, limit - used), windowStart, source };
}

/** Lança se não houver cota. Chamar SEMPRE antes de criar o job de emissão. */
export async function assertQuota(userId: number): Promise<QuotaStatus> {
  const status = await getQuotaStatus(userId);
  if (status.remaining <= 0) {
    throw new QuotaExceededError(status);
  }
  return status;
}

export class QuotaExceededError extends Error {
  constructor(public status: QuotaStatus) {
    super(
      `Cota de memoriais esgotada (${status.used}/${status.limit} no ciclo atual).`,
    );
    this.name = "QuotaExceededError";
  }
}
