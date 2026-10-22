import { apiUser, route } from "@/lib/server/api";

/** GET /api/auth/me — the signed-in user. */
export const GET = route(async () => {
  const user = await apiUser();
  return Response.json({ user }, { headers: { "cache-control": "no-store" } });
});
