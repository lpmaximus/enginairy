/**
 * GET  /api/projects — projetos do usuário (próprios + do escritório).
 * POST /api/projects — cria projeto.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, projects } from "@/src/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { slugify } from "@/src/lib/projects";
import { track } from "@/src/lib/activity";
import { roleCan } from "@/src/lib/permissions";
import { isActiveOrgMember } from "@/src/lib/access";
import { DEFAULT_NORM } from "@/src/lib/engine";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const userId = Number(session.user.id);
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt))
    .limit(200);

  return NextResponse.json({ projects: rows });
}

const CreateBody = z.object({
  name: z.string().min(2).max(200),
  client: z.string().max(200).optional(),
  city: z.string().max(120).optional(),
  uf: z.string().length(2).optional(),
  buildingType: z.enum(["comercial", "hospitalar", "industrial", "residencial"]).optional(),
  normCode: z.string().max(40).optional(),
  designConditions: z
    .object({
      outdoorDb: z.number(),
      outdoorWb: z.number(),
      altitude: z.number().optional(),
      reference: z.string().optional(),
    })
    .optional(),
  orgId: z.number().int().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const userId = Number(session.user.id);

  const orgMember = await isActiveOrgMember(userId);
  if (!roleCan(session.user.role, "create_project", orgMember)) {
    return NextResponse.json({ error: "Plano não permite criar projeto" }, { status: 403 });
  }

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Slug único por dono: sufixa até achar um livre. Loop curto e determinístico
  // é preferível a random — o slug é parte da URL que o engenheiro compartilha.
  const base = slugify(body.name) || "projeto";
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const [clash] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);
    if (!clash) break;
    slug = `${base}-${i}`;
  }

  const [project] = await db
    .insert(projects)
    .values({
      userId,
      orgId: body.orgId ?? null,
      name: body.name,
      slug,
      client: body.client ?? null,
      city: body.city ?? null,
      uf: body.uf ?? null,
      buildingType: body.buildingType ?? "comercial",
      normCode: body.normCode ?? DEFAULT_NORM,
      designConditions: body.designConditions ?? null,
      status: "draft",
    })
    .returning();

  void track(userId, "project_create", { projectId: project.id });
  return NextResponse.json({ project }, { status: 201 });
}
