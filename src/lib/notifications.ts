/**
 * Notificações in-app. `link` é gravado como caminho em PORTUGUÊS e traduzido
 * na leitura por src/i18n/localizePath.ts — assinante em inglês não pode cair
 * numa URL que, com prefixo /en, não existe.
 */
import { db, notifications } from "@/src/db";
import { and, eq, isNull } from "drizzle-orm";

export async function createNotification(input: {
  userId: number;
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<void> {
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    });
  } catch (err) {
    console.error("[notifications] falha ao criar", err);
  }
}

export async function markRead(id: number, userId: number): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllRead(userId: number): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
