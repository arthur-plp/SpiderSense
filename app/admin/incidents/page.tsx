import { Plus, Siren, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, Td, Th, Tr } from "@/components/admin/data-table";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Pagination } from "@/components/admin/pagination";
import { PrioritySelect } from "@/components/admin/priority-select";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/form";
import { IncidentIcon } from "@/components/ui/incident-icon";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatDistance } from "@/lib/geo";
import { pluralize } from "@/lib/format";
import { type IncidentPriority, PRIORITY_LABELS, STATUS_LABELS, type IncidentStatus } from "@/lib/labels";
import { requireStaff } from "@/lib/server/auth";
import {
  getDuplicateMap,
  INCIDENT_SORTS,
  INCIDENTS_PAGE_SIZE,
  listAdminIncidents,
  parseIncidentFilters,
} from "@/lib/server/services/admin/incidents";
import { listIncidentTypes } from "@/lib/server/services/incidents";
import { getVillain } from "@/lib/server/services/villains";

export const metadata: Metadata = { title: "Incidents" };

export default async function AdminIncidentsPage({ searchParams }: PageProps<"/admin/incidents">) {
  await requireStaff();
  const params = await searchParams;
  const filters = parseIncidentFilters(params);
  const [{ rows, total }, duplicates, types, villain] = await Promise.all([
    listAdminIncidents(filters),
    getDuplicateMap(),
    listIncidentTypes(),
    filters.villainId ? getVillain(filters.villainId) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Modération"
        title="Incidents"
        description={`${pluralize(total, "incident")} correspondant aux filtres. Les incidents du même type signalés à moins de 500 m et 3 h d'intervalle sont marqués comme doublons possibles.`}
        actions={
          <LinkButton href="/admin/incidents/nouveau" variant="danger">
            <Plus className="size-4" aria-hidden />
            Signaler un incident
          </LinkButton>
        }
      />

      <FilterForm action="/admin/incidents" className="mb-4">
        <FilterField label="Statut" htmlFor="status">
          <Select name="status" defaultValue={filters.status ?? ""} className="h-10 py-0 text-sm">
            <option value="">Tous les statuts</option>
            <option value="ACTIVE">Actifs (signalés ou en cours)</option>
            {(Object.keys(STATUS_LABELS) as IncidentStatus[]).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Priorité" htmlFor="priority">
          <Select name="priority" defaultValue={filters.priority ?? ""} className="h-10 py-0 text-sm">
            <option value="">Toutes les priorités</option>
            {(Object.keys(PRIORITY_LABELS) as IncidentPriority[]).map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
            <option value="NONE">À définir</option>
          </Select>
        </FilterField>
        <FilterField label="Type" htmlFor="type">
          <Select name="type" defaultValue={filters.typeId ?? ""} className="h-10 py-0 text-sm">
            <option value="">Tous les types</option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Trier par" htmlFor="sort">
          <Select name="sort" defaultValue={filters.sort} className="h-10 py-0 text-sm">
            {Object.entries(INCIDENT_SORTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FilterField>
        {filters.villainId && <input type="hidden" name="villain" value={filters.villainId} />}
        <Checkbox name="deleted" value="1" defaultChecked={filters.includeDeleted} label="Inclure les supprimés" className="pb-2.5" />
        <Button type="submit" variant="secondary" className="h-10">
          Filtrer
        </Button>
      </FilterForm>

      {villain && (
        <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
          Incidents liés au vilain
          <Link
            href="/admin/incidents"
            className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
          >
            {villain.alias}
            <X className="size-3.5" aria-label="Retirer ce filtre" />
          </Link>
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState icon={<Siren className="size-8" />} title="Aucun incident">
          Aucun incident ne correspond à ces filtres.
        </EmptyState>
      ) : (
        <DataTable caption="Liste des incidents" minWidth={980}>
          <thead>
            <tr>
              <Th>Incident</Th>
              <Th>Lieu</Th>
              <Th>Statut</Th>
              <Th>Priorité</Th>
              <Th>Déclarant</Th>
              <Th>Signalé</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((incident) => {
              const links = duplicates.get(incident.id) ?? [];
              const active = !incident.deletedAt && (incident.status === "REPORTED" || incident.status === "IN_PROGRESS");
              return (
                <Tr key={incident.id} className={incident.deletedAt ? "opacity-60" : undefined}>
                  <Td className="max-w-sm">
                    <div className="flex gap-3">
                      <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-300">
                        <IncidentIcon code={incident.typeCode} size={16} />
                      </span>
                      <div className="min-w-0">
                        <Link href={`/admin/incidents/${incident.id}`} className="font-semibold text-slate-100 hover:text-sky-200">
                          {incident.typeLabel}
                        </Link>
                        <p className="line-clamp-2 text-xs text-slate-400">{incident.description}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {incident.deletedAt && <Badge tone="danger">Supprimé</Badge>}
                          {links.length > 0 && (
                            <Link
                              href={`/admin/incidents/${links[0].id}`}
                              title={`Incident similaire à ${formatDistance(links[0].distance)}`}
                              className="rounded-full focus-visible:outline-2"
                            >
                              <Badge tone="warning" dot>
                                Doublon possible{links.length > 1 ? ` (+${links.length - 1})` : ""}
                              </Badge>
                            </Link>
                          )}
                          {(incident.villainAlias ?? incident.reportedVillainName) && (
                            <Badge tone={incident.villainAlias ? "brand" : "neutral"}>
                              {incident.villainAlias ?? `« ${incident.reportedVillainName} »`}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <p className="text-slate-200">{incident.city}</p>
                    {incident.street && <p className="text-xs text-slate-500">{incident.street}</p>}
                  </Td>
                  <Td>
                    <StatusBadge status={incident.status} />
                    {incident.hero && (
                      <Link href={`/admin/utilisateurs/${incident.hero.id}`} className="mt-1 block text-xs text-sky-300 hover:underline">
                        {incident.hero.alias}
                      </Link>
                    )}
                  </Td>
                  <Td>
                    {active ? (
                      <PrioritySelect
                        endpoint={{ method: "PATCH", path: `/api/incidents/${incident.id}/priority` }}
                        priority={incident.priority}
                        label={`Priorité de l'incident ${incident.typeLabel} à ${incident.city}`}
                      />
                    ) : (
                      <PriorityBadge priority={incident.priority} />
                    )}
                  </Td>
                  <Td>
                    {incident.reporter ? (
                      <Link href={`/admin/utilisateurs/${incident.reporter.id}`} className="text-slate-200 hover:text-sky-200">
                        {incident.reporter.name}
                      </Link>
                    ) : (
                      <span className="text-slate-500">Compte supprimé</span>
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-slate-400">
                    <RelativeTime value={incident.createdAt} />
                  </Td>
                  <Td className="text-right">
                    <LinkButton href={`/admin/incidents/${incident.id}`} variant="ghost" size="sm">
                      Ouvrir
                    </LinkButton>
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      <Pagination pathname="/admin/incidents" params={params} page={filters.page} pageSize={INCIDENTS_PAGE_SIZE} total={total} />
    </>
  );
}
