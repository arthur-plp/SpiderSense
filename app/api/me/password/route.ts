import { z } from "zod";
import { apiUser, fieldError, parse, readBody, route } from "@/lib/server/api";
import { changePassword } from "@/lib/server/services/account";
import { newPasswordSchema } from "@/lib/validation";

const schema = z.object({ currentPassword: z.string().max(128).default("") }).and(newPasswordSchema);

/** PUT /api/me/password — new password, after checking the current one. */
export const PUT = route(async (request) => {
  const user = await apiUser();
  const { currentPassword, password } = parse(schema, await readBody(request));
  const result = await changePassword(user.id, currentPassword, password);
  if (!result.ok) throw fieldError("currentPassword", result.error ?? "Mot de passe actuel incorrect.");
  return Response.json({ message: "Mot de passe modifié." });
});
