/**
 * Canonical + hreflang por página.
 *
 * ⚠️ No App Router, `alternates` definido no layout é HERDADO por toda página
 * que não sobrescreve o campo. Um `canonical` da home declarado no layout de
 * [locale] faz TODAS as páginas dizerem ao Google "sou cópia da home" — foi um
 * bug real e caro no backingtrack.store, e a correção veio junto com este
 * arquivo. Não repetir aqui.
 *
 * Regra: o layout NÃO declara alternates; cada página pública declara o seu
 * com `alternatesFor(href, locale)`. Página privada (conta, projetos —
 * bloqueadas no robots.ts) simplesmente não declara: ausência de canonical é
 * inofensiva, canonical errado não.
 */
import type { Metadata } from "next";
import { routing, htmlLang, defaultLocale, type Locale } from "@/src/i18n/routing";
import { getPathname } from "@/src/i18n/navigation";
import { siteUrl } from "@/src/lib/siteUrl";

type Href = Parameters<typeof getPathname>[0]["href"];

export function alternatesFor(href: Href, locale: Locale): NonNullable<Metadata["alternates"]> {
  const base = siteUrl();

  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[htmlLang[l]] = `${base}${getPathname({ href, locale: l })}`;
  }
  languages["x-default"] = `${base}${getPathname({ href, locale: defaultLocale })}`;

  return {
    canonical: `${base}${getPathname({ href, locale })}`,
    languages,
  };
}
