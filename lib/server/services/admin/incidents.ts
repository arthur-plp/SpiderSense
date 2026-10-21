import "server-only";
import { and, asc, desc, eq, inArray, isNull, type SQL, sql } from "drizzle-orm";
import { heroProfiles, incidentTypes, incidents, users, villains } from "@/db/schema";
import { DUPLICATE_RADIUS_METERS, distanceInMeters, hasPosition } from "@/lib/geo";
import type { IncidentPriority, IncidentStatus } from "@/lib/labels";
import { logActivity } from "../../activity";
import { db, isUniqueViolation } from "../../db";
import { mailTemplates, queueMails } from "../../mail";
import { getBaseUrl } from "../../url";
import {
  getIncident,
  getIncidentReporter,
  type IncidentDto,
  isUuid,
  listActiveIncidents,
  type MutationResult,
  toMailInfo,
} from "../incidents";
import { getReviewForIncident } from "../reviews";
import { listEntityActivity } from "./activity";
import { firstParam as first, parsePage, type SearchParams } from "./params";

// --- Listing -------------------------------------------------------------------

const STATUSES = ["REPORTED", "IN_PROGRESS", "SUCCEEDED", "FAILED"] as const;
const PRIORITIES = ["HIGH", "NORMAL", "LOW"] as const;
export const INCIDENT_SORTS = { recent: "Plus récents", oldest: "Plus anciens", priority: "Priorité" } as const;
export const INCIDENTS_PAGE_SIZE = 40;

export type IncidentFilters = {
  status: IncidentStatus | "ACTIVE" | null;
  priority: IncidentPriority | "NONE" | null;
  typeId: number | null;
  villainId: string | null;
  includeDeleted: boolean;
  sort: keyof typeof INCIDENT_SORTS;
  page: number;
};

export function parseIncidentFilters(params: SearchParams): IncidentFilters {
  const status = first(params.status);
  const priority = first(params.priority);
  const typeId = Number(first(params.type));
  const villainId = first(params.villain);
  const sort = first(params.sort);
  return {
    status: status === "ACTIVE" || STATUSES.includes(status as IncidentStatus) ? (status as IncidentFilters["status"]) : null,
    priority:
      priority === "NONE" || PRIORITIES.includes(priority as IncidentPriority) ? (priority as IncidentFilters["priority"]) : null,
    typeId: Number.isInteger(typeId) && typeId > 0 ? typeId : null,
    villainId: villainId && isUuid(villainId) ? villainId : null,
    includeDeleted: first(params.deleted) === "1",
    sort: sort && sort in INCIDENT_SORTS ? (sort as IncidentFilters["sort"]) : "recent",
    page: parsePage(params.page),
  };
}

export type AdminIncidentRow = {
  id: string;
  typeId: number;
  typeCode: string;
  typeLabel: string;
  status: IncidentStatus;
  priority: IncidentPriority | null;
  description: string;
  street: string | null;
  city: string;
  latitude: number | null;
  longitude: number | null;
  occurredAt: string;
  createdAt: string;
  hero: { id: string; alias: string } | null;
  reporter: { id: string; name: string } | null;
  villainAlias: string | null;
  reportedVillainName: string | null;
  deletedAt: string | null;
};

// High first, then incidents nobody has prioritised yet (see PRIORITY_RANK).
const priorityRank = sql`case when ${incidents.priority} = 'HIGH' then 0 when ${incidents.priority} is null then 1 when ${incidents.priority} = 'NORMAL' then 2 else 3 end`;

