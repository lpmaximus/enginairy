/**
 * POST /api/asaas/webhook — eventos de cobrança do Asaas.
 *
 * Endpoint PÚBLICO, mesmas três regras do webhook do ECE: token validado antes
 * de tocar o banco, idempotência e resposta rápida.
 *
 * É este handler — e só ele — que muda users.role. A verdade do faturamento é
 * do gateway; nossa tabela é espelho.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, subscriptions, users } from "@/src/db";
import { eq } from "drizzle-orm";
import { createNotification } from "@/src/lib/notifications";

/** Eventos que concedem acesso e eventos que o retiram. */
const GRANT = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);
const REVOKE = new Set([
  "PAYMENT_OVERDUE",
  "PAYMENT_DELETED",
  "PAYMENT_REFUNDED",
  "SUBSCRIPTION_DELETED",
]);

export async function POST(req: NextRequest) {
  const token = req.headers.get("asaas-access-token");
  if (!process.env.ASAAS_WEBHOOK_TOKEN || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    event?: string;
    payment?: { subscription?: string };
    subscription?: { id?: string };
  } | null;
  if (!body?.event) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const providerSubId = body.payment?.subscription ?? body.subscription?.id;
  if (!providerSubId) {
    // Evento sem assinatura (cobrança avulsa) — nada a fazer, mas responder 200
    // para o Asaas não ficar reenviando.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.providerSubscriptionId, providerSubId))
    .limit(1);
  if (!sub) return NextResponse.json({ ok: true, unknown: true });

  if (GRANT.has(body.event)) {
    // Idempotente: reentrega de PAYMENT_CONFIRMED só reafirma o mesmo estado.
    await db
      .update(subscriptions)
      .set({ status: "active", currentPeriodStart: new Date() })
      .where(eq(subscriptions.id, sub.id));

    if (sub.userId) {
      await db.update(users).set({ role: sub.plan }).where(eq(users.id, sub.userId));
      void createNotification({
        userId: sub.userId,
        title: "Assinatura ativa",
        body: `Plano ${sub.plan} liberado.`,
        link: "/conta",
      });
    }
  } else if (REVOKE.has(body.event)) {
    await db
      .update(subscriptions)
      .set({
        status: body.event === "SUBSCRIPTION_DELETED" ? "canceled" : "past_due",
        canceledAt: body.event === "SUBSCRIPTION_DELETED" ? new Date() : sub.canceledAt,
      })
      .where(eq(subscriptions.id, sub.id));

    if (sub.userId && body.event === "SUBSCRIPTION_DELETED") {
      await db.update(users).set({ role: "free" }).where(eq(users.id, sub.userId));
    }
  }

  return NextResponse.json({ ok: true });
}
