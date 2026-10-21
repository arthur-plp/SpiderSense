import "server-only";

export type Address = {
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  label: string;
  lat: number;
  lng: number;
};

type NominatimPlace = {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string | undefined>;
};

// Nominatim's usage policy asks for an identifying User-Agent and caching.
const USER_AGENT = "Heros-SOS/1.0 (plateforme citoyens / super-heros)";
const cache = new Map<string, { at: number; value: unknown }>();
const TTL_MS = 24 * 60 * 60 * 1000;

async function nominatim<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as T;
  const response = await fetch(`https://nominatim.openstreetmap.org${path}`, {
    headers: { "user-agent": USER_AGENT, "accept-language": "fr" },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(`Nominatim a répondu ${response.status}`);
  const value = (await response.json()) as T;
  if (cache.size > 500) cache.clear();
  cache.set(path, { at: Date.now(), value });
  return value;
}

function toAddress(place: NominatimPlace): Address {
  const a = place.address ?? {};
  const road = a.road ?? a.pedestrian ?? a.footway ?? a.square ?? null;
  return {
    street: road ? [a.house_number, road].filter(Boolean).join(" ") : null,
    postalCode: a.postcode ?? null,
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? a.suburb ?? null,
    country: a.country ?? null,
    label: place.display_name,
    lat: Number(place.lat),
    lng: Number(place.lon),
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<Address | null> {
  const place = await nominatim<NominatimPlace & { error?: string }>(
    `/reverse?format=jsonv2&addressdetails=1&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}`,
  );
  return place.error ? null : toAddress(place);
}

export async function searchAddress(query: string): Promise<Address[]> {
  const places = await nominatim<NominatimPlace[]>(
    `/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=fr&q=${encodeURIComponent(query)}`,
  );
  return places.map(toAddress);
}
