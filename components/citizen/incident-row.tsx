import { ChevronRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import { IncidentIcon } from "@/components/ui/incident-icon";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatDistance } from "@/lib/geo";
import type { IncidentDto } from "@/lib/server/services/incidents";

export function IncidentRow({ incident, distance }: { incident: IncidentDto; distance?: number | null }) {
  const removed = incident.deletedAt !== null;
  return (
    <Link href={`/citoyen/incidents/${incident.id}`} className="glass flex items-center gap-3 rounded-2xl p-3.5 active:scale-[0.99]">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/6 text-sky-200">
        <IncidentIcon code={incident.typeCode} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-white">{incident.typeLabel}</span>
          {removed ? <span className="shrink-0 text-[11px] font-semibold text-slate-500">Retiré</span> : <StatusBadge status={incident.status} />}
        </span>
        <span className="mt-0.5 block truncate text-xs text-slate-400">
          {incident.city}
          {distance != null && ` · ${formatDistance(distance)}`} · <RelativeTime value={incident.createdAt} />
        </span>
        {incident.hero && (
          <span className="mt-1 flex items-center gap-1 text-xs text-sky-200/80">
            <ShieldCheck className="size-3.5" aria-hidden /> {incident.hero.alias}
          </span>
        )}
      </span>
      <ChevronRight className="size-4 shrink-0 text-slate-500" aria-hidden />
    </Link>
  );
}
