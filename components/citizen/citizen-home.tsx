"use client";

import { BookOpen, ChevronRight, Film, LocateFixed, Newspaper, ShieldCheck, Siren, Star, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DarkMap, type MapFocus, type MapMarker } from "@/components/map/dark-map";
import { HeroPin, IncidentPin, UserPin } from "@/components/map/markers";
import { useGeolocation } from "@/components/map/use-geolocation";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { IncidentIcon } from "@/components/ui/incident-icon";
import { RelativeTime } from "@/components/ui/relative-time";
import { useLiveResource } from "@/components/ui/use-live-resource";
import { DEFAULT_CENTER, distanceInMeters, formatDistance, type LatLng } from "@/lib/geo";
import type { HeroDto } from "@/lib/server/services/heroes";
import type { IncidentDto } from "@/lib/server/services/incidents";
import { BottomSheet, type SheetSnap } from "./bottom-sheet";
import { HeroRow } from "./hero-row";
import { SosBuzzer } from "./sos-buzzer";
import { type IncidentTypeOption, SosDialog } from "./sos-dialog";

type CitizenHomeProps = {
  user: { id: string; firstName: string; avatarUrl: string | null };
  initialIncidents: IncidentDto[];
  initialHeroes: HeroDto[];
  types: IncidentTypeOption[];
  rateableCount: number;
  homeAddress: { street: string; postalCode: string; city: string; country: string };
};

type Marker = MapMarker &
  ({ kind: "incident"; incident: IncidentDto } | { kind: "hero"; hero: HeroDto } | { kind: "me" });

type HeroFilter = "all" | "available";
type HeroSort = "distance" | "rating" | "interventions";

/**
 * Citizen home (mobile, 390×844 reference): dark map, central SOS buzzer,
 * floating action buttons and a draggable sheet listing every hero.
 */
