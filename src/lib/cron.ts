/**
 * Autenticação das rotas de cron.
 *
 * A Vercel chama os endpoints de vercel.json com o header
 * `Authorization: Bearer $CRON_SECRET`. Sem essa checagem, qualquer um na
 * internet dispara a rotina de purga de contas — que apaga dados.
 */
import type { NextRequest } from "next/server";

export function isCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
