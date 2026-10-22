import "server-only";
import { z } from "zod";
import { ApiError, fieldError, parse, readFormBody } from "@/lib/server/api";
import { richTextToPlainText, sanitizeRichText } from "@/lib/server/sanitize";
import type { SaveArticleResult } from "@/lib/server/services/admin/articles";
import { optionalHttpUrl, optionalText, requiredText } from "@/lib/validation";

const articleSchema = z.object({
  title: requiredText("Le titre", 255),
  slug: optionalText(255),
  coverUrl: optionalHttpUrl,
  contentHtml: z.string().max(200_000, "Le contenu est trop long."),
  status: z.enum(["DRAFT", "PUBLISHED"], { error: "Statut invalide." }),
});

/** Article fields of a create / update request, with the HTML sanitized. */
export async function readArticle(request: Request) {
  const input = parse(articleSchema, await readFormBody(request));
  const contentHtml = sanitizeRichText(input.contentHtml);
  if (!richTextToPlainText(contentHtml)) throw fieldError("contentHtml", "Rédigez le contenu de l'article.");
  return { ...input, contentHtml };
}

/** Throws the error of a failed save, on its field when the service names one. */
export function checkSaved(result: SaveArticleResult): asserts result is Extract<SaveArticleResult, { ok: true }> {
  if (result.ok) return;
  throw result.field ? fieldError(result.field, result.error, 409) : new ApiError(400, result.error);
}

export const savedMessage = (status: "DRAFT" | "PUBLISHED") =>
  status === "PUBLISHED" ? "Article enregistré et publié." : "Brouillon enregistré.";
