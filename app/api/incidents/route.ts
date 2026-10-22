import { z } from "zod";
import { ApiError, apiUser, fieldError, parse, readFormBody, route } from "@/lib/server/api";
import { actionTime } from "@/lib/server/request-context";
import {
  countHeroesOnDuty,
  createIncident,
  listActiveIncidents,
  listHeroBoardIncidents,
  listIncidentTypes,
} from "@/lib/server/services/incidents";
import { incidentSchema, prioritySchema } from "@/lib/validation";

/**
 * GET /api/incidents — live incidents, polled by the hero and citizen maps.
 * Heroes and moderators also get what ended in the last 24 hours.
 */
export const GET = route(async () => {
  const user = await apiUser();
  const board = user.isHero || user.isStaff;
  const incidents = board ? await listHeroBoardIncidents() : await listActiveIncidents();
  return Response.json(
    {
      serverTime: new Date().toISOString(),
      // Citizens only see who reported what for their own incidents.
      incidents: board ? incidents : incidents.map((incident) => ({ ...incident, reporterId: incident.reporterId === user.id ? user.id : null })),
    },
    { headers: { "cache-control": "no-store" } },
  );
});

const prioritySchemaAtCreation = z.object({
  priority: z
    .union([z.literal(""), prioritySchema])
    .optional()
    .transform((value) => value || null),
});

/**
 * POST /api/incidents — reports an incident (detailed form or SOS buzzer).
 * Heroes on duty and moderators are emailed. Moderators may set the priority.
 */
export const POST = route(async (request) => {
  const user = await apiUser();
  const body = await readFormBody(request);
  const input = parse(incidentSchema, body);
  // No date typed: it happened when the citizen sent it (the device clock for an offline replay).
  if (!body.occurredAt) input.occurredAt = actionTime();
  const { priority } = parse(prioritySchemaAtCreation, body);
  if (priority && !user.isStaff) throw new ApiError(403, "Seuls les modérateurs fixent la priorité à la création.");
  if (!(await listIncidentTypes()).some((type) => type.id === input.typeId)) {
    throw fieldError("typeId", "Choisissez un type d'incident.");
  }
  const id = await createIncident({ ...input, priority }, user.id);
  return Response.json(
    { message: "Incident signalé : les super-héros en service sont prévenus.", id, heroesAvailable: await countHeroesOnDuty() },
    { status: 201 },
  );
});
