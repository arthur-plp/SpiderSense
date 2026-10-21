import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { emailChangeRequests, heroMovies, heroProfiles, movies, newsletterSubscriptions, users } from "@/db/schema";
import { logActivity } from "../../activity";
import { db, isUniqueViolation } from "../../db";
import { mailTemplates, queueMails } from "../../mail";
import { getBaseUrl } from "../../url";
import type { MutationResult } from "../incidents";

// --- Hero applications (3.1.2) ----------------------------------------------------

export type HeroApplication = {
  userId: string;
  alias: string;
  bio: string | null;
  powers: string[];
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  avatarUrl: string | null;
  verified: boolean;
  requestedAt: string;
};

export async function listPendingHeroApplications(): Promise<HeroApplication[]> {
  const database = await db();
  const rows = await database
    .select({
      userId: heroProfiles.userId,
      alias: heroProfiles.alias,
      bio: heroProfiles.bio,
      powers: heroProfiles.powers,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      phone: users.phone,
      city: users.city,
      avatarUrl: users.avatarUrl,
      verifiedAt: users.verifiedAt,
      requestedAt: heroProfiles.updatedAt,
    })
    .from(heroProfiles)
    .innerJoin(users, eq(heroProfiles.userId, users.id))
    .where(eq(heroProfiles.status, "PENDING"))
    .orderBy(asc(heroProfiles.updatedAt));
  return rows.map(({ verifiedAt, requestedAt, ...row }) => ({
    ...row,
    verified: verifiedAt !== null,
    requestedAt: requestedAt.toISOString(),
  }));
}

export async function decideHeroApplication(userId: string, approved: boolean, actorId: string): Promise<MutationResult> {
  const database = await db();
  const decided = await database.transaction(async (tx) => {
    const [profile] = await tx
      .update(heroProfiles)
      .set({ status: approved ? "APPROVED" : "REJECTED", reviewedBy: actorId, reviewedAt: new Date() })
      .where(and(eq(heroProfiles.userId, userId), eq(heroProfiles.status, "PENDING")))
      .returning({ alias: heroProfiles.alias });
    if (!profile) return null;
    // Staff members keep their role: only citizens become heroes.
    if (approved) {
      await tx.update(users).set({ role: "HERO" }).where(and(eq(users.id, userId), eq(users.role, "CITIZEN")));
    }
    const [user] = await tx.select({ firstName: users.firstName, email: users.email }).from(users).where(eq(users.id, userId));
    return { alias: profile.alias, ...user };
  });
  if (!decided) return { ok: false, error: "Cette demande a déjà été traitée." };

  await logActivity({
    actorId,
    action: approved ? "hero.approve" : "hero.reject",
    entityType: "user",
    entityId: userId,
    metadata: { alias: decided.alias },
  });
  const baseUrl = await getBaseUrl();
  queueMails([
    {
      to: decided.email,
      ...mailTemplates.heroApplicationDecision(
        decided.firstName,
        decided.alias,
        approved,
        `${baseUrl}${approved ? "/heros" : "/citoyen/compte"}`,
      ),
    },
  ]);
  return { ok: true };
}

// --- Email changes (5.8.3) ---------------------------------------------------------

export type EmailChangeRequest = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  currentEmail: string;
  newEmail: string;
  avatarUrl: string | null;
  requestedAt: string;
};

export async function listPendingEmailChanges(): Promise<EmailChangeRequest[]> {
  const database = await db();
  const rows = await database
    .select({
      id: emailChangeRequests.id,
      userId: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      currentEmail: users.email,
      newEmail: emailChangeRequests.newEmail,
      avatarUrl: users.avatarUrl,
      requestedAt: emailChangeRequests.createdAt,
    })
    .from(emailChangeRequests)
    .innerJoin(users, eq(emailChangeRequests.userId, users.id))
    .where(eq(emailChangeRequests.status, "PENDING"))
    .orderBy(asc(emailChangeRequests.createdAt));
  return rows.map((row) => ({ ...row, requestedAt: row.requestedAt.toISOString() }));
}

