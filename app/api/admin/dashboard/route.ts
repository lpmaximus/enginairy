/**
 * GET /api/admin/dashboard — visão geral do mês corrente.
 *
 * Um payload só para a home do painel: cada card daqui abre um módulo que
 * refaz a consulta com detalhe. Duplicar número é aceitável; fazer a home
 * disparar cinco requisições não é.
 *
 * Auth por x-admin-password (src/lib/adminAuth).
 */
import { NextRequest, NextResponse } from "next/server";
import {
  db,
  users,
  projects,
  documents,
  subscriptions,
  processingJobs,
  organizations,
} from "@/src/db";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { isAdminRequest } from "@/src/lib/adminAuth";
import { computeMrr, MEMORIAL_COST, FIXED_INFRA_COST } from "@/src/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Primeiro instante do mês corrente, em UTC. */
function monthStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const since = monthStart();
  const count = sql<number>`count(*)::int`;

  const [
    [totalUsers],
    [newUsers],
    [blockedUsers],
    [totalProjects],
    [issuedProjects],
    [totalDocs],
    [docsThisMonth],
    [failedJobs],
    [queuedJobs],
    [orgs],
    roleRows,
    planRows,
    [pastDue],
  ] = await Promise.all([
    db.select({ n: count }).from(users),
    db.select({ n: count }).from(users).where(gte(users.createdAt, since)),
    db.select({ n: count }).from(users).where(inArray(users.status, ["blocked", "banned"])),
    db.select({ n: count }).from(projects),
    db.select({ n: count }).from(projects).where(eq(projects.status, "issued")),
    db.select({ n: count }).from(documents),
    db.select({ n: count }).from(documents).where(gte(documents.createdAt, since)),
    db.select({ n: count }).from(processingJobs).where(eq(processingJobs.status, "failed")),
    db.select({ n: count }).from(processingJobs).where(eq(processingJobs.status, "queued")),
    db.select({ n: count }).from(organizations),
    db.select({ role: users.role, n: count }).from(users).groupBy(users.role),
    db
      .select({ plan: subscriptions.plan, n: count })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))
      .groupBy(subscriptions.plan),
    db
      .select({ n: count })
      .from(subscriptions)
      .where(and(eq(subscriptions.status, "past_due"))),
  ]);

  const counts = { pro: 0, escritorio: 0, enterprise: 0 };
  for (const row of planRows) {
    if (row.plan in counts) counts[row.plan as keyof typeof counts] = row.n;
  }

  const mrr = computeMrr(counts);
  const infra = Object.values(FIXED_INFRA_COST).reduce((a, b) => a + b, 0);
  // Custo variável do MÊS, não de todos os tempos: margem mensal comparada com
  // custo acumulado desde sempre pioraria sozinha para sempre.
  const custoVariavel = (docsThisMonth?.n ?? 0) * MEMORIAL_COST;
  const custoMes = infra + custoVariavel;

  return NextResponse.json({
    periodo: new Date().toISOString().slice(0, 7),

    // Faixa superior
    mrr,
    custoMes,
    margem: mrr - custoMes,

    usuarios: {
      total: totalUsers?.n ?? 0,
      novosNoMes: newUsers?.n ?? 0,
      bloqueados: blockedUsers?.n ?? 0,
      escritorios: orgs?.n ?? 0,
      porRole: Object.fromEntries(roleRows.map((r) => [r.role, r.n])) as Record<string, number>,
    },

    projetos: {
      total: totalProjects?.n ?? 0,
      emitidos: issuedProjects?.n ?? 0,
    },

    memoriais: {
      total: totalDocs?.n ?? 0,
      noMes: docsThisMonth?.n ?? 0,
    },

    jobs: {
      falhados: failedJobs?.n ?? 0,
      naFila: queuedJobs?.n ?? 0,
    },

    assinaturas: {
      ativasPorPlano: counts,
      inadimplentes: pastDue?.n ?? 0,
    },

    custos: { infra, variavel: custoVariavel },
  });
}
