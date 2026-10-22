import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { heroMovies, heroProfiles, heroReviews, heroStats, heroVillainStats, incidents, users } from "@/db/schema";
import type { HeroAvailability } from "@/lib/labels";
import { db } from "../db";
import { changeHero } from "../events/store";
import { actionTime } from "../request-context";

export type { HeroAvailability };

export type HeroDto = {
  id: string;
  alias: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  powers: string[];
  onDuty: boolean;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
  availability: HeroAvailability;
  activeIncidentId: string | null;
  interventions: number;
  succeeded: number;
  citizensSaved: number;
  villainsImprisoned: number;
  rating: number | null;
  ratingCount: number;
  moviesCount: number;
  memberSince: string;
};

/** Contact details: only for signed-in users (encyclopedia, staff). */
export type HeroContactDto = HeroDto & { email: string; phone: string };

async function loadHeroes(heroId?: string): Promise<HeroContactDto[]> {
  const database = await db();
  const heroFilter = heroId ? eq(users.id, heroId) : undefined;

  const [profiles, interventionStats, villainStats, activeInterventions, ratingStats, movieStats] = await Promise.all([
    database
      .select({
        id: users.id,
        alias: heroProfiles.alias,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        phone: users.phone,
        avatarUrl: users.avatarUrl,
        bio: heroProfiles.bio,
        powers: heroProfiles.powers,
        onDuty: heroProfiles.onDuty,
        latitude: heroProfiles.latitude,
        longitude: heroProfiles.longitude,
        locationUpdatedAt: heroProfiles.locationUpdatedAt,
        memberSince: heroProfiles.reviewedAt,
        createdAt: heroProfiles.createdAt,
      })
      .from(heroProfiles)
      .innerJoin(users, eq(heroProfiles.userId, users.id))
      .where(
        and(
          eq(heroProfiles.status, "APPROVED"),
          eq(users.role, "HERO"),
          isNull(users.disabledAt),
          heroFilter,
        ),
      )
      .orderBy(heroProfiles.alias),
    database
      .select({
        heroId: heroStats.heroId,
        interventions: heroStats.interventions,
        succeeded: heroStats.succeeded,
        citizensSaved: heroStats.citizensSaved,
      })
      .from(heroStats)
      .where(heroId ? eq(heroStats.heroId, heroId) : undefined),
    database
      .select({
        heroId: heroVillainStats.heroId,
        villainsImprisoned: sql<number>`count(*) filter (where ${heroVillainStats.imprisonments} > 0)::int`,
      })
      .from(heroVillainStats)
      .where(heroId ? eq(heroVillainStats.heroId, heroId) : undefined)
      .groupBy(heroVillainStats.heroId),
    // At most one per hero: incidents_one_active_intervention_per_hero.
    database
      .select({ heroId: incidents.heroId, activeIncidentId: incidents.id })
      .from(incidents)
      .where(
        and(
          eq(incidents.status, "IN_PROGRESS"),
          isNull(incidents.deletedAt),
          heroId ? eq(incidents.heroId, heroId) : undefined,
        ),
      ),
    database
      .select({
        heroId: heroReviews.heroId,
        rating: sql<number>`avg(${heroReviews.rating})::float8`,
        ratingCount: sql<number>`count(*)::int`,
      })
      .from(heroReviews)
      .where(and(eq(heroReviews.moderationStatus, "VISIBLE"), heroId ? eq(heroReviews.heroId, heroId) : undefined))
      .groupBy(heroReviews.heroId),
    database
      .select({ heroId: heroMovies.heroId, moviesCount: sql<number>`count(*)::int` })
      .from(heroMovies)
      .where(and(eq(heroMovies.status, "APPROVED"), heroId ? eq(heroMovies.heroId, heroId) : undefined))
      .groupBy(heroMovies.heroId),
  ]);

  const byHero = <T extends { heroId: string | null }>(rows: T[]) =>
    new Map(rows.map((row) => [row.heroId, row]));
  const interventionsOf = byHero(interventionStats);
  const villainsOf = byHero(villainStats);
  const activeOf = byHero(activeInterventions);
  const ratingsOf = byHero(ratingStats);
  const moviesOf = byHero(movieStats);

  return profiles.map((profile) => {
    const stats = interventionsOf.get(profile.id);
    const ratings = ratingsOf.get(profile.id);
    const activeIncidentId = activeOf.get(profile.id)?.activeIncidentId ?? null;
    return {
      id: profile.id,
      alias: profile.alias,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      phone: profile.phone,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      powers: profile.powers,
      onDuty: profile.onDuty,
      latitude: profile.latitude,
      longitude: profile.longitude,
      locationUpdatedAt: profile.locationUpdatedAt?.toISOString() ?? null,
      availability: activeIncidentId ? "BUSY" : profile.onDuty ? "AVAILABLE" : "OFF_DUTY",
      activeIncidentId,
      interventions: stats?.interventions ?? 0,
      succeeded: stats?.succeeded ?? 0,
      citizensSaved: stats?.citizensSaved ?? 0,
      villainsImprisoned: villainsOf.get(profile.id)?.villainsImprisoned ?? 0,
      rating: ratings?.rating ?? null,
      ratingCount: ratings?.ratingCount ?? 0,
      moviesCount: moviesOf.get(profile.id)?.moviesCount ?? 0,
      memberSince: (profile.memberSince ?? profile.createdAt).toISOString(),
    };
  });
}

const withoutContact = ({ email: _email, phone: _phone, ...hero }: HeroContactDto): HeroDto => hero;

/** Approved heroes, public information only. */
export async function listHeroes(): Promise<HeroDto[]> {
  return (await loadHeroes()).map(withoutContact);
}

/** Approved heroes with email and phone (encyclopedia 5.5, signed-in users). */
export function listHeroesWithContact(): Promise<HeroContactDto[]> {
  return loadHeroes();
}

export async function getHero(heroId: string): Promise<HeroContactDto | null> {
  if (!/^[0-9a-f-]{36}$/i.test(heroId)) return null;
  const [hero] = await loadHeroes(heroId);
  return hero ?? null;
}

export async function setHeroOnDuty(heroId: string, onDuty: boolean): Promise<void> {
  await changeHero(heroId, "HeroDutyChanged", async (tx) => {
    await tx.update(heroProfiles).set({ onDuty }).where(eq(heroProfiles.userId, heroId));
    return { onDuty };
  });
}

export async function setHeroLocation(heroId: string, latitude: number, longitude: number): Promise<void> {
  await changeHero(heroId, "HeroLocationUpdated", async (tx) => {
    await tx
      .update(heroProfiles)
      .set({ latitude, longitude, locationUpdatedAt: actionTime() })
      .where(eq(heroProfiles.userId, heroId));
    return { latitude, longitude };
  });
}
