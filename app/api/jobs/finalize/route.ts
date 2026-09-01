/**
 * Cron diário: fecha jobs pendurados.
 *
 * Job que ficou 'running' por mais de uma hora não vai terminar — o processo
 * morreu, o worker sumiu ou o webhook se perdeu. Deixá-lo 'running' para
 * sempre trava a leitura de estado na tela do usuário; marcá-lo 'failed'
 * também devolve a cota, porque falha nossa não debita.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, processingJobs } from "@/src/db";
import { and, eq, lt } from "drizzle-orm";
import { isCronRequest } from "@/src/lib/cron";

const STALE_MS = 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const cutoff = new Date(Date.now() - STALE_MS);
  const result = await db
    .update(processingJobs)
    .set({ status: "failed", error: "Job expirado sem retorno do provider", finishedAt: new Date() })
    .where(and(eq(processingJobs.status, "running"), lt(processingJobs.createdAt, cutoff)))
    .returning({ id: processingJobs.id });

  return NextResponse.json({ ok: true, finalized: result.length });
}
