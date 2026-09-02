/**
 * Camada de eventos do GA4 no cliente.
 *
 * Regra: nenhum componente chama `window.gtag` direto. Nome de evento é
 * enumerado aqui — GA4 trata cada string nova como um evento diferente, e
 * "clique_orcamento" vs "click_orcamento" viram dois relatórios que nunca
 * fecham. Se não está na lista, não é medido.
 *
 * Os nomes seguem o padrão GA4 (snake_case, ≤ 40 chars). `cta_click` é um
 * evento único com o parâmetro `cta_id` — assim o painel de Audiência lista
 * todos os CTAs numa tabela só, em vez de exigir um evento por botão.
 */

export const CTA_IDS = [
  "orcamento_whatsapp", // formulário de orçamento → enviar pelo WhatsApp
  "orcamento_email", // formulário de orçamento → enviar por e-mail
  "header_contato",
  "header_entrar",
  "hero_orcamento",
  "hero_como_funciona",
  "planos_pro",
  "planos_escritorio",
  "planos_enterprise",
  "planos_falar",
  "waitlist_submit",
  "cadastro_iniciado",
  "footer_whatsapp",
  "projeto_novo",
  "memorial_download",
] as const;

export type CtaId = (typeof CTA_IDS)[number];

type GtagFn = (...args: unknown[]) => void;

function gtag(): GtagFn | null {
  if (typeof window === "undefined") return null;
  const fn = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof fn === "function" ? fn : null;
}

/** Clique num CTA. Nunca lança — analytics não pode derrubar interação. */
export function trackCta(id: CtaId, params?: Record<string, string | number>): void {
  try {
    gtag()?.("event", "cta_click", { cta_id: id, ...params });
  } catch {
    /* bloqueador de anúncio ou consentimento negado — segue o baile */
  }
}

/** Pageview manual (SPA). O layout dispara; ninguém mais precisa chamar. */
export function trackPageview(path: string): void {
  try {
    gtag()?.("event", "page_view", { page_path: path, page_location: window.location.href });
  } catch {
    /* idem */
  }
}

/** Evento nomeado fora da lista de CTA (conversões de produto). */
export function trackEvent(name: string, params?: Record<string, string | number>): void {
  try {
    gtag()?.("event", name, params);
  } catch {
    /* idem */
  }
}
