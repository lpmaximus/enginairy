/**
 * Provider LOCAL do ECE — calcula no próprio runtime Node, sem worker externo.
 *
 * É o padrão do MVP: a carga térmica de um projeto de porte comum sai em
 * milissegundos e não justifica a complexidade de uma fila. O contrato
 * (EngineProvider) já prevê o worker para quando isso deixar de ser verdade —
 * simulação horária, otimização de sistema, geração em lote.
 *
 * MÉTODO: estimativa de primeira ordem por somatório de ganhos (pessoas,
 * iluminação, equipamentos, envoltória, ar exterior). NÃO é CLTD/RTS hora a
 * hora. O memorial declara isso; ver ENG-W010.
 */
import type {
  EngineInput,
  EngineOutput,
  EngineProvider,
  EngineWarning,
  RoomInput,
  RoomResult,
} from "./types";
import {
  getNorm,
  DEFAULT_LIGHTING_DENSITY,
  SOLAR_GAIN_BY_ORIENTATION,
} from "./nbr16401";

export const ENGINE_VERSION = "ece-1.0.0";

/** 1 TR = 3516,85 W. 1 W = 3,412142 BTU/h. */
const W_PER_TR = 3516.85;
const BTUH_PER_W = 3.412142;

/** Calor específico volumétrico do ar a ~20 °C: ~0,33 W·h/(m³·K). */
const AIR_CP_VOL = 0.33;

