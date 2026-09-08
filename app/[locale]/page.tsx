import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/src/lib/seo";
import type { Locale } from "@/src/i18n/routing";
import BudgetForm from "@/app/components/BudgetForm";
import { localizePath } from "@/src/i18n/localizePath";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  return {
    title: `Enginairy — ${t("title")}`,
    description: t("subtitle"),
    alternates: alternatesFor("/", locale),
  };
}

const CATEGORY_KEYS = ["cat1", "cat2", "cat3", "cat4", "cat5", "cat6", "cat7"] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  return (
    <div className="eng-root" id="top">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="eng-hero">
        <div className="eng-wrap eng-hero-inner">
          <h1>
            {t("heroTitleLine1")}
            <br />
            <span className="hl">{t("heroTitleHighlight")}</span>
          </h1>
          <p className="eng-lede">{t("heroLede")}</p>
          <p className="eng-hint">{t("heroLedeNote")}</p>
          <div className="eng-hero-ctas">
            <a className="eng-btn eng-btn-primary" href="#orcamento" data-cta="hero_orcamento">
              {t("cta")}
            </a>
            <a className="eng-btn eng-btn-ghost" href="#como" data-cta="hero_como_funciona">
              {t("ctaSecondary")}
            </a>
          </div>
        </div>
      </div>

      {/* ── Faixa de categorias ──────────────────────────────────────── */}
      <div className="eng-strip">
        <div className="eng-wrap eng-strip-inner">
          {CATEGORY_KEYS.map((key, i) => (
            <span key={key} style={{ display: "contents" }}>
              {i > 0 && <b>•</b>}
              <span>{t(key)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── O que você recebe ────────────────────────────────────────── */}
      <section className="eng-section dark" id="entrega">
        <div className="eng-wrap eng-split">
          <div className="eng-sec-head">
            <p className="eng-eyebrow on-dark">{t("eyebrowWhatYouGet")}</p>
            <h2>{t("whatYouGet")}</h2>
            <p className="eng-lede on-dark">{t("whatYouGetSubtitle")}</p>
            <ul className="eng-checks">
              <li>{t("deliverable1")}</li>
              <li>{t("deliverable2")}</li>
              <li>{t("deliverable3")}</li>
              <li>{t("deliverable4")}</li>
            </ul>
          </div>
          <div className="eng-report">
            <div className="eng-report-top">
              <span className="t">{t("reportTitle")}</span>
              <span className="s">{t("reportStatus")}</span>
            </div>
            <div className="eng-rrow"><span className="k">{t("reportEnv")}</span><span className="v">{t("reportEnvValue")}</span></div>
            <div className="eng-rrow"><span className="k">{t("reportOrientation")}</span><span className="v">{t("reportOrientationValue")}</span></div>
            <div className="eng-rrow"><span className="k">{t("reportHeightLabel")}</span><span className="v">{t("reportHeightValue")}</span></div>
            <div className="eng-rrow"><span className="k">{t("reportOccupancy")}</span><span className="v">{t("reportOccupancyValue")}</span></div>
            <div className="eng-rrow"><span className="k">{t("reportHeat")}</span><span className="v">{t("reportHeatValue")}</span></div>
            <div className="eng-rrow big"><span className="k">{t("reportCapacity")}</span><span className="v">{t("reportCapacityValue")}</span></div>
            <p className="eng-report-foot">{t("reportFooter")}</p>
          </div>
        </div>
      </section>

      {/* ── Como funciona ────────────────────────────────────────────── */}
      <section className="eng-section" id="como">
        <div className="eng-wrap">
          <div className="eng-sec-head">
            <p className="eng-eyebrow">{t("eyebrowHowItWorks")}</p>
            <h2>{t("howItWorksTitle")}</h2>
          </div>
          <div className="eng-steps">
            <div className="eng-step">
              <span className="n">{t("step1Label")}</span>
              <h3>{t("step1Title")}</h3>
              <p>{t("step1Body")}</p>
            </div>
            <div className="eng-step">
              <span className="n">{t("step2Label")}</span>
              <h3>{t("step2Title")}</h3>
              <p>{t("step2Body")}</p>
            </div>
            <div className="eng-step">
              <span className="n">{t("step3Label")}</span>
              <h3>{t("step3Title")}</h3>
              <p>{t("step3Body")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quem faz o cálculo ───────────────────────────────────────── */}
      <section className="eng-section paper2" id="quem">
        <div className="eng-wrap eng-who">
          <div className="eng-who-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/luiz-paulo.jpg"
              alt={t("whoMakesSignature")}
              width={440}
              height={440}
            />
          </div>
          <div className="eng-sec-head">
            <p className="eng-eyebrow">{t("eyebrowWho")}</p>
            <h2>{t("whoMakesTitle")}</h2>
            <p className="eng-lede">{t("whoMakesBody")}</p>
            <p className="eng-sig">{t("whoMakesSignature")}</p>
            <a
              className="eng-linkedin"
              href="https://www.linkedin.com/in/engluizpaulojr/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.03-1.85-3.03-1.86 0-2.14 1.45-2.14 2.94v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.62-1.85 3.34-1.85 3.58 0 4.24 2.35 4.24 5.41v6.33zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
              </svg>
              {t("whoLinkedin")}
            </a>
            <div className="eng-who-stats">
              <div><span className="v">15+</span><span className="k">{t("whoStatYearsLabel")}</span></div>
              <div><span className="v">M.Sc.</span><span className="k">{t("whoStatMScLabel")}</span></div>
              <div><span className="v">CREA</span><span className="k">{t("whoStatCREALabel")}</span></div>
              <div><span className="v">Global</span><span className="k">{t("whoStatGlobalLabel")}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Para empresas e obras ────────────────────────────────────── */}
      <section className="eng-section dark">
        <div className="eng-wrap eng-split">
          <div className="eng-sec-head">
            <p className="eng-eyebrow on-dark">{t("eyebrowForCompanies")}</p>
            <h2>{t("forCompaniesTitle")}</h2>
            <p className="eng-lede on-dark">{t("forCompaniesBody")}</p>
            <div className="eng-pills">
              <span className="eng-pill on">{t("forCompaniesPill1")}</span>
              <span className="eng-pill">{t("forCompaniesPill2")}</span>
              <span className="eng-pill">{t("forCompaniesPill3")}</span>
              <span className="eng-pill">{t("forCompaniesPill4")}</span>
              <span className="eng-pill">{t("forCompaniesPill5")}</span>
              <span className="eng-pill">{t("forCompaniesPill6")}</span>
            </div>
            <div className="eng-credits">
              <span>SAP2000</span>
              <span>Inventor</span>
              <span>CYPE 3D</span>
              <span>AutoCAD</span>
              <span>ABNT · AISC · ASME · Eurocode</span>
            </div>
            <div className="eng-hero-ctas">
              <a className="eng-btn eng-btn-on-dark" href="#orcamento" data-cta="planos_falar">
                {t("forCompaniesCta")}
              </a>
              {/* Segunda porta para a prova técnica: quem chega por aqui está
                  avaliando se a engenharia existe, não o preço. */}
              <a
                className="eng-btn eng-btn-ghost-on-dark"
                href={localizePath("/projetos-realizados", locale)}
              >
                {t("forCompaniesWorkCta")}
              </a>
            </div>
          </div>
          <div className="eng-report">
            <div className="eng-report-top">
              <span className="t">{t("forCompaniesReport")}</span>
              <span className="s">{t("forCompaniesReport15Years")}</span>
            </div>
            <div className="eng-rrow"><span className="k">{t("reportMineral")}</span><span className="v">{t("reportMineralValue")}</span></div>
            <div className="eng-rrow"><span className="k">{t("reportRailway")}</span><span className="v">{t("reportRailwayValue")}</span></div>
            <div className="eng-rrow"><span className="k">{t("reportEnergy")}</span><span className="v">{t("reportEnergyValue")}</span></div>
            <div className="eng-rrow"><span className="k">{t("reportEducation")}</span><span className="v">{t("reportEducationValue")}</span></div>
            <div className="eng-rrow big"><span className="k">{t("reportAttendance")}</span><span className="v">{t("reportAttendanceValue")}</span></div>
            <p className="eng-report-foot">{t("reportFooterIndustrial")}</p>
          </div>
        </div>
      </section>

      {/* ── Serviços ─────────────────────────────────────────────────── */}
      <section className="eng-section" id="servicos">
        <div className="eng-wrap">
          <div className="eng-sec-head">
            <p className="eng-eyebrow">{t("eyebrowServices")}</p>
            <h2>{t("servicesTitle")}</h2>
          </div>
          <div className="eng-cards">
            <div className="eng-card feature">
              <span className="k">{t("cardTagResidential")}</span>
              <h3>{t("serviceResidentialTitle")}</h3>
              <p className="desc">{t("serviceResidentialDesc")}</p>
              <ul>
                <li>{t("serviceResidentialItem1")}</li>
                <li>{t("serviceResidentialItem2")}</li>
                <li>{t("serviceResidentialItem3")}</li>
                <li>{t("serviceResidentialItem4")}</li>
                <li>{t("serviceResidentialItem5")}</li>
                <li>{t("serviceResidentialItem6")}</li>
              </ul>
              <a className="eng-btn eng-btn-accent" href="#orcamento" data-cta="planos_pro">{t("cta")}</a>
            </div>
            <div className="eng-card">
              <span className="k">{t("cardTagTechnical")}</span>
              <h3>{t("serviceTechnicalTitle")}</h3>
              <p className="desc">{t("serviceTechnicalDesc")}</p>
              <ul>
                <li>{t("serviceTechnicalItem1")}</li>
                <li>{t("serviceTechnicalItem2")}</li>
                <li>{t("serviceTechnicalItem3")}</li>
                <li>{t("serviceTechnicalItem4")}</li>
                <li>{t("serviceTechnicalItem5")}</li>
                <li>{t("serviceTechnicalItem6")}</li>
              </ul>
              <a className="eng-btn eng-btn-ghost" href="#orcamento" data-cta="planos_escritorio">{t("cta")}</a>
            </div>
            <div className="eng-card">
              <span className="k">{t("cardTagProject")}</span>
              <h3>{t("serviceIndustrialTitle")}</h3>
              <p className="desc">{t("serviceIndustrialDesc")}</p>
              <ul>
                <li>{t("serviceIndustrialItem1")}</li>
                <li>{t("serviceIndustrialItem2")}</li>
                <li>{t("serviceIndustrialItem3")}</li>
                <li>{t("serviceIndustrialItem4")}</li>
                <li>{t("serviceIndustrialItem5")}</li>
                <li>{t("serviceIndustrialItem6")}</li>
              </ul>
              <a className="eng-btn eng-btn-ghost" href="#orcamento" data-cta="planos_enterprise">{t("cta")}</a>
            </div>
          </div>
          <p className="eng-cards-note">{t("servicesNote")}</p>
        </div>
      </section>

      {/* ── Chamada: dicas de ar-condicionado ───────────────────────── */}
      <section className="eng-section paper2">
        <div className="eng-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
          <div className="eng-sec-head" style={{ gap: 8 }}>
            <p className="eng-eyebrow">{t("tipsEyebrow")}</p>
            <h2 style={{ fontSize: 24 }}>{t("tipsTitle")}</h2>
            <p className="eng-lede" style={{ fontSize: 15.5 }}>{t("tipsLede")}</p>
          </div>
          <a
            className="eng-btn eng-btn-ghost"
            href={localizePath("/dicas-ar-condicionado", locale)}
            data-cta="home_dicas_ar_condicionado"
          >
            {t("tipsCta")}
          </a>
        </div>
      </section>

      {/* ── Orçamento ────────────────────────────────────────────────── */}
      <section className="eng-section eng-form-sec" id="orcamento">
        <div className="eng-wrap eng-form-grid">
          <div>
            <div className="eng-sec-head">
              <p className="eng-eyebrow">{t("eyebrowBudget")}</p>
              <h2>{t("budgetTitle")}</h2>
              <p className="eng-lede">{t("budgetSubtitle")}</p>
            </div>
            <div className="eng-contact-list">
              <a
                className="eng-contact-item"
                href={`https://wa.me/5531998536281?text=${encodeURIComponent(t("contactWhatsappPrefill"))}`}
                data-cta="footer_whatsapp"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="ci">WA</span>
                <span>
                  <span className="cl">{t("contactWhatsappLabel")}</span>
                  <br />
                  <span className="cv">+55 31 99853-6281</span>
                </span>
              </a>
              <a
                className="eng-contact-item"
                href={`mailto:contato@l2techs.com?subject=${encodeURIComponent(t("contactEmailSubject"))}`}
              >
                <span className="ci">@</span>
                <span>
                  <span className="cl">{t("contactEmailLabel")}</span>
                  <br />
                  <span className="cv">contato@l2techs.com</span>
                </span>
              </a>
            </div>
          </div>

          <BudgetForm />
        </div>
      </section>

      {/* ── Dúvidas frequentes ───────────────────────────────────────── */}
      <section className="eng-section" id="duvidas">
        <div className="eng-wrap">
          <div className="eng-sec-head">
            <p className="eng-eyebrow">{t("eyebrowFaq")}</p>
            <h2>{t("faqTitle")}</h2>
          </div>
          <div className="eng-faq">
            <details open>
              <summary>{t("faq1Q")}</summary>
              <p>{t("faq1A")}</p>
            </details>
            <details>
              <summary>{t("faq2Q")}</summary>
              <p>{t("faq2A")}</p>
            </details>
            <details>
              <summary>{t("faq3Q")}</summary>
              <p>{t("faq3A")}</p>
            </details>
            <details>
              <summary>{t("faq4Q")}</summary>
              <p>{t("faq4A")}</p>
            </details>
            <details>
              <summary>{t("faq5Q")}</summary>
              <p>{t("faq5A")}</p>
            </details>
            <details>
              <summary>{t("faq6Q")}</summary>
              <p>{t("faq6A")}</p>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
