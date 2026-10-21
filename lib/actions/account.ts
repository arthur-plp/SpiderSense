"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { type ActionState, formValues } from "@/lib/action-state";
import { requireHero, requireUser } from "@/lib/server/auth";
import {
  applyAsHero,
  cancelEmailChange,
  changePassword,
  removeAvatar,
  requestEmailChange,
  setAvatar,
  updateContact,
  updateHeroProfile,
} from "@/lib/server/services/account";
import { getImdbTitle } from "@/lib/server/imdb";
import { removeHeroMovie, requestHeroMovie } from "@/lib/server/services/movies";
import {
  setSubscriptionEnabled,
  subscribe,
  unsubscribeUser,
} from "@/lib/server/services/newsletter";
import { replyToReview } from "@/lib/server/services/reviews";
import {
  contactSchema,
  emailSchema,
  fieldErrorsOf,
  newPasswordSchema,
  optionalText,
  parsePowers,
  requiredText,
} from "@/lib/validation";

// --- Profile (5.7, 5.8.3, 6.1.1) ---------------------------------------------------

export async function updateContactAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: formValues(formData) };
  }
  await updateContact(user.id, parsed.data);
  refresh();
  return { status: "success", message: "Coordonnées mises à jour." };
}

export async function changePasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  const result = await changePassword(user.id, String(formData.get("currentPassword") ?? ""), parsed.data.password);
  if (!result.ok) return { status: "error", fieldErrors: { currentPassword: [result.error!] } };
  return { status: "success", message: "Mot de passe modifié." };
}

export async function requestEmailChangeAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = emailSchema.safeParse(formData.get("newEmail"));
  if (!parsed.success) return { status: "error", fieldErrors: { newEmail: ["Adresse email invalide."] }, values: formValues(formData) };
  if (parsed.data === user.email.toLowerCase()) {
    return { status: "error", fieldErrors: { newEmail: ["C'est déjà votre adresse actuelle."] } };
  }
  const result = await requestEmailChange(user.id, parsed.data);
  if (!result.ok) return { status: "error", fieldErrors: { newEmail: [result.error!] }, values: formValues(formData) };
  refresh();
  return { status: "success", message: "Demande envoyée : un modérateur va la valider." };
}

export async function cancelEmailChangeAction(): Promise<void> {
  const user = await requireUser();
  await cancelEmailChange(user.id);
  refresh();
}

export async function uploadAvatarAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choisissez une image." };
  const result = await setAvatar(user.id, file);
  if (!result.ok) return { status: "error", message: result.error };
  refresh();
  return { status: "success", message: "Photo de profil mise à jour." };
}

export async function removeAvatarAction(): Promise<void> {
  const user = await requireUser();
  await removeAvatar(user.id);
  refresh();
}

// --- Newsletter settings (4.2) --------------------------------------------------------

export async function subscribeMeAction(): Promise<void> {
  const user = await requireUser();
  // We already know the email: no form needed for signed-in citizens.
  await subscribe(user.email);
  refresh();
}

export async function setNewsletterEnabledAction(enabled: boolean): Promise<void> {
  const user = await requireUser();
  await setSubscriptionEnabled(user.id, enabled);
  refresh();
}

export async function unsubscribeMeAction(): Promise<void> {
  const user = await requireUser();
  await unsubscribeUser(user.id);
  refresh();
}

// --- Hero status ---------------------------------------------------------------------

const heroApplicationSchema = z.object({
  alias: requiredText("Le nom de super-héros", 100),
  powers: z.string().transform(parsePowers).refine((powers) => powers.length > 0, "Indiquez au moins un pouvoir."),
  bio: optionalText(1000),
});

export async function applyAsHeroAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = heroApplicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: formValues(formData) };
  const result = await applyAsHero(user.id, parsed.data);
  if (!result.ok) return { status: "error", message: result.error, values: formValues(formData) };
  refresh();
  return { status: "success", message: "Demande envoyée ! L'administration va examiner votre profil." };
}

const heroProfileSchema = z.object({
  powers: z.string().transform(parsePowers).refine((powers) => powers.length > 0, "Indiquez au moins un pouvoir."),
  bio: optionalText(1000),
});

export async function updateHeroProfileAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const hero = await requireHero();
  const parsed = heroProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: formValues(formData) };
  await updateHeroProfile(hero.id, parsed.data);
  refresh();
  return { status: "success", message: "Profil de super-héros mis à jour." };
}

// --- Hero movies (5.8.4) ----------------------------------------------------------------

export async function requestMovieAction(imdbId: string): Promise<{ ok: boolean; error?: string }> {
  const hero = await requireHero();
  // Data is re-fetched server-side: the client only sends the IMDb id.
  const title = await getImdbTitle(imdbId).catch(() => null);
  if (!title) return { ok: false, error: "Film introuvable sur IMDb." };
  const result = await requestHeroMovie(hero.id, title);
  if (result.ok) refresh();
  return result;
}

export async function removeMovieAction(movieId: string): Promise<void> {
  const hero = await requireHero();
  await removeHeroMovie(hero.id, movieId);
  refresh();
}

// --- Reputation (5.8.5) ---------------------------------------------------------------

export async function replyToReviewAction(reviewId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const hero = await requireHero();
  const reply = String(formData.get("reply") ?? "").trim();
  if (reply.length < 2 || reply.length > 1000) {
    return { status: "error", fieldErrors: { reply: ["Votre réponse doit faire entre 2 et 1000 caractères."] }, values: { reply } };
  }
  const ok = await replyToReview(hero.id, reviewId, reply);
  if (!ok) return { status: "error", message: "Avis introuvable." };
  refresh();
  return { status: "success", message: "Réponse publiée." };
}
