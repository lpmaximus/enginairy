import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { alternatesFor } from "@/src/lib/seo";
import { localizePath } from "@/src/i18n/localizePath";
import type { Locale } from "@/src/i18n/routing";
import ShotLightbox from "@/app/components/ShotLightbox";

/**
 * Prova técnica: os projetos industriais que sustentam a promessa da home.
 *
 * As imagens vivem em /public/projetos e são servidas com <img> comum (e não
 * next/image) pelo mesmo motivo do resto da landing: o tema é CSS puro e a
 * página é estática — o otimizador cobraria uma função serverless por foto
 * sem ganho real, já que os arquivos saem daqui em WebP e < 160 KB.
 *
 * Toda legenda vem de messages/*.json (namespace `work`), incluindo os títulos
 * de categoria. O array abaixo guarda só o que NÃO muda com o idioma: arquivo,
 * proporção de encaixe e as ferramentas (nome próprio de software não traduz).
 *
 * `fit: "contain"` é para prancha de CAD — cortar uma planta baixa em `cover`
 * esconde justamente o que prova o trabalho.
 */
type Shot = {
  key: string;
  file: string;
  fit: "cover" | "contain";
  tools: string;
  wide?: boolean;
};

type Block = { key: string; shots: Shot[] };

const BLOCKS: Block[] = [
  {
    key: "pumping",
    shots: [
      { key: "tailings", file: "bombeamento-rejeitos.webp", fit: "cover", tools: "AutoCAD" },
      { key: "boosting", file: "pressurizacao-agua-fria.webp", fit: "cover", tools: "Revit" },
    ],
  },
  {
    key: "structural",
    shots: [
      { key: "shed", file: "galpao-metalico-cype.webp", fit: "contain", tools: "CYPE 3D" },
      { key: "fops", file: "crash-test-fops.webp", fit: "contain", tools: "Nastran · Inventor · ISO 3449" },
      { key: "lug", file: "olhal-icamento.webp", fit: "contain", tools: "FEA · von Mises" },
      { key: "tower", file: "torre-iluminacao.webp", fit: "contain", tools: "Inventor" },
    ],
  },
  {
    key: "hvac",
    shots: [
      { key: "canteen", file: "hvac-refeitorio.webp", fit: "cover", tools: "Revit" },
      { key: "ducts", file: "hvac-refeitorio-dutos.webp", fit: "cover", tools: "Revit" },
      { key: "substation", file: "hvac-subestacao.webp", fit: "cover", tools: "Revit" },
    ],
  },
  {
    key: "mechanical",
    shots: [
      { key: "conveyor", file: "transportador-correias.webp", fit: "contain", tools: "Inventor" },
      { key: "gates", file: "comportas-efluentes.webp", fit: "cover", tools: "Revit" },
    ],
  },
  {
    key: "field",
    shots: [
      { key: "valves", file: "inspecao-valvulas.webp", fit: "cover", tools: "FAT · ASME", wide: true },
      { key: "gases", file: "gases-medicinais.webp", fit: "contain", tools: "AutoCAD · NBR 12188", wide: true },
    ],
  },
];

/** Recomendações públicas do LinkedIn. Nome e cargo são dados de terceiros e
 *  não passam por i18n; só o depoimento é traduzido (a nota `quoteLang` avisa
 *  ao leitor em que idioma ele foi escrito originalmente). */
const QUOTES = [
  { key: "afonso", name: "Afonso José Luciani Corrêa de Lima", role: "Diretor de Engenharia · Mestre em Eng. de Estruturas", origin: "pt" },
  { key: "fellipe", name: "Fellipe Godinho", role: "Project Manager, MBA · Mining Infrastructure", origin: "en" },
  { key: "adriano", name: "Adriano Otávio Oliveira", role: "Engenheiro Eletricista Master", origin: "pt" },
  { key: "pablo", name: "Pablo Lima", role: "Senior Mechanical Engineer · Process Control", origin: "pt" },
  { key: "gerbert", name: "Gerbert Mascarenhas", role: "Gerente Geral de Obras Industriais & EPCM · CREA-MG", origin: "pt" },
  { key: "fabricio", name: "Fabrício L. Miranda", role: "Coordenador de Planejamento · SALUM Construções", origin: "pt" },
] as const;

