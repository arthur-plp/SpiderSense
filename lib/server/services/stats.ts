import "server-only";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { heroMovies, heroReviews, heroStats, heroVillainStats, incidentCounts, incidentTypes, incidents, villains } from "@/db/schema";
import { db } from "../db";

export type TypeShare = { code: string; label: string; count: number; percent: number };

export type GlobalStats = {
  totalIncidents: number;
  activeIncidents: number;
  interventions: number;
  succeeded: number;
  failed: number;
  citizensSaved: number;
  endangeredCitizensSaved: number;
  villainsIdentified: number;
  villainsImprisoned: number;
  typeShares: TypeShare[];
};

/**
 * Section 5.8.1 of the specification. Read from the incident_counts
 * projection (a few dozen rows) instead of aggregating every incident.
 */
export async function getGlobalStats(): Promise<GlobalStats> {
  const database = await db();
  const [counts, types, [villainTotals]] = await Promise.all([
    database
      .select({
        typeId: incidentCounts.typeId,
        status: incidentCounts.status,
        incidents: incidentCounts.incidents,
        people: incidentCounts.peopleInvolved,
      })
      .from(incidentCounts)
      .where(eq(incidentCounts.deleted, false)),
    database.select().from(incidentTypes).orderBy(incidentTypes.id),
    database
      .select({
        identified: sql<number>`count(*)::int`,
        imprisoned: sql<number>`count(*) filter (where ${villains.status} = 'IMPRISONED')::int`,
      })
      .from(villains),
  ]);
  const endangers = new Set(types.filter((type) => type.endangersCitizens).map((type) => type.id));
  const totals = {
    totalIncidents: 0,
    activeIncidents: 0,
    interventions: 0,
    succeeded: 0,
    failed: 0,
    citizensSaved: 0,
    endangeredCitizensSaved: 0,
  };
  const perType = new Map<number, number>();
  for (const row of counts) {
    totals.totalIncidents += row.incidents;
    perType.set(row.typeId, (perType.get(row.typeId) ?? 0) + row.incidents);
    if (row.status === "REPORTED" || row.status === "IN_PROGRESS") totals.activeIncidents += row.incidents;
    // A hero is assigned from IN_PROGRESS on (database check incidents_intervention_matches_status).
    if (row.status !== "REPORTED") totals.interventions += row.incidents;
    if (row.status === "FAILED") totals.failed += row.incidents;
    if (row.status === "SUCCEEDED") {
      totals.succeeded += row.incidents;
      // Rescued = people involved in a succeeded intervention, not the number of interventions.
      totals.citizensSaved += row.people;
      if (endangers.has(row.typeId)) totals.endangeredCitizensSaved += row.people;
    }
  }
  return {
    ...totals,
    villainsIdentified: villainTotals.identified,
    villainsImprisoned: villainTotals.imprisoned,
    typeShares: types
      .map((type) => ({ code: type.code, label: type.label, count: perType.get(type.id) ?? 0 }))
      .filter((type) => type.count > 0)
      .sort((a, b) => b.count - a.count)
      .map((type) => ({ ...type, percent: totals.totalIncidents === 0 ? 0 : (type.count / totals.totalIncidents) * 100 })),
  };
}

export type HeroStats = {
  interventions: number;
  succeeded: number;
  failed: number;
  villainsImprisoned: number;
  rating: number | null;
  ratingCount: number;
  moviesCount: number;
  citizensSaved: number;
  worstEnemy: { id: string; alias: string; encounters: number } | null;
  weekly: { weekStart: string; count: number }[];
};

/** Section 5.8.2 of the specification. */
export async function getHeroStats(heroId: string): Promise<HeroStats> {
  const database = await db();
  const mine = and(eq(incidents.heroId, heroId), isNull(incidents.deletedAt));
  const [[totals], [imprisoned], [ratings], [movies], [enemy], weekly] = await Promise.all([
    database
      .select({
        interventions: heroStats.interventions,
        succeeded: heroStats.succeeded,
        failed: heroStats.failed,
        citizensSaved: heroStats.citizensSaved,
      })
      .from(heroStats)
      .where(eq(heroStats.heroId, heroId)),
    database
      .select({ count: sql<number>`count(*)::int` })
      .from(heroVillainStats)
      .where(and(eq(heroVillainStats.heroId, heroId), gt(heroVillainStats.imprisonments, 0))),
    database
      .select({ rating: sql<number | null>`avg(${heroReviews.rating})::float8`, ratingCount: sql<number>`count(*)::int` })
      .from(heroReviews)
      .where(and(eq(heroReviews.heroId, heroId), eq(heroReviews.moderationStatus, "VISIBLE"))),
    database
      .select({ count: sql<number>`count(*)::int` })
      .from(heroMovies)
      .where(and(eq(heroMovies.heroId, heroId), eq(heroMovies.status, "APPROVED"))),
    // Worst enemy: the villain this hero has faced the most.
    database
      .select({ id: villains.id, alias: villains.alias, encounters: heroVillainStats.encounters })
      .from(heroVillainStats)
      .innerJoin(villains, eq(heroVillainStats.villainId, villains.id))
      .where(and(eq(heroVillainStats.heroId, heroId), gt(heroVillainStats.encounters, 0)))
      .orderBy(desc(heroVillainStats.encounters), villains.alias)
      .limit(1),
    // 8 weeks of one hero: read through incidents_hero_started_at_idx.
    database
      .select({
        weekStart: sql<string>`to_char(date_trunc('week', ${incidents.interventionStartedAt}), 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(incidents)
      .where(and(mine, sql`${incidents.interventionStartedAt} > now() - interval '8 weeks'`))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
  ]);

  // Fill missing weeks so the chart has a stable 8-bar axis.
  const counts = new Map(weekly.map((week) => [week.weekStart, week.count]));
  const monday = new Date();
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(monday);
    start.setUTCDate(start.getUTCDate() - (7 - index) * 7);
    const key = start.toISOString().slice(0, 10);
    return { weekStart: key, count: counts.get(key) ?? 0 };
  });

  return {
    interventions: totals?.interventions ?? 0,
    succeeded: totals?.succeeded ?? 0,
    failed: totals?.failed ?? 0,
    citizensSaved: totals?.citizensSaved ?? 0,
    villainsImprisoned: imprisoned.count,
    rating: ratings.rating,
    ratingCount: ratings.ratingCount,
    moviesCount: movies.count,
    worstEnemy: enemy ?? null,
    weekly: weeks,
  };
}
