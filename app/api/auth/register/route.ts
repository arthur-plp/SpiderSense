import { parse, readFormBody, route, fieldError } from "@/lib/server/api";
import { registerUser } from "@/lib/server/services/auth";
import { registerSchema } from "@/lib/validation";

/** POST /api/auth/register — creates an inactive citizen account and emails the activation link. */
export const POST = route(async (request) => {
  const { passwordConfirmation: _confirmation, acceptTerms: _terms, ...input } = parse(registerSchema, await readFormBody(request));
  const result = await registerUser(input);
  if (!result.ok) throw fieldError("email", result.error, 409);
  return Response.json(
    { message: "Compte créé : cliquez sur le lien reçu par email pour l'activer.", user: { id: result.userId, email: result.email } },
    { status: 201 },
  );
});
