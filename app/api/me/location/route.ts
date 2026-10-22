import { z } from "zod";
import { apiHero, parse, readBody, route } from "@/lib/server/api";
import { setHeroLocation } from "@/lib/server/services/heroes";

const schema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

/** PUT /api/me/location — current position of the hero, shown on the maps. */
export const PUT = route(async (request) => {
  const hero = await apiHero();
  const { lat, lng } = parse(schema, await readBody(request), "Position invalide.");
  await setHeroLocation(hero.id, lat, lng);
  return Response.json({ lat, lng });
});
