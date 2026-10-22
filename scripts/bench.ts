// Response times of the pages and API routes that depend on the incident volume.
//   npm run bench -- --label avant          measure (server must be running) and save bench/avant.json
//   npm run bench -- --compare avant apres  print both runs side by side
// Options: --url http://localhost:3000 --runs 10

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Pool } from "pg";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on the environment.
}

const TARGET_MS = 350;
const arg = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};
const BASE = arg("url") ?? "http://localhost:3000";
const RUNS = Number(arg("runs") ?? 10);

type Role = "public" | "citizen" | "hero" | "moderator";
type Scenario = { name: string; role: Role; path: string };
type Result = { name: string; role: Role; path: string; p50: number; p95: number; max: number; status: number };

const ACCOUNTS: Record<Exclude<Role, "public">, string> = {
  citizen: "citoyen@spider-sense.test",
  hero: "Spider-Man",
  moderator: "moderateur@spider-sense.test",
};

async function login(identifier: string): Promise<string> {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "Demo1234!" }),
  });
  if (!response.ok) throw new Error(`Connexion impossible pour ${identifier} (${response.status})`);
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith("spidersense_session="));
  if (!cookie) throw new Error("Pas de cookie de session");
  return cookie.split(";")[0];
}

async function scenarios(): Promise<Scenario[]> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const one = async (sql: string) => (await pool.query<{ id: string }>(sql)).rows[0]?.id;
  const [heroId, villainId, citizenIncident] = await Promise.all([
    one("select hp.user_id as id from hero_profiles hp where hp.alias = 'Spider-Man'"),
    one("select villain_id as id from incidents where villain_id is not null group by 1 order by count(*) desc limit 1"),
    one("select i.id from incidents i join users u on u.id = i.reporter_id where u.email = 'citoyen@spider-sense.test' order by i.created_at desc limit 1"),
  ]);
  await pool.end();
  return [
    { name: "Accueil (statistiques globales)", role: "public", path: "/" },
    { name: "Annuaire des super-héros", role: "public", path: "/super-heros" },
    { name: "API incidents en cours (citoyen)", role: "citizen", path: "/api/incidents" },
    { name: "API super-héros (cartes)", role: "citizen", path: "/api/heroes" },
    { name: "API incidents à proximité", role: "citizen", path: "/api/incidents/nearby?lat=48.8566&lng=2.3522" },
    { name: "App citoyen", role: "citizen", path: "/citoyen" },
    { name: "Historique du citoyen", role: "citizen", path: "/citoyen/incidents" },
    { name: "Détail d'un incident (citoyen)", role: "citizen", path: `/citoyen/incidents/${citizenIncident}` },
    { name: "Encyclopédie", role: "citizen", path: "/citoyen/encyclopedie" },
    { name: "Fiche d'un vilain", role: "citizen", path: `/citoyen/encyclopedie/vilains/${villainId}` },
    { name: "API incidents (tableau des héros)", role: "hero", path: "/api/incidents" },
    { name: "Centre d'opérations", role: "hero", path: "/heros" },
    { name: "Statistiques du héros", role: "hero", path: "/heros/statistiques" },
    { name: "Tableau de bord modération", role: "moderator", path: "/admin" },
    { name: "Incidents (récents)", role: "moderator", path: "/admin/incidents" },
    { name: "Incidents (par priorité)", role: "moderator", path: "/admin/incidents?sort=priority" },
    { name: "Incidents (filtrés : vols réussis)", role: "moderator", path: "/admin/incidents?status=SUCCEEDED&type=1" },
    { name: "Incidents (page 200)", role: "moderator", path: "/admin/incidents?page=200" },
    { name: "Super-héros (modération)", role: "moderator", path: "/admin/heros" },
    { name: "Vilains (modération)", role: "moderator", path: "/admin/vilains" },
    { name: "Fiche d'un héros (modération)", role: "moderator", path: `/admin/utilisateurs/${heroId}` },
  ];
}

const percentile = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];

async function measure(label: string) {
  const cookies: Partial<Record<Role, string>> = {};
  for (const [role, identifier] of Object.entries(ACCOUNTS)) cookies[role as Role] = await login(identifier);
  const results: Result[] = [];
  for (const scenario of await scenarios()) {
    const headers = scenario.role === "public" ? undefined : { cookie: cookies[scenario.role]! };
    const timings: number[] = [];
    let status = 0;
    for (let run = 0; run <= RUNS; run++) {
      const start = performance.now();
      const response = await fetch(`${BASE}${scenario.path}`, { headers, redirect: "manual" });
      await response.text(); // until the last byte: streamed pages included
      const elapsed = performance.now() - start;
      status = response.status;
      if (run > 0) timings.push(elapsed); // run 0 warms the caches
    }
    timings.sort((a, b) => a - b);
    const result = { ...scenario, p50: percentile(timings, 50), p95: percentile(timings, 95), max: timings.at(-1)!, status };
    results.push(result);
    console.log(`${result.p95 <= TARGET_MS ? "✅" : "❌"} ${scenario.name.padEnd(38)} p50 ${ms(result.p50)}  p95 ${ms(result.p95)}  max ${ms(result.max)}  [${status}]`);
  }
  mkdirSync("bench", { recursive: true });
  writeFileSync(`bench/${label}.json`, JSON.stringify({ label, date: new Date().toISOString(), base: BASE, runs: RUNS, results }, null, 2) + "\n");
  const ok = results.filter((result) => result.p95 <= TARGET_MS).length;
  console.log(`\n${ok}/${results.length} sous ${TARGET_MS} ms (p95). Résultats : bench/${label}.json`);
}

const ms = (value: number) => `${Math.round(value).toString().padStart(6)} ms`;

function compare(before: string, after: string) {
  const load = (label: string) => JSON.parse(readFileSync(`bench/${label}.json`, "utf8")) as { results: Result[] };
  const a = load(before).results;
  const b = new Map(load(after).results.map((result) => [result.name, result]));
  console.log(`${"".padEnd(40)}${before.padStart(12)}${after.padStart(12)}   gain`);
  for (const result of a) {
    const next = b.get(result.name);
    if (!next) continue;
    const gain = result.p95 / Math.max(next.p95, 1);
    console.log(
      `${next.p95 <= TARGET_MS ? "✅" : "❌"} ${result.name.padEnd(38)}${ms(result.p95).padStart(12)}${ms(next.p95).padStart(12)}   ×${gain.toFixed(gain >= 10 ? 0 : 1)}`,
    );
  }
}

const compareIndex = process.argv.indexOf("--compare");
const run =
  compareIndex !== -1
    ? Promise.resolve(compare(process.argv[compareIndex + 1], process.argv[compareIndex + 2]))
    : measure(arg("label") ?? "resultats");
run.catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
