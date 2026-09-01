/**
 * Coeficientes e limites da ABNT NBR 16401 usados pelo ECE.
 *
 * Ficam isolados aqui, e não espalhados no cálculo, por um motivo prático: no
 * dia em que a norma for revisada (ou o usuário escolher outra), a mudança tem
 * que caber num arquivo e ficar rastreável no diff. `NORMS` é a chave que
 * `calculations.normCode` grava — o memorial de ontem continua explicável
 * mesmo depois da atualização de hoje.
 */

export interface NormProfile {
  code: string;
  label: string;
  /** Ar exterior mínimo por pessoa (m³/h) — NBR 16401-3, nível 1. */
  outdoorAirPerPerson: number;
  /** Ar exterior mínimo por área (m³/h·m²) — parcela da própria edificação. */
  outdoorAirPerArea: number;
  /** Faixa de conforto de bulbo seco no verão (°C) — NBR 16401-2. */
  comfortDb: [number, number];
  /** Faixa de umidade relativa admissível (%). */
  comfortRh: [number, number];
  /** Calor sensível/latente por pessoa (W) em atividade de escritório. */
  personSensible: number;
  personLatent: number;
}

export const NORMS: Record<string, NormProfile> = {
  "ABNT NBR 16401": {
    code: "ABNT NBR 16401",
    label: "ABNT NBR 16401 (2008) — Instalações de ar-condicionado, sistemas centrais e unitários",
    outdoorAirPerPerson: 8.5,
    outdoorAirPerArea: 0.9,
    comfortDb: [22.5, 25.5],
    comfortRh: [40, 65],
    personSensible: 75,
    personLatent: 55,
  },
};

export const DEFAULT_NORM = "ABNT NBR 16401";

export function getNorm(code?: string | null): NormProfile {
  return NORMS[code ?? DEFAULT_NORM] ?? NORMS[DEFAULT_NORM];
}

/** Densidade de iluminação padrão por tipologia (W/m²), quando não declarada. */
export const DEFAULT_LIGHTING_DENSITY: Record<string, number> = {
  comercial: 12,
  hospitalar: 14,
  industrial: 10,
  residencial: 8,
};

/**
 * Ganho solar de referência por orientação (W/m² de vidro).
 *
 * ATENÇÃO: é um fator de PRÉ-DIMENSIONAMENTO, não o método CLTD/RTS hora a
 * hora. Serve para a estimativa que o produto entrega em minutos; um projeto
 * executivo de grande porte ainda pede a simulação completa, e o memorial diz
 * isso explicitamente. Ver o aviso ENG-W010 em local.ts.
 */
export const SOLAR_GAIN_BY_ORIENTATION: Record<string, number> = {
  N: 120,
  NE: 210,
  L: 350,
  SE: 280,
  S: 90,
  SO: 300,
  O: 380,
  NO: 250,
};
