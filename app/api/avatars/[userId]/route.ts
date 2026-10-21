import { connection } from "next/server";
import { getAvatar } from "@/lib/server/services/account";

/** GET /api/avatars/:userId — profile picture stored in the database. */
export async function GET(_request: Request, { params }: RouteContext<"/api/avatars/[userId]">) {
  await connection();
  const { userId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return new Response(null, { status: 404 });
  const avatar = await getAvatar(userId);
  if (!avatar) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(avatar.data), {
    headers: {
      "content-type": avatar.mimeType,
      // URLs are versioned (?v=…) on every upload, so they can be cached for long.
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
