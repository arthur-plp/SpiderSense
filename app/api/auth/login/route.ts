import { z } from "zod";
import { ApiError, parse, readBody, route } from "@/lib/server/api";
import { signIn } from "@/lib/server/services/auth";

const schema = z.object({
  identifier: z.string().trim().min(1).max(255),
  password: z.string().min(1).max(128),
});

/** POST /api/auth/login — checks the credentials and sets the session cookie. */
export const POST = route(async (request) => {
  const { identifier, password } = parse(schema, await readBody(request), "Renseignez votre identifiant et votre mot de passe.");
  const result = await signIn(identifier, password);
  if (result.ok) return Response.json({ user: result.user, homePath: result.homePath });
  switch (result.reason) {
    case "INVALID_CREDENTIALS":
      throw new ApiError(401, "Identifiant ou mot de passe incorrect.");
    case "ACCOUNT_DISABLED":
      throw new ApiError(403, "Ce compte a été désactivé par la modération.");
    case "EMAIL_NOT_VERIFIED":
      throw new ApiError(403, "Votre compte n'est pas encore activé : cliquez sur le lien reçu par email.", undefined, {
        unverifiedEmail: result.email,
      });
  }
});
