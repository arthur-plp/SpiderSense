import { z } from "zod";
import { apiHero, notFound, parse, readBody, route, uuidParam } from "@/lib/server/api";
import { replyToReview } from "@/lib/server/services/reviews";

const replyMessage = "Votre réponse doit faire entre 2 et 1000 caractères.";
const schema = z.object({ reply: z.string({ error: replyMessage }).trim().min(2, replyMessage).max(1000, replyMessage) });

/** PUT /api/reviews/:reviewId/reply — the hero's public answer to a review about them. */
export const PUT = route(async (request, { params }: RouteContext<"/api/reviews/[reviewId]/reply">) => {
  const hero = await apiHero();
  const reviewId = uuidParam((await params).reviewId);
  const { reply } = parse(schema, await readBody(request));
  if (!(await replyToReview(hero.id, reviewId, reply))) throw notFound("Avis introuvable.");
  return Response.json({ message: "Réponse publiée." });
});
