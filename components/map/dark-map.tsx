"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker, PaddingOptions } from "maplibre-gl";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/cn";
import type { LatLng } from "@/lib/geo";

const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** Stacking order: higher stays on top (selected, user position…). */
  zIndex?: number;
};

export type MapFocus = { lat: number; lng: number; zoom?: number; key: string | number };

type DarkMapProps<T extends MapMarker> = {
  markers: T[];
  renderMarker: (marker: T) => ReactNode;
  initialCenter: LatLng;
  initialZoom?: number;
  focus?: MapFocus | null;
  /** Keeps flyTo targets visible next to floating panels. */
  padding?: PaddingOptions;
  onMarkerClick?: (id: string) => void;
  onMapClick?: (position: LatLng) => void;
  showControls?: boolean;
  className?: string;
};

/**
 * Full-bleed dark map (MapLibre + CARTO Dark Matter). Markers are React
 * portals into MapLibre DOM markers, so they can be styled like any component.
 */
export function DarkMap<T extends MapMarker>({
  markers,
  renderMarker,
  initialCenter,
  initialZoom = 12.5,
  focus,
  padding,
  onMarkerClick,
  onMapClick,
  showControls = true,
  className,
}: DarkMapProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerLib = useRef<typeof Marker | null>(null);
  const instances = useRef(new Map<string, { marker: Marker; element: HTMLButtonElement }>());
  const [elements, setElements] = useState<Map<string, HTMLElement>>(() => new Map());
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Latest callbacks without re-binding DOM listeners.
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
    onMapClickRef.current = onMapClick;
  });

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    const markerInstances = instances.current;
    import("maplibre-gl")
      .then((maplibre) => {
        if (cancelled || !containerRef.current) return;
        markerLib.current = maplibre.Marker;
        // Served from public/ (see scripts/copy-maplibre-worker.mjs).
        maplibre.setWorkerUrl(`/vendor/maplibre-gl-worker.mjs?v=${maplibre.getVersion()}`);
        map = new maplibre.Map({
          container: containerRef.current,
          style: DARK_STYLE,
          center: [initialCenter.lng, initialCenter.lat],
          zoom: initialZoom,
          attributionControl: { compact: true },
          pitchWithRotate: false,
          dragRotate: false,
        });
        if (showControls) {
          map.addControl(new maplibre.NavigationControl({ showCompass: false }), "bottom-right");
        }
        map.on("style.load", () => tintStyle(map!));
        map.on("load", () => !cancelled && setReady(true));
        map.on("click", (event) => onMapClickRef.current?.({ lat: event.lngLat.lat, lng: event.lngLat.lng }));
        mapRef.current = map;
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      markerInstances.forEach(({ marker }) => marker.remove());
      markerInstances.clear();
      map?.remove();
      mapRef.current = null;
    };
    // The initial camera is only read once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers with the map.
  useEffect(() => {
    const map = mapRef.current;
    const MarkerClass = markerLib.current;
    if (!ready || !map || !MarkerClass) return;
    const current = instances.current;
    const wanted = new Set(markers.map((marker) => marker.id));
    let changed = false;

    for (const [id, { marker }] of current) {
      if (!wanted.has(id)) {
        marker.remove();
        current.delete(id);
        changed = true;
      }
    }
    for (const item of markers) {
      const existing = current.get(item.id);
      if (existing) {
        existing.marker.setLngLat([item.lng, item.lat]);
        existing.element.setAttribute("aria-label", item.label);
        existing.element.style.zIndex = String(item.zIndex ?? 1);
        continue;
      }
      const element = document.createElement("button");
      element.type = "button";
      element.className = "block cursor-pointer border-0 bg-transparent p-0";
      element.setAttribute("aria-label", item.label);
      element.title = item.label;
      element.style.zIndex = String(item.zIndex ?? 1);
      // Native listener: stops the map's own click handler from firing too.
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onMarkerClickRef.current?.(item.id);
      });
      const marker = new MarkerClass({ element, anchor: "center" }).setLngLat([item.lng, item.lat]).addTo(map);
      current.set(item.id, { marker, element });
      changed = true;
    }
    if (changed) {
      setElements(new Map([...current].map(([id, { element }]) => [id, element])));
    }
  }, [markers, ready]);

  useEffect(() => {
    if (ready && padding) mapRef.current?.setPadding(padding);
  }, [ready, padding]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focus) return;
    map.flyTo({
      center: [focus.lng, focus.lat],
      zoom: focus.zoom ?? Math.max(map.getZoom(), 14.5),
      essential: true,
      duration: 1100,
    });
    // Fly only when a new focus request arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focus?.key]);

  const byId = new Map(markers.map((marker) => [marker.id, marker]));

  return (
    // Positioning comes from the caller (absolute full-bleed, or relative + height).
    <div className={cn("isolate overflow-hidden bg-ink-950", className)}>
      {/* Inline style: maplibre-gl.css sets `.maplibregl-map { position: relative }`. */}
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {/* Subtle vignette so floating glass panels stay readable. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgb(4_6_13/0.75))]" />
      {failed && (
        <p className="absolute inset-x-0 top-1/2 text-center text-sm text-slate-500">
          La carte n&apos;a pas pu être chargée.
        </p>
      )}
      {[...elements].map(([id, element]) => {
        const marker = byId.get(id);
        return marker ? createPortal(renderMarker(marker), element, id) : null;
      })}
    </div>
  );
}

/** Pushes the CARTO dark style towards the app's deep blue palette. */
function tintStyle(map: MapLibreMap) {
  const style = map.getStyle();
  for (const layer of style.layers ?? []) {
    try {
      if (layer.type === "background") {
        map.setPaintProperty(layer.id, "background-color", "#05080f");
      } else if (layer.type === "fill" && layer.id.includes("water")) {
        map.setPaintProperty(layer.id, "fill-color", "#0a1a30");
      } else if (layer.type === "line" && /road|street|highway|motorway|trunk/.test(layer.id)) {
        map.setPaintProperty(layer.id, "line-color", "#1b2a45");
      } else if (layer.type === "symbol") {
        // Labels in French (falls back to the local name when missing).
        const textField = map.getLayoutProperty(layer.id, "text-field");
        const serialized = JSON.stringify(textField);
        if (serialized?.includes('"name:en"')) {
          map.setLayoutProperty(layer.id, "text-field", JSON.parse(serialized.replaceAll('"name:en"', '"name:fr"')));
        }
      }
    } catch {
      // Layer-specific expressions we don't override: keep the original.
    }
  }
}
