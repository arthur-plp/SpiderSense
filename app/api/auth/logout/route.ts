import { route } from "@/lib/server/api";
import { signOut } from "@/lib/server/services/auth";

/** POST /api/auth/logout — closes the session and clears the cookie. */
export const POST = route(async () => {
  await signOut();
  // This device keeps nothing of the account: offline caches and the queue of pending actions go.
  return new Response(null, { status: 204, headers: { "clear-site-data": '"cache", "storage"' } });
});
