import { apiHero, check, route, uuidParam } from "@/lib/server/api";
import { takeIncident } from "@/lib/server/services/incidents";

/** POST /api/incidents/:id/intervention — the hero takes the incident (one intervention at a time). */
export const POST = route(async (_request, { params }: RouteContext<"/api/incidents/[id]/intervention">) => {
  const hero = await apiHero();
  check(await takeIncident(uuidParam((await params).id), hero.id), 409);
  return Response.json({ message: "Intervention démarrée." });
});
