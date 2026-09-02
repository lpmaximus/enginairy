"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { localizePath } from "@/src/i18n/localizePath";
import type { Locale } from "@/src/i18n/routing";

/** Marca da engrenagem — mesmo desenho do enginairylanding.html.
 *  Usa currentColor para ficar branca sobre o rodapé escuro. */
function Mark() {
  const teeth = [0, 40, 80, 120, 160, 200, 240, 280, 320];
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="Enginairy" focusable="false">
      <g fill="currentColor">
        {teeth.map((deg) => (
          <rect
            key={deg}
            x="42.5"
            y="-2"
            width="15"
            height="16"
            rx="2.6"
            transform={`rotate(${deg} 50 50)`}
          />
        ))}
      </g>
      <circle cx="50" cy="50" r="39.5" fill="none" stroke="currentColor" strokeWidth="9" />
      <rect x="29" y="29" width="42" height="42" rx="12" fill="none" stroke="currentColor" strokeWidth="8" />
      <rect x="32" y="44.8" width="32" height="10.4" rx="5.2" fill="var(--eng-accent)" />
    </svg>
  );
}

export default function SiteFooter() {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const t = useTranslations("footer");

  const home = locale === "pt" ? "/" : `/${locale}`;
  const onHome = pathname === home;
  const to = (id: string) => (onHome ? `#${id}` : `${home}#${id}`);

  return (
    <footer className="eng-footer">
      <div className="eng-wrap">
        <div className="eng-foot-top">
          <div className="eng-foot-brand">
            <span className="eng-foot-mark">
              <Mark />
              <span>
                <span className="eng-foot-wm">
                  ENGIN<i>AIRY</i>
                </span>
                <span className="eng-foot-tagline">{t("tagline")}</span>
              </span>
            </span>
            <p>{t("blurb")}</p>
          </div>

          <div className="eng-foot-cols">
            <div className="eng-foot-col">
              <span className="h">{t("colServices")}</span>
              <a href={to("servicos")}>{t("linkResidential")}</a>
              <a href={to("servicos")}>{t("linkReports")}</a>
              <a href={to("servicos")}>{t("linkIndustrial")}</a>
            </div>
            <div className="eng-foot-col">
              <span className="h">{t("colLearn")}</span>
              <a href={localizePath("/projetos-realizados", locale)}>{t("linkWork")}</a>
              <a href={to("entrega")}>{t("linkWhatYouGet")}</a>
              <a href={to("como")}>{t("linkHowItWorks")}</a>
              <a href={to("duvidas")}>{t("linkFaq")}</a>
            </div>
            <div className="eng-foot-col">
              <span className="h">{t("colContact")}</span>
              <a href="https://wa.me/5531998536281" target="_blank" rel="noopener noreferrer">
                {t("linkWhatsapp")}
              </a>
              <a href="mailto:contato@l2techs.com">contato@l2techs.com</a>
              <a href={to("orcamento")}>{t("linkQuote")}</a>
            </div>
          </div>
        </div>

        <div className="eng-foot-bot">
          <span>© {new Date().getFullYear()} Enginairy · L2tech</span>
          <span>{t("legal")}</span>
        </div>
      </div>
    </footer>
  );
}
