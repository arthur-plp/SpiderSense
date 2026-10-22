import { z } from "zod";
import { apiUser, check, parse, readFormBody, route } from "@/lib/server/api";
import { applyAsHero } from "@/lib/server/services/account";
import { optionalText, parsePowers, requiredText } from "@/lib/validation";

const schema = z.object({
  alias: requiredText("Le nom de super-héros", 100),
  powers: z.string().transform(parsePowers).refine((powers) => powers.length > 0, "Indiquez au moins un pouvoir."),
  bio: optionalText(1000),
});

/** POST /api/me/hero-application — asks for the super-hero status, reviewed by a moderator. */
export const POST = route(async (request) => {
  const user = await apiUser();
  check(await applyAsHero(user.id, parse(schema, await readFormBody(request))), 409);
  return Response.json({ message: "Demande envoyée ! L'administration va examiner votre profil." }, { status: 201 });
});