export function CitizenHome({ user, initialIncidents, initialHeroes, types, rateableCount, homeAddress }: CitizenHomeProps) {
  const router = useRouter();
  const geo = useGeolocation();
  const incidents = useLiveResource("/api/incidents", initialIncidents, (body) => (body as { incidents: IncidentDto[] }).incidents, 15_000);
  const heroes = useLiveResource("/api/heroes", initialHeroes, (body) => (body as { heroes: HeroDto[] }).heroes, 20_000);
  const [sosOpen, setSosOpen] = useState(false);
  const [sheet, setSheet] = useState<SheetSnap>("peek");
  const [preview, setPreview] = useState<IncidentDto | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [heroFilter, setHeroFilter] = useState<HeroFilter>("all");
  const [heroSort, setHeroSort] = useState<HeroSort>("distance");

  const position: LatLng | null = geo.status === "ready" ? geo.position : null;
  const origin = position ?? DEFAULT_CENTER;
  const myAlerts = incidents.data.filter((incident) => incident.reporterId === user.id);
  const myAlert = myAlerts[0] ?? null;

  const distanceTo = (lat: number | null, lng: number | null) =>
    lat !== null && lng !== null ? distanceInMeters(origin, { lat, lng }) : null;

  const sortedHeroes = useMemo(() => {
    const rank = { AVAILABLE: 0, BUSY: 1, OFF_DUTY: 2 };
    return heroes.data
      .filter((hero) => heroFilter === "all" || hero.availability === "AVAILABLE")
      .map((hero) => ({ hero, distance: hero.latitude !== null && hero.longitude !== null ? distanceInMeters(origin, { lat: hero.latitude, lng: hero.longitude }) : null }))
      .sort((a, b) => {
        if (heroSort === "rating") return (b.hero.rating ?? 0) - (a.hero.rating ?? 0);
        if (heroSort === "interventions") return b.hero.interventions - a.hero.interventions;
        return rank[a.hero.availability] - rank[b.hero.availability] || (a.distance ?? Infinity) - (b.distance ?? Infinity);
      });
  }, [heroes.data, heroFilter, heroSort, origin]);

  const available = heroes.data.filter((hero) => hero.availability === "AVAILABLE");
  const nearestAvailable = sortedHeroes.find((entry) => entry.hero.availability === "AVAILABLE");

  const markers = useMemo<Marker[]>(() => {
    const list: Marker[] = [];
    for (const hero of heroes.data) {
      if (hero.latitude === null || hero.longitude === null || hero.availability !== "AVAILABLE") continue;
      list.push({ id: `hero-${hero.id}`, kind: "hero", hero, lat: hero.latitude, lng: hero.longitude, label: `${hero.alias}, disponible`, zIndex: 5 });
    }
    for (const incident of incidents.data) {
      if (incident.latitude === null || incident.longitude === null) continue;
      list.push({ id: incident.id, kind: "incident", incident, lat: incident.latitude, lng: incident.longitude, label: `${incident.typeLabel} — ${incident.city}`, zIndex: 10 });
    }
    if (position) list.push({ id: "me", kind: "me", lat: position.lat, lng: position.lng, label: "Votre position", zIndex: 30 });
    return list;
  }, [heroes.data, incidents.data, position]);

  const fabs = [
    { href: "/citoyen/incidents", label: "Incidents", icon: Siren, badge: myAlerts.length },
    { href: "/citoyen/noter", label: "Noter", icon: Star, badge: rateableCount },
    { href: "/citoyen/encyclopedie", label: "Encyclo", icon: BookOpen, badge: 0 },
    { href: "/citoyen/videotheque", label: "Films", icon: Film, badge: 0 },
    { href: "/blog", label: "Actus", icon: Newspaper, badge: 0 },
    { href: "/citoyen/compte", label: "Compte", icon: UserRound, badge: 0 },
  ];

  return (
    <div className="relative h-dvh overflow-hidden">
      <DarkMap
        className="absolute inset-0"
        markers={markers}
        initialCenter={origin}
        initialZoom={13.2}
        // Until the citizen recenters manually, fly once to the first GPS fix.
        focus={focus ?? (position ? { ...position, zoom: 14.2, key: "first-fix" } : null)}
        showControls={false}
        padding={{ top: 80, bottom: 120, left: 20, right: 70 }}
        onMarkerClick={(id) => {
          const incident = incidents.data.find((item) => item.id === id);
          if (incident) setPreview(incident);
          const hero = heroes.data.find((item) => `hero-${item.id}` === id);
          if (hero) router.push(`/citoyen/encyclopedie/heros/${hero.id}`);
        }}
        onMapClick={() => setPreview(null)}
        renderMarker={(marker) =>
          marker.kind === "incident" ? (
            <IncidentPin typeCode={marker.incident.typeCode} status={marker.incident.status} priority={marker.incident.priority} selected={preview?.id === marker.id} />
          ) : marker.kind === "hero" ? (
            <HeroPin alias={marker.hero.alias} available busy={false} />
          ) : (
            <UserPin />
          )
        }
      />

      {/* Top bar */}
      <header className="glass absolute inset-x-3 top-3 z-20 flex items-center gap-3 rounded-2xl px-3 py-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-sos text-[11px] font-black tracking-wider text-white shadow-[0_0_18px_-4px_var(--color-sos)]">SOS</span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-white">Bonjour {user.firstName}</p>
          <p className="truncate text-[11px] text-slate-400">
            {geo.status === "ready"
              ? `${available.length} héros disponibles autour de vous`
              : geo.status === "locating" || geo.status === "idle"
                ? "Localisation en cours…"
                : "Position indisponible : carte centrée sur Paris"}
          </p>
        </div>
        <Link href="/citoyen/compte" aria-label="Mon compte">
          <Avatar src={user.avatarUrl} label={user.firstName} size={36} />
        </Link>
      </header>

      {/* Floating action buttons */}
      <nav aria-label="Fonctionnalités" className="absolute right-3 top-[84px] z-20 flex flex-col gap-2.5">
        {fabs.map(({ href, label, icon: Icon, badge }) => (
          <Link key={href} href={href} className="group flex flex-col items-center gap-1" aria-label={badge ? `${label} (${badge})` : label}>
            <span className="glass relative flex size-12 items-center justify-center rounded-full text-sky-50 transition group-active:scale-90">
              <Icon className="size-5" aria-hidden />
              {badge > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-sos px-1 text-[10px] font-bold text-white ring-2 ring-ink-950">
                  {badge}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium text-slate-300 drop-shadow-[0_1px_2px_rgb(0_0_0)]" aria-hidden>
              {label}
            </span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => (position ? setFocus({ ...position, zoom: 15, key: Date.now() }) : geo.retry())}
          className="glass mt-1 flex size-12 items-center justify-center rounded-full text-sky-200"
          aria-label="Centrer sur ma position"
        >
          <LocateFixed className="size-5" aria-hidden />
        </button>
      </nav>

      {/* Buzzer */}
      <div className="pointer-events-none absolute inset-x-0 top-[22%] z-10 flex flex-col items-center">
        <div className="pointer-events-auto">
          <SosBuzzer alertActive={myAlert !== null} onPress={() => setSosOpen(true)} />
        </div>
        {!myAlert && nearestAvailable && (
          <p className="mt-1 rounded-full bg-ink-950/70 px-3 py-1 text-xs text-slate-300 backdrop-blur">
            Héros le plus proche : <span className="font-semibold text-white">{nearestAvailable.hero.alias}</span>
            {nearestAvailable.distance !== null && ` à ${formatDistance(nearestAvailable.distance)}`}
          </p>
        )}
      </div>

      {/* Ongoing alert or tapped incident */}
      <div className="absolute inset-x-3 bottom-[112px] z-20 flex flex-col gap-2">
        {preview ? (
          <div className="glass glass-strong flex items-center gap-3 rounded-2xl p-3 animate-slide-up">
            <IncidentIcon code={preview.typeCode} className="text-sky-200" />
            <Link href={`/citoyen/incidents/${preview.id}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{preview.typeLabel}</p>
              <p className="truncate text-xs text-slate-400">
                {preview.city}
                {distanceTo(preview.latitude, preview.longitude) !== null && ` · ${formatDistance(distanceTo(preview.latitude, preview.longitude)!)}`} ·{" "}
                <RelativeTime value={preview.createdAt} />
              </p>
            </Link>
            <StatusBadge status={preview.status} />
            <button type="button" onClick={() => setPreview(null)} aria-label="Fermer l'aperçu" className="text-slate-400">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          myAlert && (
            <Link href={`/citoyen/incidents/${myAlert.id}`} className="glass glass-strong flex items-center gap-3 rounded-2xl p-3 animate-slide-up">
              <span className={cn("flex size-10 items-center justify-center rounded-xl", myAlert.hero ? "bg-sky-400/15 text-sky-200" : "bg-amber-300/15 text-amber-200")}>
                {myAlert.hero ? <ShieldCheck className="size-5" aria-hidden /> : <Siren className="size-5" aria-hidden />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Votre alerte en cours</span>
                <span className="block truncate text-sm font-semibold text-white">
                  {myAlert.hero ? `${myAlert.hero.alias} intervient` : "En attente d'un super-héros"} · {myAlert.typeLabel}
                </span>
              </span>
              <ChevronRight className="size-5 text-slate-400" aria-hidden />
            </Link>
          )
        )}
      </div>

      <BottomSheet
        label="Super-héros"
        snap={sheet}
        onSnapChange={setSheet}
        peekHeight={98}
        header={
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Super-héros</h2>
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-emerald-300">{available.length} disponibles</span> sur {heroes.data.length}
                </p>
              </div>
              <div className="flex -space-x-2" aria-hidden>
                {available.slice(0, 5).map((hero) => (
                  <Avatar key={hero.id} src={hero.avatarUrl} label={hero.alias} size={30} className="ring-2 ring-ink-900" />
                ))}
              </div>
            </div>
            {sheet !== "peek" && (
              <div className="mt-3 flex gap-2" onPointerDown={(event) => event.stopPropagation()}>
                <div role="tablist" aria-label="Filtrer les héros" className="flex rounded-xl bg-ink-950/50 p-1">
                  {(
                    [
                      ["all", "Tous"],
                      ["available", "Disponibles"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={heroFilter === value}
                      onClick={() => setHeroFilter(value)}
                      className={cn("rounded-lg px-3 py-1 text-xs font-semibold", heroFilter === value ? "bg-sky-400/20 text-sky-100" : "text-slate-400")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="sr-only" htmlFor="hero-sort">
                  Trier les héros
                </label>
                <select id="hero-sort" value={heroSort} onChange={(event) => setHeroSort(event.target.value as HeroSort)} className="field ml-auto h-8 w-auto py-0 text-xs">
                  <option value="distance">Plus proches</option>
                  <option value="rating">Mieux notés</option>
                  <option value="interventions">Plus expérimentés</option>
                </select>
              </div>
            )}
          </div>
        }
      >
        <ul className="flex flex-col gap-2.5 pt-1">
          {sortedHeroes.map(({ hero, distance }) => (
            <li key={hero.id}>
              <HeroRow hero={hero} distance={distance} />
            </li>
          ))}
        </ul>
      </BottomSheet>

      <SosDialog
        open={sosOpen}
        onClose={() => setSosOpen(false)}
        onSent={() => void incidents.reload()}
        types={types}
        position={position}
        precise={geo.status === "ready" && geo.accuracy < 200}
        fallbackAddress={homeAddress}
      />
    </div>
  );
}
