import { z } from "zod";
import { fieldError, readBody, route } from "@/lib/server/api";
import { requestPasswordReset } from "@/lib/server/services/auth";
import { emailSchema } from "@/lib/validation";

/** POST /api/auth/forgot-password — emails a reset link. Same answer whether the account exists or not. */
export const POST = route(async (request) => {
  const parsed = z.object({ email: emailSchema }).safeParse(await readBody(request));
  if (!parsed.success) throw fieldError("email", "Adresse email invalide.");
  await requestPasswordReset(parsed.data.email);
  return Response.json(
    { message: "Si un compte existe avec cette adresse, vous allez recevoir un lien de réinitialisation." },
    { status: 202 },
  );
});
