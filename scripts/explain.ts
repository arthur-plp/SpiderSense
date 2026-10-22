// Query plans of the heaviest queries: `npm run explain -- --label avant`.
// Writes bench/explain-<label>.md (EXPLAIN ANALYZE, BUFFERS) for the analysis.

import { mkdirSync, writeFileSync } from "node:fs";
import { Pool } from "pg";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on the environment.
}

const index = process.argv.indexOf("--label");
const label = index === -1 ? "plans" : process.argv[index + 1];
const projections = process.argv.includes("--projections");

const RANK = `(case when i.priority = 'HIGH' then 0 when i.priority is null then 1 when i.priority = 'NORMAL' then 2 else 3 end)`;
const LIST = `select i.id, i.type_id, t.code, i.status, i.priority, i.description, i.city, i.created_at, hp.alias, u.first_name, v.alias
  from incidents i join incident_types t on t.id = i.type_id
  left join hero_profiles hp on hp.user_id = i.hero_id left join users u on u.id = i.reporter_id
  left join villains v on v.id = i.villain_id`;

const QUERIES: { title: string; sql: string; projection?: boolean }[] = [
  {
    title: "Statistiques globales (accueil, espace pro)",
    sql: `select count(*), count(*) filter (where status in ('REPORTED','IN_PROGRESS')), count(*) filter (where hero_id is not null),
            count(*) filter (where status = 'SUCCEEDED'), sum(people_involved) filter (where status = 'SUCCEEDED')
          from incidents i join incident_types t on t.id = i.type_id where i.deleted_at is null`,
  },
  {
    title: "Statistiques globales depuis la projection",
    projection: true,
    sql: `select type_id, status, sum(incidents), sum(people_involved) from incident_counts where not deleted group by 1, 2`,
  },
  {
    title: "Statistiques de tous les héros (API /api/heroes, toutes les 20 s)",
    sql: `select hero_id, count(*), count(*) filter (where status = 'SUCCEEDED'), count(distinct villain_id) filter (where villain_imprisoned)
          from incidents where deleted_at is null group by hero_id`,
  },
  {
    title: "Statistiques des héros depuis les projections",
    projection: true,
    sql: `select h.hero_id, h.interventions, h.succeeded, (select count(*) from hero_villain_stats v where v.hero_id = h.hero_id and v.imprisonments > 0)
          from hero_stats h`,
  },
  { title: "Liste de modération : total", sql: `select count(*) from incidents where deleted_at is null` },
  { title: "Liste de modération : 40 plus récents", sql: `${LIST} where i.deleted_at is null order by i.created_at desc limit 40` },
  { title: "Liste de modération : tri par priorité", sql: `${LIST} where i.deleted_at is null order by ${RANK}, i.created_at desc limit 40` },
  { title: "Liste de modération : page 200", sql: `${LIST} where i.deleted_at is null order by i.created_at desc limit 40 offset 7960` },
  {
    title: "Liste de modération : vols réussis",
    sql: `${LIST} where i.deleted_at is null and i.status = 'SUCCEEDED' and i.type_id = 1 order by i.created_at desc limit 40`,
  },
  {
    title: "Tableau des héros : actifs + terminés depuis 24 h",
    sql: `${LIST} where i.deleted_at is null and (i.status in ('REPORTED','IN_PROGRESS') or i.intervention_ended_at > now() - interval '24 hours')
          order by i.created_at desc`,
  },
  {
    title: "Pire ennemi d'un héros",
    sql: `select v.id, v.alias, count(*) from incidents i join villains v on v.id = i.villain_id
          where i.hero_id = (select user_id from hero_profiles where alias = 'Spider-Man') and i.deleted_at is null
          group by v.id order by count(*) desc limit 1`,
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let markdown = `# Plans d'exécution : ${label}\n\n${new Date().toISOString()}\n`;
  for (const query of QUERIES) {
    if (query.projection && !projections) continue;
    const { rows } = await pool.query<{ "QUERY PLAN": string }>(`explain (analyze, buffers) ${query.sql}`);
    const plan = rows.map((row) => row["QUERY PLAN"]).join("\n");
    const time = /Execution Time: ([\d.]+) ms/.exec(plan)?.[1];
    console.log(`${query.title.padEnd(62)} ${time?.padStart(10)} ms`);
    markdown += `\n## ${query.title} : ${time} ms\n\n\`\`\`sql\n${query.sql.replace(/\s+/g, " ").trim()}\n\`\`\`\n\n\`\`\`\n${plan}\n\`\`\`\n`;
  }
  mkdirSync("bench", { recursive: true });
  writeFileSync(`bench/explain-${label}.md`, markdown);
  console.log(`\nPlans : bench/explain-${label}.md`);
  await pool.end();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
