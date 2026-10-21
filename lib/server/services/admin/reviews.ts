import "server-only";
import { eq } from "drizzle-orm";
import { heroReviews } from "@/db/schema";
import { logActivity } from "../../activity";
import { db } from "../../db";
import type { MutationResult } from "../incidents";

/** Hidden reviews stay in the database but leave the hero's public reputation. */
export async function setReviewHidden(reviewId: string, hidden: boolean, actorId: string): Promise<MutationResult> {
  const database = await db();
  const status = hidden ? "HIDDEN" : "VISIBLE";
  const [row] = await database
    .update(heroReviews)
    .set({ moderationStatus: status })
    .where(eq(heroReviews.id, reviewId))
    .returning({ id: heroReviews.id });
  if (!row) return { ok: false, error: "Cet avis n'existe plus." };
  await logActivity({ actorId, action: hidden ? "review.hide" : "review.show", entityType: "review", entityId: reviewId });
  return { ok: true };
}
