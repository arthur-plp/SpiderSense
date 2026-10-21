import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { mailOutbox } from "@/db/schema";
import { db } from "../db";
import { isMailPreviewMode } from "../mail";

/**
 * The demo mailbox shows every email the platform sends (activation and reset
 * links included), so it stays off in production unless explicitly enabled.
 */
export function isMailboxEnabled(): boolean {
  return (
    isMailPreviewMode() &&
    (process.env.NODE_ENV !== "production" || process.env.ENABLE_MAIL_PREVIEW === "true")
  );
}

export type MailboxEntry = { id: string; to: string; subject: string; createdAt: string };
export type MailboxMessage = MailboxEntry & { html: string; text: string };
export type MailboxRecipient = { email: string; count: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Stored emails, newest first, optionally for a single recipient. */
export async function listMailbox({ to, limit = 100 }: { to?: string | null; limit?: number } = {}): Promise<MailboxEntry[]> {
  const database = await db();
  const rows = await database
    .select({ id: mailOutbox.id, to: mailOutbox.toEmail, subject: mailOutbox.subject, createdAt: mailOutbox.createdAt })
    .from(mailOutbox)
    .where(to ? sql`lower(${mailOutbox.toEmail}) = lower(${to})` : undefined)
    .orderBy(desc(mailOutbox.createdAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}

/** Most recently contacted recipients, for the quick filters. */
export async function listMailboxRecipients(limit = 12): Promise<MailboxRecipient[]> {
  const database = await db();
  const email = sql<string>`lower(${mailOutbox.toEmail})`;
  return database
    .select({ email, count: sql<number>`count(*)::int` })
    .from(mailOutbox)
    .groupBy(email)
    .orderBy(desc(sql`max(${mailOutbox.createdAt})`))
    .limit(limit);
}

export async function getMailboxMessage(id: string): Promise<MailboxMessage | null> {
  if (!UUID.test(id)) return null;
  const database = await db();
  const [row] = await database
    .select({
      id: mailOutbox.id,
      to: mailOutbox.toEmail,
      subject: mailOutbox.subject,
      html: mailOutbox.html,
      text: mailOutbox.text,
      createdAt: mailOutbox.createdAt,
    })
    .from(mailOutbox)
    .where(eq(mailOutbox.id, id));
  return row ? { ...row, createdAt: row.createdAt.toISOString() } : null;
}
