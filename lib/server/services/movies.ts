import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { heroMovies, heroProfiles, movies } from "@/db/schema";
import type { ReviewStatus } from "@/lib/labels";
import { logActivity } from "../activity";
import { db } from "../db";
import { searchImdb, type ImdbTitle } from "../imdb";

export type LibraryMovie = {
  id: string;
  imdbId: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  synopsis: string | null;
  heroes: { id: string; alias: string }[];
};

/** Vidéothèque: movies approved by moderators, with the heroes appearing in them. */
export async function listLibrary(): Promise<LibraryMovie[]> {
  const database = await db();
  const rows = await database
    .select({
      id: movies.id,
      imdbId: movies.imdbId,
      title: movies.title,
      year: movies.year,
      posterUrl: movies.posterUrl,
      synopsis: movies.synopsis,
      heroId: heroProfiles.userId,
      heroAlias: heroProfiles.alias,
    })
    .from(heroMovies)
    .innerJoin(movies, eq(heroMovies.movieId, movies.id))
    .innerJoin(heroProfiles, eq(heroMovies.heroId, heroProfiles.userId))
    .where(and(eq(heroMovies.status, "APPROVED"), eq(heroProfiles.status, "APPROVED")))
    .orderBy(desc(movies.year), movies.title, heroProfiles.alias);

  const library = new Map<string, LibraryMovie>();
  for (const row of rows) {
    const movie = library.get(row.id) ?? {
      id: row.id,
      imdbId: row.imdbId,
      title: row.title,
      year: row.year,
      posterUrl: row.posterUrl,
      synopsis: row.synopsis,
      heroes: [],
    };
    movie.heroes.push({ id: row.heroId, alias: row.heroAlias });
    library.set(row.id, movie);
  }
  return [...library.values()];
}

export type HeroMovie = {
  movieId: string;
  imdbId: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  status: ReviewStatus;
  requestedAt: string;
};

/** "Mes films": every movie a hero proposed, whatever its moderation status. */
export async function listHeroMovies(heroId: string, onlyApproved = false): Promise<HeroMovie[]> {
  const database = await db();
  const rows = await database
    .select({
      movieId: movies.id,
      imdbId: movies.imdbId,
      title: movies.title,
      year: movies.year,
      posterUrl: movies.posterUrl,
      status: heroMovies.status,
      requestedAt: heroMovies.createdAt,
    })
    .from(heroMovies)
    .innerJoin(movies, eq(heroMovies.movieId, movies.id))
    .where(and(eq(heroMovies.heroId, heroId), onlyApproved ? eq(heroMovies.status, "APPROVED") : undefined))
    .orderBy(desc(movies.year));
  return rows.map((row) => ({ ...row, requestedAt: row.requestedAt.toISOString() }));
}

export { searchImdb, type ImdbTitle };

/** Caches the IMDb data locally, then files the request for moderation. */
export async function requestHeroMovie(heroId: string, title: ImdbTitle): Promise<{ ok: boolean; error?: string }> {
  const database = await db();
  await database
    .insert(movies)
    .values({
      imdbId: title.imdbId,
      title: title.title,
      year: title.year,
      posterUrl: title.posterUrl,
      synopsis: title.cast ? `Avec ${title.cast}.` : null,
      rawData: title,
    })
    .onConflictDoNothing({ target: movies.imdbId });
  const [movie] = await database.select({ id: movies.id }).from(movies).where(eq(movies.imdbId, title.imdbId));

  const [existing] = await database
    .select({ status: heroMovies.status })
    .from(heroMovies)
    .where(and(eq(heroMovies.heroId, heroId), eq(heroMovies.movieId, movie.id)));
  if (existing?.status === "APPROVED") return { ok: false, error: "Ce film est déjà dans votre vidéothèque." };
  if (existing?.status === "PENDING") return { ok: false, error: "Ce film est déjà en attente de validation." };

  if (existing) {
    await database
      .update(heroMovies)
      .set({ status: "PENDING", reviewedAt: null, reviewedBy: null, createdAt: new Date() })
      .where(and(eq(heroMovies.heroId, heroId), eq(heroMovies.movieId, movie.id)));
  } else {
    await database.insert(heroMovies).values({ heroId, movieId: movie.id });
  }
  await logActivity({ actorId: heroId, action: "movie.request", entityType: "movie", entityId: movie.id, metadata: { title: title.title } });
  return { ok: true };
}

export async function removeHeroMovie(heroId: string, movieId: string): Promise<void> {
  const database = await db();
  await database.delete(heroMovies).where(and(eq(heroMovies.heroId, heroId), eq(heroMovies.movieId, movieId)));
  await logActivity({ actorId: heroId, action: "movie.remove", entityType: "movie", entityId: movieId });
}
