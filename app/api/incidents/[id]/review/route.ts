import { z } from "zod";
import { apiUser, check, parse, readFormBody, route, uuidParam } from "@/lib/server/api";
import { createReview } from "@/lib/server/services/reviews";
import { optionalText } from "@/lib/validation";

const schema = z.object({
  rating: z.coerce.number({ error: "Choisissez une note." }).int().min(1, "Choisissez une note.").max(5),
  comment: optionalText(1000),
});

/** POST /api/incidents/:id/review — the reporter rates the hero after the intervention (6.1.3). */
export const POST = route(async (request, { params }: RouteContext<"/api/incidents/[id]/review">) => {
  const user = await apiUser();
  const id = uuidParam((await params).id);
  const { rating, comment } = parse(schema, await readFormBody(request));
  check(await createReview(user.id, id, rating, comment));
  return Response.json({ message: "Merci ! Votre avis a été transmis au super-héros." }, { status: 201 });
});
