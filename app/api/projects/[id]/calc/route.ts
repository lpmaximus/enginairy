/**
 * POST /api/projects/[id]/calc — roda o ECE e grava uma nova revisão.
 *
 * NÃO consome cota: o que se vende é o memorial emitido, não o cálculo. Isso é
 * deliberado — cobrar por recálculo empurraria o engenheiro a revisar menos, o
 * oposto do que um produto de projeto deve incentivar.
 *
 * Cada execução cria uma linha NOVA em `calculations` com version+1. Resultado
 * de cálculo nunca é sobrescrito: é a base do memorial que alguém assinou.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, calculations, projects } from "@/src/db";
import { desc, eq } from "drizzle-orm";
import { getProjectForUser } from "@/src/lib/projects";
import { getEngineProvider } from "@/src/lib/engine";
import { buildEngineInput } from "@/src/lib/engine/input";
import { track } from "@/src/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const userId = Number(session.user.id);

  const project = await getProjectForUser(Number((await params).id), userId);
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  const input = await buildEngineInput(project.id);
  if (input.rooms.length === 0) {
    return NextResponse.json(
      { error: "Cadastre ao menos um ambiente antes de calcular." },
      { status: 400 },
    );
  }

  const engine = getEngineProvider();
  if (engine.name !== "local") {
    return NextResponse.json(
      { error: "Provider assíncrono: use a fila de emissão." },
      { status: 501 },
    );
  }

  const output = await engine.run(input);

  const [last] = await db
    .select({ version: calculations.version })
    .from(calculations)
    .where(eq(calculations.projectId, project.id))
    .orderBy(desc(calculations.version))
    .limit(1);

  const [calc] = await db
    .insert(calculations)
    .values({
      projectId: project.id,
      version: (last?.version ?? 0) + 1,
      normCode: output.normCode,
      engineVersion: output.engineVersion,
      inputSnapshot: input,
      results: output,
      warnings: output.warnings,
      totalCoolingLoad: String(output.totals.coolingLoad),
      totalAirflow: String(output.totals.supplyAirflow),
    })
    .returning();

  await db
    .update(projects)
    .set({ status: "calculated", updatedAt: new Date() })
    .where(eq(projects.id, project.id));

  void track(userId, "calc_run", { projectId: project.id, meta: { version: calc.version } });

  return NextResponse.json({ calculation: calc, output });
}
