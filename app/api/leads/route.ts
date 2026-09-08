/**
 * POST /api/leads — captura o pedido de orçamento da home ANTES do redirect
 * para o WhatsApp/e-mail (ver app/components/BudgetForm.tsx).
 *
 * Why: o clique no CTA já conta como conversão no GA4 (cta_click), mas não
 * garante que a mensagem chegou do outro lado — WhatsApp Web pode estar
 * deslogado, o visitante pode não ter cliente de e-mail padrão configurado,
 * ou pode simplesmente fechar a aba antes de apertar enviar. Sem gravar aqui,
 * esse lead se perde e ninguém percebe.
 *
 * Endpoint público (sem isAdminRequest) — é chamado do navegador do
 * visitante, antes de qualquer login.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, budgetLeads } from "@/src/db";
import { z } from "zod";

const Body = z.object({
  name: z.string().trim().min(1).max(160),
  whatsapp: z.string().trim().min(1).max(32),
  email: z.string().trim().max(255).optional(),
  service: z.string().trim().max(160).optional(),
  location: z.string().trim().max(160).optional(),
  message: z.string().trim().min(1).max(4000),
  channel: z.enum(["whatsapp", "email"]),
  locale: z.string().trim().max(8).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { email, service, location, locale, ...rest } = parsed.data;

  await db.insert(budgetLeads).values({
    ...rest,
    email: email || null,
    service: service || null,
    location: location || null,
    locale: locale || null,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
