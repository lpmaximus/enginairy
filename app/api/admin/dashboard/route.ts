/** GET /api/admin/dashboard — números de operação. Auth por x-admin-password. */
import { NextRequest, NextResponse } from "next/server";
import { db, users, projects, documents, subscriptions, processingJobs } from "@/src/db";
import { eq, sql } from "drizzle-orm";
import { isAdminRequest } from "@/src/lib/adminAuth";
import { computeMrr, MEMORIAL_COST, FIXED_INFRA_COST } from "@/src/lib/pricing";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const [[u], [p], [d], [failed]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db.select({ n: sql<number>`count(*)::int` }).from(projects),
    db.select({ n: sql<number>`count(*)::int` }).from(documents),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(processingJobs)
      .where(eq(processingJobs.status, "failed")),
  ]);

  const planRows = await db
    .select({ plan: subscriptions.plan, n: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"))
    .groupBy(subscriptions.plan);

  const counts = { pro: 0, escritorio: 0, enterprise: 0 };
  for (const row of planRows) {
    if (row.plan in counts) counts[row.plan as keyof typeof counts] = row.n;
  }

  const mrr = computeMrr(counts);
  const infra = Object.values(FIXED_INFRA_COST).reduce((a, b) => a + b, 0);
  const custoVariavel = (d?.n ?? 0) * MEMORIAL_COST;

  return NextResponse.json({
    usuarios: u?.n ?? 0,
    projetos: p?.n ?? 0,
    memoriais: d?.n ?? 0,
    jobsFalhados: failed?.n ?? 0,
    assinaturasAtivas: counts,
    mrr,
    // Margem bruta estimada — o custo real de emissão ainda é ~0 com o motor
    // local; a linha existe para não ser esquecida quando deixar de ser.
    margemEstimada: mrr - infra - custoVariavel,
  });
}
