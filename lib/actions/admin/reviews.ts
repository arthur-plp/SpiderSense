"use server";

import { refresh } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { requireStaff } from "@/lib/server/auth";
import { setReviewHidden } from "@/lib/server/services/admin/reviews";
import { isUuid } from "@/lib/server/services/incidents";
import { invalidRequest, resultState } from "./shared";

export async function setReviewHiddenAction(reviewId: string, hidden: boolean): Promise<ActionState> {
  const actor = await requireStaff();
  if (!isUuid(reviewId)) return invalidRequest;
  const result = await setReviewHidden(reviewId, hidden === true, actor.id);
  if (result.ok) refresh();
  return resultState(result, hidden ? "Avis masqué." : "Avis de nouveau visible.");
}
