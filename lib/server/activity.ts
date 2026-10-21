import "server-only";
import { activityLogs } from "@/db/schema";
import { db } from "./db";

/** Records an action in the moderators' supervision log. */
export async function logActivity(entry: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const database = await db();
  await database.insert(activityLogs).values({
    actorId: entry.actorId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    metadata: entry.metadata ?? null,
  });
}