export async function listAdminIncidents(filters: IncidentFilters): Promise<{ rows: AdminIncidentRow[]; total: number }> {
  const database = await db();
  const conditions: (SQL | undefined)[] = [
    filters.includeDeleted ? undefined : isNull(incidents.deletedAt),
    filters.status === "ACTIVE"
      ? inArray(incidents.status, ["REPORTED", "IN_PROGRESS"])
      : filters.status
        ? eq(incidents.status, filters.status)
        : undefined,
    filters.priority === "NONE"
      ? isNull(incidents.priority)
      : filters.priority
        ? eq(incidents.priority, filters.priority)
        : undefined,
    filters.typeId ? eq(incidents.typeId, filters.typeId) : undefined,
    filters.villainId ? eq(incidents.villainId, filters.villainId) : undefined,
  ];
  const where = and(...conditions);
  const order =
    filters.sort === "oldest"
      ? [asc(incidents.createdAt)]
      : filters.sort === "priority"
        ? [priorityRank, desc(incidents.createdAt)]
        : [desc(incidents.createdAt)];

  const [rows, [{ total }]] = await Promise.all([
    database
      .select({
        id: incidents.id,
        typeId: incidents.typeId,
        typeCode: incidentTypes.code,
        typeLabel: incidentTypes.label,
        status: incidents.status,
        priority: incidents.priority,
        description: incidents.description,
        street: incidents.street,
        city: incidents.city,
        latitude: incidents.latitude,
        longitude: incidents.longitude,
        occurredAt: incidents.occurredAt,
        createdAt: incidents.createdAt,
        heroId: incidents.heroId,
        heroAlias: heroProfiles.alias,
        reporterId: users.id,
        reporterFirstName: users.firstName,
        reporterLastName: users.lastName,
        villainAlias: villains.alias,
        reportedVillainName: incidents.reportedVillainName,
        deletedAt: incidents.deletedAt,
      })
      .from(incidents)
      .innerJoin(incidentTypes, eq(incidents.typeId, incidentTypes.id))
      .leftJoin(heroProfiles, eq(incidents.heroId, heroProfiles.userId))
      .leftJoin(users, eq(incidents.reporterId, users.id))
      .leftJoin(villains, eq(incidents.villainId, villains.id))
      .where(where)
      .orderBy(...order)
      .limit(INCIDENTS_PAGE_SIZE)
      .offset((filters.page - 1) * INCIDENTS_PAGE_SIZE),
    database.select({ total: sql<number>`count(*)::int` }).from(incidents).where(where),
  ]);

  return {
    total,
    rows: rows.map((row) => ({
      id: row.id,
      typeId: row.typeId,
      typeCode: row.typeCode,
      typeLabel: row.typeLabel,
      status: row.status,
      priority: row.priority,
      description: row.description,
      street: row.street,
      city: row.city,
      latitude: row.latitude,
      longitude: row.longitude,
      occurredAt: row.occurredAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      hero: row.heroId && row.heroAlias ? { id: row.heroId, alias: row.heroAlias } : null,
      reporter: row.reporterId ? { id: row.reporterId, name: `${row.reporterFirstName} ${row.reporterLastName}` } : null,
      villainAlias: row.villainAlias,
      reportedVillainName: row.reportedVillainName,
      deletedAt: row.deletedAt?.toISOString() ?? null,
    })),
  };
}

// --- Duplicate detection ------------------------------------------------------------

const DUPLICATE_WINDOW_MS = 3 * 60 * 60 * 1000;

type Comparable = {
  id: string;
  typeId: number;
  status: IncidentStatus;
  latitude: number | null;
  longitude: number | null;
  occurredAt: string;
  deletedAt: string | null;
};

export type DuplicateLink = { id: string; distance: number };

/**
 * Active incidents of the same type, reported within 500 m and 3 hours of each
 * other, are probably the same situation declared by several citizens.
 */
