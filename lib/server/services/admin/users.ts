import "server-only";
import { and, desc, eq, ilike, isNotNull, isNull, or, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { heroProfiles, sessions, users } from "@/db/schema";
import type { ReviewStatus, Role } from "@/lib/labels";
import { logActivity } from "../../activity";
import { db } from "../../db";
import { destroyAllSessions } from "../../session";
import type { MutationResult } from "../incidents";

export const ROLES: Role[] = ["CITIZEN", "HERO", "MODERATOR", "ADMIN"];
export const USER_STATUSES = {
  active: "Actifs",
  unactivated: "Non activés",
  verified: "Citoyens vérifiés",
  unverified: "À vérifier",
  disabled: "Désactivés",
} as const;
export type UserStatusFilter = keyof typeof USER_STATUSES;
export const USERS_PAGE_SIZE = 30;

export type UserFilters = { q: string; role: Role | null; status: UserStatusFilter | null; page: number };

export type AdminUserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  role: Role;
  avatarUrl: string | null;
  heroAlias: string | null;
  heroStatus: ReviewStatus | null;
  emailVerifiedAt: string | null;
  verifiedAt: string | null;
  disabledAt: string | null;
  createdAt: string;
};

/** Escapes LIKE wildcards typed by the moderator. */
const likePattern = (value: string) => `%${value.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

const STATUS_CONDITIONS: Record<UserStatusFilter, SQL> = {
  active: and(isNull(users.disabledAt), isNotNull(users.emailVerifiedAt))!,
  unactivated: isNull(users.emailVerifiedAt),
  verified: isNotNull(users.verifiedAt),
  unverified: and(eq(users.role, "CITIZEN"), isNull(users.verifiedAt), isNull(users.disabledAt))!,
  disabled: isNotNull(users.disabledAt),
};

export async function listAdminUsers(filters: UserFilters): Promise<{ rows: AdminUserRow[]; total: number }> {
  const database = await db();
  const pattern = filters.q ? likePattern(filters.q) : null;
  const where = and(
    pattern
      ? or(
          ilike(users.firstName, pattern),
          ilike(users.lastName, pattern),
          ilike(users.email, pattern),
          ilike(heroProfiles.alias, pattern),
          sql`(${users.firstName} || ' ' || ${users.lastName}) ilike ${pattern}`,
        )
      : undefined,
    filters.role ? eq(users.role, filters.role) : undefined,
    filters.status ? STATUS_CONDITIONS[filters.status] : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    database
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        city: users.city,
        role: users.role,
        avatarUrl: users.avatarUrl,
        heroAlias: heroProfiles.alias,
        heroStatus: heroProfiles.status,
        emailVerifiedAt: users.emailVerifiedAt,
        verifiedAt: users.verifiedAt,
        disabledAt: users.disabledAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(heroProfiles, eq(heroProfiles.userId, users.id))
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(USERS_PAGE_SIZE)
      .offset((filters.page - 1) * USERS_PAGE_SIZE),
    database
      .select({ total: sql<number>`count(*)::int` })
      .from(users)
      .leftJoin(heroProfiles, eq(heroProfiles.userId, users.id))
      .where(where),
  ]);

  return {
    total,
    rows: rows.map((row) => ({
      ...row,
      emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
      disabledAt: row.disabledAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

/** Who verified / disabled / reviewed the account, and how many devices are signed in. */
export async function getUserModeration(userId: string) {
  const database = await db();
  const verifier = alias(users, "verifier");
  const disabler = alias(users, "disabler");
  const [[row], [activeSessions]] = await Promise.all([
    database
      .select({
        verifiedByName: sql<string | null>`${verifier.firstName} || ' ' || ${verifier.lastName}`,
        disabledByName: sql<string | null>`${disabler.firstName} || ' ' || ${disabler.lastName}`,
      })
      .from(users)
      .leftJoin(verifier, eq(users.verifiedBy, verifier.id))
      .leftJoin(disabler, eq(users.disabledBy, disabler.id))
      .where(eq(users.id, userId)),
    database
      .select({ count: sql<number>`count(*)::int` })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), sql`${sessions.expiresAt} > now()`)),
  ]);
  return {
    verifiedByName: row?.verifiedByName ?? null,
    disabledByName: row?.disabledByName ?? null,
    activeSessions: activeSessions.count,
  };
}

async function getTarget(userId: string) {
  const database = await db();
  const [target] = await database
    .select({
      id: users.id,
      role: users.role,
      verifiedAt: users.verifiedAt,
      disabledAt: users.disabledAt,
      heroStatus: heroProfiles.status,
    })
    .from(users)
    .leftJoin(heroProfiles, eq(heroProfiles.userId, users.id))
    .where(eq(users.id, userId));
  return target ?? null;
}

type Actor = { id: string; role: Role };

/** "Citoyen vérifié" (6.1.1): the moderator checked the identity of the citizen. */
export async function verifyUser(userId: string, actor: Actor): Promise<MutationResult> {
  const database = await db();
  const [row] = await database
    .update(users)
    .set({ verifiedAt: new Date(), verifiedBy: actor.id })
    .where(and(eq(users.id, userId), isNull(users.verifiedAt)))
    .returning({ id: users.id });
  if (!row) return { ok: false, error: "Ce compte est déjà vérifié ou n'existe plus." };
  await logActivity({ actorId: actor.id, action: "user.verify", entityType: "user", entityId: userId });
  return { ok: true };
}

const isStaffRole = (role: Role) => role === "MODERATOR" || role === "ADMIN";

export async function setUserDisabled(userId: string, disabled: boolean, actor: Actor): Promise<MutationResult> {
  if (userId === actor.id) return { ok: false, error: "Vous ne pouvez pas désactiver votre propre compte." };
  const target = await getTarget(userId);
  if (!target) return { ok: false, error: "Ce compte n'existe plus." };
  if (isStaffRole(target.role) && actor.role !== "ADMIN") {
    return { ok: false, error: "Seul un administrateur peut désactiver ou réactiver un membre de l'équipe." };
  }
  if (Boolean(target.disabledAt) === disabled) return { ok: true };

  const database = await db();
  await database
    .update(users)
    .set(disabled ? { disabledAt: new Date(), disabledBy: actor.id } : { disabledAt: null, disabledBy: null })
    .where(eq(users.id, userId));
  // Signs the user out everywhere right away.
  if (disabled) await destroyAllSessions(userId);
  await logActivity({ actorId: actor.id, action: disabled ? "user.disable" : "user.enable", entityType: "user", entityId: userId });
  return { ok: true };
}

/** Roles an admin may give this account: HERO only once the hero profile is approved. */
export function assignableRoles(heroStatus: ReviewStatus | null): Role[] {
  return ROLES.filter((role) => role !== "HERO" || heroStatus === "APPROVED");
}

export async function changeUserRole(userId: string, role: Role, actor: Actor): Promise<MutationResult> {
  if (actor.role !== "ADMIN") return { ok: false, error: "Seul un administrateur peut changer un rôle." };
  if (userId === actor.id) return { ok: false, error: "Vous ne pouvez pas modifier votre propre rôle." };
  const target = await getTarget(userId);
  if (!target) return { ok: false, error: "Ce compte n'existe plus." };
  if (!assignableRoles(target.heroStatus).includes(role)) {
    return { ok: false, error: "Le rôle super-héros nécessite une demande de statut validée." };
  }
  if (target.role === role) return { ok: true };

  const database = await db();
  await database.update(users).set({ role }).where(eq(users.id, userId));
  await logActivity({
    actorId: actor.id,
    action: "user.role",
    entityType: "user",
    entityId: userId,
    metadata: { from: target.role, to: role },
  });
  return { ok: true };
}
