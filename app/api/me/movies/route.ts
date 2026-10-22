import { z } from "zod";
import { ApiError, apiHero, check, parse, readBody, route } from "@/lib/server/api";
import { getImdbTitle } from "@/lib/server/imdb";
import { requestHeroMovie } from "@/lib/server/services/movies";

const schema = z.object({ imdbId: z.string().regex(/^tt\d{5,10}$/, "Identifiant IMDb invalide.") });

/** POST /api/me/movies — adds an IMDb title to the hero's filmography, pending moderation. */
export const POST = route(async (request) => {
  const hero = await apiHero();
  const { imdbId } = parse(schema, await readBody(request));
  // Data is re-fetched server-side: the client only sends the IMDb id.
  const title = await getImdbTitle(imdbId).catch(() => null);
  if (!title) throw new ApiError(404, "Film introuvable sur IMDb.");
  check(await requestHeroMovie(hero.id, title), 409);
  return Response.json({ message: "Film proposé : un modérateur va le valider." }, { status: 201 });
});
