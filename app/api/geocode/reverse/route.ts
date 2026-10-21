import { connection } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";
import { reverseGeocode } from "@/lib/server/geocode";

/** GET /api/geocode/reverse?lat=..&lng=.. — address for a position (signed-in users). */
export async function GET(request: Request) {
  await connection();
  if (!(await getCurrentUser())) return Response.json({ error: "Non authentifié" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return Response.json({ error: "Coordonnées invalides" }, { status: 400 });
  }
  try {
    return Response.json({ address: await reverseGeocode(lat, lng) });
  } catch {
    return Response.json({ address: null, error: "Service de géocodage indisponible" }, { status: 502 });
  }
}
