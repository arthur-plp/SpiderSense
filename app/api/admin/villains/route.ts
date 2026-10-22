import { apiStaff, route } from "@/lib/server/api";
import { saveVillain } from "@/lib/server/services/admin/villains";
import { checkSaved, readVillain } from "./schema";

/** POST /api/admin/villains — creates an encyclopedia entry. */
export const POST = route(async (request) => {
  const actor = await apiStaff();
  const result = await saveVillain(null, await readVillain(request), actor.id);
  checkSaved(result);
  return Response.json({ message: "Fiche du vilain créée.", id: result.id }, { status: 201 });
});
