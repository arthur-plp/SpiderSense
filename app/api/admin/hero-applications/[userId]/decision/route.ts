import { apiStaff, check, route, uuidParam } from "@/lib/server/api";
import { decideHeroApplication } from "@/lib/server/services/admin/requests";
import { readDecision } from "../../../decision";

/** POST /api/admin/hero-applications/:userId/decision — approves or rejects a super-hero application. */
export const POST = route(async (request, { params }: RouteContext<"/api/admin/hero-applications/[userId]/decision">) => {
  const actor = await apiStaff();
  const userId = uuidParam((await params).userId);
  const approved = await readDecision(request);
  check(await decideHeroApplication(userId, approved, actor.id));
  return Response.json({ message: approved ? "Super-héros validé." : "Demande refusée.", approved });
});
