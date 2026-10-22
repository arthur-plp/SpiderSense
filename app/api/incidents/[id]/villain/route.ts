import { apiStaff, check, route, uuidParam } from "@/lib/server/api";
import { createVillainFromReport } from "@/lib/server/services/admin/incidents";

/** POST /api/incidents/:id/villain — creates (or finds) the villain named in the report and links it. */
export const POST = route(async (_request, { params }: RouteContext<"/api/incidents/[id]/villain">) => {
  const actor = await apiStaff();
  const result = await createVillainFromReport(uuidParam((await params).id), actor.id);
  check(result);
  return Response.json(
    {
      message: result.created
        ? "Vilain ajouté à l'encyclopédie et lié à l'incident. Complétez sa fiche."
        : "Ce vilain existait déjà dans l'encyclopédie : il a été lié à l'incident.",
      created: result.created,
    },
    { status: result.created ? 201 : 200 },
  );
});
