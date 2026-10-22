import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { domainEvents, heroProfiles, incidents } from "@/db/schema";
import { db } from "../db";
import { actionTime, requestContext } from "../request-context";
import type { Executor, Transaction } from "./executor";
import { type IncidentSnapshot, projectIncidentChange } from "./projections";
import { publishLocally } from "./live";

export type { Executor, Transaction } from "./executor";

export type IncidentEventType =
  | "IncidentReported"
  | "IncidentImported"
  | "IncidentPrioritized"
  | "InterventionStarted"
  | "InterventionClosed"
  | "IncidentCorrected"
  | "IncidentDeleted"
  | "IncidentVillainLinked"
  | "IncidentReviewed";

export type HeroEventType = "HeroDutyChanged" | "HeroLocationUpdated";

export type EventSource = "online" | "offline" | "seed" | "load" | "migration";

export type StoredEvent = {
  sequence: number;
  id: string;
  aggregateType: "incident" | "hero";
  aggregateId: string;
  version: number;
  type: IncidentEventType | HeroEventType;
  actorId: string | null;
  occurredAt: string;
  recordedAt: string;
  source: EventSource;
  payload: Record<string, unknown>;
};

/** Channel of the NOTIFY sent for every event: the live feed listens to it. */
export const EVENTS_CHANNEL = "domain_events";

/** What the live feed sends: enough to know what changed, nothing personal. */
export type EventSummary = Pick<StoredEvent, "sequence" | "type" | "aggregateType" | "aggregateId" | "occurredAt" | "source">;

export const summarize = (event: StoredEvent): EventSummary => ({
  sequence: event.sequence,
  type: event.type,
  aggregateType: event.aggregateType,
  aggregateId: event.aggregateId,
  occurredAt: event.occurredAt,
  source: event.source,
});

type Row = typeof domainEvents.$inferSelect;

export const toStoredEvent = (row: Row): StoredEvent => ({
  sequence: row.sequence,
  id: row.id,
  aggregateType: row.aggregateType as StoredEvent["aggregateType"],
  aggregateId: row.aggregateId,
  version: row.version,
  type: row.type as StoredEvent["type"],
  actorId: row.actorId,
  occurredAt: row.occurredAt.toISOString(),
  recordedAt: row.recordedAt.toISOString(),
  source: ((row.metadata as { source?: EventSource } | null)?.source ?? "online") as EventSource,
  payload: row.payload as Record<string, unknown>,
});

/** Appends an event at the end of its aggregate's stream. The caller holds a lock on the aggregate. */
async function append(
  tx: Executor,
  event: { aggregateType: StoredEvent["aggregateType"]; aggregateId: string; type: StoredEvent["type"]; actorId: string | null; payload: Record<string, unknown> },
): Promise<StoredEvent> {
  const context = requestContext();
  const [{ version }] = await tx
    .select({ version: sql<number>`coalesce(max(${domainEvents.version}), 0)::int + 1` })
    .from(domainEvents)
    .where(and(eq(domainEvents.aggregateType, event.aggregateType), eq(domainEvents.aggregateId, event.aggregateId)));
  const [row] = await tx
    .insert(domainEvents)
    .values({
      ...event,
      version,
      occurredAt: actionTime(),
      metadata: {
        source: context?.offline ? "offline" : "online",
        requestId: context?.requestId,
        idempotencyKey: context?.idempotencyKey ?? undefined,
      },
    })
    .returning();
  const stored = toStoredEvent(row);
  // Delivered to the LISTEN connections only if the transaction commits.
  await tx.execute(sql`select pg_notify(${EVENTS_CHANNEL}, ${JSON.stringify(summarize(stored))})`);
  return stored;
}

/** After the commit: the request ships the events to the logs, the live feed gets them (PGlite). */
function committed(events: StoredEvent[]) {
  requestContext()?.events.push(...events);
  for (const event of events) publishLocally(summarize(event));
}

