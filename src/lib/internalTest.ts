/**
 * E-mails da equipe que NÃO devem contaminar as métricas de produto.
 *
 * Lista vem de INTERNAL_TEST_EMAILS (separada por vírgula). Módulo puro: pode
 * ser importado no client e no edge.
 */
const RAW = process.env.INTERNAL_TEST_EMAILS ?? "";

const SET = new Set(
  RAW.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function isInternalTestEmail(email?: string | null): boolean {
  return Boolean(email) && SET.has(email!.toLowerCase());
}
