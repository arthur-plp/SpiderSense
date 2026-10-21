import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { after } from "next/server";
import nodemailer, { type Transporter } from "nodemailer";
import { getDb } from "@/db";
import { heroProfiles, mailOutbox, users } from "@/db/schema";
import { db } from "../db";
import type { MailContent } from "./templates";

export { mailTemplates } from "./templates";

export type MailMessage = MailContent & { to: string };

const globalForMail = globalThis as unknown as { heroSosTransport?: Transporter };

/** Without SMTP_URL, emails go to the in-app preview mailbox (/dev/mails). */
export const isMailPreviewMode = () => !process.env.SMTP_URL;

async function deliver(message: MailMessage): Promise<void> {
  if (process.env.SMTP_URL) {
    globalForMail.heroSosTransport ??= nodemailer.createTransport(process.env.SMTP_URL);
    await globalForMail.heroSosTransport.sendMail({
      from: process.env.MAIL_FROM ?? "Heros-SOS <no-reply@heros-sos.test>",
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return;
  }
  // Runs inside after(), where connection() isn't allowed: use getDb().
  const database = await getDb();
  await database.insert(mailOutbox).values({
    toEmail: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  console.info(`[mail] → ${message.to} — ${message.subject}`);
}

/** Sends once the response is on its way, so actions don't wait on SMTP. */
export function queueMails(messages: MailMessage[]): void {
  if (messages.length === 0) return;
  after(async () => {
    for (const message of messages) {
      try {
        await deliver(message);
      } catch (error) {
        console.error(`[mail] failed to send "${message.subject}" to ${message.to}`, error);
      }
    }
  });
}

export function toMany(recipients: string[], content: MailContent): MailMessage[] {
  return [...new Set(recipients)].map((to) => ({ to, ...content }));
}

export async function getStaffEmails(): Promise<string[]> {
  const database = await db();
  const rows = await database
    .select({ email: users.email })
    .from(users)
    .where(and(inArray(users.role, ["MODERATOR", "ADMIN"]), isNull(users.disabledAt)));
  return rows.map((row) => row.email);
}

export async function getHeroEmails(): Promise<string[]> {
  const database = await db();
  const rows = await database
    .select({ email: users.email })
    .from(users)
    .innerJoin(heroProfiles, eq(heroProfiles.userId, users.id))
    .where(
      and(eq(users.role, "HERO"), eq(heroProfiles.status, "APPROVED"), isNull(users.disabledAt)),
    );
  return rows.map((row) => row.email);
}
