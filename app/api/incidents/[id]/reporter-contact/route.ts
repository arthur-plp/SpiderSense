import { apiHero, notFound, route, uuidParam } from "@/lib/server/api";
import { getReporterContactForHero } from "@/lib/server/services/incidents";

/** GET /api/incidents/:id/reporter-contact — reporter's first name and phone, for the hero in charge only. */
export const GET = route(async (_request, { params }: RouteContext<"/api/incidents/[id]/reporter-contact">) => {
  const hero = await apiHero();
  const contact = await getReporterContactForHero(uuidParam((await params).id), hero.id);
  if (!contact) throw notFound("Contact disponible seulement pour le héros en charge de l'intervention.");
  return Response.json({ contact }, { headers: { "cache-control": "no-store" } });
});
