"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { localizePath } from "@/src/i18n/localizePath";
import type { Locale } from "@/src/i18n/routing";

/**
 * Cabeçalho fiel a enginairylanding.html: sticky, vidro fosco, logo da marca,
 * navegação por âncoras e CTA de orçamento.
 *
 * As âncoras vivem na home. Fora dela o href precisa do caminho completo,
 * senão o browser procura a âncora na página atual e não sai do lugar.
 *
 * Os rótulos vêm de messages/*.json (namespace `header`): o id da âncora é
 * técnico e não muda com o idioma, o texto sim.
 */
const ANCHORS = [
  { id: "entrega", key: "navDelivery" },
  { id: "como", key: "navHow" },
  { id: "quem", key: "navWho" },
  { id: "servicos", key: "navServices" },
  { id: "duvidas", key: "navFaq" },
] as const;

export default function SiteHeader() {
  const { data: session } = useSession();
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const t = useTranslations("header");

  const home = locale === "pt" ? "/" : `/${locale}`;
  const onHome = pathname === home;
  const to = (id: string) => (onHome ? `#${id}` : `${home}#${id}`);

  return (
    <header className="eng-header">
      <div className="eng-wrap eng-nav">
        <a className="eng-brand" href={onHome ? "#top" : home} aria-label="Enginairy">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="eng-brand-img"
            src="/enginairy-logo.png"
            alt={t("brandAlt")}
            width={344}
            height={75}
          />
        </a>

        <nav className="eng-nav-links">
          {ANCHORS.map((a) => (
            <a key={a.id} href={to(a.id)}>
              {t(a.key)}
            </a>
          ))}
        </nav>

        {session && (
          <a className="eng-account" href={localizePath("/conta", locale)}>
            {t("account")}
          </a>
        )}

        <a className="eng-btn eng-btn-primary" href={to("orcamento")}>
          {t("cta")}
        </a>
      </div>
    </header>
  );
}
