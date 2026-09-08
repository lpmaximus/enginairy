import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/src/lib/seo";
import { localizePath } from "@/src/i18n/localizePath";
import type { Locale } from "@/src/i18n/routing";

/**
 * Página de conteúdo (SEO/captação): diagnóstico rápido dos problemas mais
 * buscados de ar-condicionado + seção técnica que liga o sintoma a erro de
 * projeto, reforçando o produto (ECE / memorial de cálculo).
 *
 * FAQPage JSON-LD usa as mesmas 9 perguntas do acordeão — texto duplicado de
 * propósito (não link para o mesmo t()) porque o schema precisa do texto
 * puro, sem markup, no momento da renderização no servidor.
 */

const FAQ_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "acTips" });
  return {
    title: `${t("metaTitle")} — Enginairy`,
    description: t("metaDescription"),
    alternates: alternatesFor("/dicas-ar-condicionado", locale),
  };
}

export default async function AcTipsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "acTips" });

  const home = locale === "pt" ? "/" : `/${locale}`;
  const budgetHref = `${home}#orcamento`;
  const plansHref = localizePath("/planos", locale);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_IDS.map((n) => ({
      "@type": "Question",
      name: t(`faq${n}Q`),
      acceptedAnswer: { "@type": "Answer", text: t(`faq${n}A`) },
    })),
  };

  return (
    <div className="eng-root">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="eng-hero">
        <div className="eng-wrap eng-hero-inner">
          <p className="eng-eyebrow">{t("eyebrow")}</p>
          <h1>{t("heroTitle")}</h1>
          <p className="eng-lede">{t("heroLede")}</p>
          <p className="eng-hint">{t("heroNote")}</p>
        </div>
      </div>

      {/* ── Diagnóstico rápido ───────────────────────────────────────── */}
      <section className="eng-section" id="diagnostico">
        <div className="eng-wrap">
          <div className="eng-sec-head">
            <p className="eng-eyebrow">{t("diagEyebrow")}</p>
            <h2>{t("diagTitle")}</h2>
          </div>
          <div className="eng-faq">
            {FAQ_IDS.map((n, i) => (
              <details key={n} open={i === 0}>
                <summary>{t(`faq${n}Q`)}</summary>
                <p>{t(`faq${n}A`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Manutenção preventiva ────────────────────────────────────── */}
      <section className="eng-section dark" id="manutencao">
        <div className="eng-wrap">
          <div className="eng-sec-head">
            <p className="eng-eyebrow on-dark">{t("maintEyebrow")}</p>
            <h2>{t("maintTitle")}</h2>
            <p className="eng-lede on-dark">{t("maintLede")}</p>
          </div>
          <ul className="eng-checks" style={{ marginTop: 28, maxWidth: 640 }}>
            <li>{t("check1")}</li>
            <li>{t("check2")}</li>
            <li>{t("check3")}</li>
            <li>{t("check4")}</li>
            <li>{t("check5")}</li>
          </ul>
        </div>
      </section>

      {/* ── Para quem projeta ────────────────────────────────────────── */}
      <section className="eng-section" id="projeto">
        <div className="eng-wrap">
          <div className="eng-sec-head">
            <p className="eng-eyebrow">{t("designEyebrow")}</p>
            <h2>{t("designTitle")}</h2>
            <p className="eng-lede">{t("designLede")}</p>
          </div>
          <div className="eng-cards">
            <div className="eng-card">
              <span className="k">{t("card1K")}</span>
              <h3>{t("card1Title")}</h3>
              <p className="desc">{t("card1Desc")}</p>
            </div>
            <div className="eng-card">
              <span className="k">{t("card2K")}</span>
              <h3>{t("card2Title")}</h3>
              <p className="desc">{t("card2Desc")}</p>
            </div>
            <div className="eng-card">
              <span className="k">{t("card3K")}</span>
              <h3>{t("card3Title")}</h3>
              <p className="desc">{t("card3Desc")}</p>
            </div>
          </div>
          <p className="eng-cards-note">{t("designCtaNote")}</p>
          <a
            className="eng-btn eng-btn-accent"
            href={budgetHref}
            data-cta="dicas_ar_condicionado_projeto"
            style={{ marginTop: 24 }}
          >
            {t("designCta")}
          </a>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────── */}
      <section className="eng-section paper2">
        <div className="eng-wrap">
          <div className="eng-sec-head">
            <p className="eng-eyebrow">{t("finalEyebrow")}</p>
            <h2>{t("finalTitle")}</h2>
            <p className="eng-lede">{t("finalLede")}</p>
          </div>
          <div className="eng-hero-ctas" style={{ marginTop: 28 }}>
            <a
              className="eng-btn eng-btn-primary"
              href={budgetHref}
              data-cta="dicas_ar_condicionado_orcamento"
            >
              {t("ctaPrimary")}
            </a>
            <a className="eng-btn eng-btn-ghost" href={plansHref} data-cta="dicas_ar_condicionado_planos">
              {t("ctaSecondary")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
