/** POST /api/waitlist — captação de lead na fase beta. */
import { NextRequest, NextResponse } from "next/server";
import { db, waitlist } from "@/src/db";
import { z } from "zod";

const Body = z.object({
  email: z.string().email(),
  name: z.string().max(160).optional(),
  company: z.string().max(160).optional(),
  source: z.string().max(60).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });

  // onConflictDoNothing: reenviar o formulário não pode virar erro na cara do
  // lead nem duplicata na lista.
  await db.insert(waitlist).values(parsed.data).onConflictDoNothing();
  return NextResponse.json({ ok: true }, { status: 201 });
}
