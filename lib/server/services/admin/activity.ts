import "server-only";
import { and, asc, desc, eq, like, type SQL, sql } from "drizzle-orm";
import { activityLogs, users } from "@/db/schema";
import type { Role } from "@/lib/labels";
import { db } from "../../db";

export type ActivityEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string; role: Role; avatarUrl: string | null } | null;
};

/** Filters offered on the supervision page (prefix of the action key). */
export const ACTIVITY_PREFIXES = [
  { value: "incident.", label: "Incidents" },
  { value: "user.", label: "Comptes" },
  { value: "email.", label: "Changements d'email" },
  { value: "hero.", label: "Super-héros" },
  { value: "review.", label: "Avis" },
  { value: "movie.", label: "Films" },
  { value: "villain.", label: "Vilains" },
  { value: "newsletter.", label: "Newsletter" },
  { value: "article.", label: "Blog" },
] as const;

export function isActivityPrefix(value: unknown): value is string {
  return ACTIVITY_PREFIXES.some((prefix) => prefix.value === value);
}

async function selectActivity(where: SQL | undefined, options: { limit: number; offset?: number; order?: "asc" | "desc" }) {
  const database = await db();
  const rows = await database
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
      actorId: users.id,
      actorFirstName: users.firstName,
      actorLastName: users.lastName,
      actorRole: users.role,
      actorAvatarUrl: users.avatarUrl,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.actorId, users.id))
    .where(where)
    .orderBy(options.order === "asc" ? asc(activityLogs.createdAt) : desc(activityLogs.createdAt))
    .limit(options.limit)
    .offset(options.offset ?? 0);
  return rows.map(
    (row): ActivityEntry => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt.toISOString(),
      actor: row.actorId
        ? {
            id: row.actorId,
            firstName: row.actorFirstName!,
            lastName: row.actorLastName!,
            role: row.actorRole!,
            avatarUrl: row.actorAvatarUrl,
          }
        : null,
    }),
  );
}

export async function listActivity(options: { page: number; pageSize: number; prefix: string | null }) {
  const database = await db();
  // `_` and `%` never appear in action keys, so the prefix can go straight into LIKE.
  const where = options.prefix ? like(activityLogs.action, `${options.prefix}%`) : undefined;
  const [entries, [{ total }]] = await Promise.all([
    selectActivity(where, { limit: options.pageSize, offset: (options.page - 1) * options.pageSize }),
    database.select({ total: sql<number>`count(*)::int` }).from(activityLogs).where(where),
  ]);
  return { entries, total };
}

export function listRecentActivity(limit = 8): Promise<ActivityEntry[]> {
  return selectActivity(undefined, { limit });
}

/** Chronological history of one entity (incident timeline…). */
export function listEntityActivity(entityType: string, entityId: string, limit = 50): Promise<ActivityEntry[]> {
  return selectActivity(and(eq(activityLogs.entityType, entityType), eq(activityLogs.entityId, entityId)), {
    limit,
    order: "asc",
  });
}

/** What a user did, or what was done to their account. */
export function listUserActivity(userId: string, limit = 12): Promise<ActivityEntry[]> {
  return selectActivity(
    sql`${activityLogs.actorId} = ${userId} or (${activityLogs.entityType} = 'user' and ${activityLogs.entityId} = ${userId})`,
    { limit },
  );
}
