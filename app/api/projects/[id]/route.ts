/** GET/PATCH/DELETE de um projeto. */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, projects, rooms, calculations, documents, auditLog } from "@/src/db";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getProjectForUser } from "@/src/lib/projects";
import { track } from "@/src/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const userId = Number(session.user.id);

  const project = await getProjectForUser(Number((await params).id), userId);
  // 404 e não 403 de propósito — ver comentário em getProjectForUser.
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  const [roomRows, calcRows, docRows] = await Promise.all([
    db.select().from(rooms).where(eq(rooms.projectId, project.id)).orderBy(asc(rooms.sortOrder)),
    db
      .select()
      .from(calculations)
      .where(eq(calculations.projectId, project.id))
      .orderBy(desc(calculations.version))
      .limit(20),
    db.select().from(documents).where(eq(documents.projectId, project.id)).orderBy(desc(documents.createdAt)),
  ]);

  void track(userId, "project_open", { projectId: project.id });
  return NextResponse.json({ project, rooms: roomRows, calculations: calcRows, documents: docRows });
}

const PatchBody = z.object({
  name: z.string().min(2).max(200).optional(),
  client: z.string().max(200).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  uf: z.string().length(2).nullable().optional(),
  buildingType: z.enum(["comercial", "hospitalar", "industrial", "residencial"]).optional(),
  normCode: z.string().max(40).optional(),
  designConditions: z.record(z.unknown()).optional(),
  status: z.enum(["draft", "calculated", "issued", "archived"]).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const userId = Number(session.user.id);

  const project = await getProjectForUser(Number((await params).id), userId);
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const [updated] = await db
    .update(projects)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(projects.id, project.id))
    .returning();

  // Trilha de auditoria: projeto já emitido que muda precisa deixar rastro de
  // quem mudou o quê. É o que sustenta a rastreabilidade prometida ao cliente.
  await db.insert(auditLog).values({
    projectId: project.id,
    userId,
    action: "project_update",
    before: project,
    after: updated,
  });

  return NextResponse.json({ project: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const userId = Number(session.user.id);

  const project = await getProjectForUser(Number((await params).id), userId);
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
  // Só o dono apaga. Membro do escritório edita, não destrói.
  if (project.userId !== userId) {
    return NextResponse.json({ error: "Apenas o dono pode excluir" }, { status: 403 });
  }

  await db.delete(projects).where(eq(projects.id, project.id));
  return NextResponse.json({ ok: true });
}
