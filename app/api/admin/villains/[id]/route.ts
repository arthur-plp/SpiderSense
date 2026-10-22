import { apiStaff, check, route, uuidParam } from "@/lib/server/api";
import { deleteVillain, saveVillain } from "@/lib/server/services/admin/villains";
import { checkSaved, readVillain } from "../schema";

type Context = RouteContext<"/api/admin/villains/[id]">;

/** PUT /api/admin/villains/:id — updates an encyclopedia entry and replaces its specialties. */
export const PUT = route(async (request, { params }: Context) => {
  const actor = await apiStaff();
  const id = uuidParam((await params).id);
  const result = await saveVillain(id, await readVillain(request), actor.id);
  checkSaved(result);
  return Response.json({ message: "Fiche du vilain enregistrée.", id: result.id });
});

/** DELETE /api/admin/villains/:id — removes an encyclopedia entry. */
export const DELETE = route(async (_request, { params }: Context) => {
  const actor = await apiStaff();
  check(await deleteVillain(uuidParam((await params).id), actor.id));
  return Response.json({ message: "Fiche du vilain supprimée." });
});
