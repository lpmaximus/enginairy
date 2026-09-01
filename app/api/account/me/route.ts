/** GET/PATCH do próprio perfil (dados que vão para o rodapé do memorial). */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, users } from "@/src/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      company: users.company,
      crea: users.crea,
      phone: users.phone,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, Number(session.user.id)))
    .limit(1);

  return NextResponse.json({ user });
}

const Body = z.object({
  name: z.string().min(2).max(160).optional(),
  company: z.string().max(160).nullable().optional(),
  crea: z.string().max(40).nullable().optional(),
  phone: z.string().max(32).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  // role e status NÃO estão no schema de entrada de propósito: quem muda plano
  // é o webhook de pagamento, não o próprio usuário via PATCH.
  const [user] = await db
    .update(users)
    .set(parsed.data)
    .where(eq(users.id, Number(session.user.id)))
    .returning({ id: users.id, name: users.name, company: users.company, crea: users.crea });

  return NextResponse.json({ user });
}
