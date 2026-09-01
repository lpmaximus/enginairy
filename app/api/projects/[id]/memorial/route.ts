/**
 * POST /api/projects/[id]/memorial — emite o memorial (PDF ou DOCX).
 *
 * É AQUI que a cota é debitada, e por isso a ordem importa:
 *   1. autorização e capability do plano;
 *   2. cota (assertQuota) — antes de qualquer trabalho caro;
 *   3. cria o processingJob (a linha que a cota conta);
 *   4. renderiza, sobe no R2, grava o documento;
 *   5. fecha o job e notifica.
 *
 * Se a renderização falhar, o job vira 'failed' — e job 'failed' NÃO conta na
 * cota (ver src/lib/quota.ts). O usuário não paga pelo nosso erro.
 */
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { auth } from "@/auth";
import { db, calculations, documents, processingJobs, projects, users } from "@/src/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getProjectForUser } from "@/src/lib/projects";
import { assertQuota, QuotaExceededError } from "@/src/lib/quota";
import { roleCan, FREE_TIER_WATERMARK } from "@/src/lib/permissions";
import { isActiveOrgMember } from "@/src/lib/access";
import { renderMemorial, MIME, type DocFormat } from "@/src/lib/documents";
import { putObject } from "@/src/lib/r2";
import { createNotification } from "@/src/lib/notifications";
import { track } from "@/src/lib/activity";
import type { EngineInput, EngineOutput } from "@/src/lib/engine/types";

type Params = { params: Promise<{ id: string }> };

const Body = z.object({ format: z.enum(["pdf", "docx"]).default("pdf") });

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const userId = Number(session.user.id);
  const role = session.user.role;

  const project = await getProjectForUser(Number((await params).id), userId);
  if (!project) return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  const format: DocFormat = parsed.success ? parsed.data.format : "pdf";

  const orgMember = await isActiveOrgMember(userId);
  if (!roleCan(role, "generate_memorial", orgMember)) {
    return NextResponse.json({ error: "Plano não permite emitir memorial" }, { status: 403 });
  }
  if (format === "docx" && !roleCan(role, "export_docx", orgMember)) {
    return NextResponse.json(
      { error: "DOCX editável disponível a partir do plano Pro." },
      { status: 402 },
    );
  }

  // Último cálculo — emitir sem calcular seria emitir um documento sem números.
  const [calc] = await db
    .select()
    .from(calculations)
    .where(eq(calculations.projectId, project.id))
    .orderBy(desc(calculations.version))
    .limit(1);
  if (!calc) {
    return NextResponse.json(
      { error: "Rode o cálculo antes de emitir o memorial." },
      { status: 409 },
    );
  }

  try {
    await assertQuota(userId);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return NextResponse.json({ error: err.message, quota: err.status }, { status: 429 });
    }
    throw err;
  }

  const [job] = await db
    .insert(processingJobs)
    .values({
      projectId: project.id,
      userId,
      kind: "memorial",
      status: "running",
      provider: "local",
      startedAt: new Date(),
    })
    .returning();

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const watermark = FREE_TIER_WATERMARK && !roleCan(role, "remove_watermark", orgMember);

    const bytes = await renderMemorial({
      input: calc.inputSnapshot as EngineInput,
      output: calc.results as EngineOutput,
      author: {
        name: user?.name,
        crea: user?.crea,
        company: user?.company,
        email: user?.email,
      },
      version: calc.version,
      format,
      watermark,
    });

    const key = `memoriais/${project.id}/v${calc.version}-${Date.now()}.${format}`;
    const url = await putObject(key, bytes, MIME[format]);
    const checksum = createHash("sha256").update(bytes).digest("hex");

    const [doc] = await db
      .insert(documents)
      .values({
        projectId: project.id,
        calculationId: calc.id,
        kind: "memorial",
        format,
        url,
        storageKey: key,
        bytes: bytes.byteLength,
        checksum,
      })
      .returning();

    await db
      .update(processingJobs)
      .set({ status: "done", finishedAt: new Date() })
      .where(eq(processingJobs.id, job.id));

    await db
      .update(projects)
      .set({ status: "issued", updatedAt: new Date() })
      .where(eq(projects.id, project.id));

    void createNotification({
      userId,
      title: "Memorial emitido",
      body: `${project.name} — revisão ${calc.version} (${format.toUpperCase()})`,
      link: `/projetos/${project.id}`,
    });
    void track(userId, "memorial_generate", {
      projectId: project.id,
      meta: { format, version: calc.version },
    });

    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err) {
    // Job 'failed' não conta cota — o usuário não paga pelo nosso erro.
    await db
      .update(processingJobs)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        finishedAt: new Date(),
      })
      .where(eq(processingJobs.id, job.id));

    console.error("[memorial] falha ao emitir", err);
    return NextResponse.json({ error: "Falha ao gerar o memorial." }, { status: 500 });
  }
}
