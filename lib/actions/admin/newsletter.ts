"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { type ActionState, formValues } from "@/lib/action-state";
import { pluralize } from "@/lib/format";
import { requireStaff } from "@/lib/server/auth";
import { richTextToPlainText, sanitizeRichText } from "@/lib/server/sanitize";
import { sendNewsletter } from "@/lib/server/services/admin/newsletter";
import { isUuid } from "@/lib/server/services/incidents";
import { fieldErrorsOf, requiredText } from "@/lib/validation";

const newsletterSchema = z
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

export async function sendNewsletterAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const values = formValues(formData);
  const parsed = newsletterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Certains champs sont à corriger.", fieldErrors: fieldErrorsOf(parsed.error), values };
  }
  const contentHtml = sanitizeRichText(parsed.data.contentHtml);
  if (!richTextToPlainText(contentHtml)) {
    return { status: "error", fieldErrors: { contentHtml: ["Rédigez le contenu de la newsletter."] }, values };
  }

  const result = await sendNewsletter(
    {
      subject: parsed.data.subject,
      contentHtml,
      subscriptionId: parsed.data.target === "ONE" ? parsed.data.subscriptionId! : null,
    },
    actor.id,
  );
  if (!result.ok) return { status: "error", message: result.error, values };
  refresh();
  return { status: "success", message: `Newsletter envoyée à ${pluralize(result.recipients, "abonné")}.` };
}
