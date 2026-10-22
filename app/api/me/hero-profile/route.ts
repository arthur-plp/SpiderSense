import { z } from "zod";
import { apiHero, parse, readFormBody, route } from "@/lib/server/api";
import { updateHeroProfile } from "@/lib/server/services/account";
import { optionalText, parsePowers } from "@/lib/validation";

const schema = z.object({
  powers: z.string().transform(parsePowers).refine((powers) => powers.length > 0, "Indiquez au moins un pouvoir."),
  bio: optionalText(1000),
});

/** PUT /api/me/hero-profile — powers and bio of an approved hero. */
export const PUT = route(async (request) => {
  const hero = await apiHero();
  await updateHeroProfile(hero.id, parse(schema, await readFormBody(request)));
  return Response.json({ message: "Profil de super-héros mis à jour." });
});
