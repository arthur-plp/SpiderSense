import { z } from "zod";
import { apiStaff, check, parse, readBody, route, uuidParam } from "@/lib/server/api";
import { setReviewHidden } from "@/lib/server/services/admin/reviews";

const schema = z.object({ hidden: z.boolean({ error: "`hidden` doit être un booléen." }) });

/** PATCH /api/admin/reviews/:reviewId — hides a review from the public pages, or shows it again. */
export const PATCH = route(async (request, { params }: RouteContext<"/api/admin/reviews/[reviewId]">) => {
  const actor = await apiStaff();
  const id = uuidParam((await params).reviewId);
  const { hidden } = parse(schema, await readBody(request));
  check(await setReviewHidden(id, hidden, actor.id));
  return Response.json({ message: hidden ? "Avis masqué." : "Avis de nouveau visible.", hidden });
});
