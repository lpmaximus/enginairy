"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

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
  const locale = useLocale();
  const pathname = usePathname();

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
                <span className="eng-foot-tagline">Engenharia mecânica online</span>
              </span>
            </span>
            <p>
              Do dimensionamento residencial ao projeto industrial, com memorial
              técnico assinado. Um produto L2tech.
            </p>
          </div>

          <div className="eng-foot-cols">
            <div className="eng-foot-col">
              <span className="h">Serviços</span>
              <a href={to("servicos")}>Residencial</a>
              <a href={to("servicos")}>Laudos e pareceres</a>
              <a href={to("servicos")}>Projeto industrial</a>
            </div>
            <div className="eng-foot-col">
              <span className="h">Saiba mais</span>
              <a href={to("entrega")}>O que você recebe</a>
              <a href={to("como")}>Como funciona</a>
              <a href={to("duvidas")}>Dúvidas frequentes</a>
            </div>
            <div className="eng-foot-col">
              <span className="h">Contato</span>
              <a href="https://wa.me/5531998536281" target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
              <a href="mailto:contato@l2techs.com">contato@l2techs.com</a>
              <a href={to("orcamento")}>Pedir orçamento</a>
            </div>
          </div>
        </div>

        <div className="eng-foot-bot">
          <span>© {new Date().getFullYear()} Enginairy · L2tech</span>
          <span>Responsabilidade técnica registrada no CREA · ART sob demanda</span>
        </div>
      </div>
    </footer>
  );
}
