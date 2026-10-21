import "server-only";
import { and, desc, eq, gt, inArray, isNull, or, type SQL } from "drizzle-orm";
import {
  heroProfiles,
  incidentTypes,
  incidents,
  users,
  villains,
} from "@/db/schema";
import type { Database } from "@/db";
import type { IncidentPriority, IncidentStatus } from "@/lib/labels";
import { logActivity } from "../activity";
import { db, isUniqueViolation } from "../db";
import {
  getHeroEmails,
  getStaffEmails,
  type MailMessage,
  mailTemplates,
  queueMails,
  toMany,
} from "../mail";
import type { IncidentMailInfo } from "../mail/templates";
import { getBaseUrl } from "../url";

export type IncidentDto = {
  id: string;
  typeId: number;
  typeCode: string;
  typeLabel: string;
  endangersCitizens: boolean;
  status: IncidentStatus;
  priority: IncidentPriority | null;
  description: string;
  occurredAt: string;
  createdAt: string;
  street: string | null;
  postalCode: string | null;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  peopleInvolved: number;
  reportedVillainName: string | null;
  villain: { id: string; alias: string; imprisoned: boolean } | null;
  hero: { id: string; alias: string } | null;
  reporterId: string | null;
  interventionStartedAt: string | null;
  interventionEndedAt: string | null;
  villainImprisoned: boolean;
  deletedAt: string | null;
};

const columns = {
  id: incidents.id,
  typeId: incidents.typeId,
  typeCode: incidentTypes.code,
  typeLabel: incidentTypes.label,
  endangersCitizens: incidentTypes.endangersCitizens,
  status: incidents.status,
  priority: incidents.priority,
  description: incidents.description,
  occurredAt: incidents.occurredAt,
  createdAt: incidents.createdAt,
  street: incidents.street,
  postalCode: incidents.postalCode,
  city: incidents.city,
  country: incidents.country,
  latitude: incidents.latitude,
  longitude: incidents.longitude,
  peopleInvolved: incidents.peopleInvolved,
  reportedVillainName: incidents.reportedVillainName,
  villainId: villains.id,
  villainAlias: villains.alias,
  villainStatus: villains.status,
  heroId: incidents.heroId,
  heroAlias: heroProfiles.alias,
  reporterId: incidents.reporterId,
  interventionStartedAt: incidents.interventionStartedAt,
  interventionEndedAt: incidents.interventionEndedAt,
  villainImprisoned: incidents.villainImprisoned,
  deletedAt: incidents.deletedAt,
};

function incidentQuery(database: Database) {
  return database
    .select(columns)
    .from(incidents)
    .innerJoin(incidentTypes, eq(incidents.typeId, incidentTypes.id))
    .leftJoin(villains, eq(incidents.villainId, villains.id))
    .leftJoin(heroProfiles, eq(incidents.heroId, heroProfiles.userId));
}

type Row = Awaited<ReturnType<typeof incidentQuery>>[number];

const iso = (date: Date | null) => (date ? date.toISOString() : null);

function toDto(row: Row): IncidentDto {
  return {
    id: row.id,
    typeId: row.typeId,
    typeCode: row.typeCode,
    typeLabel: row.typeLabel,
    endangersCitizens: row.endangersCitizens,
    status: row.status,
    priority: row.priority,
    description: row.description,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    street: row.street,
    postalCode: row.postalCode,
    city: row.city,
    country: row.country,
    latitude: row.latitude,
    longitude: row.longitude,
    peopleInvolved: row.peopleInvolved,
    reportedVillainName: row.reportedVillainName,
    villain: row.villainId
      ? { id: row.villainId, alias: row.villainAlias!, imprisoned: row.villainStatus === "IMPRISONED" }
      : null,
    hero: row.heroId && row.heroAlias ? { id: row.heroId, alias: row.heroAlias } : null,
    reporterId: row.reporterId,
    interventionStartedAt: iso(row.interventionStartedAt),
    interventionEndedAt: iso(row.interventionEndedAt),
    villainImprisoned: row.villainImprisoned,
    deletedAt: iso(row.deletedAt),
  };
}

