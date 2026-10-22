"use client";

import { LocateFixed, Radio, Search, Siren } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DarkMap, type MapFocus, type MapMarker } from "@/components/map/dark-map";
import { HeroPin, IncidentPin } from "@/components/map/markers";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/panel";
import { RelativeTime } from "@/components/ui/relative-time";
import { ToastViewport, useToasts } from "@/components/ui/toasts";
import { useLiveResource } from "@/components/ui/use-live-resource";
import { apiRequest } from "@/lib/api-client";
import { DEFAULT_CENTER, distanceInMeters, type LatLng } from "@/lib/geo";
import { type IncidentPriority, PRIORITY_RANK } from "@/lib/labels";
import type { HeroDto } from "@/lib/server/services/heroes";
import type { IncidentDto } from "@/lib/server/services/incidents";
import type { InterventionReport } from "./close-intervention-form";
import { IncidentCard } from "./incident-card";
import { IncidentDetail, type VillainOption } from "./incident-detail";

type Filter = "active" | "REPORTED" | "IN_PROGRESS" | "closed";
type Sort = "priority" | "recent" | "distance";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "active", label: "Actifs" },
  { value: "REPORTED", label: "Signalés" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "closed", label: "Terminés 24 h" },
];

const matchesFilter = (incident: IncidentDto, filter: Filter) => {
  switch (filter) {
    case "active":
      return incident.status === "REPORTED" || incident.status === "IN_PROGRESS";
    case "closed":
      return incident.status === "SUCCEEDED" || incident.status === "FAILED";
    default:
      return incident.status === filter;
  }
};

type OperationsCenterProps = {
  hero: { id: string; alias: string; position: LatLng | null };
  initialIncidents: IncidentDto[];
  initialHeroes: HeroDto[];
  villains: VillainOption[];
  initialSelectedId: string | null;
};

type IncidentMarker = MapMarker & { kind: "incident"; incident: IncidentDto };
type HeroMarker = MapMarker & { kind: "hero"; hero: HeroDto; isMe: boolean };

/**
 * Hero command center (desktop): full-screen dark map, incidents both as
 * markers and as liquid-glass cards. Card ↔ marker selection is synced.
 */
