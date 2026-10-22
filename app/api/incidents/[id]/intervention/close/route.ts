import { z } from "zod";
import { apiHero, check, parse, readBody, route, uuidParam } from "@/lib/server/api";
import { closeIntervention } from "@/lib/server/services/incidents";

const schema = z.object({
  outcome: z.enum(["SUCCEEDED", "FAILED"]),
  villainId: z.uuid().nullable().default(null),
  villainImprisoned: z.boolean().default(false),
  peopleInvolved: z.number().int().min(0).max(10_000),
});

/** POST /api/incidents/:id/intervention/close — the hero in charge closes the intervention with a report. */
export const POST = route(async (request, { params }: RouteContext<"/api/incidents/[id]/intervention/close">) => {
  const hero = await apiHero();
  const id = uuidParam((await params).id);
  const report = parse(schema, await readBody(request), "Rapport d'intervention invalide.");
  check(await closeIntervention(id, hero.id, report), 409);
  return Response.json({ message: report.outcome === "SUCCEEDED" ? "Intervention réussie." : "Intervention clôturée." });
});
