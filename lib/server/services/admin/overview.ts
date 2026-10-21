import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  emailChangeRequests,
  heroMovies,
  heroProfiles,
  heroReviews,
  incidents,
  users,
} from "@/db/schema";
import { db } from "../../db";

export type ModerationCounters = {
  incidentsToPrioritize: number;
  pendingHeroes: number;
  pendingMovies: number;
  pendingEmailChanges: number;
  reviews: number;
  hiddenReviews: number;
  users: number;
  disabledUsers: number;
  unverifiedCitizens: number;
};

/** Everything waiting for a moderator, for the overview and the navigation. */
export async function getModerationCounters(): Promise<ModerationCounters> {
  const database = await db();
  const [[toPrioritize], [heroes], [movies], [emails], [reviews], [people]] = await Promise.all([
    database
      .select({ count: sql<number>`count(*)::int` })
      .from(incidents)
      .where(
        and(
          isNull(incidents.deletedAt),
          isNull(incidents.priority),
          inArray(incidents.status, ["REPORTED", "IN_PROGRESS"]),
        ),
      ),
    database.select({ count: sql<number>`count(*)::int` }).from(heroProfiles).where(eq(heroProfiles.status, "PENDING")),
    database.select({ count: sql<number>`count(*)::int` }).from(heroMovies).where(eq(heroMovies.status, "PENDING")),
    database
      .select({ count: sql<number>`count(*)::int` })
      .from(emailChangeRequests)
      .where(eq(emailChangeRequests.status, "PENDING")),
    database
      .select({
        total: sql<number>`count(*)::int`,
        hidden: sql<number>`count(*) filter (where ${heroReviews.moderationStatus} = 'HIDDEN')::int`,
      })
      .from(heroReviews),
    database
      .select({
        total: sql<number>`count(*)::int`,
        disabled: sql<number>`count(*) filter (where ${users.disabledAt} is not null)::int`,
        unverified: sql<number>`count(*) filter (where ${users.role} = 'CITIZEN' and ${users.verifiedAt} is null and ${users.disabledAt} is null)::int`,
      })
      .from(users),
  ]);
  return {
    incidentsToPrioritize: toPrioritize.count,
    pendingHeroes: heroes.count,
    pendingMovies: movies.count,
    pendingEmailChanges: emails.count,
    reviews: reviews.total,
    hiddenReviews: reviews.hidden,
    users: people.total,
    disabledUsers: people.disabled,
    unverifiedCitizens: people.unverified,
  };
}