export function OperationsCenter({ hero, initialIncidents, initialHeroes, villains, initialSelectedId }: OperationsCenterProps) {
  const incidentsFeed = useLiveResource("/api/incidents", initialIncidents, (body) => (body as { incidents: IncidentDto[] }).incidents);
  const heroesFeed = useLiveResource("/api/heroes", initialHeroes, (body) => (body as { heroes: HeroDto[] }).heroes, 20_000);
  const incidents = incidentsFeed.data;

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [filter, setFilter] = useState<Filter>("active");
  const [sort, setSort] = useState<Sort>("priority");
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [position, setPosition] = useState<LatLng | null>(hero.position);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const [pending, startTransition] = useTransition();
  const { toasts, push, dismiss } = useToasts();
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const seenIds = useRef(new Set(initialIncidents.map((incident) => incident.id)));

  const myActive = incidents.find((incident) => incident.status === "IN_PROGRESS" && incident.hero?.id === hero.id) ?? null;
  const selected = incidents.find((incident) => incident.id === selectedId) ?? null;

  const distanceTo = useCallback(
    (incident: IncidentDto) =>
      position && incident.latitude !== null && incident.longitude !== null
        ? distanceInMeters(position, { lat: incident.latitude, lng: incident.longitude })
        : null,
    [position],
  );

  const select = useCallback(
    (id: string, options: { fly?: boolean; scroll?: boolean } = {}) => {
      setSelectedId(id);
      const incident = incidents.find((item) => item.id === id);
      if (options.fly && incident?.latitude != null && incident.longitude != null) {
        setFocus({ lat: incident.latitude, lng: incident.longitude, key: `${id}-${Date.now()}` });
      }
      if (options.scroll) {
        // A marker click can target a card hidden by the current filter.
        if (incident && !matchesFilter(incident, filter)) setFilter(incident.status === "REPORTED" || incident.status === "IN_PROGRESS" ? "active" : "closed");
        requestAnimationFrame(() => cardRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
      }
    },
    [incidents, filter],
  );

  // Deep link (?incident=…) from the alert email: fly there once the map is up.
  useEffect(() => {
    if (initialSelectedId) {
      const timer = setTimeout(() => select(initialSelectedId, { fly: true, scroll: true }), 600);
      return () => clearTimeout(timer);
    }
    // Only for the initial deep link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // New incidents since the last poll: highlight their card and notify.
  useEffect(() => {
    const fresh = incidents.filter((incident) => !seenIds.current.has(incident.id));
    if (fresh.length === 0) return;
    fresh.forEach((incident) => seenIds.current.add(incident.id));
    const reported = fresh.filter((incident) => incident.status === "REPORTED");
    // Derived from polled data: the flash only lasts a few seconds.
    setFreshIds(new Set(reported.map((incident) => incident.id)));
    for (const incident of reported) {
      push({
        tone: "info",
        title: `Nouvel incident : ${incident.typeLabel}`,
        description: `${incident.city} · ${incident.peopleInvolved} personne(s) impliquée(s)`,
        action: { label: "Voir sur la carte", onClick: () => select(incident.id, { fly: true, scroll: true }) },
      });
    }
  }, [incidents, push, select]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = incidents.filter(
      (incident) =>
        matchesFilter(incident, filter) &&
        (!term ||
          [incident.typeLabel, incident.city, incident.street, incident.description, incident.reportedVillainName, incident.villain?.alias]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(term))),
    );
    const byRecent = (a: IncidentDto, b: IncidentDto) => b.createdAt.localeCompare(a.createdAt);
    return list.sort((a, b) => {
      // The hero's own intervention always stays on top.
      const mineA = a.id === myActive?.id ? -1 : 0;
      const mineB = b.id === myActive?.id ? -1 : 0;
      if (mineA !== mineB) return mineA - mineB;
      if (sort === "distance") return (distanceTo(a) ?? Infinity) - (distanceTo(b) ?? Infinity);
      if (sort === "priority") {
        const rank = PRIORITY_RANK[a.priority ?? "NONE"] - PRIORITY_RANK[b.priority ?? "NONE"];
        if (rank !== 0) return rank;
      }
      return byRecent(a, b);
    });
  }, [incidents, filter, query, sort, myActive?.id, distanceTo]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map(({ value }) => [value, incidents.filter((incident) => matchesFilter(incident, value)).length])) as Record<Filter, number>,
    [incidents],
  );

  const markers = useMemo(() => {
    const incidentMarkers: IncidentMarker[] = incidents
      .filter((incident) => incident.latitude !== null && incident.longitude !== null)
      .filter((incident) => matchesFilter(incident, filter) || incident.id === selectedId)
      .map((incident) => ({
        id: incident.id,
        kind: "incident",
        incident,
        lat: incident.latitude!,
        lng: incident.longitude!,
        label: `${incident.typeLabel} — ${incident.city}`,
        zIndex: incident.id === selectedId ? 50 : incident.status === "REPORTED" ? 20 : 10,
      }));
    const heroMarkers: HeroMarker[] = heroesFeed.data
      // Busy heroes stand on their incident's marker: only show heroes on patrol.
      .filter((item) => item.latitude !== null && item.longitude !== null && (item.id === hero.id || item.availability === "AVAILABLE"))
      .map((item) => {
        const isMe = item.id === hero.id;
        const lat = isMe && position ? position.lat : item.latitude!;
        const lng = isMe && position ? position.lng : item.longitude!;
        return { id: `hero-${item.id}`, kind: "hero", hero: item, isMe, lat, lng, label: isMe ? "Votre position" : item.alias, zIndex: isMe ? 40 : 5 };
      });
    return [...heroMarkers, ...incidentMarkers];
  }, [incidents, heroesFeed.data, filter, selectedId, hero.id, position]);

  const run = (task: () => Promise<{ ok: boolean; error?: string }>, success: string) =>
    startTransition(async () => {
      const result = await task();
      if (result.ok) {
        push({ tone: "success", title: success });
        await incidentsFeed.reload();
        void heroesFeed.reload();
      } else {
        push({ tone: "error", title: "Action impossible", description: result.error });
        void incidentsFeed.reload();
      }
    });

  const take = (incident: IncidentDto) => {
    select(incident.id, { fly: true });
    run(() => apiRequest("POST", `/api/incidents/${incident.id}/intervention`), `Intervention démarrée : ${incident.typeLabel} à ${incident.city}`);
  };

  const prioritize = (incident: IncidentDto, priority: IncidentPriority) => {
    // Optimistic: the badge changes immediately, the poll confirms it.
    incidentsFeed.setData((all) => all.map((item) => (item.id === incident.id ? { ...item, priority } : item)));
    run(() => apiRequest("PATCH", `/api/incidents/${incident.id}/priority`, { priority }), "Priorité mise à jour");
  };

  const finish = (incident: IncidentDto, report: InterventionReport) =>
    startTransition(async () => {
      const result = await apiRequest("POST", `/api/incidents/${incident.id}/intervention/close`, report);
      if (result.ok) {
        setFinishingId(null);
        // The server moved the hero to where the intervention ended.
        if (incident.latitude !== null && incident.longitude !== null) {
          setPosition({ lat: incident.latitude, lng: incident.longitude });
        }
        push({
          tone: "success",
          title: report.outcome === "SUCCEEDED" ? "Intervention réussie, bravo !" : "Intervention clôturée",
          description: report.villainImprisoned ? "Le super-vilain est sous les verrous." : "Le citoyen est invité à noter votre intervention.",
        });
        await incidentsFeed.reload();
        void heroesFeed.reload();
      } else {
        push({ tone: "error", title: "Clôture impossible", description: result.error });
      }
    });

  const locate = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const next = { lat: result.coords.latitude, lng: result.coords.longitude };
        setPosition(next);
        setFocus({ ...next, zoom: 14, key: `me-${Date.now()}` });
        startTransition(async () => {
          const saved = await apiRequest("PUT", "/api/me/location", next);
          push(saved.ok ? { tone: "success", title: "Position mise à jour" } : { tone: "error", title: "Position refusée", description: saved.error });
        });
      },
      () => push({ tone: "error", title: "Géolocalisation refusée", description: "Autorisez la localisation dans votre navigateur." }),
    );
  };

  const center = position ?? DEFAULT_CENTER;

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <DarkMap
        className="absolute inset-0"
        markers={markers}
        initialCenter={center}
        initialZoom={12.4}
        focus={focus}
        padding={{ left: 470, right: selected ? 450 : 30, top: 110, bottom: 40 }}
        onMarkerClick={(id) => {
          if (id.startsWith("hero-")) return;
          select(id, { scroll: true, fly: true });
        }}
        renderMarker={(marker) =>
          marker.kind === "incident" ? (
            <IncidentPin
              typeCode={marker.incident.typeCode}
              status={marker.incident.status}
              priority={marker.incident.priority}
              selected={marker.id === selectedId}
            />
          ) : (
            <HeroPin
              alias={marker.isMe ? "Vous" : marker.hero.alias}
              available={marker.hero.availability === "AVAILABLE"}
              busy={marker.hero.availability === "BUSY"}
            />
          )
        }
      />

      {/* Incidents panel */}
      <section
        aria-label="Incidents signalés"
        className="glass absolute bottom-4 left-4 top-24 z-10 flex w-[440px] max-w-[calc(100vw-2rem)] flex-col rounded-3xl"
      >
        <header className="space-y-3 border-b border-white/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="flex items-center gap-2 text-lg font-bold text-white">
              <Siren className="size-5 text-sos" aria-hidden />
              Incidents
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-slate-400" aria-live="polite">
              <Radio className={cn("size-3.5", incidentsFeed.online ? "text-emerald-400" : "text-rose-400")} aria-hidden />
              {incidentsFeed.online ? (
                incidentsFeed.updatedAt ? (
                  <>
                    En direct · <RelativeTime value={new Date(incidentsFeed.updatedAt).toISOString()} />
                  </>
                ) : (
                  "En direct"
                )
              ) : (
                "Hors ligne"
              )}
            </p>
          </div>
          <div role="tablist" aria-label="Filtrer les incidents" className="grid grid-cols-4 gap-1 rounded-xl bg-ink-950/40 p-1">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                onClick={() => setFilter(option.value)}
                className={cn(
                  "rounded-lg px-1 py-1.5 text-[11px] font-semibold transition",
                  filter === option.value ? "bg-sky-400/20 text-sky-100 ring-1 ring-sky-300/40" : "text-slate-400 hover:text-white",
                )}
              >
                {option.label} <span className="tabular-nums opacity-70">{counts[option.value]}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Rechercher un incident</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Lieu, type, vilain…"
                className="field h-9 pl-9 text-sm"
              />
            </label>
            <label className="sr-only" htmlFor="sort">
              Trier
            </label>
            <select id="sort" value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="field h-9 w-auto py-0 text-sm">
              <option value="priority">Priorité</option>
              <option value="recent">Plus récents</option>
              <option value="distance">Distance</option>
            </select>
          </div>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto p-3 [scrollbar-width:thin]">
          {visible.length === 0 ? (
            <EmptyState title="Aucun incident" className="mt-6">
              Rien à signaler dans cette catégorie. Restez en alerte !
            </EmptyState>
          ) : (
            visible.map((incident) => (
              <IncidentCard
                key={incident.id}
                ref={(element) => {
                  if (element) cardRefs.current.set(incident.id, element);
                  else cardRefs.current.delete(incident.id);
                }}
                incident={incident}
                selected={incident.id === selectedId}
                isNew={freshIds.has(incident.id)}
                distance={distanceTo(incident)}
                heroId={hero.id}
                heroBusy={myActive !== null}
                pending={pending}
                onSelect={() => select(incident.id, { fly: true })}
                onTake={() => take(incident)}
                onFinish={() => {
                  select(incident.id, { fly: true });
                  setFinishingId(incident.id);
                }}
              />
            ))
          )}
        </div>
      </section>

      {/* Detail drawer */}
      {selected && (
        <div className="absolute bottom-4 right-4 top-24 z-10 w-[420px] max-w-[calc(100vw-2rem)]">
          <IncidentDetail
            key={selected.id}
            incident={selected}
            heroId={hero.id}
            heroBusy={myActive !== null}
            distance={distanceTo(selected)}
            villains={villains}
            pending={pending}
            finishing={finishingId === selected.id}
            onClose={() => setSelectedId(null)}
            onTake={() => take(selected)}
            onPriority={(priority) => prioritize(selected, priority)}
            onStartFinish={() => setFinishingId(selected.id)}
            onFinish={(report) => finish(selected, report)}
          />
        </div>
      )}

      {/* Current mission + locate */}
      <div className={cn("absolute bottom-6 z-10 flex items-center gap-2", selected ? "right-[452px]" : "right-16")}>
        {myActive && myActive.id !== selectedId && (
          <button
            type="button"
            onClick={() => select(myActive.id, { fly: true, scroll: true })}
            className="glass glass-strong flex items-center gap-3 rounded-2xl px-4 py-2.5 text-left"
          >
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-sky-400" />
            </span>
            <span className="text-sm">
              <span className="block font-semibold text-white">Mission en cours : {myActive.typeLabel}</span>
              <span className="text-xs text-slate-300">
                {myActive.city} · depuis {myActive.interventionStartedAt && <RelativeTime value={myActive.interventionStartedAt} />}
              </span>
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={locate}
          className="glass flex size-11 items-center justify-center rounded-2xl text-sky-100 hover:border-sky-300/50"
          aria-label="Mettre à jour ma position"
          title="Mettre à jour ma position"
        >
          <LocateFixed className="size-5" />
        </button>
      </div>

      <ToastViewport toasts={toasts} dismiss={dismiss} className="absolute left-1/2 top-24 z-30 -translate-x-1/2 items-center" />
    </div>
  );
}