function num(v: number | undefined | null, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export class LocalEngineProvider implements EngineProvider {
  readonly name = "local";
  readonly version = ENGINE_VERSION;

  async run(input: EngineInput): Promise<EngineOutput> {
    const norm = getNorm(input.normCode);
    const warnings: EngineWarning[] = [];
    const rooms: RoomResult[] = [];

    if (input.rooms.length === 0) {
      warnings.push({
        roomId: null,
        severity: "error",
        code: "ENG-E001",
        message: "Projeto sem ambientes cadastrados — não há o que calcular.",
      });
    }

    for (const room of input.rooms) {
      rooms.push(this.calcRoom(room, input, norm, warnings));
    }

    const totals = rooms.reduce(
      (acc, r) => ({
        coolingLoad: acc.coolingLoad + r.loads.total,
        supplyAirflow: acc.supplyAirflow + r.supplyAirflow,
        outdoorAirflow: acc.outdoorAirflow + r.outdoorAirflow,
        capacityTr: acc.capacityTr + r.capacityTr,
      }),
      { coolingLoad: 0, supplyAirflow: 0, outdoorAirflow: 0, capacityTr: 0 },
    );

    // Aviso de método: sai em TODO memorial, de propósito. Quem assina precisa
    // saber o que está assinando, e o produto vende velocidade — não onisciência.
    warnings.push({
      roomId: null,
      severity: "info",
      code: "ENG-W010",
      message:
        "Cálculo por somatório de ganhos (estimativa de primeira ordem). Para " +
        "projeto executivo de grande porte, confirmar com simulação horária " +
        "(método RTS/CLTD).",
      reference: `${norm.code}`,
    });

    return {
      engineVersion: ENGINE_VERSION,
      normCode: norm.code,
      rooms,
      totals: {
        coolingLoad: round(totals.coolingLoad),
        supplyAirflow: round(totals.supplyAirflow),
        outdoorAirflow: round(totals.outdoorAirflow),
        capacityTr: round(totals.capacityTr, 2),
      },
      warnings,
    };
  }

  private calcRoom(
    room: RoomInput,
    input: EngineInput,
    norm: ReturnType<typeof getNorm>,
    warnings: EngineWarning[],
  ): RoomResult {
    const area = num(room.area, 0);
    const height = num(room.ceilingHeight, 2.7);
    const occupancy = num(room.occupancy, 0);

    const indoorDb = num(room.setpoints?.indoorDb, 24);
    const indoorRh = num(room.setpoints?.indoorRh, 50);
    const outdoorDb = num(input.designConditions?.outdoorDb, 32);

    // ── Validação normativa ──────────────────────────────────────────────
    if (area <= 0) {
      warnings.push({
        roomId: room.id,
        severity: "error",
        code: "ENG-E002",
        message: `Ambiente "${room.name}" sem área informada.`,
      });
    }
    if (indoorDb < norm.comfortDb[0] || indoorDb > norm.comfortDb[1]) {
      warnings.push({
        roomId: room.id,
        severity: "warning",
        code: "ENG-W001",
        message:
          `Temperatura interna de projeto (${indoorDb} °C) fora da faixa de ` +
          `conforto ${norm.comfortDb[0]}–${norm.comfortDb[1]} °C.`,
        reference: `${norm.code}-2, conforto térmico`,
      });
    }
    if (indoorRh < norm.comfortRh[0] || indoorRh > norm.comfortRh[1]) {
      warnings.push({
        roomId: room.id,
        severity: "warning",
        code: "ENG-W002",
        message:
          `Umidade relativa de projeto (${indoorRh}%) fora da faixa ` +
          `${norm.comfortRh[0]}–${norm.comfortRh[1]}%.`,
        reference: `${norm.code}-2, conforto térmico`,
      });
    }

    // ── Ganhos internos ──────────────────────────────────────────────────
    const people = occupancy * (norm.personSensible + norm.personLatent);

    const lightingDensity = num(
      room.internalLoads?.lightingDensity,
      DEFAULT_LIGHTING_DENSITY[input.buildingType ?? "comercial"] ?? 12,
    );
    const lighting = area * lightingDensity;

    const equipment = num(room.internalLoads?.equipment, 0);
    if (!room.internalLoads?.equipment) {
      warnings.push({
        roomId: room.id,
        severity: "info",
        code: "ENG-W003",
        message: `Carga de equipamentos não declarada em "${room.name}" — adotado 0 W.`,
      });
    }

    // ── Envoltória: condução pela parede + ganho solar pelo vidro ────────
    const deltaT = Math.max(0, outdoorDb - indoorDb);
    const wallArea = num(room.envelope?.wallArea, 0);
    const wallU = num(room.envelope?.wallU, 2.2);
    const conduction = wallArea * wallU * deltaT;

    const glazing = num(room.envelope?.glazingArea, 0);
    const shgc = num(room.envelope?.shgc, 0.65);
    const solarBase = SOLAR_GAIN_BY_ORIENTATION[room.envelope?.orientation ?? "N"] ?? 120;
    const solar = glazing * shgc * solarBase;

    const envelope = conduction + solar;

    // ── Ar exterior ──────────────────────────────────────────────────────
    // A norma pede o MAIOR entre a parcela por pessoa e a por área — adotar só
    // a por pessoa subdimensiona ambiente grande e pouco ocupado.
    const perPerson = num(room.setpoints?.outdoorAirPerPerson, norm.outdoorAirPerPerson);
    const outdoorAirflow = Math.max(occupancy * perPerson, area * norm.outdoorAirPerArea);

    // Carga do ar exterior tratado (só a parcela sensível na estimativa).
    const ventilation = outdoorAirflow * AIR_CP_VOL * deltaT;

    const total = people + lighting + equipment + envelope + ventilation;

    // ── Vazão de insuflamento ────────────────────────────────────────────
    // ΔT de insuflamento adotado: 11 K (padrão de projeto para conforto).
    const supplyDeltaT = 11;
    const supplyAirflow = total > 0 ? total / (AIR_CP_VOL * supplyDeltaT) : 0;

    if (supplyAirflow > 0 && outdoorAirflow / supplyAirflow > 0.5) {
      warnings.push({
        roomId: room.id,
        severity: "warning",
        code: "ENG-W004",
        message:
          `Ar exterior representa mais de 50% da vazão de insuflamento em ` +
          `"${room.name}" — avaliar recuperador de calor ou sistema dedicado (DOAS).`,
        reference: `${norm.code}-3, vazão de ar exterior`,
      });
    }

    const volume = area * height;
    const ach = volume > 0 ? supplyAirflow / volume : 0;
    if (ach > 0 && ach < 4) {
      warnings.push({
        roomId: room.id,
        severity: "info",
        code: "ENG-W005",
        message:
          `Trocas de ar em "${room.name}" (${ach.toFixed(1)} 1/h) abaixo de 4 1/h — ` +
          `verificar distribuição e risco de estratificação.`,
      });
    }

    return {
      roomId: room.id,
      name: room.name,
      loads: {
        people: round(people),
        lighting: round(lighting),
        equipment: round(equipment),
        envelope: round(envelope),
        ventilation: round(ventilation),
        total: round(total),
      },
      supplyAirflow: round(supplyAirflow),
      outdoorAirflow: round(outdoorAirflow),
      capacityTr: round(total / W_PER_TR, 2),
      capacityBtuh: round(total * BTUH_PER_W),
    };
  }
}

function round(v: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
