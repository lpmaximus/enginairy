/**
 * GET   /api/admin/users  — lista da base, com busca e paginação.
 * PATCH /api/admin/users  — muda plano (role) ou status de UM usuário.
 *
 * O PATCH é deliberadamente estreito: só `role` e `status`, um usuário por
 * chamada. Editar perfil, CREA ou e-mail pelo painel é o caminho curto para
 * corromper dado que entra em memorial assinado — isso o próprio usuário faz
 * na conta dele.
 */
import { NextRequest, NextResponse } from "next/server";
import { db, users, projects, documents, subscriptions, orgMembers } from "@/src/db";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { isAdminRequest } from "@/src/lib/adminAuth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES = ["free", "pro", "escritorio", "enterprise", "admin"] as const;
const STATUSES = ["active", "blocked", "banned"] as const;

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const role = url.searchParams.get("role") ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

  const filters = [];
  if (q) filters.push(or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`)));
  if ((ROLES as readonly string[]).includes(role)) filters.push(eq(users.role, role));
  const where = filters.length ? and(...filters) : undefined;

  // Contagens por subquery correlacionada em vez de JOIN + GROUP BY: com dois
  // agregados diferentes (projetos e memoriais) o JOIN multiplica as linhas e
  // o total de memoriais sai inflado pelo número de projetos.
  const projectCount = sql<number>`(
    select count(*)::int from ${projects} where ${projects.userId} = ${users.id}
  )`;
  const memorialCount = sql<number>`(
    select count(*)::int from ${documents}
    join ${projects} p on p.id = ${documents.projectId}
    where p.user_id = ${users.id}
  )`;
  const orgCount = sql<number>`(
    select count(*)::int from ${orgMembers}
    where ${orgMembers.userId} = ${users.id} and ${orgMembers.status} = 'active'
  )`;

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        company: users.company,
        crea: users.crea,
        trialPlan: users.trialPlan,
        trialEndsAt: users.trialEndsAt,
        trialCredits: users.trialCredits,
        deletionScheduledAt: users.deletionScheduledAt,
        lastSeenAt: users.lastSeenAt,
        createdAt: users.createdAt,
        projetos: projectCount,
        memoriais: memorialCount,
        escritorios: orgCount,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ n: sql<number>`count(*)::int` }).from(users).where(where),
  ]);

  const [roleRows, statusRows, [assinantes]] = await Promise.all([
    db.select({ role: users.role, n: sql<number>`count(*)::int` }).from(users).groupBy(users.role),
    db
      .select({ status: users.status, n: sql<number>`count(*)::int` })
      .from(users)
      .groupBy(users.status),
    db
      .select({ n: sql<number>`count(distinct ${subscriptions.userId})::int` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active")),
  ]);

  return NextResponse.json({
    rows,
    total: total?.n ?? 0,
    limit,
    offset,
    resumo: {
      porRole: Object.fromEntries(roleRows.map((r) => [r.role, r.n])),
      porStatus: Object.fromEntries(statusRows.map((r) => [r.status, r.n])),
      assinantes: assinantes?.n ?? 0,
    },
  });
}

const Patch = z.object({
  id: z.number().int().positive(),
  role: z.enum(ROLES).optional(),
  status: z.enum(STATUSES).optional(),
});

export async function PATCH(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Payload inválido" }, { status: 400 });

  const { id, role, status } = parsed.data;
  if (!role && !status) {
    return NextResponse.json({ error: "Nada para alterar" }, { status: 400 });
  }

  // Rebaixar o último admin tranca todo mundo do lado de fora do painel.
  if (role && role !== "admin") {
    const [alvo] = await db.select({ role: users.role }).from(users).where(eq(users.id, id));
    if (alvo?.role === "admin") {
      const [{ n } = { n: 0 }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "admin"));
      if (n <= 1) {
        return NextResponse.json(
          { error: "Este é o último admin — promova outro antes de rebaixá-lo." },
          { status: 409 },
        );
      }
    }
  }

  const [updated] = await db
    .update(users)
    .set({ ...(role ? { role } : {}), ...(status ? { status } : {}) })
    .where(eq(users.id, id))
    .returning({ id: users.id, role: users.role, status: users.status });

  if (!updated) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true, user: updated });
}
