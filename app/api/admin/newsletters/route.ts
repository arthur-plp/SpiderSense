import { z } from "zod";
import { pluralize } from "@/lib/format";
import { apiStaff, check, fieldError, parse, readFormBody, route } from "@/lib/server/api";
import { richTextToPlainText, sanitizeRichText } from "@/lib/server/sanitize";
import { sendNewsletter } from "@/lib/server/services/admin/newsletter";
import { isUuid } from "@/lib/server/services/incidents";
import { requiredText } from "@/lib/validation";

const schema = z
  .object({
    subject: requiredText("L'objet", 255),
    contentHtml: z.string().max(200_000, "Le contenu est trop long."),
    target: z.enum(["ALL", "ONE"], { error: "Choisissez les destinataires." }),
    subscriptionId: z.string().optional(),
  })
  .refine((data) => data.target === "ALL" || (data.subscriptionId && isUuid(data.subscriptionId)), {
    path: ["subscriptionId"],
    message: "Choisissez un abonné.",
  });

/** POST /api/admin/newsletters — sends a newsletter to every active subscriber, or to one (test). */
export const POST = route(async (request) => {
  const actor = await apiStaff();
  const input = parse(schema, await readFormBody(request));
  const contentHtml = sanitizeRichText(input.contentHtml);
  if (!richTextToPlainText(contentHtml)) throw fieldError("contentHtml", "Rédigez le contenu de la newsletter.");
  const result = await sendNewsletter(
    { subject: input.subject, contentHtml, subscriptionId: input.target === "ONE" ? input.subscriptionId! : null },
    actor.id,
  );
  check(result);
  return Response.json(
    { message: `Newsletter envoyée à ${pluralize(result.recipients, "abonné")}.`, recipients: result.recipients },
    { status: 201 },
  );
});
