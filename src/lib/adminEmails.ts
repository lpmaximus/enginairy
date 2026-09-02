/**
 * E-mails com promoção automática para 'admin' no login (ADR análogo ao de
 * internalTest.ts).
 *
 * Lista vem de ADMIN_EMAILS (separada por vírgula). Módulo puro — não toca o
 * banco; quem aplica a promoção é auth.ts, no momento do login.
 *
 * Por que no login e não só no cadastro: a conta pode já existir antes do
 * e-mail entrar nesta lista (ex.: alguém que se cadastrou antes de virar
 * admin). Checar em todo login "cura" isso sem precisar de migração manual.
 */
const RAW = process.env.ADMIN_EMAILS ?? "";

const SET = new Set(
  RAW.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function isAdminEmail(email?: string | null): boolean {
  return Boolean(email) && SET.has(email!.toLowerCase());
}
