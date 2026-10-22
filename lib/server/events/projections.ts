// No "server-only" here: the seed and load scripts (tsx) rebuild the projections too.
import { getTableName, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { heroStats, heroVillainStats, incidentCounts, villainStats } from "@/db/schema";
import type { IncidentPriority, IncidentStatus } from "@/lib/labels";
import type { Executor } from "./executor";

/**
 * The fields of an incident the statistics depend on. Every incident event
 * carries this snapshot before and after the change: a projection only has to
 * remove what `before` contributed and add what `after` contributes.
 */
export type IncidentSnapshot = {
  typeId: number;
  status: IncidentStatus;
  priority: IncidentPriority | null;
  deleted: boolean;
  peopleInvolved: number;
  heroId: string | null;
  villainId: string | null;
  villainImprisoned: boolean;
};

type CountRow = { status: IncidentStatus; typeId: number; priority: string; deleted: boolean; incidents: number; peopleInvolved: number };
type HeroRow = { heroId: string; interventions: number; succeeded: number; failed: number; citizensSaved: number };
type HeroVillainRow = { heroId: string; villainId: string; encounters: number; imprisonments: number };
type VillainRow = { villainId: string; incidents: number };

type Deltas = { counts: CountRow[]; heroes: HeroRow[]; heroVillains: HeroVillainRow[]; villains: VillainRow[] };

/** What one incident adds to each projection (sign -1 to take it back). */
function contribution(snapshot: IncidentSnapshot, sign: 1 | -1): Deltas {
  const succeeded = snapshot.status === "SUCCEEDED";
  const visible = !snapshot.deleted;
  return {
    counts: [
      {
        status: snapshot.status,
        typeId: snapshot.typeId,
        priority: snapshot.priority ?? "NONE",
        deleted: snapshot.deleted,
        incidents: sign,
        peopleInvolved: sign * snapshot.peopleInvolved,
      },
    ],
    heroes:
      visible && snapshot.heroId
        ? [
            {
              heroId: snapshot.heroId,
              interventions: sign,
              succeeded: succeeded ? sign : 0,
              failed: snapshot.status === "FAILED" ? sign : 0,
              citizensSaved: succeeded ? sign * snapshot.peopleInvolved : 0,
            },
          ]
        : [],
    heroVillains:
      visible && snapshot.heroId && snapshot.villainId
        ? [{ heroId: snapshot.heroId, villainId: snapshot.villainId, encounters: sign, imprisonments: snapshot.villainImprisoned ? sign : 0 }]
        : [],
    villains: visible && snapshot.villainId ? [{ villainId: snapshot.villainId, incidents: sign }] : [],
  };
}

/** Sums rows sharing the same key, and drops the ones that cancel out. */
function merge<T extends Record<string, unknown>>(rows: T[], keys: (keyof T)[], values: (keyof T)[]): T[] {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    const key = keys.map((name) => String(row[name])).join("|");
    const existing = byKey.get(key);
    if (!existing) byKey.set(key, { ...row });
    else for (const name of values) (existing[name] as number) += row[name] as number;
  }
  return [...byKey.values()].filter((row) => values.some((name) => row[name] !== 0));
}

export function incidentDeltas(before: IncidentSnapshot | null, after: IncidentSnapshot | null): Deltas {
  const parts = [before && contribution(before, -1), after && contribution(after, 1)].filter((part): part is Deltas => part !== null);
  return {
    counts: merge(parts.flatMap((part) => part.counts), ["status", "typeId", "priority", "deleted"], ["incidents", "peopleInvolved"]),
    heroes: merge(parts.flatMap((part) => part.heroes), ["heroId"], ["interventions", "succeeded", "failed", "citizensSaved"]),
    heroVillains: merge(parts.flatMap((part) => part.heroVillains), ["heroId", "villainId"], ["encounters", "imprisonments"]),
    villains: merge(parts.flatMap((part) => part.villains), ["villainId"], ["incidents"]),
  };
}

/** `table.column + excluded.column`, qualified: "incidents" is also a table name. */
const plus = (column: AnyPgColumn) => sql.raw(`"${getTableName(column.table)}"."${column.name}" + excluded."${column.name}"`);

