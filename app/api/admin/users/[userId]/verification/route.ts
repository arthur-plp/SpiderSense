import { apiStaff, check, route, uuidParam } from "@/lib/server/api";
import { verifyUser } from "@/lib/server/services/admin/users";

/** POST /api/admin/users/:userId/verification — gives the "Citoyen vérifié" badge (identity checked). */
export const POST = route(async (_request, { params }: RouteContext<"/api/admin/users/[userId]/verification">) => {
  const actor = await apiStaff();
  check(await verifyUser(uuidParam((await params).userId), actor));
  return Response.json({ message: "Le compte porte désormais le badge « Citoyen vérifié »." });
});
