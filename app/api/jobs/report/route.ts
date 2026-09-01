/**
 * Cron 2x/semana: resumo operacional por e-mail.
 * Números crus, sem interpretação — quem lê é quem toca o produto.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, projects, documents, users } from "@/src/db";
import { gte, sql } from "drizzle-orm";
import { isCronRequest } from "@/src/lib/cron";
import { sendMail } from "@/src/lib/mailer";

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const since = new Date(Date.now() - 7 * 864e5);
  const count = async (table: typeof projects | typeof documents | typeof users, col: never) => {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(table)
      .where(gte(col, since));
    return row?.n ?? 0;
  };

  const novosProjetos = await count(projects, projects.createdAt as never);
  const memoriais = await count(documents, documents.createdAt as never);
  const novosUsuarios = await count(users, users.createdAt as never);

  const html =
    `<h2>Enginairy — últimos 7 dias</h2><ul>` +
    `<li>Novos usuários: ${novosUsuarios}</li>` +
    `<li>Projetos criados: ${novosProjetos}</li>` +
    `<li>Memoriais emitidos: ${memoriais}</li>` +
    `</ul>`;

  const to = process.env.INTERNAL_TEST_EMAILS?.split(",")[0]?.trim();
  if (to) await sendMail({ to, subject: "Enginairy — resumo semanal", html });

  return NextResponse.json({ ok: true, novosUsuarios, novosProjetos, memoriais });
}
