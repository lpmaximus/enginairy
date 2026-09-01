/**
 * Helper de role PURO — sem imports de banco de dados.
 *
 * Pode ser importado no client ("use client") e no proxy/edge, porque não toca
 * o Neon. A checagem que consulta o banco (acesso herdado via escritório) fica
 * em src/lib/access.ts, que NÃO pode ir para o client nem para o edge.
 *
 * ORDEM DE PODER: free < pro < escritorio < enterprise < admin.
 */
export function isPaidRole(role?: string | null): boolean {
  return (
    role === "pro" || role === "escritorio" || role === "enterprise" || role === "admin"
  );
}

/**
 * Decisão PURA de acesso pago — sem banco, fácil de testar.
 * `hasActiveOrgAccess` resume a consulta de vínculo + assinatura feita em
 * src/lib/access.ts.
 */
export function decidePaidAccess(input: {
  role?: string | null;
  hasActiveOrgAccess: boolean;
}): boolean {
  return isPaidRole(input.role) || input.hasActiveOrgAccess;
}

/** Rótulo curto para badge de header/perfil. Espelha resolveUserType(). */
export function roleLabel(role?: string | null, isActiveOrgMember = false): string {
  switch (role) {
    case "admin":      return "ADMIN";
    case "enterprise": return "ENTERPRISE";
    case "escritorio": return "ESCRITÓRIO";
    case "pro":        return "PRO";
    default:           return isActiveOrgMember ? "EQUIPE" : "FREE";
  }
}
