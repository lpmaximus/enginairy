/**
 * Acesso a projeto — quem pode ler/escrever o quê.
 *
 * Toca o banco: NÃO importar no client nem no proxy/edge.
 */
import { db, projects, orgMembers } from "@/src/db";
import { and, eq } from "drizzle-orm";

export type ProjectRow = typeof projects.$inferSelect;

/** Slug único por dono (não global): dois escritórios podem ter "torre-a". */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

/**
 * Devolve o projeto se o usuário pode vê-lo: é o dono, ou é membro ativo do
 * escritório a que o projeto pertence. Caso contrário, `null` — a rota
 * responde 404, não 403: confirmar a existência de um projeto alheio já é
 * vazamento (diz ao curioso que aquele id existe).
 */
export async function getProjectForUser(
  projectId: number,
  userId: number,
): Promise<ProjectRow | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) return null;
  if (project.userId === userId) return project;

  if (project.orgId) {
    const [member] = await db
      .select({ id: orgMembers.id })
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.orgId, project.orgId),
          eq(orgMembers.userId, userId),
          eq(orgMembers.status, "active"),
        ),
      )
      .limit(1);
    if (member) return project;
  }

  return null;
}
