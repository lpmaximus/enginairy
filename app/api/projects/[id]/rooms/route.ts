/** GET/POST/PUT dos ambientes de um projeto. */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, rooms, projects } from "@/src/db";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getProjectForUser } from "@/src/lib/projects";
import { track } from "@/src/lib/activity";

type Params = { params: Promise<{ id: string }> };

const RoomBody = z.object({
  name: z.string().min(1).max(160),
  floor: z.string().max(60).nullable().optional(),
  area: z.number().positive(),
  ceilingHeight: z.number().positive().default(2.7),
  occupancy: z.number().int().min(0).default(0),
  internalLoads: z
    .object({ lightingDensity: z.number().min(0).optional(), equipment: z.number().min(0).optional() })
    .nullable()
    .optional(),
  envelope: z
    .object({
      glazingArea: z.number().min(0).optional(),
      shgc: z.number().min(0).max(1).optional(),
      orientation: z.enum(["N", "S", "L", "O", "NE", "NO", "SE", "SO"]).optional(),
      wallArea: z.number().min(0).optional(),
      wallU: z.number().min(0).optional(),
    })
    .nullable()
    .optional(),
  setpoints: z
    .object({
      indoorDb: z.number().optional(),
      indoorRh: z.number().min(0).max(100).optional(),
      outdoorAirPerPerson: z.number().min(0).optional(),
    })
    .nullable()
    .optional(),
  sortOrder: z.number().int().default(0),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const project = await getProjectForUser(Number((await params).id), Number(session.user.id));
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  const rows = await db
    .select()
    .from(rooms)
    .where(eq(rooms.projectId, project.id))
    .orderBy(asc(rooms.sortOrder));
  return NextResponse.json({ rooms: rows });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const userId = Number(session.user.id);

  const project = await getProjectForUser(Number((await params).id), userId);
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  const parsed = RoomBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }
  const b = parsed.data;

  const [room] = await db
    .insert(rooms)
    .values({
      projectId: project.id,
      name: b.name,
      floor: b.floor ?? null,
      // numeric() do Drizzle é string no driver — converter aqui evita
      // "invalid input syntax for type numeric" em runtime.
      area: String(b.area),
      ceilingHeight: String(b.ceilingHeight),
      occupancy: b.occupancy,
      internalLoads: b.internalLoads ?? null,
      envelope: b.envelope ?? null,
      setpoints: b.setpoints ?? null,
      sortOrder: b.sortOrder,
    })
    .returning();

  // Editar ambiente invalida o "calculado": o projeto volta a rascunho para
  // que ninguém emita memorial com número que não corresponde ao dado atual.
  if (project.status === "calculated") {
    await db.update(projects).set({ status: "draft", updatedAt: new Date() }).where(eq(projects.id, project.id));
  }

  void track(userId, "room_edit", { projectId: project.id });
  return NextResponse.json({ room }, { status: 201 });
}
