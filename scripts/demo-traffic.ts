// Live activity for the presentation: `npm run demo:traffic` (server running).
// Citizens report incidents, heroes take them, move and close them, and some
// actions arrive "from offline" (replayed with an older device time). The maps
// update live and the Kibana dashboard fills up. Ctrl+C to stop.
// Options: --url http://localhost:3000 --every 4 (seconds between two actions) --minutes 10

import { randomUUID } from "node:crypto";

const arg = (name: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
};
const BASE = arg("url") ?? "http://localhost:3000";
const EVERY_MS = Number(arg("every") ?? 4) * 1000;
const STOP_AT = Date.now() + Number(arg("minutes") ?? 10) * 60_000;

const CITIZENS = ["citoyen@spider-sense.test", "lucas.bernard@spider-sense.test", "lea.dubois@spider-sense.test", "hugo.thomas@spider-sense.test"];
const HEROES = ["Black Panther", "Captain Marvel", "Doctor Strange", "Scarlet Witch"];
const SITUATIONS = [
  { typeId: 1, text: "Vol à l'arraché près d'une station de métro" },
  { typeId: 2, text: "Cambriolage en cours, fenêtre brisée au rez-de-chaussée" },
  { typeId: 4, text: "Agression armée signalée par des passants" },
  { typeId: 6, text: "Individu retenant des clients dans une boutique" },
  { typeId: 8, text: "Tentative d'enlèvement à la sortie d'une école" },
  { typeId: 9, text: "Comportement suspect d'un individu masqué sur les toits" },
];

type Session = { name: string; cookie: string };

async function login(identifier: string): Promise<Session> {
  const response = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "Demo1234!" }),
  });
  if (!response.ok) throw new Error(`Connexion impossible pour ${identifier} (${response.status})`);
  const cookie = response.headers.getSetCookie().find((value) => value.startsWith("spidersense_session="))!.split(";")[0];
  return { name: identifier, cookie };
}

async function call(session: Session, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: { cookie: session.cookie, "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, data };
}

const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const around = () => ({ latitude: 48.83 + Math.random() * 0.06, longitude: 2.29 + Math.random() * 0.1 });
const time = () => new Date().toLocaleTimeString("fr-FR");

async function main() {
  const citizens = await Promise.all(CITIZENS.map(login));
  const heroes = await Promise.all(HEROES.map(login));
  const busy = new Map<string, string>(); // hero → incident in progress
  console.log(`Activité de démo sur ${BASE} : une action toutes les ${EVERY_MS / 1000} s. Ctrl+C pour arrêter.\n`);

  while (Date.now() < STOP_AT) {
    const roll = Math.random();
    const hero = pick(heroes);
    const incident = busy.get(hero.name);

    if (incident && roll < 0.35) {
      const outcome = Math.random() < 0.8 ? "SUCCEEDED" : "FAILED";
      const { status } = await call(hero, "POST", `/api/incidents/${incident}/intervention/close`, { outcome, peopleInvolved: 1 + Math.floor(Math.random() * 3) });
      busy.delete(hero.name);
      console.log(`${time()}  ${hero.name} clôture une intervention (${outcome === "SUCCEEDED" ? "réussie" : "échouée"}) [${status}]`);
    } else if (!incident && roll < 0.55) {
      const { data } = await call(hero, "GET", "/api/incidents");
      const open = ((data.incidents as { id: string; status: string; typeLabel: string }[]) ?? []).filter((item) => item.status === "REPORTED");
      if (open.length) {
        const target = pick(open);
        const { status } = await call(hero, "POST", `/api/incidents/${target.id}/intervention`);
        if (status === 200) busy.set(hero.name, target.id);
        console.log(`${time()}  ${hero.name} prend en charge : ${target.typeLabel} [${status}]`);
      }
    } else if (roll < 0.8) {
      const situation = pick(SITUATIONS);
      const citizen = pick(citizens);
      // One report in four comes back from a dead zone: replayed with the time it was made.
      const offline = Math.random() < 0.25;
      const headers: Record<string, string> = offline
        ? { "idempotency-key": randomUUID(), "x-offline-replay": "1", "x-client-time": new Date(Date.now() - (30 + Math.random() * 600) * 1000).toISOString() }
        : {};
      const { status } = await call(citizen, "POST", "/api/incidents", { typeId: situation.typeId, description: situation.text, city: "Paris", ...around() }, headers);
      console.log(`${time()}  ${citizen.name.split("@")[0]} signale : ${situation.text}${offline ? " (rejoué hors ligne)" : ""} [${status}]`);
    } else {
      const { latitude, longitude } = around();
      const { status } = await call(hero, "PUT", "/api/me/location", { lat: latitude, lng: longitude });
      console.log(`${time()}  ${hero.name} se déplace [${status}]`);
    }
    await new Promise((resolve) => setTimeout(resolve, EVERY_MS * (0.5 + Math.random())));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
