import { apiStaff, route } from "@/lib/server/api";
import { saveArticle } from "@/lib/server/services/admin/articles";
import { checkSaved, readArticle, savedMessage } from "./schema";

/** POST /api/admin/articles — creates a blog article (draft or published). */
export const POST = route(async (request) => {
  const actor = await apiStaff();
  const input = await readArticle(request);
  const result = await saveArticle(null, input, actor.id);
  checkSaved(result);
  return Response.json({ message: savedMessage(input.status), id: result.id, slug: result.slug }, { status: 201 });
});
