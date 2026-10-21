"use client";

import { DarkMap } from "@/components/map/dark-map";
import { IncidentPin } from "@/components/map/markers";
import type { IncidentPriority, IncidentStatus } from "@/lib/labels";

/** Small static map centred on one incident. */
export function IncidentMap({ lat, lng, typeCode, status, priority }: { lat: number; lng: number; typeCode: string; status: IncidentStatus; priority: IncidentPriority | null }) {
  return (
    <DarkMap
      className="relative h-44 rounded-2xl border border-white/10"
      markers={[{ id: "incident", lat, lng, label: "Lieu de l'incident" }]}
      renderMarker={() => <IncidentPin typeCode={typeCode} status={status} priority={priority} />}
      initialCenter={{ lat, lng }}
      initialZoom={15}
      showControls={false}
    />
  );
}
