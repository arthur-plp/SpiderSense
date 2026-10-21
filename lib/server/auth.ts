import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { heroProfiles, sessions, users } from "@/db/schema";
import type { ReviewStatus, Role } from "@/lib/labels";
import { db } from "./db";
import { readSessionToken } from "./session";
import { hashToken } from "./tokens";

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl: string | null;
  hero: { alias: string; status: ReviewStatus } | null;
  /** Role HERO and an approved hero profile. */
  isHero: boolean;
  isStaff: boolean;
};

/** Data Access Layer entry point: the signed-in user, or null. Deduped per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await readSessionToken();
  if (!token) return null;
  const database = await db();
  const [row] = await database
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      avatarUrl: users.avatarUrl,
      heroAlias: heroProfiles.alias,
      heroStatus: heroProfiles.status,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(heroProfiles, eq(heroProfiles.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        gt(sessions.expiresAt, new Date()),
        isNull(users.disabledAt),
      ),
    );
  if (!row) return null;
  const hero =
    row.heroAlias && row.heroStatus ? { alias: row.heroAlias, status: row.heroStatus } : null;
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    role: row.role,
    avatarUrl: row.avatarUrl,
    hero,
    isHero: row.role === "HERO" && hero?.status === "APPROVED",
    isStaff: row.role === "MODERATOR" || row.role === "ADMIN",
  };
});

/** Where a user lands after signing in. */
export function homePathFor(user: Pick<CurrentUser, "isHero" | "isStaff">): string {
  if (user.isStaff) return "/admin";
  if (user.isHero) return "/heros";
  return "/citoyen";
}

export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (roles && !roles.includes(user.role)) redirect(homePathFor(user));
  return user;
}

export async function requireHero(): Promise<CurrentUser> {
  const user = await requireUser(["HERO"]);
  if (!user.isHero) redirect("/citoyen");
  return user;
}

export function requireStaff(): Promise<CurrentUser> {
  return requireUser(["MODERATOR", "ADMIN"]);
}

/** Pages reserved to visitors (login, sign-up…) send signed-in users home. */
export async function redirectIfSignedIn(): Promise<void> {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user));
}
