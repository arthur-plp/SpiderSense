import { z } from "zod";
import { apiStaff, check, parse, readBody, route, uuidParam } from "@/lib/server/api";
import { setUserDisabled } from "@/lib/server/services/admin/users";

const schema = z.object({ disabled: z.boolean({ error: "`disabled` doit être un booléen." }) });

/** PATCH /api/admin/users/:userId/status — disables an account (all its sessions are closed) or enables it again. */
export const PATCH = route(async (request, { params }: RouteContext<"/api/admin/users/[userId]/status">) => {
  const actor = await apiStaff();
  const userId = uuidParam((await params).userId);
  const { disabled } = parse(schema, await readBody(request));
  check(await setUserDisabled(userId, disabled, actor));
  return Response.json({
    message: disabled ? "Compte désactivé : l'utilisateur a été déconnecté de tous ses appareils." : "Compte réactivé.",
    disabled,
  });
});
