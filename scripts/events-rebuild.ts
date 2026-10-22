// Event sourcing demo: `npm run events:rebuild`.
// Throws the projections away, replays the whole journal to rebuild them, then
// checks them against the incidents table. `--check` only compares.

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";
import { rebuildProjections } from "../lib/server/events/projections";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on the environment.
}

// Each check: the projection, and the same figures computed from the incidents.
// Rows back to zero after decrements are kept by the live updates: ignored.
const CHECKS: { name: string; projection: string; truth: string }[] = [
  {
    name: "incident_counts",
    projection: `select status::text, type_id, priority, deleted, incidents::bigint as n, people_involved::bigint as people from incident_counts where incidents <> 0`,
    truth: `select status::text, type_id, coalesce(priority::text, 'NONE') as priority, deleted_at is not null as deleted,
                   count(*)::bigint as n, sum(people_involved)::bigint as people from incidents group by 1, 2, 3, 4`,
  },
  {
    name: "hero_stats",
    projection: `select hero_id, interventions::bigint, succeeded::bigint, failed::bigint, citizens_saved::bigint from hero_stats where interventions <> 0`,
    truth: `select hero_id, count(*)::bigint, count(*) filter (where status = 'SUCCEEDED')::bigint, count(*) filter (where status = 'FAILED')::bigint,
                   coalesce(sum(people_involved) filter (where status = 'SUCCEEDED'), 0)::bigint
            from incidents where deleted_at is null and hero_id is not null group by 1`,
  },
  {
    name: "hero_villain_stats",
    projection: `select hero_id, villain_id, encounters::bigint, imprisonments::bigint from hero_villain_stats where encounters <> 0`,
    truth: `select hero_id, villain_id, count(*)::bigint, count(*) filter (where villain_imprisoned)::bigint
            from incidents where deleted_at is null and hero_id is not null and villain_id is not null group by 1, 2`,
  },
  {
    name: "villain_stats",
    projection: `select villain_id, incidents::bigint from villain_stats where incidents <> 0`,
    truth: `select villain_id, count(*)::bigint from incidents where deleted_at is null and villain_id is not null group by 1`,
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows: [journal] } = await pool.query<{ events: number; types: number }>(
    "select count(*)::int as events, count(distinct type)::int as types from domain_events",
  );
  console.log(`Journal : ${journal.events.toLocaleString("fr-FR")} événements (${journal.types} types)`);

  if (!process.argv.includes("--check")) {
    const started = Date.now();
    await rebuildProjections(drizzle({ client: pool, schema }));
    console.log(`Projections reconstruites en rejouant le journal : ${((Date.now() - started) / 1000).toFixed(1)} s`);
  }

  let ok = true;
  for (const check of CHECKS) {
    // Rows of one side missing from the other, both ways.
    const { rows: [diff] } = await pool.query<{ missing: number; extra: number }>(
      `select (select count(*) from ((${check.truth}) except (${check.projection})) a)::int as missing,
              (select count(*) from ((${check.projection}) except (${check.truth})) b)::int as extra`,
    );
    const same = diff.missing === 0 && diff.extra === 0;
    ok &&= same;
    console.log(`${same ? "✅" : "❌"} ${check.name.padEnd(20)} ${same ? "identique aux incidents" : `${diff.missing} lignes manquantes, ${diff.extra} en trop`}`);
  }
  await pool.end();
  if (!ok) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
