import { z } from "zod";
import { apiHero, parse, readBody, route } from "@/lib/server/api";
import { setHeroOnDuty } from "@/lib/server/services/heroes";

/** PUT /api/me/duty — on duty (visible and alerted) or off duty. */
export const PUT = route(async (request) => {
  const hero = await apiHero();
  const { onDuty } = parse(
    z.object({ onDuty: z.boolean({ error: "`onDuty` doit être un booléen." }) }),
    await readBody(request),
  );
  await setHeroOnDuty(hero.id, onDuty);
  return Response.json({ onDuty });
});
