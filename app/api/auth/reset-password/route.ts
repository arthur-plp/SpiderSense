import { z } from "zod";
import { badRequest, parse, readBody, route } from "@/lib/server/api";
import { completePasswordReset } from "@/lib/server/services/auth";
import { newPasswordSchema } from "@/lib/validation";

const schema = z.object({ token: z.string().min(1).max(200) }).and(newPasswordSchema);

/** POST /api/auth/reset-password — sets a new password from the link received by email. */
export const POST = route(async (request) => {
  const { token, password } = parse(schema, await readBody(request));
  if (!(await completePasswordReset(token, password))) {
    throw badRequest("Ce lien a expiré ou a déjà été utilisé. Faites une nouvelle demande.");
  }
  return Response.json({ message: "Mot de passe modifié : vous pouvez vous connecter." });
});