/** Applies the change of one incident to the projections, in the caller's transaction. */
export async function projectIncidentChange(tx: Executor, before: IncidentSnapshot | null, after: IncidentSnapshot | null) {
  const deltas = incidentDeltas(before, after);
  if (deltas.counts.length) {
    await tx
      .insert(incidentCounts)
      .values(deltas.counts)
      .onConflictDoUpdate({
        target: [incidentCounts.status, incidentCounts.typeId, incidentCounts.priority, incidentCounts.deleted],
        set: { incidents: plus(incidentCounts.incidents), peopleInvolved: plus(incidentCounts.peopleInvolved) },
      });
  }
  if (deltas.heroes.length) {
    await tx
      .insert(heroStats)
      .values(deltas.heroes)
      .onConflictDoUpdate({
        target: heroStats.heroId,
        set: {
          interventions: plus(heroStats.interventions),
          succeeded: plus(heroStats.succeeded),
          failed: plus(heroStats.failed),
          citizensSaved: plus(heroStats.citizensSaved),
        },
      });
  }
  if (deltas.heroVillains.length) {
    await tx
      .insert(heroVillainStats)
      .values(deltas.heroVillains)
      .onConflictDoUpdate({
        target: [heroVillainStats.heroId, heroVillainStats.villainId],
        set: { encounters: plus(heroVillainStats.encounters), imprisonments: plus(heroVillainStats.imprisonments) },
      });
  }
  if (deltas.villains.length) {
    await tx
      .insert(villainStats)
      .values(deltas.villains)
      .onConflictDoUpdate({ target: villainStats.villainId, set: { incidents: plus(villainStats.incidents) } });
  }
}

// The same arithmetic in SQL, over the whole journal: `after` counts +1, `before` -1.
const REBUILD = [
  `create temp table event_sides on commit drop as
     select (s->>'status')::incident_status as status, (s->>'typeId')::smallint as type_id,
            coalesce(s->>'priority', 'NONE') as priority, (s->>'deleted')::boolean as deleted,
            (s->>'peopleInvolved')::int as people, (s->>'heroId')::uuid as hero_id,
            (s->>'villainId')::uuid as villain_id, (s->>'villainImprisoned')::boolean as imprisoned, sign
     from (
       select payload->'after' as s, 1 as sign from domain_events
       where aggregate_type = 'incident' and jsonb_typeof(payload->'after') = 'object'
       union all
       select payload->'before', -1 from domain_events
       where aggregate_type = 'incident' and jsonb_typeof(payload->'before') = 'object'
     ) sides`,
  `truncate incident_counts, hero_stats, hero_villain_stats, villain_stats`,
  `insert into incident_counts (status, type_id, priority, deleted, incidents, people_involved)
     select status, type_id, priority, deleted, sum(sign), sum(sign * people) from event_sides
     group by 1, 2, 3, 4 having sum(sign) <> 0`,
  `insert into hero_stats (hero_id, interventions, succeeded, failed, citizens_saved)
     select hero_id, sum(sign), coalesce(sum(sign) filter (where status = 'SUCCEEDED'), 0),
            coalesce(sum(sign) filter (where status = 'FAILED'), 0),
            coalesce(sum(sign * people) filter (where status = 'SUCCEEDED'), 0)
     from event_sides where not deleted and hero_id is not null and hero_id in (select id from users)
     group by 1 having sum(sign) <> 0`,
  // Deleted villains are unlinked from their incidents (on delete set null): skip them.
  `insert into hero_villain_stats (hero_id, villain_id, encounters, imprisonments)
     select hero_id, villain_id, sum(sign), coalesce(sum(sign) filter (where imprisoned), 0)
     from event_sides where not deleted and hero_id is not null and villain_id in (select id from villains)
     group by 1, 2 having sum(sign) <> 0`,
  `insert into villain_stats (villain_id, incidents)
     select villain_id, sum(sign) from event_sides
     where not deleted and villain_id in (select id from villains) group by 1 having sum(sign) <> 0`,
];

/** Recomputes every projection by replaying the journal (event-sourcing rebuild). */
export async function rebuildProjections(database: Executor): Promise<void> {
  await database.transaction(async (tx) => {
    for (const statement of REBUILD) await tx.execute(sql.raw(statement));
  });
}

/**
 * Backfills an IncidentImported event for every incident that has none: rows
 * inserted directly (demo seed, load dataset, data from before the journal).
 */
export async function importIncidentsIntoJournal(database: Executor, source: "seed" | "load" | "migration"): Promise<void> {
  await database.execute(sql`
    insert into domain_events (aggregate_type, aggregate_id, version, type, payload, actor_id, occurred_at, recorded_at, metadata)
    select 'incident', i.id, 1, 'IncidentImported',
           jsonb_build_object('before', null, 'after', jsonb_build_object(
             'typeId', i.type_id, 'status', i.status, 'priority', i.priority, 'deleted', i.deleted_at is not null,
             'peopleInvolved', i.people_involved, 'heroId', i.hero_id, 'villainId', i.villain_id,
             'villainImprisoned', i.villain_imprisoned)),
           i.reporter_id, i.created_at, now(), jsonb_build_object('source', ${source}::text)
    from incidents i
    where not exists (select 1 from domain_events e where e.aggregate_type = 'incident' and e.aggregate_id = i.id)`);
}
