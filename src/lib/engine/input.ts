/**
 * Monta o EngineInput a partir das linhas do banco.
 *
 * Fica fora de local.ts de propósito: o motor não deve saber que existe
 * Drizzle. Aqui também acontece a conversão de `numeric` (string no driver
 * Postgres) para número — se isso vazar para o cálculo, "12" + 3 vira "123".
 */
import { db, projects, rooms } from "@/src/db";
import { asc, eq } from "drizzle-orm";
import type { EngineInput, RoomInput, DesignConditions } from "./types";

const DEFAULT_CONDITIONS: DesignConditions = {
  outdoorDb: 32,
  outdoorWb: 24,
  reference: "condição padrão adotada (não informada pelo usuário)",
};

function n(v: unknown, fallback: number): number {
  const parsed = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function buildEngineInput(projectId: number): Promise<EngineInput> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) throw new Error(`Projeto ${projectId} não encontrado`);

  const roomRows = await db
    .select()
    .from(rooms)
    .where(eq(rooms.projectId, projectId))
    .orderBy(asc(rooms.sortOrder));

  const mapped: RoomInput[] = roomRows.map((r) => ({
    id: r.id,
    name: r.name,
    floor: r.floor,
    area: n(r.area, 0),
    ceilingHeight: n(r.ceilingHeight, 2.7),
    occupancy: r.occupancy ?? 0,
    internalLoads: (r.internalLoads as RoomInput["internalLoads"]) ?? null,
    envelope: (r.envelope as RoomInput["envelope"]) ?? null,
    setpoints: (r.setpoints as RoomInput["setpoints"]) ?? null,
  }));

  return {
    projectId: project.id,
    projectName: project.name,
    client: project.client,
    city: project.city,
    uf: project.uf,
    buildingType: project.buildingType,
    normCode: project.normCode,
    designConditions:
      (project.designConditions as DesignConditions | null) ?? DEFAULT_CONDITIONS,
    rooms: mapped,
  };
}
