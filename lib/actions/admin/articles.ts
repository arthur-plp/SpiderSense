"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type ActionState, formValues } from "@/lib/action-state";
import { requireStaff } from "@/lib/server/auth";
import { richTextToPlainText, sanitizeRichText } from "@/lib/server/sanitize";
import { deleteArticle, saveArticle } from "@/lib/server/services/admin/articles";
import { isUuid } from "@/lib/server/services/incidents";
import { fieldErrorsOf, optionalText, requiredText } from "@/lib/validation";
import { invalidRequest, optionalHttpUrl } from "./shared";

const articleSchema = z.object({
  title: requiredText("Le titre", 255),
  slug: optionalText(255),
  coverUrl: optionalHttpUrl,
  contentHtml: z.string().max(200_000, "Le contenu est trop long."),
  status: z.enum(["DRAFT", "PUBLISHED"], { error: "Statut invalide." }),
});

/** Creates (articleId null) or updates a blog article. */
export async function saveArticleAction(articleId: string | null, _: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  if (articleId !== null && !isUuid(articleId)) return invalidRequest;
  const values = formValues(formData);
  const parsed = articleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Certains champs sont à corriger.", fieldErrors: fieldErrorsOf(parsed.error), values };
  }
  const contentHtml = sanitizeRichText(parsed.data.contentHtml);
  if (!richTextToPlainText(contentHtml)) {
    return { status: "error", fieldErrors: { contentHtml: ["Rédigez le contenu de l'article."] }, values };
  }

  const result = await saveArticle(articleId, { ...parsed.data, contentHtml }, actor.id);
  if (!result.ok) {
    return result.field
      ? { status: "error", fieldErrors: { [result.field]: [result.error] }, values }
      : { status: "error", message: result.error, values };
  }
  if (!articleId) redirect(`/admin/blog/${result.id}`);
  refresh();
  return {
    status: "success",
    message: parsed.data.status === "PUBLISHED" ? "Article enregistré et publié." : "Brouillon enregistré.",
  };
}

export async function deleteArticleAction(articleId: string): Promise<ActionState> {
  const actor = await requireStaff();
  if (!isUuid(articleId)) return invalidRequest;
  const result = await deleteArticle(articleId, actor.id);
  if (!result.ok) return { status: "error", message: result.error };
  redirect("/admin/blog");
}
