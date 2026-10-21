import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { heroMovies, heroProfiles, heroReviews, incidents, users } from "@/db/schema";
import type { HeroAvailability } from "@/lib/labels";
import { db } from "../db";

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

  const [profiles, interventionStats, ratingStats, movieStats] = await Promise.all([
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
        heroId: incidents.heroId,
        interventions: sql<number>`count(*)::int`,
        succeeded: sql<number>`count(*) filter (where ${incidents.status} = 'SUCCEEDED')::int`,
        citizensSaved: sql<number>`coalesce(sum(${incidents.peopleInvolved}) filter (where ${incidents.status} = 'SUCCEEDED'), 0)::int`,
        villainsImprisoned: sql<number>`count(distinct ${incidents.villainId}) filter (where ${incidents.villainImprisoned})::int`,
        activeIncidentId: sql<string | null>`(array_agg(${incidents.id}::text) filter (where ${incidents.status} = 'IN_PROGRESS'))[1]`,
      })
      .from(incidents)
      .where(and(isNull(incidents.deletedAt), heroId ? eq(incidents.heroId, heroId) : undefined))
      .groupBy(incidents.heroId),
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
  const ratingsOf = byHero(ratingStats);
  const moviesOf = byHero(movieStats);

  return profiles.map((profile) => {
    const stats = interventionsOf.get(profile.id);
    const ratings = ratingsOf.get(profile.id);
    const activeIncidentId = stats?.activeIncidentId ?? null;
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
      villainsImprisoned: stats?.villainsImprisoned ?? 0,
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
  const database = await db();
  await database.update(heroProfiles).set({ onDuty }).where(eq(heroProfiles.userId, heroId));
}

export async function setHeroLocation(heroId: string, latitude: number, longitude: number): Promise<void> {
  const database = await db();
  await database
    .update(heroProfiles)
    .set({ latitude, longitude, locationUpdatedAt: new Date() })
    .where(eq(heroProfiles.userId, heroId));
}
