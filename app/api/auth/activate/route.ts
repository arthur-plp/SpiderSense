import { z } from "zod";
import { badRequest, parse, readBody, route } from "@/lib/server/api";
import { activateAccount } from "@/lib/server/services/auth";

const schema = z.object({ token: z.string({ error: "Jeton manquant." }).min(1, "Jeton manquant.").max(200) });

/** POST /api/auth/activate — activates the account from the link received by email. */
export const POST = route(async (request) => {
  const { token } = parse(schema, await readBody(request));
  if (!(await activateAccount(token))) throw badRequest("Ce lien d'activation est invalide ou a expiré.");
  return Response.json({ message: "Votre compte est activé : vous pouvez vous connecter." });
});
