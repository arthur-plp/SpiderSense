import { mkdir } from "node:fs/promises";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "./schema";

// PGlite exposes the same query builder; only `execute()` results differ
// slightly, and both expose `.rows`.
export type Database = NodePgDatabase<typeof schema>;

const migrationsFolder = path.join(process.cwd(), "db", "migrations");

// Reuse the connection across hot reloads and across the RSC/SSR module
// graphs, otherwise each one would open its own pool (or PGlite instance).
const globalForDb = globalThis as unknown as {
  heroSosDb?: Promise<Database>;
};

/**
 * Opens the database on first use: PostgreSQL when DATABASE_URL is set,
 * otherwise an embedded PGlite instance stored in .data/pglite (local demo).
 */
export function getDb(): Promise<Database> {
  globalForDb.heroSosDb ??= openDatabase().catch((error: unknown) => {
    globalForDb.heroSosDb = undefined;
    throw error;
  });
  return globalForDb.heroSosDb;
}

async function openDatabase(): Promise<Database> {
  const db = process.env.DATABASE_URL
    ? await openPostgres(process.env.DATABASE_URL)
    : await openPglite();

  const seedByDefault = !process.env.DATABASE_URL;
  const seed = process.env.SEED_DEMO_DATA
    ? process.env.SEED_DEMO_DATA === "true"
    : seedByDefault;
  if (seed) {
    const { seedDemoDataIfEmpty } = await import("./seed");
    await seedDemoDataIfEmpty(db);
  }
  return db;
}

async function openPostgres(connectionString: string): Promise<Database> {
  const pool = new Pool({ connectionString });
  const db = drizzle({ client: pool, schema });
  if (process.env.DB_MIGRATE_ON_START === "true") {
    await migrate(db, { migrationsFolder });
  }
  return db;
}

async function openPglite(): Promise<Database> {
  const [{ PGlite }, { drizzle: drizzlePglite }, { migrate: migratePglite }] =
    await Promise.all([
      import("@electric-sql/pglite"),
      import("drizzle-orm/pglite"),
      import("drizzle-orm/pglite/migrator"),
    ]);
  const dataDir =
    process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "pglite");
  // PGlite creates its own folder but not the missing parents.
  await mkdir(path.dirname(dataDir), { recursive: true });
  const client = await PGlite.create(dataDir);
  const db = drizzlePglite({ client, schema });
  await migratePglite(db, { migrationsFolder });
  return db as unknown as Database;
}