export async function decideEmailChange(requestId: string, approved: boolean, actorId: string): Promise<MutationResult> {
  const database = await db();
  const [request] = await database
    .select({
      userId: emailChangeRequests.userId,
      newEmail: emailChangeRequests.newEmail,
      oldEmail: users.email,
      firstName: users.firstName,
    })
    .from(emailChangeRequests)
    .innerJoin(users, eq(emailChangeRequests.userId, users.id))
    .where(and(eq(emailChangeRequests.id, requestId), eq(emailChangeRequests.status, "PENDING")));
  if (!request) return { ok: false, error: "Cette demande a déjà été traitée." };

  const review = { status: approved ? ("APPROVED" as const) : ("REJECTED" as const), reviewedBy: actorId, reviewedAt: new Date() };
  if (approved) {
    try {
      await database.transaction(async (tx) => {
        await tx.update(users).set({ email: request.newEmail }).where(eq(users.id, request.userId));
        await tx.update(emailChangeRequests).set(review).where(eq(emailChangeRequests.id, requestId));
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return { ok: false, error: `L'adresse ${request.newEmail} est désormais utilisée par un autre compte : refusez la demande.` };
      }
      throw error;
    }
    // Keeps the newsletter going to the right inbox, unless that address already has its own subscription.
    try {
      await database
        .update(newsletterSubscriptions)
        .set({ email: request.newEmail })
        .where(eq(newsletterSubscriptions.userId, request.userId));
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  } else {
    await database.update(emailChangeRequests).set(review).where(eq(emailChangeRequests.id, requestId));
  }

  await logActivity({
    actorId,
    action: approved ? "email.approve" : "email.reject",
    entityType: "user",
    entityId: request.userId,
    metadata: { newEmail: request.newEmail },
  });
  queueMails([
    {
      to: approved ? request.newEmail : request.oldEmail,
      ...mailTemplates.emailChangeDecision(request.firstName, request.newEmail, approved),
    },
  ]);
  return { ok: true };
}

// --- Hero movies (vidéothèque) -------------------------------------------------------

export type PendingMovie = {
  heroId: string;
  heroAlias: string;
  movieId: string;
  imdbId: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  synopsis: string | null;
  requestedAt: string;
};

export async function listPendingMovies(): Promise<PendingMovie[]> {
  const database = await db();
  const rows = await database
    .select({
      heroId: heroMovies.heroId,
      heroAlias: heroProfiles.alias,
      movieId: movies.id,
      imdbId: movies.imdbId,
      title: movies.title,
      year: movies.year,
      posterUrl: movies.posterUrl,
      synopsis: movies.synopsis,
      requestedAt: heroMovies.createdAt,
    })
    .from(heroMovies)
    .innerJoin(movies, eq(heroMovies.movieId, movies.id))
    .innerJoin(heroProfiles, eq(heroMovies.heroId, heroProfiles.userId))
    .where(eq(heroMovies.status, "PENDING"))
    .orderBy(asc(heroMovies.createdAt));
  return rows.map((row) => ({ ...row, requestedAt: row.requestedAt.toISOString() }));
}

export async function decideMovie(heroId: string, movieId: string, approved: boolean, actorId: string): Promise<MutationResult> {
  const database = await db();
  const [row] = await database
    .update(heroMovies)
    .set({ status: approved ? "APPROVED" : "REJECTED", reviewedBy: actorId, reviewedAt: new Date() })
    .where(and(eq(heroMovies.heroId, heroId), eq(heroMovies.movieId, movieId), eq(heroMovies.status, "PENDING")))
    .returning({ heroId: heroMovies.heroId });
  if (!row) return { ok: false, error: "Cette demande a déjà été traitée." };

  const [details] = await database
    .select({ title: movies.title, alias: heroProfiles.alias, email: users.email })
    .from(heroMovies)
    .innerJoin(movies, eq(heroMovies.movieId, movies.id))
    .innerJoin(heroProfiles, eq(heroMovies.heroId, heroProfiles.userId))
    .innerJoin(users, eq(heroMovies.heroId, users.id))
    .where(and(eq(heroMovies.heroId, heroId), eq(heroMovies.movieId, movieId)));
  await logActivity({
    actorId,
    action: approved ? "movie.approve" : "movie.reject",
    entityType: "movie",
    entityId: movieId,
    metadata: { title: details?.title, heroId, alias: details?.alias },
  });
  if (details) {
    const baseUrl = await getBaseUrl();
    queueMails([
      { to: details.email, ...mailTemplates.movieDecision(details.alias, details.title, approved, `${baseUrl}/heros/films`) },
    ]);
  }
  return { ok: true };
}
