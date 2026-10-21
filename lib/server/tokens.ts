import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { userTokens } from "@/db/schema";
import { db } from "./db";

// Only hashes are stored: a database leak doesn't expose usable tokens.
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const generateToken = () => randomBytes(32).toString("base64url");

type TokenType = "ACCOUNT_ACTIVATION" | "PASSWORD_RESET";

const TOKEN_LIFETIME_MS: Record<TokenType, number> = {
  ACCOUNT_ACTIVATION: 7 * 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

export async function createUserToken(userId: string, type: TokenType): Promise<string> {
  const token = generateToken();
  const database = await db();
  await database.insert(userTokens).values({
    userId,
    type,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS[type]),
  });
  return token;
}

/** Marks the token as used and returns its user, or null if invalid/expired. */
export async function consumeUserToken(token: string, type: TokenType): Promise<string | null> {
  const database = await db();
  const [row] = await database
    .update(userTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(userTokens.tokenHash, hashToken(token)),
        eq(userTokens.type, type),
        isNull(userTokens.usedAt),
        gt(userTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: userTokens.userId });
  return row?.userId ?? null;
}

/** Checks a token without consuming it (to render the reset form). */
export async function isUserTokenValid(token: string, type: TokenType): Promise<boolean> {
  const database = await db();
  const [row] = await database
    .select({ id: userTokens.id })
    .from(userTokens)
    .where(
      and(
        eq(userTokens.tokenHash, hashToken(token)),
        eq(userTokens.type, type),
        isNull(userTokens.usedAt),
        gt(userTokens.expiresAt, new Date()),
      ),
    );
  return Boolean(row);
}
