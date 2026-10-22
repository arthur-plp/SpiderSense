import { z } from "zod";
import { apiUser, noContent, parse, readBody, route } from "@/lib/server/api";
import { setSubscriptionEnabled, subscribe, unsubscribeUser } from "@/lib/server/services/newsletter";

/** POST /api/me/newsletter — subscribes the account email. */
export const POST = route(async () => {
  const user = await apiUser();
  await subscribe(user.email);
  return Response.json({ message: "Vous êtes inscrit(e) à la newsletter." }, { status: 201 });
});

/** PATCH /api/me/newsletter — suspends or resumes delivery. */
export const PATCH = route(async (request) => {
  const user = await apiUser();
  const { enabled } = parse(
    z.object({ enabled: z.boolean({ error: "`enabled` doit être un booléen." }) }),
    await readBody(request),
  );
  await setSubscriptionEnabled(user.id, enabled);
  return Response.json({ message: enabled ? "Réception de la newsletter reprise." : "Réception de la newsletter suspendue." });
});

/** DELETE /api/me/newsletter — unsubscribes (the subscription is deleted). */
export const DELETE = route(async () => {
  const user = await apiUser();
  await unsubscribeUser(user.id);
  return noContent();
});
