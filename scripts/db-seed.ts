// Seeds the demo dataset (npm run db:seed). With DATABASE_URL, run
// `npm run db:migrate` first; without it, the PGlite database is migrated here.

// tsx doesn't load .env files by itself (Next.js does, at runtime).
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on the environment.
}
process.env.SEED_DEMO_DATA = "false";

async function main() {
  const { getDb } = await import("../db/index");
  const { seedDemoDataIfEmpty } = await import("../db/seed");
  const db = await getDb();
  const seeded = await seedDemoDataIfEmpty(db);
  console.log(seeded ? "Demo data seeded." : "Database not empty: nothing to do.");
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
