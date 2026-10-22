import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { heroProfiles, users } from "@/db/schema";
import type { Role } from "@/lib/labels";
import type { registerSchema } from "@/lib/validation";
import type { z } from "zod";
import { logActivity } from "../activity";
import { homePathFor } from "../auth";
import { db, isUniqueViolation } from "../db";
import { getStaffEmails, mailTemplates, queueMails, toMany } from "../mail";
import { hashPassword, verifyPassword } from "../password";
import { createSession, destroySession } from "../session";
import { consumeUserToken, createUserToken } from "../tokens";
import { getBaseUrl } from "../url";
import { resetPassword } from "./account";
import { linkSubscriptionToUser } from "./newsletter";

type Registration = Omit<z.output<typeof registerSchema>, "passwordConfirmation" | "acceptTerms">;

/** Creates an inactive citizen account and emails the activation link (5.1). */
export async function registerUser(
  input: Registration,
): Promise<{ ok: true; userId: string; email: string } | { ok: false; error: string }> {
  const { password, ...profile } = input;
  const database = await db();
  let userId: string;
  try {
    const [created] = await database
      .insert(users)
      .values({ ...profile, passwordHash: await hashPassword(password), role: "CITIZEN" })
      .returning({ id: users.id });
    userId = created.id;
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "Un compte existe déjà avec cette adresse email." };
    throw error;
  }

  const [token, baseUrl, staff] = await Promise.all([
    createUserToken(userId, "ACCOUNT_ACTIVATION"),
    getBaseUrl(),
    getStaffEmails(),
  ]);
  await linkSubscriptionToUser(userId, profile.email);
  await logActivity({ actorId: userId, action: "user.register", entityType: "user", entityId: userId });
  queueMails([
    { to: profile.email, ...mailTemplates.activation(profile.firstName, `${baseUrl}/activation/${token}`) },
    ...toMany(staff, mailTemplates.moderatorsNewUser(profile, `${baseUrl}/admin/utilisateurs/${userId}`)),
  ]);
  return { ok: true, userId, email: profile.email };
}

/** Consumes an activation link. False when it is unknown, used or expired. */
export async function activateAccount(token: string): Promise<boolean> {
  const userId = await consumeUserToken(token, "ACCOUNT_ACTIVATION");
  if (!userId) return false;
  const database = await db();
  await database
    .update(users)
    .set({ emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` })
    .where(eq(users.id, userId));
  await logActivity({ actorId: userId, action: "user.activate", entityType: "user", entityId: userId });
  return true;
}

export type SignInResult =
  | { ok: true; user: { id: string; email: string; role: Role; isHero: boolean; isStaff: boolean }; homePath: string }
  | { ok: false; reason: "INVALID_CREDENTIALS" | "ACCOUNT_DISABLED" | "EMAIL_NOT_VERIFIED"; email?: string };

/** Checks the credentials (email, or alias for approved heroes) and opens a session. */
export async function signIn(identifier: string, password: string): Promise<SignInResult> {
  const database = await db();
  // Email for everyone, alias for approved heroes only (5.2).
  const byEmail = identifier.includes("@");
  const [user] = await database
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      disabledAt: users.disabledAt,
      heroStatus: heroProfiles.status,
    })
    .from(users)
    .leftJoin(heroProfiles, eq(heroProfiles.userId, users.id))
    .where(
      byEmail
        ? sql`lower(${users.email}) = lower(${identifier})`
        : and(sql`lower(${heroProfiles.alias}) = lower(${identifier})`, eq(heroProfiles.status, "APPROVED")),
    );

  if (!user) {
    // Same cost as a real check, so response time doesn't reveal accounts.
    await verifyPassword(password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }
  if (!(await verifyPassword(password, user.passwordHash))) return { ok: false, reason: "INVALID_CREDENTIALS" };
  if (user.disabledAt) return { ok: false, reason: "ACCOUNT_DISABLED" };
  if (!user.emailVerifiedAt) return { ok: false, reason: "EMAIL_NOT_VERIFIED", email: user.email };

  await createSession(user.id);
  await linkSubscriptionToUser(user.id, user.email);
  await logActivity({ actorId: user.id, action: "user.login", entityType: "user", entityId: user.id });

  const isHero = user.role === "HERO" && user.heroStatus === "APPROVED";
  const isStaff = user.role === "MODERATOR" || user.role === "ADMIN";
  return { ok: true, user: { id: user.id, email: user.email, role: user.role, isHero, isStaff }, homePath: homePathFor({ isHero, isStaff }) };
}

export const signOut = destroySession;

/** Sends a new activation link if the account exists and isn't active yet. */
export async function resendActivation(email: string): Promise<void> {
  const database = await db();
  const [user] = await database
    .select({ id: users.id, firstName: users.firstName, emailVerifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`);
  if (!user || user.emailVerifiedAt) return;
  const [token, baseUrl] = await Promise.all([createUserToken(user.id, "ACCOUNT_ACTIVATION"), getBaseUrl()]);
  queueMails([{ to: email, ...mailTemplates.activation(user.firstName, `${baseUrl}/activation/${token}`) }]);
}

/** Emails a reset link (valid 1 h) if an enabled account uses this address. */
export async function requestPasswordReset(email: string): Promise<void> {
  const database = await db();
  const [user] = await database
    .select({ id: users.id, firstName: users.firstName, disabledAt: users.disabledAt })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`);
  if (!user || user.disabledAt) return;
  const [token, baseUrl] = await Promise.all([createUserToken(user.id, "PASSWORD_RESET"), getBaseUrl()]);
  queueMails([
    { to: email, ...mailTemplates.passwordReset(user.firstName, `${baseUrl}/reinitialiser-mot-de-passe/${token}`) },
  ]);
}

/** Sets a new password from a reset link. False when the link is unknown, used or expired. */
export async function completePasswordReset(token: string, password: string): Promise<boolean> {
  const userId = await consumeUserToken(token, "PASSWORD_RESET");
  if (!userId) return false;
  await resetPassword(userId, password);
  return true;
}
