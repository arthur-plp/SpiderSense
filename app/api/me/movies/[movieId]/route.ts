import { apiHero, noContent, route, uuidParam } from "@/lib/server/api";
import { removeHeroMovie } from "@/lib/server/services/movies";

/** DELETE /api/me/movies/:movieId — removes a movie from the hero's filmography. */
export const DELETE = route(async (_request, { params }: RouteContext<"/api/me/movies/[movieId]">) => {
  const hero = await apiHero();
  await removeHeroMovie(hero.id, uuidParam((await params).movieId));
  return noContent();
});
