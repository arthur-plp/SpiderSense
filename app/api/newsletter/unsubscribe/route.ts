import { cookies } from "next/headers";
import { z } from "zod";
import { badRequest, parse, readBody, route } from "@/lib/server/api";
import { NEWSLETTER_COOKIE, unsubscribeByToken } from "@/lib/server/services/newsletter";

const schema = z.object({ token: z.string({ error: "Jeton manquant." }).min(1, "Jeton manquant.").max(200) });

/** POST /api/newsletter/unsubscribe — unsubscribes with the link of a newsletter email. */
export const POST = route(async (request) => {
  const { token } = parse(schema, await readBody(request));
  if (!(await unsubscribeByToken(token))) {
    throw badRequest("Ce lien de désinscription est invalide ou a déjà été utilisé.");
  }
  // Lets this browser show the sign-up form again.
  (await cookies()).delete(NEWSLETTER_COOKIE);
  return Response.json({
    message: "C'est fait : votre adresse a été retirée de la newsletter et supprimée de nos fichiers.",
  });
});
