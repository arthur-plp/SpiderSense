import { z } from "zod";
import { apiUser, fieldError, noContent, readBody, route } from "@/lib/server/api";
import { cancelEmailChange, requestEmailChange } from "@/lib/server/services/account";
import { emailSchema } from "@/lib/validation";

/** POST /api/me/email-change — asks for a new email address, validated by a moderator. */
export const POST = route(async (request) => {
  const user = await apiUser();
  const parsed = z.object({ newEmail: emailSchema }).safeParse(await readBody(request));
  if (!parsed.success) throw fieldError("newEmail", "Adresse email invalide.");
  const { newEmail } = parsed.data;
  if (newEmail === user.email.toLowerCase()) throw fieldError("newEmail", "C'est déjà votre adresse actuelle.");
  const result = await requestEmailChange(user.id, newEmail);
  if (!result.ok) throw fieldError("newEmail", result.error ?? "Demande impossible.", 409);
  return Response.json({ message: "Demande envoyée : un modérateur va la valider." }, { status: 202 });
});

/** DELETE /api/me/email-change — cancels the pending request. */
export const DELETE = route(async () => {
  const user = await apiUser();
  await cancelEmailChange(user.id);
  return noContent();
});
