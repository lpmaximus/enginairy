/**
 * GET /api/documents/[id]/download — devolve link assinado de 1 hora.
 *
 * O memorial NÃO é servido por URL pública permanente: traz nome do cliente,
 * endereço da obra e responsável técnico. Ver a nota em src/lib/r2.ts.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db, documents } from "@/src/db";
import { eq } from "drizzle-orm";
import { getProjectForUser } from "@/src/lib/projects";
import { presignGet } from "@/src/lib/r2";
import { track } from "@/src/lib/activity";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const userId = Number(session.user.id);

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, Number((await params).id)))
    .limit(1);
  if (!doc) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  const project = await getProjectForUser(doc.projectId, userId);
  if (!project) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });

  if (!doc.storageKey) {
    return NextResponse.json({ error: "Documento sem arquivo associado" }, { status: 409 });
  }

  const url = await presignGet(doc.storageKey, 3600);
  void track(userId, "memorial_download", { projectId: project.id });
  return NextResponse.json({ url, expiresIn: 3600 });
}
