"use server";

import { refresh } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { requireStaff } from "@/lib/server/auth";
import { decideEmailChange, decideHeroApplication, decideMovie } from "@/lib/server/services/admin/requests";
import { isUuid } from "@/lib/server/services/incidents";
import { invalidRequest, resultState } from "./shared";

export async function decideHeroApplicationAction(userId: string, approved: boolean): Promise<ActionState> {
  const actor = await requireStaff();
  if (!isUuid(userId)) return invalidRequest;
  const result = await decideHeroApplication(userId, approved === true, actor.id);
  if (result.ok) refresh();
  return resultState(result, approved ? "Super-héros validé." : "Demande refusée.");
}

export async function decideEmailChangeAction(requestId: string, approved: boolean): Promise<ActionState> {
  const actor = await requireStaff();
  if (!isUuid(requestId)) return invalidRequest;
  const result = await decideEmailChange(requestId, approved === true, actor.id);
  if (result.ok) refresh();
  return resultState(result, approved ? "Adresse email modifiée." : "Demande refusée.");
}

export async function decideMovieAction(heroId: string, movieId: string, approved: boolean): Promise<ActionState> {
  const actor = await requireStaff();
  if (!isUuid(heroId) || !isUuid(movieId)) return invalidRequest;
  const result = await decideMovie(heroId, movieId, approved === true, actor.id);
  if (result.ok) refresh();
  return resultState(result, approved ? "Film ajouté à la vidéothèque." : "Film refusé.");
}
