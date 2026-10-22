import { apiUser, parse, readFormBody, route } from "@/lib/server/api";
import { updateContact } from "@/lib/server/services/account";
import { contactSchema } from "@/lib/validation";

/** PUT /api/me/contact — phone and postal address. */
export const PUT = route(async (request) => {
  const user = await apiUser();
  await updateContact(user.id, parse(contactSchema, await readFormBody(request)));
  return Response.json({ message: "Coordonnées mises à jour." });
});