const snapshotColumns = {
  typeId: incidents.typeId,
  status: incidents.status,
  priority: incidents.priority,
  deleted: sql<boolean>`${incidents.deletedAt} is not null`,
  peopleInvolved: incidents.peopleInvolved,
  heroId: incidents.heroId,
  villainId: incidents.villainId,
  villainImprisoned: incidents.villainImprisoned,
};

async function snapshot(tx: Executor, incidentId: string, lock: boolean): Promise<IncidentSnapshot | null> {
  const query = tx.select(snapshotColumns).from(incidents).where(eq(incidents.id, incidentId));
  const [row] = lock ? await query.for("update") : await query;
  return row ?? null;
}

/** null: nothing to do (no event). `unchanged`: answer `result`, but nothing worth an event. */
type Change<T> = { result: T; data?: Record<string, unknown>; unchanged?: boolean } | null;

/**
 * Changes an incident and records it: the row is locked, `change` runs, then
 * an event with the snapshots before / after is appended and the projections
 * updated, all in one transaction. Returns null when `change` returns null
 * (nothing changed) or the incident doesn't exist.
 */
export async function changeIncident<T>(
  incidentId: string,
  type: IncidentEventType,
  actorId: string | null,
  change: (tx: Transaction, before: IncidentSnapshot) => Promise<Change<T>>,
): Promise<T | null> {
  const database = await db();
  const outcome = await database.transaction(async (tx) => {
    const before = await snapshot(tx, incidentId, true);
    if (!before) return null;
    const changed = await change(tx, before);
    if (!changed) return null;
    if (changed.unchanged) return { result: changed.result, event: null };
    const after = await snapshot(tx, incidentId, false);
    const event = await append(tx, { aggregateType: "incident", aggregateId: incidentId, type, actorId, payload: { ...changed.data, before, after } });
    await projectIncidentChange(tx, before, after);
    return { result: changed.result, event };
  });
  if (!outcome) return null;
  if (outcome.event) committed([outcome.event]);
  return outcome.result;
}

/** Creates an incident and records the IncidentReported event, in one transaction. */
export async function createIncidentWithEvent(
  actorId: string | null,
  insert: (tx: Transaction) => Promise<string>,
  data?: Record<string, unknown>,
): Promise<string> {
  const database = await db();
  const { incidentId, event } = await database.transaction(async (tx) => {
    const id = await insert(tx);
    const after = await snapshot(tx, id, true);
    const stored = await append(tx, { aggregateType: "incident", aggregateId: id, type: "IncidentReported", actorId, payload: { ...data, before: null, after } });
    await projectIncidentChange(tx, null, after);
    return { incidentId: id, event: stored };
  });
  committed([event]);
  return incidentId;
}

/** An event that doesn't change the statistics (a review), inside the caller's transaction. */
export async function appendIncidentEvent(
  tx: Transaction,
  incidentId: string,
  type: IncidentEventType,
  actorId: string | null,
  payload: Record<string, unknown>,
): Promise<StoredEvent> {
  await snapshot(tx, incidentId, true);
  return append(tx, { aggregateType: "incident", aggregateId: incidentId, type, actorId, payload });
}

/** Records that the caller's transaction committed events appended with appendIncidentEvent. */
export const markCommitted = (events: StoredEvent[]) => committed(events);

/** Changes a hero's presence (duty, position) and records it. */
export async function changeHero(
  heroId: string,
  type: HeroEventType,
  change: (tx: Transaction) => Promise<Record<string, unknown> | null>,
): Promise<boolean> {
  const database = await db();
  const event = await database.transaction(async (tx) => {
    const [hero] = await tx.select({ id: heroProfiles.userId }).from(heroProfiles).where(eq(heroProfiles.userId, heroId)).for("update");
    if (!hero) return null;
    const data = await change(tx);
    if (!data) return null;
    return append(tx, { aggregateType: "hero", aggregateId: heroId, type, actorId: heroId, payload: data });
  });
  if (!event) return false;
  committed([event]);
  return true;
}
