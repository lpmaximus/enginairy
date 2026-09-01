/**
 * Conteúdo do memorial — separado da renderização de propósito.
 *
 * DOCX e PDF renderam a MESMA estrutura. Sem esta camada, os dois formatos
 * divergem com o tempo e o cliente recebe um Word que não bate com o PDF
 * assinado; num documento de responsabilidade técnica isso não é detalhe.
 */
import type { EngineInput, EngineOutput } from "@/src/lib/engine/types";

export interface MemorialAuthor {
  name?: string | null;
  crea?: string | null;
  company?: string | null;
  email?: string | null;
}

export interface MemorialSection {
  heading: string;
  paragraphs?: string[];
  table?: { headers: string[]; rows: string[][] };
}

export interface MemorialContent {
  title: string;
  subtitle: string;
  issuedAt: Date;
  watermark: string | null;
  sections: MemorialSection[];
  footer: string;
}

const fmt = (v: number, digits = 0) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function buildMemorialContent(args: {
  input: EngineInput;
  output: EngineOutput;
  author: MemorialAuthor;
  version: number;
  /** Marca d'água do plano Free — ver FREE_TIER_WATERMARK em permissions.ts. */
  watermark?: boolean;
}): MemorialContent {
  const { input, output, author, version } = args;
  const issuedAt = new Date();

  const sections: MemorialSection[] = [];

  sections.push({
    heading: "1. Objeto",
    paragraphs: [
      `Este memorial descritivo apresenta o dimensionamento térmico do sistema de ` +
        `climatização do empreendimento "${input.projectName}"` +
        (input.client ? `, de propriedade de ${input.client}` : "") +
        (input.city ? `, situado em ${input.city}${input.uf ? `/${input.uf}` : ""}` : "") +
        ".",
      `Os cálculos seguem os critérios da ${input.normCode}, com validação ` +
        `normativa automatizada pelo Enginairy Core Engine (${output.engineVersion}).`,
    ],
  });

  sections.push({
    heading: "2. Condições de projeto",
    table: {
      headers: ["Parâmetro", "Valor"],
      rows: [
        ["Norma de referência", input.normCode],
        ["Tipologia da edificação", input.buildingType ?? "não informada"],
        ["TBS externa de projeto", `${input.designConditions.outdoorDb} °C`],
        ["TBU externa de projeto", `${input.designConditions.outdoorWb} °C`],
        ["Base climática", input.designConditions.reference ?? "não informada"],
        ["Altitude", input.designConditions.altitude != null ? `${input.designConditions.altitude} m` : "—"],
      ],
    },
  });

  sections.push({
    heading: "3. Carga térmica por ambiente",
    paragraphs: [
      "As parcelas abaixo estão discriminadas por origem do ganho, em watts, " +
        "conforme exigido para conferência do cálculo.",
    ],
    table: {
      headers: [
        "Ambiente",
        "Pessoas (W)",
        "Ilum. (W)",
        "Equip. (W)",
        "Envolt. (W)",
        "Ar ext. (W)",
        "Total (W)",
        "TR",
      ],
      rows: output.rooms.map((r) => [
        r.name,
        fmt(r.loads.people),
        fmt(r.loads.lighting),
        fmt(r.loads.equipment),
        fmt(r.loads.envelope),
        fmt(r.loads.ventilation),
        fmt(r.loads.total),
        fmt(r.capacityTr, 2),
      ]),
    },
  });

  sections.push({
    heading: "4. Vazões de ar",
    table: {
      headers: ["Ambiente", "Insuflamento (m³/h)", "Ar exterior (m³/h)", "Capacidade (BTU/h)"],
      rows: output.rooms.map((r) => [
        r.name,
        fmt(r.supplyAirflow),
        fmt(r.outdoorAirflow),
        fmt(r.capacityBtuh),
      ]),
    },
  });

  sections.push({
    heading: "5. Resumo do sistema",
    table: {
      headers: ["Grandeza", "Total"],
      rows: [
        ["Carga térmica total", `${fmt(output.totals.coolingLoad)} W`],
        ["Capacidade total", `${fmt(output.totals.capacityTr, 2)} TR`],
        ["Vazão total de insuflamento", `${fmt(output.totals.supplyAirflow)} m³/h`],
        ["Vazão total de ar exterior", `${fmt(output.totals.outdoorAirflow)} m³/h`],
      ],
    },
  });

  const relevantes = output.warnings.filter((w) => w.severity !== "info");
  sections.push({
    heading: "6. Validação normativa",
    paragraphs: relevantes.length
      ? undefined
      : ["Nenhuma não-conformidade identificada nos parâmetros verificados automaticamente."],
    table: relevantes.length
      ? {
          headers: ["Código", "Severidade", "Ocorrência", "Referência"],
          rows: relevantes.map((w) => [
            w.code,
            w.severity === "error" ? "Não-conformidade" : "Atenção",
            w.message,
            w.reference ?? "—",
          ]),
        }
      : undefined,
  });

  sections.push({
    heading: "7. Premissas e limitações",
    paragraphs: [
      ...output.warnings.filter((w) => w.severity === "info").map((w) => `${w.code} — ${w.message}`),
      "Este documento é gerado automaticamente a partir dos dados de entrada " +
        "fornecidos pelo responsável técnico. A conferência dos dados de entrada e " +
        "a decisão final de projeto permanecem sob responsabilidade do engenheiro " +
        "signatário.",
    ],
  });

  const assinatura = [
    author.name ?? "",
    author.crea ? `CREA ${author.crea}` : "",
    author.company ?? "",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title: "Memorial descritivo de climatização",
    subtitle: `${input.projectName} — revisão ${version}`,
    issuedAt,
    watermark: args.watermark ? "AVALIAÇÃO — NÃO USAR PARA EXECUÇÃO" : null,
    sections,
    footer:
      `Emitido em ${issuedAt.toLocaleDateString("pt-BR")} por Enginairy ` +
      `(${output.engineVersion}, ${output.normCode}).` +
      (assinatura ? ` Responsável técnico: ${assinatura}.` : ""),
  };
}
