import "server-only";
import { connection } from "next/server";
import { type Database, getDb } from "@/db";

/**
 * Database access for rendering, Server Actions and Route Handlers.
 * `connection()` keeps queries out of build-time prerendering: the data is
 * always read at request time. Inside `after()` callbacks, use `getDb()`.
 */
export async function db(): Promise<Database> {
  await connection();
  return getDb();
}

/** Postgres error code raised by unique indexes (e.g. one intervention per hero). */
export function isUniqueViolation(error: unknown): boolean {
  const code =
    (error as { code?: string })?.code ??
    (error as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}
