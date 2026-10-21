"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { type ActionState, formValues } from "@/lib/action-state";
import {
  NEWSLETTER_COOKIE,
  setNewsletterCookie,
  subscribe,
  unsubscribeByToken,
} from "@/lib/server/services/newsletter";
import { emailSchema } from "@/lib/validation";

/** Anonymous footer form (4.2): subscribes, then hides the form with a cookie. */
export async function subscribeToNewsletter(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", fieldErrors: { email: ["Adresse email invalide."] }, values: formValues(formData) };
  }
  // Same answer whether the address was already subscribed or not.
  await subscribe(parsed.data);
  await setNewsletterCookie();
  refresh();
  return { status: "success", message: "Merci ! Vous êtes inscrit(e) à la newsletter." };
}

/** Runs on a button press, never on page load: mail scanners open links. */
export async function confirmUnsubscribe(token: string): Promise<ActionState> {
  if (typeof token !== "string" || !(await unsubscribeByToken(token))) {
    return { status: "error", message: "Ce lien de désinscription est invalide ou a déjà été utilisé." };
  }
  // Lets this browser show the sign-up form again.
  (await cookies()).delete(NEWSLETTER_COOKIE);
  refresh();
  return {
    status: "success",
    message: "C'est fait : votre adresse a été retirée de la newsletter et supprimée de nos fichiers.",
  };
}
