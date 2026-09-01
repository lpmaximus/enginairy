/**
 * Contrato do ECE (Enginairy Core Engine).
 *
 * O resto do app importa SEMPRE daqui e de ./index — nunca da implementação
 * concreta. É o mesmo desenho de provider do backingtrack.store (separação de
 * stems): trocar "quem calcula" é instanciar outra classe na factory, sem
 * mexer em rota nenhuma.
 */

export interface DesignConditions {
  /** Temperatura de bulbo seco externa de projeto (°C). */
  outdoorDb: number;
  /** Temperatura de bulbo úmido externa de projeto (°C). */
  outdoorWb: number;
  altitude?: number;
  /** Cidade/base climática de referência — vai impresso no memorial. */
  reference?: string;
}

export interface RoomInput {
  id: number;
  name: string;
  floor?: string | null;
  /** m² */
  area: number;
  /** m */
  ceilingHeight: number;
  occupancy: number;
  internalLoads?: {
    /** W/m² de iluminação. */
    lightingDensity?: number;
    /** W totais de equipamentos. */
    equipment?: number;
  } | null;
  envelope?: {
    /** m² de vidro exposto. */
    glazingArea?: number;
    /** Fator solar do vidro (adimensional). */
    shgc?: number;
    /** Orientação predominante do vidro. */
    orientation?: "N" | "S" | "L" | "O" | "NE" | "NO" | "SE" | "SO";
    /** m² de parede externa. */
    wallArea?: number;
    /** U da parede (W/m²·K). */
    wallU?: number;
  } | null;
  setpoints?: {
    /** °C internos de projeto. */
    indoorDb?: number;
    /** % de umidade relativa. */
    indoorRh?: number;
    /** m³/h por pessoa de ar exterior. */
    outdoorAirPerPerson?: number;
  } | null;
}

export interface EngineInput {
  projectId: number;
  projectName: string;
  client?: string | null;
  city?: string | null;
  uf?: string | null;
  buildingType?: string | null;
  normCode: string;
  designConditions: DesignConditions;
  rooms: RoomInput[];
}

export interface RoomResult {
  roomId: number;
  name: string;
  /** Cargas em W, abertas por origem — é isso que o memorial precisa mostrar. */
  loads: {
    people: number;
    lighting: number;
    equipment: number;
    envelope: number;
    ventilation: number;
    total: number;
  };
  /** Vazão de insuflamento (m³/h). */
  supplyAirflow: number;
  /** Vazão mínima de ar exterior (m³/h) exigida pela norma. */
  outdoorAirflow: number;
  /** Capacidade sugerida em TR e BTU/h — a linguagem de quem compra máquina. */
  capacityTr: number;
  capacityBtuh: number;
}

export interface EngineWarning {
  /** Ambiente a que o aviso se refere; null = projeto inteiro. */
  roomId: number | null;
  /** info = observação; warning = revisar; error = não-conformidade. */
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  /** Cláusula da norma que sustenta o aviso — sem isso é opinião, não validação. */
  reference?: string;
}

export interface EngineOutput {
  engineVersion: string;
  normCode: string;
  rooms: RoomResult[];
  totals: {
    coolingLoad: number; // W
    supplyAirflow: number; // m³/h
    outdoorAirflow: number; // m³/h
    capacityTr: number;
  };
  warnings: EngineWarning[];
}

/**
 * Provider de cálculo. `run` é síncrono do ponto de vista do chamador quando o
 * provider é local; quando for worker externo, `run` só enfileira e o
 * resultado chega pelo webhook — por isso o retorno carrega `providerJobId`.
 */
export interface EngineProvider {
  readonly name: string;
  readonly version: string;
  /** Executa agora e devolve o resultado (provider local). */
  run(input: EngineInput): Promise<EngineOutput>;
  /** Enfileira em worker externo; resultado chega por webhook. */
  enqueue?(input: EngineInput, callbackUrl: string): Promise<{ providerJobId: string }>;
  verifyWebhook?(headers: Headers, rawBody: string): Promise<boolean>;
  parseWebhook?(rawBody: string): { providerJobId: string; output?: EngineOutput; error?: string };
}
