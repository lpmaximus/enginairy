/**
 * Preços e custos de referência (ADR-ENG-003).
 *
 * Módulo puro — usado pelo dashboard de Consumo (MRR e margem) e pela página
 * de planos. Os valores batem com app/api/asaas/checkout.
 *
 * ATENÇÃO: R$ 29 é o preço do plano inicial anunciado no site atual. Os demais
 * são âncoras de partida e precisam ser confirmados contra o custo real de
 * emissão antes de virarem link de pagamento público.
 */
export const PLAN_PRICE_MONTHLY: Record<string, number> = {
  pro: 29.0,
  escritorio: 149.0,
  enterprise: 499.0,
};

/**
 * Custo médio por memorial emitido (R$). Com ECE_PROVIDER=local o cálculo roda
 * no próprio runtime e o custo marginal é ~0; a linha existe para o dia em que
 * a emissão passar por worker/LLM, quando ela deixa de ser desprezível.
 */
export const MEMORIAL_COST = 0.05;

/** Estimativas fixas mensais de infra (R$). Ajustar conforme a fatura real. */
export const FIXED_INFRA_COST = {
  storageR2: 5,
  neon: 0,
  vercel: 0,
};

export function computeMrr(counts: {
  pro: number;
  escritorio: number;
  enterprise: number;
}): number {
  return (
    counts.pro * PLAN_PRICE_MONTHLY.pro +
    counts.escritorio * PLAN_PRICE_MONTHLY.escritorio +
    counts.enterprise * PLAN_PRICE_MONTHLY.enterprise
  );
}
