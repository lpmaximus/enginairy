/**
 * POST /api/asaas/checkout — cria (ou reaproveita) o cliente no Asaas e abre a
 * assinatura do plano escolhido.
 *
 * O role NÃO sobe aqui. Quem promove o usuário é o webhook, quando o pagamento
 * é confirmado — assinatura criada não é assinatura paga, e liberar antes do
 * dinheiro entrar é como se dá acesso de graça sem perceber.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, subscriptions, users } from "@/src/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { findOrCreateCustomer, createSubscription } from "@/src/lib/asaas";
import { PLAN_PRICE_MONTHLY } from "@/src/lib/pricing";

const Body = z.object({
  plan: z.enum(["pro", "escritorio", "enterprise"]),
  cpfCnpj: z.string().min(11).max(18).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const userId = Number(session.user.id);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  const { plan, cpfCnpj } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const value = PLAN_PRICE_MONTHLY[plan];
  if (!value) return NextResponse.json({ error: "Plano sem preço" }, { status: 400 });

  const customer = await findOrCreateCustomer({
    name: user.name ?? user.email,
    email: user.email,
    cpfCnpj: cpfCnpj ?? user.cpfCnpj ?? undefined,
  });

  const sub = await createSubscription({
    customerId: customer.id,
    value,
    description: `Enginairy — plano ${plan}`,
  });

  await db.insert(subscriptions).values({
    userId,
    provider: "asaas",
    providerCustomerId: customer.id,
    providerSubscriptionId: sub.id,
    plan,
    // 'trialing' e não 'active': ainda não houve pagamento confirmado.
    status: "trialing",
    value: String(value),
    currentPeriodStart: new Date(),
  });

  return NextResponse.json({ subscriptionId: sub.id, paymentLink: sub.paymentLink ?? null });
}
