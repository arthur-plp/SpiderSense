import { apiStaff, check, route, uuidParam } from "@/lib/server/api";
import { deleteArticle, saveArticle } from "@/lib/server/services/admin/articles";
import { checkSaved, readArticle, savedMessage } from "../schema";

type Context = RouteContext<"/api/admin/articles/[id]">;

/** PUT /api/admin/articles/:id — updates a blog article. */
export const PUT = route(async (request, { params }: Context) => {
  const actor = await apiStaff();
  const id = uuidParam((await params).id);
  const input = await readArticle(request);
  const result = await saveArticle(id, input, actor.id);
  checkSaved(result);
  return Response.json({ message: savedMessage(input.status), id: result.id, slug: result.slug });
});

/** DELETE /api/admin/articles/:id — deletes a blog article. */
export const DELETE = route(async (_request, { params }: Context) => {
  const actor = await apiStaff();
  check(await deleteArticle(uuidParam((await params).id), actor.id));
  return Response.json({ message: "Article supprimé." });
});
