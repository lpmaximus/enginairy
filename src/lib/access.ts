/**
 * Acesso pago efetivo — fonte única da verdade para "esse usuário tem plano?".
 *
 * Além do role individual, concede acesso a quem é membro ATIVO de um
 * escritório com assinatura ATIVA (o dono paga, a equipe herda).
 *
 * IMPORTANTE (regra do edge): este módulo toca o banco (Neon) — NÃO importar
 * em componentes "use client" nem no proxy/auth.config. Para UI/edge, use
 * `isPaidRole` de src/lib/roles.ts.
 */
import { db, orgMembers, organizations, subscriptions } from "@/src/db";
import { and, eq } from "drizzle-orm";
import { isPaidRole, decidePaidAccess } from "./roles";

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing"]);

export async function hasPaidAccess(userId: number, role?: string | null): Promise<boolean> {
  // Beta de captação: libera a experiência paga para todo usuário logado.
  // A cota mensal NÃO muda (é por role em checkMemorialQuota).
  // Reverter = remover a env BETA_FULL_ACCESS.
  if (process.env.BETA_FULL_ACCESS === "true" && userId) return true;
  if (isPaidRole(role)) return true;
  if (!userId) return false;

  const rows = await db
    .select({ subStatus: subscriptions.status })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .innerJoin(subscriptions, eq(organizations.subscriptionId, subscriptions.id))
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.status, "active")))
    .limit(5);

  const hasActiveOrgAccess = rows.some((r) => ACTIVE_SUB_STATUSES.has(r.subStatus));
  return decidePaidAccess({ role, hasActiveOrgAccess });
}

/** Membro ativo de algum escritório — insumo de resolveUserType(). */
export async function isActiveOrgMember(userId: number): Promise<boolean> {
  if (!userId) return false;
  const rows = await db
    .select({ subStatus: subscriptions.status })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
    .innerJoin(subscriptions, eq(organizations.subscriptionId, subscriptions.id))
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.status, "active")))
    .limit(5);
  return rows.some((r) => ACTIVE_SUB_STATUSES.has(r.subStatus));
}
