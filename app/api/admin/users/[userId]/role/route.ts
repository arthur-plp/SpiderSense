import { z } from "zod";
import { apiUser, check, parse, readBody, route, uuidParam } from "@/lib/server/api";
import { changeUserRole } from "@/lib/server/services/admin/users";

const schema = z.object({ role: z.enum(["CITIZEN", "HERO", "MODERATOR", "ADMIN"], { error: "Rôle invalide." }) });

/** PUT /api/admin/users/:userId/role — promotion / demotion. Administrators only, never on their own account. */
export const PUT = route(async (request, { params }: RouteContext<"/api/admin/users/[userId]/role">) => {
  const actor = await apiUser(["ADMIN"]);
  const userId = uuidParam((await params).userId);
  const { role } = parse(schema, await readBody(request), "Rôle invalide.");
  check(await changeUserRole(userId, role, actor));
  return Response.json({ message: "Rôle mis à jour.", role });
});
