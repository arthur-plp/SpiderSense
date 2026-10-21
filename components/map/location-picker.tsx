"use client";

import { LoaderCircle, LocateFixed, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { DEFAULT_CENTER, type LatLng } from "@/lib/geo";
import { DarkMap, type MapFocus } from "./dark-map";
import { UserPin } from "./markers";

type AddressFields = { street: string; postalCode: string; city: string; country: string };

type GeocodedAddress = {
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  label: string;
  lat: number;
  lng: number;
};

type LocationPickerProps = {
  defaultPosition?: LatLng | null;
  defaultAddress?: Partial<AddressFields>;
  errors?: Record<string, string[] | undefined>;
  /** Requests the browser position on mount (citizen declaring an incident). */
  locateOnMount?: boolean;
  mapClassName?: string;
};

/**
 * Incident location: tap the map, use the device position or search an
 * address. Posts latitude/longitude plus the address fields.
 */
export function LocationPicker({ defaultPosition, defaultAddress, errors, locateOnMount, mapClassName }: LocationPickerProps) {
  const [position, setPosition] = useState<LatLng | null>(defaultPosition ?? null);
  const [address, setAddress] = useState<AddressFields>({
    street: defaultAddress?.street ?? "",
    postalCode: defaultAddress?.postalCode ?? "",
    city: defaultAddress?.city ?? "",
    country: defaultAddress?.country ?? "France",
  });
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [busy, setBusy] = useState<"locate" | "reverse" | "search" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodedAddress[]>([]);

  const applyAddress = (found: Partial<GeocodedAddress>) =>
    setAddress((current) => ({
      street: found.street ?? current.street,
      postalCode: found.postalCode ?? current.postalCode,
      city: found.city ?? current.city,
      country: found.country ?? current.country,
    }));

  const pick = useCallback(async (next: LatLng, fly = false) => {
    setPosition(next);
    if (fly) setFocus({ ...next, zoom: 16, key: Date.now() });
    setBusy("reverse");
    setNotice(null);
    try {
      const response = await fetch(`/api/geocode/reverse?lat=${next.lat}&lng=${next.lng}`);
      const body = (await response.json()) as { address: GeocodedAddress | null };
      if (body.address) applyAddress(body.address);
      else setNotice("Adresse introuvable : complétez les champs ci-dessous.");
    } catch {
      setNotice("Adresse introuvable : complétez les champs ci-dessous.");
    } finally {
      setBusy(null);
    }
  }, []);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setNotice("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setBusy("locate");
    navigator.geolocation.getCurrentPosition(
      (result) => void pick({ lat: result.coords.latitude, lng: result.coords.longitude }, true),
      () => {
        setBusy(null);
        setNotice("Position refusée : touchez la carte ou recherchez l'adresse.");
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }, [pick]);

  useEffect(() => {
    if (!locateOnMount) return;
    const timer = setTimeout(locate, 0);
    return () => clearTimeout(timer);
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async () => {
    if (query.trim().length < 3) return;
    setBusy("search");
    setNotice(null);
    try {
      const response = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
      const body = (await response.json()) as { results: GeocodedAddress[] };
      setResults(body.results);
      if (body.results.length === 0) setNotice("Aucune adresse trouvée.");
    } catch {
      setNotice("Recherche indisponible pour le moment.");
    } finally {
      setBusy(null);
    }
  };

  const center = position ?? defaultPosition ?? DEFAULT_CENTER;
  const markers = position ? [{ id: "picked", lat: position.lat, lng: position.lng, label: "Lieu de l'incident", zIndex: 5 }] : [];

  return (
    <div className="@container flex flex-col gap-3">
      <div className="flex gap-2">
        <Input
          name="addressSearch"
          placeholder="Rechercher une adresse…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
          aria-label="Rechercher une adresse"
        />
        <Button variant="secondary" size="icon" onClick={() => void search()} aria-label="Rechercher">
          {busy === "search" ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}
        </Button>
        <Button variant="secondary" onClick={locate} aria-label="Utiliser ma position" className="px-3">
          {busy === "locate" ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
          <span className="hidden @md:inline">Ma position</span>
        </Button>
      </div>

      {results.length > 0 && (
        <ul className="panel divide-y divide-white/5 overflow-hidden rounded-xl text-sm">
          {results.map((result) => (
            <li key={`${result.lat},${result.lng}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-slate-300 hover:bg-white/5"
                onClick={() => {
                  setResults([]);
                  setPosition({ lat: result.lat, lng: result.lng });
                  setFocus({ lat: result.lat, lng: result.lng, zoom: 16, key: Date.now() });
                  applyAddress(result);
                }}
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <DarkMap
          className={mapClassName ?? "relative h-56 rounded-2xl border border-white/10"}
          markers={markers}
          renderMarker={() => <UserPin />}
          initialCenter={center}
          initialZoom={position ? 15.5 : 12}
          focus={focus}
          showControls={false}
          onMapClick={(next) => void pick(next)}
        />
        <p className="pointer-events-none absolute left-3 top-3 rounded-lg bg-ink-950/80 px-2 py-1 text-[11px] text-slate-300">
          {busy === "reverse" ? "Recherche de l'adresse…" : position ? "Touchez la carte pour ajuster" : "Touchez la carte pour placer l'incident"}
        </p>
      </div>
      {notice && <p className="text-xs text-amber-300">{notice}</p>}
      {errors?.latitude && <p className="text-xs text-rose-300">{errors.latitude[0]}</p>}

      <input type="hidden" name="latitude" value={position?.lat ?? ""} />
      <input type="hidden" name="longitude" value={position?.lng ?? ""} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
        <Field label="Rue" name="street" errors={errors?.street}>
          <Input name="street" value={address.street} onChange={(event) => setAddress({ ...address, street: event.target.value })} invalid={Boolean(errors?.street)} autoComplete="street-address" />
        </Field>
        <Field label="Code postal" name="postalCode" errors={errors?.postalCode}>
          <Input name="postalCode" value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} invalid={Boolean(errors?.postalCode)} autoComplete="postal-code" inputMode="numeric" />
        </Field>
        <Field label="Ville" name="city" errors={errors?.city}>
          <Input name="city" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} invalid={Boolean(errors?.city)} required autoComplete="address-level2" />
        </Field>
        <Field label="Pays" name="country" errors={errors?.country}>
          <Input name="country" value={address.country} onChange={(event) => setAddress({ ...address, country: event.target.value })} invalid={Boolean(errors?.country)} autoComplete="country-name" />
        </Field>
      </div>
    </div>
  );
}