export function findDuplicates(items: Comparable[]): Map<string, DuplicateLink[]> {
  const candidates = items
    .filter((item) => !item.deletedAt && (item.status === "REPORTED" || item.status === "IN_PROGRESS"))
    .filter(hasPosition)
    .map((item) => ({ ...item, time: new Date(item.occurredAt).getTime() }));
  const links = new Map<string, DuplicateLink[]>();
  const add = (from: string, link: DuplicateLink) => links.set(from, [...(links.get(from) ?? []), link]);

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];
      if (a.typeId !== b.typeId || Math.abs(a.time - b.time) > DUPLICATE_WINDOW_MS) continue;
      const distance = distanceInMeters({ lat: a.latitude, lng: a.longitude }, { lat: b.latitude, lng: b.longitude });
      if (distance > DUPLICATE_RADIUS_METERS) continue;
      add(a.id, { id: b.id, distance });
      add(b.id, { id: a.id, distance });
    }
  }
  for (const list of links.values()) list.sort((x, y) => x.distance - y.distance);
  return links;
}

/** Duplicate links computed against every active incident, not just the visible page. */
export async function getDuplicateMap(): Promise<Map<string, DuplicateLink[]>> {
  return findDuplicates(await listActiveIncidents());
}

// --- Detail -----------------------------------------------------------------------

export type IncidentDuplicate = { incident: IncidentDto; distance: number };

export async function getIncidentAdminDetail(id: string) {
  const incident = await getIncident(id);
  if (!incident) return null;
  const database = await db();
  const [reporter, timeline, review, [deletedBy], active] = await Promise.all([
    getIncidentReporter(id),
    listEntityActivity("incident", id),
    getReviewForIncident(id),
    incident.deletedAt
      ? database
          .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
          .from(incidents)
          .innerJoin(users, eq(incidents.deletedBy, users.id))
          .where(eq(incidents.id, id))
      : Promise.resolve([]),
    listActiveIncidents(),
  ]);
  const others = new Map(active.filter((other) => other.id !== id).map((other) => [other.id, other]));
  const duplicates: IncidentDuplicate[] = (findDuplicates([incident, ...others.values()]).get(id) ?? []).map((link) => ({
    incident: others.get(link.id)!,
    distance: link.distance,
  }));
  return { incident, reporter, timeline, review, deletedBy: deletedBy ?? null, duplicates };
}

// --- Mutations -------------------------------------------------------------------

export type IncidentEdit = {
  typeId: number;
  description: string;
  peopleInvolved: number;
  street: string | null;
  postalCode: string | null;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  reportedVillainName: string | null;
  priority: IncidentPriority | null;
  villainId: string | null;
};

const FIELD_LABELS: Record<keyof IncidentEdit, string> = {
  typeId: "type",
  description: "description",
  peopleInvolved: "personnes impliquées",
  street: "rue",
  postalCode: "code postal",
  city: "ville",
  country: "pays",
  latitude: "position",
  longitude: "position",
  reportedVillainName: "vilain signalé",
  priority: "priorité",
  villainId: "vilain",
};

/** Emails the citizen who reported the incident after a moderator changed or removed it. */
export async function notifyReporter(incidentId: string, actorId: string, deleted: boolean, reason: string | null) {
  const [incident, reporter, baseUrl] = await Promise.all([
    getIncident(incidentId),
    getIncidentReporter(incidentId),
    getBaseUrl(),
  ]);
  // A moderator who reported the incident himself doesn't need an email.
  if (!incident || !reporter || reporter.id === actorId) return;
  queueMails([
    {
      to: reporter.email,
      ...mailTemplates.incidentModerated(
        reporter.firstName,
        toMailInfo(incident),
        deleted,
        reason,
        `${baseUrl}/citoyen/incidents/${incidentId}`,
      ),
    },
  ]);
}

/**
 * Moderators fix the descriptive fields of a report. Status, hero and
 * intervention timestamps are never touched: the database checks they agree.
 */
