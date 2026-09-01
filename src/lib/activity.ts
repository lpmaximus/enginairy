/**
 * Log de atividade do usuário logado (analytics de produto).
 *
 * O GA4 conta visitante anônimo; isto responde "quem entrou e o que fez".
 * Regras que valem para tudo que grava aqui:
 *  - só usuário autenticado (nunca anônimo);
 *  - só eventos da whitelist abaixo — o client não define nomes de evento;
 *  - nunca guarda IP, user-agent ou identificador de rastreamento;
 *  - falha de gravação NUNCA quebra a ação do usuário (best effort).
 */
import { db, userActivity, users } from "@/src/db";
import { eq, sql } from "drizzle-orm";

export const ACTIVITY_EVENTS = [
  "login",
  "project_create",
  "project_open",
  "room_edit",
  "calc_run",
  "memorial_generate",
  "memorial_download",
  "equipment_select",
  "org_invite",
  "plan_view",
] as const;

export type ActivityEvent = (typeof ACTIVITY_EVENTS)[number];

export const EVENT_LABELS: Record<ActivityEvent, string> = {
  login: "Entrou no sistema",
  project_create: "Criou projeto",
  project_open: "Abriu projeto",
  room_edit: "Editou ambiente",
  calc_run: "Rodou cálculo",
  memorial_generate: "Emitiu memorial",
  memorial_download: "Baixou memorial",
  equipment_select: "Selecionou equipamento",
  org_invite: "Convidou para o escritório",
  plan_view: "Viu a página de planos",
};

export function isActivityEvent(v: unknown): v is ActivityEvent {
  return typeof v === "string" && (ACTIVITY_EVENTS as readonly string[]).includes(v);
}

export async function track(
  userId: number,
  event: ActivityEvent,
  opts?: { projectId?: number | null; meta?: Record<string, unknown> },
): Promise<void> {
  try {
    await db.insert(userActivity).values({
      userId,
      event,
      projectId: opts?.projectId ?? null,
      meta: opts?.meta ?? null,
    });
    await db.update(users).set({ lastSeenAt: sql`now()` }).where(eq(users.id, userId));
  } catch (err) {
    console.error("[activity] falha ao gravar evento", event, err);
  }
}
