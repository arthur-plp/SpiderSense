import { z } from "zod";
import { fieldError, readBody, route } from "@/lib/server/api";
import { setNewsletterCookie, subscribe } from "@/lib/server/services/newsletter";
import { emailSchema } from "@/lib/validation";

/** POST /api/newsletter/subscriptions — subscribes an email (no account needed). */
export const POST = route(async (request) => {
  const parsed = z.object({ email: emailSchema }).safeParse(await readBody(request));
  if (!parsed.success) throw fieldError("email", "Adresse email invalide.");
  // Same answer whether the address was already subscribed or not.
  await subscribe(parsed.data.email);
  // Hides the footer form in this browser.
  await setNewsletterCookie();
  return Response.json({ message: "Merci ! Vous êtes inscrit(e) à la newsletter." }, { status: 201 });
});
