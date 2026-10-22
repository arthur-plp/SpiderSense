import "server-only";
import { and, desc, eq, inArray, isNotNull, isNull, type SQL } from "drizzle-orm";
import { heroProfiles, heroReviews, incidentTypes, incidents, users } from "@/db/schema";
import { logActivity } from "../activity";
import { db } from "../db";
import { appendIncidentEvent, markCommitted } from "../events/store";

export type ReviewDto = {
  id: string;
  incidentId: string;
  heroId: string;
  heroAlias: string;
  rating: number;
  comment: string | null;
  heroReply: string | null;
  repliedAt: string | null;
  hidden: boolean;
  createdAt: string;
  /** "Camille M." — the full name is never shown publicly. */
  citizenName: string;
  incidentType: string;
  incidentCity: string;
};

async function selectReviews(where: SQL | undefined): Promise<ReviewDto[]> {
  const database = await db();
  const rows = await database
    .select({
      id: heroReviews.id,
      incidentId: heroReviews.incidentId,
      heroId: heroReviews.heroId,
      heroAlias: heroProfiles.alias,
      rating: heroReviews.rating,
      comment: heroReviews.comment,
      heroReply: heroReviews.heroReply,
      repliedAt: heroReviews.repliedAt,
      moderationStatus: heroReviews.moderationStatus,
      createdAt: heroReviews.createdAt,
      firstName: users.firstName,
      lastName: users.lastName,
      incidentType: incidentTypes.label,
      incidentCity: incidents.city,
    })
    .from(heroReviews)
    .innerJoin(heroProfiles, eq(heroReviews.heroId, heroProfiles.userId))
    .innerJoin(incidents, eq(heroReviews.incidentId, incidents.id))
    .innerJoin(incidentTypes, eq(incidents.typeId, incidentTypes.id))
    .leftJoin(users, eq(heroReviews.citizenId, users.id))
    .where(where)
    .orderBy(desc(heroReviews.createdAt));
  return rows.map((row) => ({
    id: row.id,
    incidentId: row.incidentId,
    heroId: row.heroId,
    heroAlias: row.heroAlias,
    rating: row.rating,
    comment: row.comment,
    heroReply: row.heroReply,
    repliedAt: row.repliedAt?.toISOString() ?? null,
    hidden: row.moderationStatus === "HIDDEN",
    createdAt: row.createdAt.toISOString(),
    citizenName: row.firstName ? `${row.firstName} ${row.lastName?.[0] ?? ""}.` : "Citoyen anonyme",
    incidentType: row.incidentType,
    incidentCity: row.incidentCity,
  }));
}

/** Public reputation: hidden reviews are excluded unless asked (moderation). */
export function listHeroReviews(heroId: string, includeHidden = false): Promise<ReviewDto[]> {
  return selectReviews(
    and(eq(heroReviews.heroId, heroId), includeHidden ? undefined : eq(heroReviews.moderationStatus, "VISIBLE")),
  );
}

export function listAllReviews(): Promise<ReviewDto[]> {
  return selectReviews(undefined);
}

export async function getReviewForIncident(incidentId: string): Promise<ReviewDto | null> {
  const [review] = await selectReviews(eq(heroReviews.incidentId, incidentId));
  return review ?? null;
}

export type RateableIntervention = {
  incidentId: string;
  heroId: string;
  heroAlias: string;
  typeLabel: string;
  city: string;
  status: "SUCCEEDED" | "FAILED";
  endedAt: string;
};

/** 6.1.3: interventions on the citizen's incidents not rated yet. */
export async function listRateableInterventions(citizenId: string): Promise<RateableIntervention[]> {
  const database = await db();
  const rows = await database
    .select({
      incidentId: incidents.id,
      heroId: heroProfiles.userId,
      heroAlias: heroProfiles.alias,
      typeLabel: incidentTypes.label,
      city: incidents.city,
      status: incidents.status,
      endedAt: incidents.interventionEndedAt,
    })
    .from(incidents)
    .innerJoin(incidentTypes, eq(incidents.typeId, incidentTypes.id))
    .innerJoin(heroProfiles, eq(incidents.heroId, heroProfiles.userId))
    .leftJoin(heroReviews, eq(heroReviews.incidentId, incidents.id))
    .where(
      and(
        eq(incidents.reporterId, citizenId),
        inArray(incidents.status, ["SUCCEEDED", "FAILED"]),
        isNull(incidents.deletedAt),
        isNotNull(incidents.interventionEndedAt),
        isNull(heroReviews.id),
      ),
    )
    .orderBy(desc(incidents.interventionEndedAt));
  return rows.map((row) => ({
    ...row,
    status: row.status as "SUCCEEDED" | "FAILED",
    endedAt: row.endedAt!.toISOString(),
  }));
}

export async function createReview(
  citizenId: string,
  incidentId: string,
  rating: number,
  comment: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const database = await db();
  const [incident] = await database
    .select({ heroId: incidents.heroId, status: incidents.status })
    .from(incidents)
    .where(and(eq(incidents.id, incidentId), eq(incidents.reporterId, citizenId), isNull(incidents.deletedAt)));
  if (!incident || !incident.heroId || (incident.status !== "SUCCEEDED" && incident.status !== "FAILED")) {
    return { ok: false, error: "Vous ne pouvez noter que les interventions terminées sur vos signalements." };
  }
  const heroId = incident.heroId;
  const recorded = await database.transaction(async (tx) => {
    const rows = await tx
      .insert(heroReviews)
      .values({ incidentId, citizenId, heroId, rating, comment })
      .onConflictDoNothing({ target: heroReviews.incidentId })
      .returning({ id: heroReviews.id });
    if (rows.length === 0) return null;
    const event = await appendIncidentEvent(tx, incidentId, "IncidentReviewed", citizenId, { reviewId: rows[0].id, heroId, rating });
    return { id: rows[0].id, event };
  });
  if (!recorded) return { ok: false, error: "Vous avez déjà noté cette intervention." };
  markCommitted([recorded.event]);
  const inserted = [{ id: recorded.id }];
  await logActivity({ actorId: citizenId, action: "review.create", entityType: "review", entityId: inserted[0].id, metadata: { rating } });
  return { ok: true };
}

export async function replyToReview(heroId: string, reviewId: string, reply: string): Promise<boolean> {
  const database = await db();
  const updated = await database
    .update(heroReviews)
    .set({ heroReply: reply, repliedAt: new Date() })
    .where(and(eq(heroReviews.id, reviewId), eq(heroReviews.heroId, heroId)))
    .returning({ id: heroReviews.id });
  if (updated.length === 0) return false;
  await logActivity({ actorId: heroId, action: "review.reply", entityType: "review", entityId: reviewId });
  return true;
}