async function selectIncidents(where: SQL | undefined, limit?: number): Promise<IncidentDto[]> {
  const database = await db();
  const query = incidentQuery(database)
    .where(where)
    .orderBy(desc(incidents.createdAt));
  const rows = limit ? await query.limit(limit) : await query;
  return rows.map(toDto);
}

const notDeleted = isNull(incidents.deletedAt);
const isActive = inArray(incidents.status, ["REPORTED", "IN_PROGRESS"]);

/** Reported and ongoing incidents (map of citizens, duplicate checks). */
export function listActiveIncidents(): Promise<IncidentDto[]> {
  return selectIncidents(and(notDeleted, isActive));
}

/** Hero board: everything active plus what ended in the last 24 hours. */
export function listHeroBoardIncidents(): Promise<IncidentDto[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return selectIncidents(and(notDeleted, or(isActive, gt(incidents.interventionEndedAt, since))));
}

/** A citizen's history, including incidents removed by moderators. */
export function listIncidentsReportedBy(userId: string): Promise<IncidentDto[]> {
  return selectIncidents(eq(incidents.reporterId, userId));
}

export function listInterventionsOf(heroId: string, limit = 50): Promise<IncidentDto[]> {
  return selectIncidents(and(notDeleted, eq(incidents.heroId, heroId)), limit);
}

export function listIncidentsOfVillain(villainId: string, limit = 20): Promise<IncidentDto[]> {
  return selectIncidents(and(notDeleted, eq(incidents.villainId, villainId)), limit);
}

export function listRecentSuccesses(limit = 8): Promise<IncidentDto[]> {
  return selectIncidents(and(notDeleted, eq(incidents.status, "SUCCEEDED")), limit);
}

export async function getIncident(id: string): Promise<IncidentDto | null> {
  if (!isUuid(id)) return null;
  const [incident] = await selectIncidents(eq(incidents.id, id), 1);
  return incident ?? null;
}

export async function getIncidentReporter(incidentId: string) {
  const database = await db();
  const [row] = await database
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone, email: users.email })
    .from(incidents)
    .innerJoin(users, eq(incidents.reporterId, users.id))
    .where(eq(incidents.id, incidentId));
  return row ?? null;
}

export async function listIncidentTypes() {
  const database = await db();
  return database.select().from(incidentTypes).orderBy(incidentTypes.id);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function toMailInfo(incident: IncidentDto): IncidentMailInfo {
  return {
    typeLabel: incident.typeLabel,
    city: incident.city,
    street: incident.street,
    occurredAt: new Date(incident.occurredAt),
    priority: incident.priority,
    description: incident.description,
    peopleInvolved: incident.peopleInvolved,
  };
}

// --- Mutations -----------------------------------------------------------------

export type NewIncident = {
  typeId: number;
  description: string;
  occurredAt: Date;
  peopleInvolved: number;
  street: string | null;
  postalCode: string | null;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  reportedVillainName: string | null;
  priority?: IncidentPriority | null;
};

/** Workflow 4.1: the incident shows up for heroes and moderators, who get an email. */
export async function createIncident(input: NewIncident, reporterId: string): Promise<string> {
  const database = await db();
  const [created] = await database
    .insert(incidents)
    .values({ ...input, priority: input.priority ?? null, reporterId })
    .returning({ id: incidents.id });
  await logActivity({ actorId: reporterId, action: "incident.create", entityType: "incident", entityId: created.id });

  const incident = (await getIncident(created.id))!;
  const [baseUrl, staff, heroes] = await Promise.all([getBaseUrl(), getStaffEmails(), getHeroEmails()]);
  const info = toMailInfo(incident);
  queueMails([
    ...toMany(staff, mailTemplates.incidentReported(info, `${baseUrl}/admin/incidents/${incident.id}`)),
    ...toMany(heroes, mailTemplates.incidentReported(info, `${baseUrl}/heros?incident=${incident.id}`)),
  ]);
  return created.id;
}

export type MutationResult = { ok: true } | { ok: false; error: string };

export async function setIncidentPriority(
  incidentId: string,
  priority: IncidentPriority,
  actorId: string,
): Promise<MutationResult> {
  const database = await db();
  const [row] = await database
    .update(incidents)
    .set({ priority })
    .where(and(eq(incidents.id, incidentId), notDeleted))
    .returning({ id: incidents.id });
  if (!row) return { ok: false, error: "Incident introuvable." };
  await logActivity({ actorId, action: "incident.priority", entityType: "incident", entityId: incidentId, metadata: { priority } });
  return { ok: true };
}

/** "1 intervention à la fois": guarded by a partial unique index. */
export async function takeIncident(incidentId: string, heroId: string): Promise<MutationResult> {
  const database = await db();
  try {
    const [row] = await database
      .update(incidents)
      .set({ status: "IN_PROGRESS", heroId, interventionStartedAt: new Date() })
      .where(and(eq(incidents.id, incidentId), eq(incidents.status, "REPORTED"), notDeleted))
      .returning({ id: incidents.id });
    if (!row) return { ok: false, error: "Cet incident est déjà pris en charge ou n'existe plus." };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, error: "Vous avez déjà une intervention en cours : terminez-la d'abord." };
    }
    throw error;
  }
  await database.update(heroProfiles).set({ onDuty: true }).where(eq(heroProfiles.userId, heroId));
  await logActivity({ actorId: heroId, action: "incident.take", entityType: "incident", entityId: incidentId });

  const incident = (await getIncident(incidentId))!;
  const [baseUrl, staff] = await Promise.all([getBaseUrl(), getStaffEmails()]);
  queueMails(
    toMany(staff, mailTemplates.incidentTaken(incident.hero!.alias, toMailInfo(incident), `${baseUrl}/admin/incidents/${incidentId}`)),
  );
  return { ok: true };
}

