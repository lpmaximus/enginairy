/**
 * Cron diário: apaga em definitivo contas cuja exclusão foi agendada e cujo
 * prazo de arrependimento já passou.
 *
 * O prazo existe para que exclusão acidental seja reversível; passado ele, o
 * dado sai de verdade — é o que a política de privacidade promete.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/src/db";
import { and, isNotNull, lte } from "drizzle-orm";
import { isCronRequest } from "@/src/lib/cron";

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const deleted = await db
    .delete(users)
    .where(and(isNotNull(users.deletionScheduledAt), lte(users.deletionScheduledAt, new Date())))
    .returning({ id: users.id });

  return NextResponse.json({ ok: true, purged: deleted.length });
}
