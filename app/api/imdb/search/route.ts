import { connection } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { searchImdb } from "@/lib/server/imdb";

/** GET /api/imdb/search?q= — IMDb title search for heroes adding movies. */
export async function GET(request: Request) {
  await connection();
  const user = await getCurrentUser();
  if (!user?.isHero && !user?.isStaff) return Response.json({ error: "Accès réservé" }, { status: 403 });
  const query = new URL(request.url).searchParams.get("q") ?? "";
  try {
    return Response.json({ results: await searchImdb(query.slice(0, 100)) });
  } catch {
    return Response.json({ results: [], error: "IMDb est injoignable pour le moment." }, { status: 502 });
  }
}
