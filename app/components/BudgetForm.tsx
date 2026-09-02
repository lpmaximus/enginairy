"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { trackCta, type CtaId } from "@/src/lib/analytics";

/**
 * Reproduz o <script> do enginairylanding.html (linhas 675–745): os botões
 * "Enviar pelo WhatsApp" / "Enviar por e-mail" não são links estáticos — o
 * href é remontado a cada tecla digitada, embutindo nome/whatsapp/e-mail/
 * serviço/local/descrição na mensagem. Um clique sem nome, WhatsApp ou
 * descrição preenchidos é bloqueado e mostra o que falta.
 *
 * Todo texto visível (e a própria mensagem enviada) vem do namespace `form`
 * em messages/*.json: quem chega pelo /en escreve e envia em inglês.
 */

const WHATS_NUMBER = "5531998536281";
const MAIL_TO = "contato@l2techs.com";

const SERVICE_KEYS = [
  "service1",
  "service2",
  "service3",
  "service4",
  "service5",
  "service6",
  "service7",
] as const;

type Values = {
  nome: string;
  zap: string;
  email: string;
  tipo: string;
  local: string;
  desc: string;
};

export default function BudgetForm() {
  const t = useTranslations("form");

  const services = SERVICE_KEYS.map((k) => t(k));

  const [values, setValues] = useState<Values>({
    nome: "",
    zap: "",
    email: "",
    tipo: "",
    local: "",
    desc: "",
  });
  const [error, setError] = useState<string | null>(null);

  // `tipo` nasce vazio para o estado inicial não depender das traduções (que
  // só existem no render). Vazio = primeira opção, igual ao <select>.
  const tipo = values.tipo || services[0];

  function set<K extends keyof Values>(key: K, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (error) setError(null);
  }

  const texto = [
    t("msgIntro"),
    "",
    `${t("msgName")}: ${values.nome.trim() || "—"}`,
    `${t("msgWhatsapp")}: ${values.zap.trim() || "—"}`,
    `${t("msgEmail")}: ${values.email.trim() || "—"}`,
    `${t("msgService")}: ${tipo}`,
    `${t("msgLocation")}: ${values.local.trim() || "—"}`,
    "",
    t("msgProblem"),
    values.desc.trim() || "—",
  ].join("\n");

  const waHref = `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(texto)}`;
  const mailHref =
    `mailto:${MAIL_TO}` +
    `?subject=${encodeURIComponent(
      `${t("mailSubject")} — ${values.nome.trim() || t("mailSubjectFallback")}`,
    )}` +
    `&body=${encodeURIComponent(texto)}`;

  const faltando: string[] = [];
  if (!values.nome.trim()) faltando.push(t("missingName"));
  if (!values.zap.trim()) faltando.push(t("missingWhatsapp"));
  if (!values.desc.trim()) faltando.push(t("missingDesc"));

  /**
   * Bloqueia o envio incompleto e, quando o envio acontece, marca o CTA no
   * GA4. A ordem importa: só conta como conversão o clique que de fato abriu
   * o WhatsApp/e-mail — clique barrado por campo faltando é abandono, não
   * lead, e inflar isso estraga a taxa de conversão do painel.
   */
  function guard(e: React.MouseEvent<HTMLAnchorElement>, cta: CtaId) {
    if (faltando.length) {
      e.preventDefault();
      setError(`${t("missingPrefix")}: ${faltando.join(", ")}.`);
      return;
    }
    trackCta(cta, { servico: tipo });
  }

  return (
    <form className="eng-form" onSubmit={(e) => e.preventDefault()}>
      <div className="eng-field">
        <label htmlFor="f-nome">
          {t("nameLabel")} <span className="req">*</span>
        </label>
        <input
          id="f-nome"
          name="nome"
          type="text"
          placeholder={t("namePlaceholder")}
          autoComplete="name"
          required
          value={values.nome}
          onChange={(e) => set("nome", e.target.value)}
        />
      </div>
      <div className="eng-row2">
        <div className="eng-field">
          <label htmlFor="f-zap">
            {t("whatsappLabel")} <span className="req">*</span>
          </label>
          <input
            id="f-zap"
            name="whatsapp"
            type="tel"
            placeholder={t("whatsappPlaceholder")}
            autoComplete="tel"
            required
            value={values.zap}
            onChange={(e) => set("zap", e.target.value)}
          />
        </div>
        <div className="eng-field">
          <label htmlFor="f-email">{t("emailLabel")}</label>
          <input
            id="f-email"
            name="email"
            type="email"
            placeholder={t("emailPlaceholder")}
            autoComplete="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
      </div>
      <div className="eng-row2">
        <div className="eng-field">
          <label htmlFor="f-tipo">{t("serviceLabel")}</label>
          <select id="f-tipo" name="tipo" value={tipo} onChange={(e) => set("tipo", e.target.value)}>
            {services.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="eng-field">
          <label htmlFor="f-local">{t("locationLabel")}</label>
          <input
            id="f-local"
            name="local"
            type="text"
            placeholder={t("locationPlaceholder")}
            value={values.local}
            onChange={(e) => set("local", e.target.value)}
          />
        </div>
      </div>
      <div className="eng-field">
        <label htmlFor="f-desc">
          {t("descLabel")} <span className="req">*</span>
        </label>
        <textarea
          id="f-desc"
          name="descricao"
          placeholder={t("descPlaceholder")}
          required
          value={values.desc}
          onChange={(e) => set("desc", e.target.value)}
        />
      </div>
      <div className="eng-form-actions">
        <a
          className="eng-btn eng-btn-primary"
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={faltando.length > 0}
          onClick={(e) => guard(e, "orcamento_whatsapp")}
        >
          {t("sendWhatsapp")}
        </a>
        <a
          className="eng-btn eng-btn-ghost"
          href={mailHref}
          aria-disabled={faltando.length > 0}
          onClick={(e) => guard(e, "orcamento_email")}
        >
          {t("sendEmail")}
        </a>
      </div>
      {error && (
        <p className="eng-hint err" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
