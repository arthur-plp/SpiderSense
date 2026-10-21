import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { newsletterSends, newsletterSubscriptions, newsletters, users } from "@/db/schema";
import { logActivity } from "../../activity";
import { db } from "../../db";
import { mailTemplates, queueMails } from "../../mail";
import { getBaseUrl } from "../../url";

export type NewsletterHistoryItem = {
  id: string;
  subject: string;
  contentHtml: string;
  authorName: string | null;
  createdAt: string;
  recipients: number;
};

export async function listNewsletterHistory(): Promise<NewsletterHistoryItem[]> {
  const database = await db();
  const rows = await database
    .select({
      id: newsletters.id,
      subject: newsletters.subject,
      contentHtml: newsletters.contentHtml,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      createdAt: newsletters.createdAt,
      recipients: sql<number>`(select count(*)::int from ${newsletterSends} where ${newsletterSends.newsletterId} = ${newsletters.id})`,
    })
    .from(newsletters)
    .leftJoin(users, eq(newsletters.createdBy, users.id))
    .orderBy(desc(newsletters.createdAt));
  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    contentHtml: row.contentHtml,
    authorName: row.authorFirstName ? `${row.authorFirstName} ${row.authorLastName}` : null,
    createdAt: row.createdAt.toISOString(),
    recipients: row.recipients,
  }));
}

export type Subscriber = {
  id: string;
  email: string;
  isEnabled: boolean;
  subscribedAt: string;
  user: { id: string; name: string } | null;
};

export async function listSubscribers(): Promise<Subscriber[]> {
  const database = await db();
  const rows = await database
    .select({
      id: newsletterSubscriptions.id,
      email: newsletterSubscriptions.email,
      isEnabled: newsletterSubscriptions.isEnabled,
      subscribedAt: newsletterSubscriptions.subscribedAt,
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(newsletterSubscriptions)
    .leftJoin(users, eq(newsletterSubscriptions.userId, users.id))
    .orderBy(desc(newsletterSubscriptions.subscribedAt));
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    isEnabled: row.isEnabled,
    subscribedAt: row.subscribedAt.toISOString(),
    user: row.userId ? { id: row.userId, name: `${row.firstName} ${row.lastName}` } : null,
  }));
}

/**
 * Records the newsletter and one send per recipient, then queues the emails.
 * `subscriptionId` null means every enabled subscriber.
 */
export async function sendNewsletter(
  input: { subject: string; contentHtml: string; subscriptionId: string | null },
  actorId: string,
): Promise<{ ok: true; recipients: number } | { ok: false; error: string }> {
  const database = await db();
  const targets = await database
    .select({
      id: newsletterSubscriptions.id,
      email: newsletterSubscriptions.email,
      unsubscribeToken: newsletterSubscriptions.unsubscribeToken,
    })
    .from(newsletterSubscriptions)
    .where(
      and(
        eq(newsletterSubscriptions.isEnabled, true),
        input.subscriptionId ? eq(newsletterSubscriptions.id, input.subscriptionId) : undefined,
      ),
    );
  if (targets.length === 0) {
    return {
      ok: false,
      error: input.subscriptionId ? "Cet abonné n'existe plus ou a désactivé la newsletter." : "Aucun abonné actif.",
    };
  }

  const newsletterId = await database.transaction(async (tx) => {
    const [created] = await tx
      .insert(newsletters)
      .values({ subject: input.subject, contentHtml: input.contentHtml, createdBy: actorId })
      .returning({ id: newsletters.id });
    await tx.insert(newsletterSends).values(targets.map((target) => ({ newsletterId: created.id, subscriptionId: target.id })));
    return created.id;
  });

  await logActivity({
    actorId,
    action: "newsletter.send",
    entityType: "newsletter",
    entityId: newsletterId,
    metadata: { subject: input.subject, recipients: targets.length },
  });
  const baseUrl = await getBaseUrl();
  queueMails(
    targets.map((target) => ({
      to: target.email,
      ...mailTemplates.newsletter(input.subject, input.contentHtml, `${baseUrl}/newsletter/desinscription/${target.unsubscribeToken}`),
    })),
  );
  return { ok: true, recipients: targets.length };
}
