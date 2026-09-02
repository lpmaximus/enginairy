"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { localizePath } from "@/src/i18n/localizePath";
import type { Locale } from "@/src/i18n/routing";
import { trackCta } from "@/src/lib/analytics";

/**
 * Cabeçalho fiel a enginairylanding.html: sticky, vidro fosco, logo da marca,
 * navegação por âncoras e CTA de orçamento.
 *
 * As âncoras vivem na home. Fora dela o href precisa do caminho completo,
 * senão o browser procura a âncora na página atual e não sai do lugar.
 *
 * Os rótulos vêm de messages/*.json (namespace `header`): o id da âncora é
 * técnico e não muda com o idioma, o texto sim.
 *
 * No celular a lista some e vira gaveta atrás do botão de menu. Antes ela
 * apenas sumia (`display:none` abaixo de 860px) e o visitante de celular —
 * que é a maioria — ficava sem acesso nenhum a "o que você recebe", "como
 * funciona", "serviços" e à página de projetos.
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
  const [open, setOpen] = useState(false);

  const home = locale === "pt" ? "/" : `/${locale}`;
  const onHome = pathname === home;
  const to = (id: string) => (onHome ? `#${id}` : `${home}#${id}`);
  const workHref = localizePath("/projetos-realizados", locale);

  // Trocar de rota tem que fechar a gaveta: o Next preserva o componente entre
  // navegações e ela ficaria aberta por cima da página nova.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header className={`eng-header${open ? " open" : ""}`}>
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
          {/* Único item que não é âncora da home: página própria, então precisa
              do slug traduzido (/en/portfolio), nunca de `${home}/...`. */}
          <a href={workHref}>{t("navWork")}</a>
        </nav>

        {session && (
          <a className="eng-account" href={localizePath("/conta", locale)}>
            {t("account")}
          </a>
        )}

        <a
          className="eng-btn eng-btn-primary eng-nav-cta"
          href={to("orcamento")}
          onClick={() => trackCta("header_contato", { origem: "desktop" })}
        >
          {t("cta")}
        </a>

        <button
          className="eng-burger"
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="eng-mobile-nav"
          aria-label={open ? t("menuClose") : t("menuOpen")}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Sempre no DOM (e não montado sob condição) para o aria-controls do
          botão apontar para algo real mesmo com a gaveta fechada. */}
      <div className="eng-mobile-nav" id="eng-mobile-nav" hidden={!open}>
        <div className="eng-wrap">
          {ANCHORS.map((a) => (
            <a key={a.id} href={to(a.id)} onClick={() => setOpen(false)}>
              {t(a.key)}
            </a>
          ))}
          <a href={workHref} onClick={() => setOpen(false)}>
            {t("navWork")}
          </a>
          {session && (
            <a href={localizePath("/conta", locale)} onClick={() => setOpen(false)}>
              {t("account")}
            </a>
          )}
          <a
            className="eng-btn eng-btn-primary"
            href={to("orcamento")}
            onClick={() => {
              trackCta("header_contato", { origem: "mobile" });
              setOpen(false);
            }}
          >
            {t("cta")}
          </a>
        </div>
      </div>
    </header>
  );
}