export type InterventionReport = {
  outcome: "SUCCEEDED" | "FAILED";
  villainId: string | null;
  villainImprisoned: boolean;
  peopleInvolved: number;
};

export async function closeIntervention(
  incidentId: string,
  heroId: string,
  report: InterventionReport,
): Promise<MutationResult> {
  const database = await db();
  const imprisoned = report.outcome === "SUCCEEDED" && report.villainImprisoned && report.villainId !== null;
  const closed = await database.transaction(async (tx) => {
    const [row] = await tx
      .update(incidents)
      .set({
        status: report.outcome,
        interventionEndedAt: new Date(),
        villainId: report.villainId,
        villainImprisoned: imprisoned,
        peopleInvolved: report.peopleInvolved,
      })
      .where(and(eq(incidents.id, incidentId), eq(incidents.heroId, heroId), eq(incidents.status, "IN_PROGRESS")))
      .returning({ latitude: incidents.latitude, longitude: incidents.longitude });
    if (!row) return false;
    if (imprisoned) {
      await tx
        .update(villains)
        .set({ status: "IMPRISONED", imprisonedAt: new Date() })
        .where(eq(villains.id, report.villainId!));
    }
    // The hero now stands where the intervention ended.
    if (row.latitude !== null && row.longitude !== null) {
      await tx
        .update(heroProfiles)
        .set({ latitude: row.latitude, longitude: row.longitude, locationUpdatedAt: new Date() })
        .where(eq(heroProfiles.userId, heroId));
    }
    return true;
  });
  if (!closed) return { ok: false, error: "Aucune intervention en cours sur cet incident." };

  await logActivity({
    actorId: heroId,
    action: report.outcome === "SUCCEEDED" ? "incident.succeed" : "incident.fail",
    entityType: "incident",
    entityId: incidentId,
    metadata: { villainImprisoned: imprisoned },
  });

  const incident = (await getIncident(incidentId))!;
  const [baseUrl, staff, reporter] = await Promise.all([getBaseUrl(), getStaffEmails(), getIncidentReporter(incidentId)]);
  const succeeded = report.outcome === "SUCCEEDED";
  const messages: MailMessage[] = toMany(
    staff,
    mailTemplates.incidentClosed(incident.hero!.alias, toMailInfo(incident), succeeded, imprisoned, `${baseUrl}/admin/incidents/${incidentId}`),
  );
  if (reporter) {
    messages.push({
      to: reporter.email,
      ...mailTemplates.rateHero(reporter.firstName, incident.hero!.alias, succeeded, `${baseUrl}/citoyen/incidents/${incidentId}#noter`),
    });
  }
  queueMails(messages);
  return { ok: true };
}
