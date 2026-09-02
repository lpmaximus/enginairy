/**
 * GET /api/admin/consumption?days=30 — receita, custo e uso do motor.
 *
 * Responde a uma pergunta só: cada memorial emitido está pago? Por isso o
 * módulo cruza MRR com emissões e falhas de job no MESMO período — memorial
 * que falha custa runtime e não gera receita, e é a linha que some quando o
 * painel só mostra sucesso.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, documents, projects, processingJobs, subscriptions, users } from "@/src/db";
import { desc, eq, gte, sql } from "drizzle-orm";
import { isAdminRequest } from "@/src/lib/adminAuth";
import {
  computeMrr,
  MEMORIAL_COST,
  FIXED_INFRA_COST,
  PLAN_PRICE_MONTHLY,
} from "@/src/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get("days")) || 30, 1), 365);
  const since = new Date(Date.now() - days * 86_400_000);
  const count = sql<number>`count(*)::int`;

  const [planRows, statusRows, [docsPeriodo], formatoRows, jobsRows, porDia, topUsuarios] =
    await Promise.all([
      db
        .select({ plan: subscriptions.plan, n: count })
        .from(subscriptions)
        .where(eq(subscriptions.status, "active"))
        .groupBy(subscriptions.plan),

      db
        .select({ status: subscriptions.status, n: count })
        .from(subscriptions)
        .groupBy(subscriptions.status),

      db.select({ n: count }).from(documents).where(gte(documents.createdAt, since)),

      db
        .select({ format: documents.format, n: count })
        .from(documents)
        .where(gte(documents.createdAt, since))
        .groupBy(documents.format),

      db
        .select({ status: processingJobs.status, n: count })
        .from(processingJobs)
        .where(gte(processingJobs.createdAt, since))
        .groupBy(processingJobs.status),

      // Série diária de emissões. date_trunc no Postgres, não no Node: trazer
      // todas as linhas para contar em JS é o que trava o painel quando a base
      // cresce.
      db
        .select({
          dia: sql<string>`to_char(date_trunc('day', ${documents.createdAt}), 'YYYY-MM-DD')`,
          n: count,
        })
        .from(documents)
        .where(gte(documents.createdAt, since))
        .groupBy(sql`date_trunc('day', ${documents.createdAt})`)
        .orderBy(sql`date_trunc('day', ${documents.createdAt})`),

      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          n: count,
        })
        .from(documents)
        .innerJoin(projects, eq(projects.id, documents.projectId))
        .innerJoin(users, eq(users.id, projects.userId))
        .where(gte(documents.createdAt, since))
        .groupBy(users.id, users.name, users.email, users.role)
        .orderBy(desc(count))
        .limit(10),
    ]);

  const ativas = { pro: 0, escritorio: 0, enterprise: 0 };
  for (const row of planRows) {
    if (row.plan in ativas) ativas[row.plan as keyof typeof ativas] = row.n;
  }

  const mrr = computeMrr(ativas);
  const infra = Object.values(FIXED_INFRA_COST).reduce((a, b) => a + b, 0);
  const emissoes = docsPeriodo?.n ?? 0;
  const custoEmissao = emissoes * MEMORIAL_COST;

  const jobs = Object.fromEntries(jobsRows.map((r) => [r.status, r.n])) as Record<string, number>;
  const totalJobs = Object.values(jobs).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    days,
    mrr,
    receitaPorPlano: {
      pro: ativas.pro * PLAN_PRICE_MONTHLY.pro,
      escritorio: ativas.escritorio * PLAN_PRICE_MONTHLY.escritorio,
      enterprise: ativas.enterprise * PLAN_PRICE_MONTHLY.enterprise,
    },
    assinaturas: {
      ativasPorPlano: ativas,
      porStatus: Object.fromEntries(statusRows.map((r) => [r.status, r.n])),
    },
    custos: {
      infra,
      detalheInfra: FIXED_INFRA_COST,
      emissao: custoEmissao,
      total: infra + custoEmissao,
      porMemorial: MEMORIAL_COST,
    },
    margem: mrr - infra - custoEmissao,
    emissoes: {
      total: emissoes,
      porFormato: Object.fromEntries(formatoRows.map((r) => [r.format, r.n])),
      porDia,
    },
    jobs: {
      porStatus: jobs,
      total: totalJobs,
      // Falha aqui é dinheiro gasto sem entrega — a taxa é o número que
      // justifica (ou não) trocar o provider do motor.
      taxaFalha: totalJobs ? ((jobs.failed ?? 0) / totalJobs) * 100 : 0,
    },
    topUsuarios,
  });
}
