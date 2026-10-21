"use client";

import { Clock, MapPin, ShieldCheck, Users } from "lucide-react";
import type { Ref } from "react";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { IncidentIcon } from "@/components/ui/incident-icon";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatTime } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { PRIORITY_COLORS, STATUS_COLORS } from "@/lib/labels";
import type { IncidentDto } from "@/lib/server/services/incidents";

type IncidentCardProps = {
  ref?: Ref<HTMLElement>;
  incident: IncidentDto;
  selected: boolean;
  isNew?: boolean;
  distance: number | null;
  heroId: string;
  heroBusy: boolean;
  pending: boolean;
  onSelect: () => void;
  onTake: () => void;
  onFinish: () => void;
};

/** Liquid-glass card of an incident in the hero side panel. */
export function IncidentCard({
  ref,
  incident,
  selected,
  isNew,
  distance,
  heroId,
  heroBusy,
  pending,
  onSelect,
  onTake,
  onFinish,
}: IncidentCardProps) {
  const accent =
    incident.status === "REPORTED"
      ? incident.priority
        ? PRIORITY_COLORS[incident.priority]
        : "#cbd5e1"
      : STATUS_COLORS[incident.status];
  const mine = incident.hero?.id === heroId;
  const place = [incident.street, incident.city].filter(Boolean).join(", ");

  return (
    <article
      ref={ref}
      className={cn(
        "glass group relative rounded-2xl p-4 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-sky-300/45",
        selected && "glass-active",
        isNew && "animate-slide-up",
      )}
    >
      {/* Stretched button: the whole card selects the incident, actions stay separate. */}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`${incident.typeLabel} à ${incident.city}, voir le détail`}
        className="absolute inset-0 z-0 rounded-2xl"
      />
      <div className="pointer-events-none relative flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset"
          style={{ color: accent, backgroundColor: `${accent}1f`, boxShadow: `0 0 20px -6px ${accent}` }}
        >
          <IncidentIcon code={incident.typeCode} size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-white">{incident.typeLabel}</h3>
            <PriorityBadge priority={incident.priority} />
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-sky-100/70">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{place}</span>
            {distance !== null && <span className="shrink-0 text-sky-200/90">· {formatDistance(distance)}</span>}
          </p>
        </div>
      </div>

      <p className="pointer-events-none relative mt-2.5 line-clamp-2 text-[13px] leading-relaxed text-slate-300">{incident.description}</p>

      <div className="pointer-events-none relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-400">
        <StatusBadge status={incident.status} />
        <span className="flex items-center gap-1">
          <Clock className="size-3" aria-hidden />
          <RelativeTime value={incident.createdAt} /> · {formatTime(incident.createdAt)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="size-3" aria-hidden />
          {incident.peopleInvolved}
        </span>
      </div>

      <div className="relative mt-3 flex items-center justify-between gap-2 border-t border-white/8 pt-3">
        <p className="pointer-events-none min-w-0 truncate text-xs text-slate-400">
          {incident.hero ? (
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-sky-300" aria-hidden />
              {mine ? "Votre intervention" : incident.hero.alias}
            </span>
          ) : (
            "En attente d'un super-héros"
          )}
        </p>
        {incident.status === "REPORTED" && (
          <Button
            size="sm"
            className="relative z-10"
            disabled={heroBusy || pending}
            title={heroBusy ? "Terminez d'abord votre intervention en cours" : undefined}
            onClick={onTake}
          >
            Prendre en charge
          </Button>
        )}
        {incident.status === "IN_PROGRESS" && mine && (
          <Button size="sm" variant="brand" className="relative z-10" disabled={pending} onClick={onFinish}>
            Terminer l&apos;intervention
          </Button>
        )}
      </div>
    </article>
  );
}