const LINKEDIN = "https://www.linkedin.com/in/engluizpaulojr/";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "work" });
  return {
    title: `${t("metaTitle")} — Enginairy`,
    description: t("metaDescription"),
    alternates: alternatesFor("/projetos-realizados", locale),
  };
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "work" });
  const home = locale === "pt" ? "/" : `/${locale}`;

  return (
    <div className="eng-root" id="top">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="eng-hero">
        <div className="eng-wrap eng-hero-inner">
          <p className="eng-eyebrow">{t("eyebrow")}</p>
          <h1>
            {t("heroTitleLine1")}
            <br />
            <span className="hl">{t("heroTitleHighlight")}</span>
          </h1>
          <p className="eng-lede">{t("heroLede")}</p>
          <p className="eng-hint">{t("heroNote")}</p>
          <div className="eng-hero-ctas">
            <a className="eng-btn eng-btn-primary" href={`${home}#orcamento`}>
              {t("cta")}
            </a>
            <a className="eng-btn eng-btn-ghost" href="#recomendacoes">
              {t("ctaSecondary")}
            </a>
          </div>
        </div>
      </div>

      {/* ── Faixa de disciplinas ─────────────────────────────────────── */}
      <div className="eng-strip">
        <div className="eng-wrap eng-strip-inner">
          {BLOCKS.map((b, i) => (
            <span key={b.key} style={{ display: "contents" }}>
              {i > 0 && <b>•</b>}
              <a href={`#${b.key}`}>{t(`${b.key}Strip`)}</a>
            </span>
          ))}
        </div>
      </div>

      {/* ── Galerias por disciplina ──────────────────────────────────── */}
      <section className="eng-section">
        <div className="eng-wrap eng-work">
          {BLOCKS.map((block) => (
            <div className="eng-work-block" id={block.key} key={block.key}>
              <div className="eng-work-head">
                <h2>{t(`${block.key}Title`)}</h2>
                <p>{t(`${block.key}Body`)}</p>
              </div>
              <div className="eng-work-grid">
                {block.shots.map((shot) => (
                  <figure
                    className={`eng-work-card${shot.wide ? " wide" : ""}`}
                    key={shot.key}
                  >
                    <a
                      className={`eng-shot ${shot.fit}`}
                      href={`/projetos/${shot.file}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t(`${shot.key}Title`)}
                      data-shot=""
                      data-caption={t(`${shot.key}Title`)}
                      data-body={t(`${shot.key}Body`)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/projetos/${shot.file}`} alt={t(`${shot.key}Title`)} loading="lazy" />
                    </a>
                    <figcaption>
                      <h3>{t(`${shot.key}Title`)}</h3>
                      <p>{t(`${shot.key}Body`)}</p>
                      <span className="eng-work-tools">{shot.tools}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recomendações do LinkedIn ────────────────────────────────── */}
      <section className="eng-section dark" id="recomendacoes">
        <div className="eng-wrap">
          <div className="eng-sec-head">
            <p className="eng-eyebrow on-dark">{t("quotesEyebrow")}</p>
            <h2>{t("quotesTitle")}</h2>
            <p className="eng-lede on-dark">{t("quotesLede")}</p>
          </div>
          <div className="eng-quotes">
            {QUOTES.map((q) => (
              <figure className="eng-quote" key={q.key}>
                <blockquote>{t(`${q.key}Quote`)}</blockquote>
                <figcaption>
                  <span className="n">{q.name}</span>
                  <span className="r">{q.role}</span>
                  {q.origin !== locale && (
                    <span className="tr">
                      {q.origin === "en" ? t("translatedFromEn") : t("translatedFromPt")}
                    </span>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="eng-hero-ctas eng-quotes-cta">
            <a
              className="eng-btn eng-btn-on-dark"
              href={`${LINKEDIN}details/recommendations/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("quotesCta")}
            </a>
          </div>
        </div>
      </section>

      {/* ── Chamada final ────────────────────────────────────────────── */}
      <section className="eng-section paper2">
        <div className="eng-wrap eng-sec-head">
          <p className="eng-eyebrow">{t("closingEyebrow")}</p>
          <h2>{t("closingTitle")}</h2>
          <p className="eng-lede">{t("closingBody")}</p>
          <div className="eng-hero-ctas">
            <a className="eng-btn eng-btn-accent" href={`${home}#orcamento`}>
              {t("cta")}
            </a>
            <a className="eng-btn eng-btn-ghost" href={localizePath("/sobre", locale)}>
              {t("closingCtaSecondary")}
            </a>
          </div>
        </div>
      </section>

      {/* Ilha cliente: o grid acima continua sendo renderizado no servidor. */}
      <ShotLightbox />
    </div>
  );
}
