import { noContent, route } from "@/lib/server/api";
import { signOut } from "@/lib/server/services/auth";

/** POST /api/auth/logout — closes the session and clears the cookie. */
export const POST = route(async () => {
  await signOut();
  return noContent();
});
