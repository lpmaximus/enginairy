/**
 * POST /api/auth/register — cadastro com e-mail e senha.
 *
 * Responde igual para e-mail novo e e-mail já cadastrado no caminho de erro
 * genérico? Não: aqui devolvemos 409 explícito, porque o produto é B2B com
 * cadastro autoidentificado e esconder isso só gera chamado de suporte. O que
 * NÃO fazemos é confirmar existência de conta em rota não autenticada de
 * recuperação — lá o silêncio é o certo.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/src/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(8, "A senha precisa de ao menos 8 caracteres"),
  name: z.string().min(2).max(160).optional(),
  company: z.string().max(160).optional(),
  crea: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }
  const { email, password, name, company, crea } = parsed.data;

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: name ?? null,
      company: company ?? null,
      crea: crea ?? null,
      provider: "credentials",
      role: "free",
    })
    .returning({ id: users.id, email: users.email });

  return NextResponse.json({ user }, { status: 201 });
}
