/**
 * GET  /api/admin/messages — histórico de avisos + leads da lista de espera.
 * POST /api/admin/messages — envia notificação in-app.
 *
 * Alvo do POST: `all` (base inteira), um `role`, ou um `userId`. O envio grava
 * uma linha em `notifications` por destinatário — é o mesmo caminho que o
 * produto já usa, então o sininho do usuário funciona sem nada novo.
 *
 * O `link` é gravado em PORTUGUÊS e traduzido na leitura por localizePath:
 * gravar "/projects" aqui quebraria o assinante em pt (ver src/lib/notifications).
 */
import { NextRequest, NextResponse } from "next/server";
import { db, notifications, users, waitlist } from "@/src/db";
import { desc, eq, sql } from "drizzle-orm";
import { isAdminRequest } from "@/src/lib/adminAuth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const count = sql<number>`count(*)::int`;

  const [enviadas, leads, [totalLeads], [naoLidas], [alcance]] = await Promise.all([
    // Agrupado por título+data para o broadcast aparecer como UM envio, e não
    // como 400 linhas iguais.
    db
      .select({
        title: notifications.title,
        body: notifications.body,
        link: notifications.link,
        destinatarios: count,
        lidas: sql<number>`count(${notifications.readAt})::int`,
        enviadaEm: sql<string>`max(${notifications.createdAt})`,
      })
      .from(notifications)
      .groupBy(notifications.title, notifications.body, notifications.link)
      .orderBy(desc(sql`max(${notifications.createdAt})`))
      .limit(30),

    db
      .select({
        id: waitlist.id,
        email: waitlist.email,
        name: waitlist.name,
        company: waitlist.company,
        source: waitlist.source,
        createdAt: waitlist.createdAt,
      })
      .from(waitlist)
      .orderBy(desc(waitlist.createdAt))
      .limit(100),

    db.select({ n: count }).from(waitlist),
    db.select({ n: count }).from(notifications).where(sql`${notifications.readAt} is null`),
    db.select({ n: count }).from(users).where(eq(users.status, "active")),
  ]);

  return NextResponse.json({
    enviadas,
    leads,
    totalLeads: totalLeads?.n ?? 0,
    naoLidas: naoLidas?.n ?? 0,
    alcanceMaximo: alcance?.n ?? 0,
  });
}

const Body = z.object({
  title: z.string().min(3).max(200),
  body: z.string().max(2000).optional(),
  link: z.string().max(300).optional(),
  alvo: z.enum(["all", "role", "user"]),
  role: z.enum(["free", "pro", "escritorio", "enterprise", "admin"]).optional(),
  userId: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const { title, body, link, alvo, role, userId } = parsed.data;

  if (alvo === "role" && !role) {
    return NextResponse.json({ error: "Escolha o plano de destino" }, { status: 400 });
  }
  if (alvo === "user" && !userId) {
    return NextResponse.json({ error: "Escolha o usuário de destino" }, { status: 400 });
  }

  // Conta bloqueada/banida não recebe aviso: notificar quem foi barrado é
  // ruído para nós e provocação para ele.
  const base = db.select({ id: users.id }).from(users);
  const alvos =
    alvo === "user"
      ? await base.where(eq(users.id, userId!))
      : alvo === "role"
        ? await base.where(sql`${users.role} = ${role} and ${users.status} = 'active'`)
        : await base.where(eq(users.status, "active"));

  if (!alvos.length) {
    return NextResponse.json({ error: "Nenhum destinatário para esse alvo" }, { status: 400 });
  }

  // Insert em lote: uma ida ao banco, não uma por usuário.
  await db.insert(notifications).values(
    alvos.map((u) => ({
      userId: u.id,
      title,
      body: body ?? null,
      link: link ?? null,
    })),
  );

  return NextResponse.json({ ok: true, enviados: alvos.length });
}
