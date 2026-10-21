import { connection } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { searchAddress } from "@/lib/server/geocode";

/** GET /api/geocode/search?q=.. — address suggestions (signed-in users). */
export async function GET(request: Request) {
  await connection();
  if (!(await getCurrentUser())) return Response.json({ error: "Non authentifié" }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 3) return Response.json({ results: [] });
  try {
    return Response.json({ results: await searchAddress(query.slice(0, 200)) });
  } catch {
    return Response.json({ results: [], error: "Service de géocodage indisponible" }, { status: 502 });
  }
}
