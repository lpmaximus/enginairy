/**
 * Auth do painel administrativo.
 *
 * Segredo compartilhado (header x-admin-password contra ADMIN_PASSWORD), não
 * sessão — mesmo padrão do backingtrack.store. Centralizado aqui para não
 * repetir a checagem em cada rota do /api/admin.
 */
import { NextRequest } from "next/server";

export function isAdminRequest(req: NextRequest): boolean {
  const pass = req.headers.get("x-admin-password");
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && pass === expected;
}
