import { apiStaff, check, route, uuidParam } from "@/lib/server/api";
import { decideMovie } from "@/lib/server/services/admin/requests";
import { readDecision } from "../../../../decision";

/** POST /api/admin/hero-movies/:heroId/:movieId/decision — approves or rejects a movie proposed by a hero. */
export const POST = route(
  async (request, { params }: RouteContext<"/api/admin/hero-movies/[heroId]/[movieId]/decision">) => {
    const actor = await apiStaff();
    const { heroId, movieId } = await params;
    const approved = await readDecision(request);
    check(await decideMovie(uuidParam(heroId), uuidParam(movieId), approved, actor.id));
    return Response.json({ message: approved ? "Film ajouté à la vidéothèque." : "Film refusé.", approved });
  },
);
