import { z } from "zod";
import { apiUser, parse, route } from "@/lib/server/api";
import { findNearbyActiveIncidents } from "@/lib/server/services/incidents";

const schema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

/** GET /api/incidents/nearby?lat=..&lng=.. — active incidents within 500 m, to warn about duplicates. */
export const GET = route(async (request) => {
  await apiUser();
  const { searchParams } = new URL(request.url);
  const { lat, lng } = parse(schema, Object.fromEntries(searchParams), "Coordonnées invalides");
  return Response.json({ incidents: await findNearbyActiveIncidents(lat, lng) }, { headers: { "cache-control": "no-store" } });
});
