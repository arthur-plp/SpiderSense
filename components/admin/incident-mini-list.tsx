import Link from "next/link";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { IncidentIcon } from "@/components/ui/incident-icon";
import { formatShortDate } from "@/lib/format";
import type { IncidentStatus } from "@/lib/labels";

type Item = {
  id: string;
  typeCode: string;
  typeLabel: string;
  city: string;
  status: IncidentStatus;
  createdAt: string;
  deletedAt: string | null;
  hero?: { alias: string } | null;
};

/** Compact incident list for a user profile (reported incidents, interventions). */
export function IncidentMiniList({ incidents, showHero = false }: { incidents: Item[]; showHero?: boolean }) {
  return (
    <ul className="flex flex-col">
      {incidents.map((incident) => (
        <li key={incident.id} className="flex items-center gap-3 border-b border-white/5 py-2.5 last:border-b-0">
          <IncidentIcon code={incident.typeCode} size={16} className="text-slate-400" />
          <div className="min-w-0 flex-1">
            <Link href={`/admin/incidents/${incident.id}`} className="block truncate text-sm font-medium text-slate-100 hover:text-sky-200">
              {incident.typeLabel} · {incident.city}
            </Link>
            <p className="text-xs text-slate-500">
              {formatShortDate(incident.createdAt)}
              {showHero && incident.hero && ` · ${incident.hero.alias}`}
            </p>
          </div>
          <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
            {incident.deletedAt && <Badge tone="danger">Supprimé</Badge>}
            <StatusBadge status={incident.status} />
          </span>
        </li>
      ))}
    </ul>
  );
}
