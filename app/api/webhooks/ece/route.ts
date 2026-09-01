/**
 * POST /api/webhooks/ece — chamado pelo worker externo do ECE ao terminar.
 *
 * Endpoint PÚBLICO. As três regras do webhook (as mesmas do backingtrack.store):
 *   1. valida a assinatura ANTES de tocar o banco — sem isso, qualquer um
 *      injeta resultado de cálculo falso num projeto assinado;
 *   2. é idempotente por providerJobId — o worker reenvia em timeout;
 *   3. só grava e responde rápido; nada pesado roda aqui.
 *
 * Enquanto ECE_PROVIDER=local esta rota fica ociosa; ela existe para que a
 * troca de provider não exija mexer no fluxo de emissão.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, calculations, processingJobs, projects } from "@/src/db";
import { desc, eq } from "drizzle-orm";
import { getEngineProvider } from "@/src/lib/engine";
import { createNotification } from "@/src/lib/notifications";
import type { EngineInput } from "@/src/lib/engine/types";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const provider = getEngineProvider();

  if (!provider.verifyWebhook || !provider.parseWebhook) {
    return NextResponse.json({ error: "Provider sem webhook" }, { status: 501 });
  }

  // 1. Assinatura.
  if (!(await provider.verifyWebhook(req.headers, rawBody))) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = provider.parseWebhook(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const [job] = await db
    .select()
    .from(processingJobs)
    .where(eq(processingJobs.providerJobId, parsed.providerJobId))
    .limit(1);
  if (!job) return NextResponse.json({ error: "Job desconhecido" }, { status: 404 });

  // 2. Idempotência: reentrega de job já fechado é sucesso, não erro.
  if (job.status === "done" || job.status === "failed") {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  if (parsed.error || !parsed.output) {
    await db
      .update(processingJobs)
      .set({ status: "failed", error: parsed.error ?? "Sem resultado", finishedAt: new Date() })
      .where(eq(processingJobs.id, job.id));
    return NextResponse.json({ ok: true });
  }

  const output = parsed.output;
  const projectId = job.projectId!;

  const [last] = await db
    .select({ version: calculations.version })
    .from(calculations)
    .where(eq(calculations.projectId, projectId))
    .orderBy(desc(calculations.version))
    .limit(1);

  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  await db.insert(calculations).values({
    projectId,
    version: (last?.version ?? 0) + 1,
    normCode: output.normCode,
    engineVersion: output.engineVersion,
    // O worker devolve o input que efetivamente usou; guardamos ELE, não o
    // que achamos que mandamos.
    inputSnapshot: (parsed as unknown as { input?: EngineInput }).input ?? {},
    results: output,
    warnings: output.warnings,
    totalCoolingLoad: String(output.totals.coolingLoad),
    totalAirflow: String(output.totals.supplyAirflow),
  });

  await db
    .update(processingJobs)
    .set({ status: "done", finishedAt: new Date() })
    .where(eq(processingJobs.id, job.id));

  await db
    .update(projects)
    .set({ status: "calculated", updatedAt: new Date() })
    .where(eq(projects.id, projectId));

  if (job.userId) {
    void createNotification({
      userId: job.userId,
      title: "Cálculo concluído",
      body: project?.name ?? undefined,
      link: `/projetos/${projectId}`,
    });
  }

  return NextResponse.json({ ok: true });
}
