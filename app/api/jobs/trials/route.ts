/** Cron diário: rebaixa quem teve o trial vencido. Ver vercel.json. */
import { NextRequest, NextResponse } from "next/server";
import { isCronRequest } from "@/src/lib/cron";
import { expireDueTrials } from "@/src/lib/trials";

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const expired = await expireDueTrials();
  return NextResponse.json({ ok: true, expired });
}
