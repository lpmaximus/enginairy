/** GET /api/quota — quanto resta no ciclo. Alimenta o aviso no editor. */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getQuotaStatus } from "@/src/lib/quota";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const status = await getQuotaStatus(Number(session.user.id));
  return NextResponse.json(status);
}