export async function updateIncidentAsModerator(
  incidentId: string,
  input: IncidentEdit,
  actorId: string,
): Promise<MutationResult & { changed?: string[] }> {
  const database = await db();
  const [current] = await database
    .select()
    .from(incidents)
    .where(and(eq(incidents.id, incidentId), isNull(incidents.deletedAt)));
  if (!current) return { ok: false, error: "Cet incident n'existe plus ou a été supprimé." };

  // The arrest recorded by the hero refers to this villain: the link stays.
  const next: IncidentEdit = current.villainImprisoned ? { ...input, villainId: current.villainId } : input;
  const changedKeys = (Object.keys(next) as (keyof IncidentEdit)[]).filter((key) => next[key] !== current[key]);
  if (changedKeys.length === 0) return { ok: true, changed: [] };

  await database.update(incidents).set(next).where(eq(incidents.id, incidentId));
  const changed = [...new Set(changedKeys.map((key) => FIELD_LABELS[key]))];
  await logActivity({
    actorId,
    action: changedKeys.length === 1 && changedKeys[0] === "priority" ? "incident.priority" : "incident.update",
    entityType: "incident",
    entityId: incidentId,
    metadata: { fields: changed, ...(changedKeys.includes("priority") ? { priority: next.priority } : {}) },
  });
  await notifyReporter(incidentId, actorId, false, null);
  return { ok: true, changed };
}

/** Soft delete: the reporter keeps the incident in his history and is told why. */
export async function deleteIncidentAsModerator(incidentId: string, reason: string, actorId: string): Promise<MutationResult> {
  const database = await db();
  const [row] = await database
    .update(incidents)
    .set({ deletedAt: new Date(), deletedBy: actorId })
    .where(and(eq(incidents.id, incidentId), isNull(incidents.deletedAt)))
    .returning({ id: incidents.id });
  if (!row) return { ok: false, error: "Cet incident a déjà été supprimé." };
  await logActivity({ actorId, action: "incident.delete", entityType: "incident", entityId: incidentId, metadata: { reason } });
  await notifyReporter(incidentId, actorId, true, reason);
  return { ok: true };
}

/** Turns the name typed by the citizen into an encyclopedia entry linked to the incident. */
export async function createVillainFromReport(
  incidentId: string,
  actorId: string,
): Promise<{ ok: true; villainId: string; created: boolean } | { ok: false; error: string }> {
  const database = await db();
  const [incident] = await database
    .select({ name: incidents.reportedVillainName, villainId: incidents.villainId })
    .from(incidents)
    .where(and(eq(incidents.id, incidentId), isNull(incidents.deletedAt)));
  if (!incident) return { ok: false, error: "Cet incident n'existe plus ou a été supprimé." };
  if (incident.villainId) return { ok: false, error: "Un vilain est déjà lié à cet incident." };
  const alias = incident.name?.trim();
  if (!alias) return { ok: false, error: "Aucun nom de vilain n'a été signalé." };

  const findExisting = async () => {
    const [existing] = await database
      .select({ id: villains.id })
      .from(villains)
      .where(sql`lower(${villains.alias}) = lower(${alias})`);
    return existing?.id ?? null;
  };

  let villainId = await findExisting();
  let created = false;
  if (!villainId) {
    try {
      const [inserted] = await database.insert(villains).values({ alias, createdBy: actorId }).returning({ id: villains.id });
      villainId = inserted.id;
      created = true;
    } catch (error) {
      // Someone created it in the meantime: link that one.
      if (!isUniqueViolation(error)) throw error;
      villainId = await findExisting();
      if (!villainId) throw error;
    }
  }

  await database.update(incidents).set({ villainId }).where(eq(incidents.id, incidentId));
  if (created) {
    await logActivity({ actorId, action: "villain.create", entityType: "villain", entityId: villainId, metadata: { alias } });
  }
  await logActivity({
    actorId,
    action: "incident.update",
    entityType: "incident",
    entityId: incidentId,
    metadata: { fields: [FIELD_LABELS.villainId] },
  });
  await notifyReporter(incidentId, actorId, false, null);
  return { ok: true, villainId, created };
}
