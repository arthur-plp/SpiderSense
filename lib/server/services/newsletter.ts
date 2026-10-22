import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { newsletterSubscriptions, users } from "@/db/schema";
import { db } from "../db";
import { mailTemplates, queueMails } from "../mail";
import { getBaseUrl } from "../url";

/** Set after an anonymous sign-up so the footer form disappears (4.2). */
export const NEWSLETTER_COOKIE = "spidersense_newsletter";

export async function hasNewsletterCookie(): Promise<boolean> {
  return (await cookies()).get(NEWSLETTER_COOKIE)?.value === "1";
}

export async function setNewsletterCookie(): Promise<void> {
  (await cookies()).set(NEWSLETTER_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** Subscribes an email (linked to the matching account if any). Idempotent. */
export async function subscribe(email: string): Promise<{ created: boolean }> {
  const database = await db();
  const [account] = await database
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${email})`);
  const inserted = await database
    .insert(newsletterSubscriptions)
    .values({ email, userId: account?.id ?? null })
    .onConflictDoNothing()
    .returning({ unsubscribeToken: newsletterSubscriptions.unsubscribeToken });
  if (inserted.length === 0) return { created: false };
  const baseUrl = await getBaseUrl();
  queueMails([
    { to: email, ...mailTemplates.newsletterWelcome(`${baseUrl}/newsletter/desinscription/${inserted[0].unsubscribeToken}`) },
  ]);
  return { created: true };
}

/** Attaches an anonymous subscription made with the same email to the account. */
export async function linkSubscriptionToUser(userId: string, email: string): Promise<void> {
  const database = await db();
  await database
    .update(newsletterSubscriptions)
    .set({ userId })
    .where(and(sql`lower(${newsletterSubscriptions.email}) = lower(${email})`, isNull(newsletterSubscriptions.userId)));
}

export async function setSubscriptionEnabled(userId: string, enabled: boolean): Promise<void> {
  const database = await db();
  await database
    .update(newsletterSubscriptions)
    .set({ isEnabled: enabled })
    .where(eq(newsletterSubscriptions.userId, userId));
}

/** Unsubscribing deletes the row: nothing is kept (GDPR). */
export async function unsubscribeUser(userId: string): Promise<void> {
  const database = await db();
  await database.delete(newsletterSubscriptions).where(eq(newsletterSubscriptions.userId, userId));
}

export async function unsubscribeByToken(token: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return false;
  const database = await db();
  const deleted = await database
    .delete(newsletterSubscriptions)
    .where(eq(newsletterSubscriptions.unsubscribeToken, token))
    .returning({ id: newsletterSubscriptions.id });
  return deleted.length > 0;
}
