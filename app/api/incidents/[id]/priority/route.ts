import { z } from "zod";
import { ApiError, apiUser, check, parse, readBody, route, uuidParam } from "@/lib/server/api";
import { setIncidentPriority } from "@/lib/server/services/incidents";
import { prioritySchema } from "@/lib/validation";

const schema = z.object({ priority: prioritySchema });

/** PATCH /api/incidents/:id/priority — triage by a hero or a moderator (4.1.1). */
export const PATCH = route(async (request, { params }: RouteContext<"/api/incidents/[id]/priority">) => {
  const user = await apiUser();
  if (!user.isHero && !user.isStaff) throw new ApiError(403, "Seuls les super-héros et les modérateurs fixent la priorité.");
  const id = uuidParam((await params).id);
  const { priority } = parse(schema, await readBody(request), "Choisissez une priorité.");
  check(await setIncidentPriority(id, priority, user.id));
  return Response.json({ message: "Priorité mise à jour.", priority });
});
