/**
 * Configuração de rotas i18n (ADR-ENG-004).
 *
 * pt → idioma padrão, SEM prefixo (mantém as URLs atuais de enginairy.com
 *      intactas: /planos continua /planos e preserva o SEO já conquistado).
 * en → prefixo /en com slugs traduzidos (enginairy.com/en/pricing).
 *
 * `localeDetection: false` porque a negociação NÃO é por Accept-Language e sim
 * por país (ver proxy.ts): fora do Brasil o visitante cai em inglês. O cookie
 * NEXT_LOCALE continua sendo respeitado — escolha manual sempre vence.
 */
import { defineRouting } from "next-intl/routing";

export const locales = ["pt", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "pt";

/** Tag BCP-47 usada em <html lang>, hreflang e Intl.* */
export const htmlLang: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en",
};

/** A chave é sempre o caminho interno (= pasta em app/[locale]). */
export const pathnames = {
  "/": "/",

  // Público / marketing
  "/planos": { pt: "/planos", en: "/pricing" },
  "/como-funciona": { pt: "/como-funciona", en: "/how-it-works" },
  "/sobre": { pt: "/sobre", en: "/about" },
  "/projetos-realizados": { pt: "/projetos-realizados", en: "/portfolio" },
  "/contato": { pt: "/contato", en: "/contact" },
  "/entrar": { pt: "/entrar", en: "/sign-in" },
  "/coming-soon": "/coming-soon",

  // App logado
  "/projetos": { pt: "/projetos", en: "/projects" },
  "/projetos/[id]": { pt: "/projetos/[id]", en: "/projects/[id]" },
  "/projetos/[id]/memorial": { pt: "/projetos/[id]/memorial", en: "/projects/[id]/memorial" },
  "/escritorio": { pt: "/escritorio", en: "/workspace" },
  "/conta": { pt: "/conta", en: "/account" },
  "/convite/[token]": { pt: "/convite/[token]", en: "/invite/[token]" },

  // Legal
  "/termos": { pt: "/termos", en: "/terms" },
  "/privacidade": { pt: "/privacidade", en: "/privacy" },
  "/cookies": { pt: "/cookies", en: "/cookies" },
} as const;

export type Pathname = keyof typeof pathnames;

/**
 * Só as rotas SEM segmento dinâmico.
 *
 * É o tipo certo para menus e rodapé: `/projetos/[id]` não pode ser passada
 * como string ao <Link>, exige `{ pathname, params }`. Restringir aqui faz o
 * erro aparecer na lista de itens do menu, não em produção.
 */
export type StaticPathname = Exclude<Pathname, `${string}[${string}`>;

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  localeDetection: false,
  pathnames,
});
