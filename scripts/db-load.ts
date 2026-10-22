// Load test dataset: `npm run db:load -- --incidents 5000000 --citizens 50000`.
// Adds generated citizens and closed incidents (spread over 3 years) on top of
// the demo data, directly in SQL (generate_series), in batches.

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../db/schema";
import { importIncidentsIntoJournal, rebuildProjections } from "../lib/server/events/projections";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on the environment.
}

function option(name: string, fallback: number): number {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 0) throw new Error(`--${name} attend un entier positif.`);
  return value;
}

const INCIDENTS = option("incidents", 5_000_000);
const CITIZENS = option("citizens", 50_000);
const BATCH = option("batch", 250_000);
const FORCE = process.argv.includes("--force");

const FIRST_NAMES = ["Camille", "Lucas", "Léa", "Hugo", "Chloé", "Nathan", "Manon", "Inès", "Louis", "Jade", "Gabriel", "Emma", "Arthur", "Alice", "Jules", "Lina", "Adam", "Rose", "Paul", "Zoé"];
const LAST_NAMES = ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier"];
const STREETS = ["rue de Rivoli", "boulevard Voltaire", "rue de la Roquette", "avenue de la République", "rue Oberkampf", "boulevard Haussmann", "rue du Faubourg Saint-Antoine", "rue de Belleville", "avenue des Ternes", "rue de Vaugirard", "boulevard Saint-Germain", "rue Lepic"];
const DESCRIPTIONS = [
  "Vol à l'arraché près de la station de métro, le suspect s'enfuit à pied.",
  "Cambriolage en cours dans un appartement, bruits de verre brisé.",
  "Agression violente signalée par plusieurs passants.",
  "Individu armé menaçant les clients d'un commerce.",
  "Personne retenue contre son gré dans un véhicule.",
  "Tentative d'enlèvement à la sortie d'une école.",
  "Explosion suspecte entendue dans une rue commerçante.",
  "Comportement suspect d'un individu masqué sur les toits.",
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL est requis : le jeu de charge vise PostgreSQL.");
  const started = Date.now();
  const { rows: [{ count }] } = await pool.query<{ count: number }>("select count(*)::int as count from incidents");
  if (count > 100_000 && !FORCE) {
    throw new Error(`La base contient déjà ${count} incidents. Relancez avec --force pour en ajouter encore.`);
  }

  const { rows: [reference] } = await pool.query<{ hash: string }>(
    "select password_hash as hash from users where lower(email) = 'citoyen@spider-sense.test'",
  );
  if (!reference) throw new Error("Données de démo absentes : lancez d'abord npm run db:seed.");

  // --- Citizens (same password as the demo accounts) --------------------------------
  console.log(`→ ${CITIZENS} citoyens…`);
  await pool.query(
    `insert into users (email, password_hash, civility, first_name, last_name, birth_date, phone, street, postal_code, city, country, role, email_verified_at, created_at, updated_at)
     select 'citoyen.' || g || '@charge.spider-sense.test', $1,
            (array['MR','MRS','OTHER'])[1 + floor(random() * 3)::int]::civility,
            ($2::text[])[1 + floor(random() * array_length($2::text[], 1))::int],
            ($3::text[])[1 + floor(random() * array_length($3::text[], 1))::int],
            date '1950-01-01' + floor(random() * 20000)::int,
            '06 ' || lpad(floor(random() * 100000000)::text, 8, '0'),
            (1 + floor(random() * 120))::int || ' ' || ($4::text[])[1 + floor(random() * array_length($4::text[], 1))::int],
            '750' || lpad((1 + floor(random() * 20))::int::text, 2, '0'), 'Paris', 'France', 'CITIZEN',
            created, created, created
     from (select g, now() - random() * interval '3 years' as created from generate_series(1, $5::int) g) s
     on conflict do nothing`,
    [reference.hash, FIRST_NAMES, LAST_NAMES, STREETS, CITIZENS],
  );

  const ids = async (sql: string) => (await pool.query<{ id: string }>(sql)).rows.map((row) => row.id);
  const [heroes, villains, reporters] = await Promise.all([
    ids("select user_id as id from hero_profiles where status = 'APPROVED'"),
    ids("select id from villains"),
    ids("select id from users where role = 'CITIZEN' and disabled_at is null"),
  ]);
  console.log(`  ${reporters.length} citoyens, ${heroes.length} héros, ${villains.length} vilains`);

  // --- Incidents: closed interventions, ~1 % soft-deleted -------------------------------
  // Type mix weighted towards thefts and burglaries, like real reports.
  for (let done = 0; done < INCIDENTS; done += BATCH) {
    const size = Math.min(BATCH, INCIDENTS - done);
    const batchStart = Date.now();
    await pool.query(
      `insert into incidents (reporter_id, type_id, villain_id, description, occurred_at, people_involved, street, postal_code, city, country,
                              latitude, longitude, status, priority, hero_id, intervention_started_at, intervention_ended_at,
                              villain_imprisoned, deleted_at, created_at, updated_at)
       select reporter, type_id, villain, description, occurred, people, street, postal, 'Paris', 'France',
              lat, lng, status::incident_status, priority::incident_priority, hero, started, ended,
              status = 'SUCCEEDED' and villain is not null and r7 < 0.4,
              case when r1 > 0.99 then ended + interval '1 day' end,
              occurred + interval '2 minutes', ended
       from (
         select *,
                occurred + (5 + r6 * 25) * interval '1 minute' as started,
                occurred + (5 + r6 * 25 + 10 + r7 * 110) * interval '1 minute' as ended
         from (
           select r1, r6, r7,
                  case when r1 < 0.8 then 'SUCCEEDED' else 'FAILED' end as status,
                  case when r2 < 0.35 then 1 when r2 < 0.60 then 2 when r2 < 0.63 then 3 when r2 < 0.67 then 4
                       when r2 < 0.68 then 5 when r2 < 0.71 then 6 when r2 < 0.75 then 7 when r2 < 0.80 then 8 else 9 end as type_id,
                  ($1::uuid[])[1 + floor(r3 * array_length($1::uuid[], 1))::int] as hero,
                  case when r4 < 0.35 then ($2::uuid[])[1 + floor(r5 * array_length($2::uuid[], 1))::int] end as villain,
                  ($3::uuid[])[1 + floor(r8 * array_length($3::uuid[], 1))::int] as reporter,
                  case when r5 < 0.2 then 'HIGH' when r5 < 0.7 then 'NORMAL' when r5 < 0.9 then 'LOW' end as priority,
                  1 + floor(r7 * 3)::int as people,
                  ($4::text[])[1 + floor(r9 * array_length($4::text[], 1))::int] as description,
                  (1 + floor(r6 * 120))::int || ' ' || ($5::text[])[1 + floor(r8 * array_length($5::text[], 1))::int] as street,
                  '750' || lpad((1 + floor(r9 * 20))::int::text, 2, '0') as postal,
                  48.816 + r8 * 0.084 as lat, 2.255 + r9 * 0.16 as lng,
                  now() - interval '1 day' - r10 * interval '3 years' as occurred
           from (
             select random() r1, random() r2, random() r3, random() r4, random() r5,
                    random() r6, random() r7, random() r8, random() r9, random() r10
             from generate_series(1, $6::int)
           ) draws
         ) drawn
       ) incident`,
      [heroes, villains, reporters, DESCRIPTIONS, STREETS, size],
    );
    const total = done + size;
    console.log(`  ${total.toLocaleString("fr-FR")} / ${INCIDENTS.toLocaleString("fr-FR")} incidents (${((Date.now() - batchStart) / 1000).toFixed(1)} s)`);
  }

  // Event sourcing: the generated incidents enter the journal, then the projections are replayed.
  const database = drizzle({ client: pool, schema });
  let step = Date.now();
  console.log("→ journal (IncidentImported)…");
  await importIncidentsIntoJournal(database, "load");
  console.log(`  ${((Date.now() - step) / 1000).toFixed(0)} s`);
  step = Date.now();
  console.log("→ projections (rejeu du journal)…");
  await rebuildProjections(database);
  console.log(`  ${((Date.now() - step) / 1000).toFixed(0)} s`);

  console.log("→ ANALYZE…");
  await pool.query("analyze users; analyze incidents; analyze domain_events;");
  console.log(`Terminé en ${((Date.now() - started) / 1000).toFixed(0)} s.`);
}

main()
  .then(() => pool.end())
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await pool.end();
    process.exit(1);
  });
