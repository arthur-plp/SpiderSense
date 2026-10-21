import { connection } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { listHeroes } from "@/lib/server/services/heroes";

/** GET /api/heroes — approved heroes with live availability and stats. */
export async function GET() {
  await connection();
  if (!(await getCurrentUser())) return Response.json({ error: "Non authentifié" }, { status: 401 });
  return Response.json({ heroes: await listHeroes() }, { headers: { "cache-control": "no-store" } });
}
