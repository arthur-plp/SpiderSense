import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import {
  emailChangeRequests,
  heroProfiles,
  newsletterSubscriptions,
  userAvatars,
  users,
} from "@/db/schema";
import { logActivity } from "../activity";
import { db, isUniqueViolation } from "../db";
import { getStaffEmails, mailTemplates, queueMails, toMany } from "../mail";
import { hashPassword, verifyPassword } from "../password";
import { destroyAllSessions } from "../session";
import { getBaseUrl } from "../url";

export type AccountDto = Awaited<ReturnType<typeof getAccount>>;

/** Everything shown on the profile page (5.7). */
export async function getAccount(userId: string) {
  const database = await db();
  const [user] = await database.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const [[hero], [pendingEmail], [subscription]] = await Promise.all([
    database.select().from(heroProfiles).where(eq(heroProfiles.userId, userId)),
    database
      .select({ newEmail: emailChangeRequests.newEmail, createdAt: emailChangeRequests.createdAt })
      .from(emailChangeRequests)
      .where(and(eq(emailChangeRequests.userId, userId), eq(emailChangeRequests.status, "PENDING"))),
    database
      .select({ id: newsletterSubscriptions.id, isEnabled: newsletterSubscriptions.isEnabled })
      .from(newsletterSubscriptions)
      .where(
        sql`${newsletterSubscriptions.userId} = ${userId} or lower(${newsletterSubscriptions.email}) = lower(${user.email})`,
      ),
  ]);
  const { passwordHash: _passwordHash, ...profile } = user;
  return {
    ...profile,
    hero: hero ?? null,
    pendingEmail: pendingEmail ?? null,
    newsletter: subscription ?? null,
  };
}

export type ContactInput = {
  phone: string;
  street: string;
  addressComplement: string | null;
  postalCode: string;
  city: string;
  country: string;
};

export async function updateContact(userId: string, input: ContactInput): Promise<void> {
  const database = await db();
  await database.update(users).set(input).where(eq(users.id, userId));
  await logActivity({ actorId: userId, action: "user.update", entityType: "user", entityId: userId });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const database = await db();
  const [user] = await database.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId));
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return { ok: false, error: "Le mot de passe actuel est incorrect." };
  }
  await database.update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, userId));
  return { ok: true };
}

/** Email changes need a moderator's approval (5.8.3 / 6.1.1). */
export async function requestEmailChange(userId: string, newEmail: string): Promise<{ ok: boolean; error?: string }> {
  const database = await db();
  const [taken] = await database
    .select({ id: users.id })
    .from(users)
    .where(and(sql`lower(${users.email}) = lower(${newEmail})`, ne(users.id, userId)));
  if (taken) return { ok: false, error: "Cette adresse email est déjà utilisée." };
  try {
    await database.insert(emailChangeRequests).values({ userId, newEmail });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "Une demande est déjà en attente de validation." };
    throw error;
  }
  await logActivity({ actorId: userId, action: "email.request", entityType: "user", entityId: userId, metadata: { newEmail } });
  return { ok: true };
}

export async function cancelEmailChange(userId: string): Promise<void> {
  const database = await db();
  await database
    .delete(emailChangeRequests)
    .where(and(eq(emailChangeRequests.userId, userId), eq(emailChangeRequests.status, "PENDING")));
}

const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const AVATAR_MAX_BYTES = 600 * 1024;

export async function setAvatar(userId: string, file: File): Promise<{ ok: boolean; error?: string }> {
  if (!AVATAR_TYPES.has(file.type)) return { ok: false, error: "Formats acceptés : JPEG, PNG ou WebP." };
  if (file.size === 0 || file.size > AVATAR_MAX_BYTES) return { ok: false, error: "L'image doit peser moins de 600 Ko." };
  const data = Buffer.from(await file.arrayBuffer());
  const database = await db();
  await database
    .insert(userAvatars)
    .values({ userId, mimeType: file.type, data })
    .onConflictDoUpdate({ target: userAvatars.userId, set: { mimeType: file.type, data, updatedAt: new Date() } });
  // Versioned URL so browsers drop the cached image.
  await database.update(users).set({ avatarUrl: `/api/avatars/${userId}?v=${Date.now()}` }).where(eq(users.id, userId));
  return { ok: true };
}

export async function removeAvatar(userId: string): Promise<void> {
  const database = await db();
  await database.delete(userAvatars).where(eq(userAvatars.userId, userId));
  await database.update(users).set({ avatarUrl: null }).where(eq(users.id, userId));
}

export async function getAvatar(userId: string) {
  const database = await db();
  const [avatar] = await database.select().from(userAvatars).where(eq(userAvatars.userId, userId));
  return avatar ?? null;
}

/** A citizen asks to be recognised as a hero; moderators decide (3.1.2). */
export async function applyAsHero(
  userId: string,
  input: { alias: string; powers: string[]; bio: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const database = await db();
  const [aliasTaken] = await database
    .select({ userId: heroProfiles.userId })
    .from(heroProfiles)
    .where(and(sql`lower(${heroProfiles.alias}) = lower(${input.alias})`, ne(heroProfiles.userId, userId)));
  if (aliasTaken) return { ok: false, error: "Ce nom de super-héros est déjà pris." };

  const [existing] = await database.select({ status: heroProfiles.status }).from(heroProfiles).where(eq(heroProfiles.userId, userId));
  if (existing?.status === "PENDING") return { ok: false, error: "Votre demande est déjà en cours d'examen." };
  if (existing?.status === "APPROVED") return { ok: false, error: "Vous êtes déjà reconnu comme super-héros." };

  const values = { alias: input.alias, powers: input.powers, bio: input.bio, status: "PENDING" as const, reviewedAt: null, reviewedBy: null };
  if (existing) {
    await database.update(heroProfiles).set(values).where(eq(heroProfiles.userId, userId));
  } else {
    await database.insert(heroProfiles).values({ userId, ...values });
  }
  await logActivity({ actorId: userId, action: "hero.apply", entityType: "user", entityId: userId, metadata: { alias: input.alias } });

  const [[user], baseUrl, staff] = await Promise.all([
    database.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, userId)),
    getBaseUrl(),
    getStaffEmails(),
  ]);
  queueMails(
    toMany(staff, mailTemplates.heroApplicationReceived(input.alias, `${user.firstName} ${user.lastName}`, `${baseUrl}/admin/demandes`)),
  );
  return { ok: true };
}

export async function updateHeroProfile(heroId: string, input: { bio: string | null; powers: string[] }): Promise<void> {
  const database = await db();
  await database.update(heroProfiles).set(input).where(eq(heroProfiles.userId, heroId));
  await logActivity({ actorId: heroId, action: "hero.update", entityType: "user", entityId: heroId });
}

/** Used after a password reset: every other device is signed out. */
export async function resetPassword(userId: string, newPassword: string): Promise<void> {
  const database = await db();
  await database
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` })
    .where(eq(users.id, userId));
  await destroyAllSessions(userId);
  await logActivity({ actorId: userId, action: "user.password_reset", entityType: "user", entityId: userId });
}
