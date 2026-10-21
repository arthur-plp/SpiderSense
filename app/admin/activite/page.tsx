import { Activity } from "lucide-react";
import type { Metadata } from "next";
import { ActivityList } from "@/components/admin/activity-list";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Pagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import { pluralize } from "@/lib/format";
import { requireStaff } from "@/lib/server/auth";
import { ACTIVITY_PREFIXES, isActivityPrefix, listActivity } from "@/lib/server/services/admin/activity";
import { firstParam, parsePage } from "@/lib/server/services/admin/params";

export const metadata: Metadata = { title: "Activité" };

const PAGE_SIZE = 30;

export default async function AdminActivityPage({ searchParams }: PageProps<"/admin/activite">) {
  await requireStaff();
  const params = await searchParams;
  const typeParam = firstParam(params.type);
  const prefix = isActivityPrefix(typeParam) ? typeParam : null;
  const page = parsePage(params.page);
  const { entries, total } = await listActivity({ page, pageSize: PAGE_SIZE, prefix });

  return (
    <>
      <PageHeader
        eyebrow="Supervision"
        title="Journal d'activité"
        description={`${pluralize(total, "action enregistrée", "actions enregistrées")} : inscriptions, signalements, interventions et décisions de modération.`}
      />

      <FilterForm action="/admin/activite" className="mb-4">
        <FilterField label="Type d'action" htmlFor="type">
          <Select name="type" defaultValue={prefix ?? ""} className="h-10 py-0 text-sm">
            <option value="">Toutes les actions</option>
            {ACTIVITY_PREFIXES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FilterField>
        <Button type="submit" variant="secondary" className="h-10">
          Filtrer
        </Button>
      </FilterForm>

      {entries.length === 0 ? (
        <EmptyState icon={<Activity className="size-8" />} title="Aucune activité">
          Aucune action ne correspond à ce filtre.
        </EmptyState>
      ) : (
        <Panel className="px-4 py-1 sm:px-5">
          <ActivityList entries={entries} />
        </Panel>
      )}

      <Pagination pathname="/admin/activite" params={params} page={page} pageSize={PAGE_SIZE} total={total} />
    </>
  );
}
