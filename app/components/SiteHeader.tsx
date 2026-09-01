"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

/**
 * Cabeçalho fiel a enginairylanding.html: sticky, vidro fosco, logo da marca,
 * navegação por âncoras e CTA de orçamento.
 *
 * As âncoras vivem na home. Fora dela o href precisa do caminho completo,
 * senão o browser procura a âncora na página atual e não sai do lugar.
 */
const ANCHORS = [
  { id: "entrega", label: "O que você recebe" },
  { id: "como", label: "Como funciona" },
  { id: "quem", label: "Quem faz" },
  { id: "servicos", label: "Serviços" },
  { id: "duvidas", label: "Dúvidas" },
];

export default function SiteHeader() {
  const { data: session } = useSession();
  const locale = useLocale();
  const pathname = usePathname();

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
            alt="Enginairy — engenharia mecânica online"
            width={344}
            height={75}
          />
        </a>

        <nav className="eng-nav-links">
          {ANCHORS.map((a) => (
            <a key={a.id} href={to(a.id)}>
              {a.label}
            </a>
          ))}
        </nav>

        {session && (
          <a className="eng-account" href={`${home === "/" ? "" : home}/conta`}>
            Conta
          </a>
        )}

        <a className="eng-btn eng-btn-primary" href={to("orcamento")}>
          Pedir orçamento
        </a>
      </div>
    </header>
  );
}
