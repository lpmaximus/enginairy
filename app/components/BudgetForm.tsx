"use client";

import { useState } from "react";

/**
 * Reproduz o <script> do enginairylanding.html (linhas 675–745): os botões
 * "Enviar pelo WhatsApp" / "Enviar por e-mail" não são links estáticos — o
 * href é remontado a cada tecla digitada, embutindo nome/whatsapp/e-mail/
 * serviço/local/descrição na mensagem. Um clique sem nome, WhatsApp ou
 * descrição preenchidos é bloqueado e mostra o que falta.
 */

const WHATS_NUMBER = "5531998536281";
const MAIL_TO = "contato@l2techs.com";

const SERVICE_OPTIONS = [
  "Ar-condicionado / climatização",
  "Bomba (jardim, cisterna, poço)",
  "Piscina (bomba, filtro, aquecimento)",
  "Pressurização / hidráulica",
  "Verificação estrutural / laudo",
  "Projeto industrial / estrutura metálica",
  "Outro — explico na descrição",
];

type Values = {
  nome: string;
  zap: string;
  email: string;
  tipo: string;
  local: string;
  desc: string;
};

const INITIAL: Values = {
  nome: "",
  zap: "",
  email: "",
  tipo: SERVICE_OPTIONS[0],
  local: "",
  desc: "",
};

function compose(v: Values): string {
  return [
    "Olá! Vim pelo site da Enginairy e gostaria de um orçamento.",
    "",
    `Nome: ${v.nome.trim() || "—"}`,
    `WhatsApp: ${v.zap.trim() || "—"}`,
    `E-mail: ${v.email.trim() || "—"}`,
    `Serviço: ${v.tipo}`,
    `Local: ${v.local.trim() || "—"}`,
    "",
    "Problema:",
    v.desc.trim() || "—",
  ].join("\n");
}

function missing(v: Values): string[] {
  const faltando: string[] = [];
  if (!v.nome.trim()) faltando.push("nome");
  if (!v.zap.trim()) faltando.push("WhatsApp");
  if (!v.desc.trim()) faltando.push("descrição do problema");
  return faltando;
}

export default function BudgetForm() {
  const [values, setValues] = useState<Values>(INITIAL);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Values>(key: K, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (error) setError(null);
  }

  const texto = compose(values);
  const waHref = `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(texto)}`;
  const mailHref =
    `mailto:${MAIL_TO}` +
    `?subject=${encodeURIComponent("Orçamento Enginairy — " + (values.nome.trim() || "novo pedido"))}` +
    `&body=${encodeURIComponent(texto)}`;
  const faltando = missing(values);

  function guard(e: React.MouseEvent<HTMLAnchorElement>) {
    if (faltando.length) {
      e.preventDefault();
      setError(`Falta preencher: ${faltando.join(", ")}.`);
    }
  }

  return (
    <form className="eng-form" onSubmit={(e) => e.preventDefault()}>
      <div className="eng-field">
        <label htmlFor="f-nome">
          Nome <span className="req">*</span>
        </label>
        <input
          id="f-nome"
          name="nome"
          type="text"
          placeholder="Como devo te chamar"
          autoComplete="name"
          required
          value={values.nome}
          onChange={(e) => set("nome", e.target.value)}
        />
      </div>
      <div className="eng-row2">
        <div className="eng-field">
          <label htmlFor="f-zap">
            WhatsApp <span className="req">*</span>
          </label>
          <input
            id="f-zap"
            name="whatsapp"
            type="tel"
            placeholder="(31) 99999-9999"
            autoComplete="tel"
            required
            value={values.zap}
            onChange={(e) => set("zap", e.target.value)}
          />
        </div>
        <div className="eng-field">
          <label htmlFor="f-email">E-mail</label>
          <input
            id="f-email"
            name="email"
            type="email"
            placeholder="voce@email.com"
            autoComplete="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
      </div>
      <div className="eng-row2">
        <div className="eng-field">
          <label htmlFor="f-tipo">Tipo de serviço</label>
          <select id="f-tipo" name="tipo" value={values.tipo} onChange={(e) => set("tipo", e.target.value)}>
            {SERVICE_OPTIONS.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="eng-field">
          <label htmlFor="f-local">Cidade / País</label>
          <input
            id="f-local"
            name="local"
            type="text"
            placeholder="Belo Horizonte, Brasil"
            value={values.local}
            onChange={(e) => set("local", e.target.value)}
          />
        </div>
      </div>
      <div className="eng-field">
        <label htmlFor="f-desc">
          Descreva o problema <span className="req">*</span>
        </label>
        <textarea
          id="f-desc"
          name="descricao"
          placeholder="Ex.: quarto de 14 m² no último andar, janela grande virada para o poente. Quero saber qual ar-condicionado comprar e se preciso trocar a fiação."
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
          onClick={guard}
        >
          Enviar pelo WhatsApp
        </a>
        <a
          className="eng-btn eng-btn-ghost"
          href={mailHref}
          aria-disabled={faltando.length > 0}
          onClick={guard}
        >
          Enviar por e-mail
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
