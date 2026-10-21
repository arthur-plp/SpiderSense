import { connection } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { listActiveIncidents, listHeroBoardIncidents } from "@/lib/server/services/incidents";

/**
 * GET /api/incidents — live incidents, polled by the hero and citizen maps.
 * Heroes and moderators also get what ended in the last 24 hours.
 */
export async function GET() {
  await connection();
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Non authentifié" }, { status: 401 });
  const board = user.isHero || user.isStaff;
  const incidents = board ? await listHeroBoardIncidents() : await listActiveIncidents();
  return Response.json(
    {
      serverTime: new Date().toISOString(),
      // Citizens only see who reported what for their own incidents.
      incidents: board ? incidents : incidents.map((incident) => ({ ...incident, reporterId: incident.reporterId === user.id ? user.id : null })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
