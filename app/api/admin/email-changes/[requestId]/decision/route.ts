import { apiStaff, check, route, uuidParam } from "@/lib/server/api";
import { decideEmailChange } from "@/lib/server/services/admin/requests";
import { readDecision } from "../../../decision";

/** POST /api/admin/email-changes/:requestId/decision — approves or rejects an email change. */
export const POST = route(async (request, { params }: RouteContext<"/api/admin/email-changes/[requestId]/decision">) => {
  const actor = await apiStaff();
  const requestId = uuidParam((await params).requestId);
  const approved = await readDecision(request);
  check(await decideEmailChange(requestId, approved, actor.id));
  return Response.json({ message: approved ? "Adresse email modifiée." : "Demande refusée.", approved });
});
