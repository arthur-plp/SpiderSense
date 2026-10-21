import { Plus, Skull } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { MarvelEncyclopediaLink } from "@/components/admin/marvel-link";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import { formatShortDate, fullName, pluralize } from "@/lib/format";
import { VILLAIN_STATUS_LABELS } from "@/lib/labels";
import { requireStaff } from "@/lib/server/auth";
import { firstParam } from "@/lib/server/services/admin/params";
import { listVillains } from "@/lib/server/services/villains";

export const metadata: Metadata = { title: "Vilains" };

type VillainStatus = keyof typeof VILLAIN_STATUS_LABELS;

export default async function AdminVillainsPage({ searchParams }: PageProps<"/admin/vilains">) {
  await requireStaff();
  const params = await searchParams;
  const query = (firstParam(params.q) ?? "").trim().toLowerCase();
  const statusParam = firstParam(params.statut);
  const status = statusParam && statusParam in VILLAIN_STATUS_LABELS ? (statusParam as VillainStatus) : null;

  const all = await listVillains();
  const villains = all.filter(
    (villain) =>
      (!status || villain.status === status) &&
      (!query || [villain.alias, villain.firstName, villain.lastName].some((value) => value?.toLowerCase().includes(query))),
  );
  const imprisoned = all.filter((villain) => villain.status === "IMPRISONED").length;

  return (
    <>
      <PageHeader
        eyebrow="Encyclopédie"
        title="Répertoire des vilains"
        description={`${pluralize(all.length, "vilain identifié", "vilains identifiés")}, dont ${pluralize(imprisoned, "emprisonné")}. Les héros et les citoyens consultent ces fiches dans l'encyclopédie.`}
        actions={
          <>
            <MarvelEncyclopediaLink />
            <LinkButton href="/admin/vilains/nouveau">
              <Plus className="size-4" aria-hidden />
              Ajouter un vilain
            </LinkButton>
          </>
        }
      />

      <FilterForm action="/admin/vilains" className="mb-4">
        <FilterField label="Rechercher" htmlFor="q" className="sm:min-w-64 sm:flex-1">
          <Input name="q" type="search" defaultValue={firstParam(params.q) ?? ""} placeholder="Nom de vilain, identité…" className="h-10 py-0 text-sm" />
        </FilterField>
        <FilterField label="Statut" htmlFor="statut">
          <Select name="statut" defaultValue={status ?? ""} className="h-10 py-0 text-sm">
            <option value="">Tous</option>
            {(Object.keys(VILLAIN_STATUS_LABELS) as VillainStatus[]).map((value) => (
              <option key={value} value={value}>
                {VILLAIN_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        </FilterField>
        <Button type="submit" variant="secondary" className="h-10">
          Rechercher
        </Button>
      </FilterForm>

      {villains.length === 0 ? (
        <EmptyState icon={<Skull className="size-8" />} title="Aucun vilain">
          Aucune fiche ne correspond à cette recherche.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {villains.map((villain) => {
            const identity = fullName(villain);
            return (
              <li key={villain.id}>
                <Panel className="flex h-full gap-4 p-4">
                  <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-white/5">
                    {villain.imageUrl ? (
                      // Image URLs are typed by moderators and can point to any host.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={villain.imageUrl} alt="" loading="lazy" className="size-full object-cover" />
                    ) : (
                      <span className="flex size-full items-center justify-center text-slate-600">
                        <Skull className="size-8" aria-hidden />
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/vilains/${villain.id}`} className="text-base font-bold text-white hover:text-sky-200">
                        {villain.alias}
                      </Link>
                      <Badge tone={villain.status === "IMPRISONED" ? "success" : "danger"} dot>
                        {VILLAIN_STATUS_LABELS[villain.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">
                      {identity || "Identité inconnue"}
                      {villain.mainSector && ` · ${villain.mainSector}`}
                      {villain.imprisonedAt && ` · emprisonné le ${formatShortDate(villain.imprisonedAt)}`}
                    </p>
                    {villain.specialties.length > 0 && (
                      <ul className="flex flex-wrap gap-1" aria-label="Spécialités">
                        {villain.specialties.map((specialty) => (
                          <li key={specialty.id}>
                            <Badge tone="neutral">{specialty.label}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                      <Link href={`/admin/incidents?villain=${villain.id}`} className="text-xs text-sky-300 hover:underline">
                        {pluralize(villain.incidentsCount, "incident lié", "incidents liés")}
                      </Link>
                      <LinkButton href={`/admin/vilains/${villain.id}`} variant="ghost" size="sm">
                        Modifier
                      </LinkButton>
                    </div>
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
