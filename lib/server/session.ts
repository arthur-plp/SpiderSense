import "server-only";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { sessions } from "@/db/schema";
import { db } from "./db";
import { generateToken, hashToken } from "./tokens";

export const SESSION_COOKIE = "hsos_session";
const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Opens a database session and sets the httpOnly cookie (Server Actions only). */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
  const requestHeaders = await headers();
  const database = await db();
  await database.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    ipAddress: requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 45) ?? null,
    userAgent: requestHeaders.get("user-agent"),
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const token = await readSessionToken();
  if (token) {
    const database = await db();
    await database.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  (await cookies()).delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string): Promise<void> {
  const database = await db();
  await database.delete(sessions).where(eq(sessions.userId, userId));
}
