import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { heroMovies, heroReviews, incidentTypes, incidents, villains } from "@/db/schema";
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

/** Section 5.8.1 of the specification. */
export async function getGlobalStats(): Promise<GlobalStats> {
  const database = await db();
  const [[totals], types, [villainTotals]] = await Promise.all([
    database
      .select({
        totalIncidents: sql<number>`count(*)::int`,
        activeIncidents: sql<number>`count(*) filter (where ${incidents.status} in ('REPORTED', 'IN_PROGRESS'))::int`,
        interventions: sql<number>`count(*) filter (where ${incidents.heroId} is not null)::int`,
        succeeded: sql<number>`count(*) filter (where ${incidents.status} = 'SUCCEEDED')::int`,
        failed: sql<number>`count(*) filter (where ${incidents.status} = 'FAILED')::int`,
        // Rescued = people involved in a succeeded intervention, not the number of interventions.
        citizensSaved: sql<number>`coalesce(sum(${incidents.peopleInvolved}) filter (where ${incidents.status} = 'SUCCEEDED'), 0)::int`,
        endangeredCitizensSaved: sql<number>`coalesce(sum(${incidents.peopleInvolved}) filter (where ${incidents.status} = 'SUCCEEDED' and ${incidentTypes.endangersCitizens}), 0)::int`,
      })
      .from(incidents)
      .innerJoin(incidentTypes, eq(incidents.typeId, incidentTypes.id))
      .where(isNull(incidents.deletedAt)),
    database
      .select({ code: incidentTypes.code, label: incidentTypes.label, count: sql<number>`count(${incidents.id})::int` })
      .from(incidentTypes)
      .leftJoin(incidents, and(eq(incidents.typeId, incidentTypes.id), isNull(incidents.deletedAt)))
      .groupBy(incidentTypes.id)
      .orderBy(desc(sql`count(${incidents.id})`)),
    database
      .select({
        identified: sql<number>`count(*)::int`,
        imprisoned: sql<number>`count(*) filter (where ${villains.status} = 'IMPRISONED')::int`,
      })
      .from(villains),
  ]);
  const total = types.reduce((sum, type) => sum + type.count, 0);
  return {
    ...totals,
    villainsIdentified: villainTotals.identified,
    villainsImprisoned: villainTotals.imprisoned,
    typeShares: types
      .filter((type) => type.count > 0)
      .map((type) => ({ ...type, percent: total === 0 ? 0 : (type.count / total) * 100 })),
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
  const [[totals], [ratings], [movies], [enemy], weekly] = await Promise.all([
    database
      .select({
        interventions: sql<number>`count(*)::int`,
        succeeded: sql<number>`count(*) filter (where ${incidents.status} = 'SUCCEEDED')::int`,
        failed: sql<number>`count(*) filter (where ${incidents.status} = 'FAILED')::int`,
        villainsImprisoned: sql<number>`count(distinct ${incidents.villainId}) filter (where ${incidents.villainImprisoned})::int`,
        citizensSaved: sql<number>`coalesce(sum(${incidents.peopleInvolved}) filter (where ${incidents.status} = 'SUCCEEDED'), 0)::int`,
      })
      .from(incidents)
      .where(mine),
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
      .select({ id: villains.id, alias: villains.alias, encounters: sql<number>`count(*)::int` })
      .from(incidents)
      .innerJoin(villains, eq(incidents.villainId, villains.id))
      .where(mine)
      .groupBy(villains.id)
      .orderBy(desc(sql`count(*)`), villains.alias)
      .limit(1),
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
    ...totals,
    rating: ratings.rating,
    ratingCount: ratings.ratingCount,
    moviesCount: movies.count,
    worstEnemy: enemy ?? null,
    weekly: weeks,
  };
}
