import { ArrowLeft, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/action-button";
import { MarvelEncyclopediaLink } from "@/components/admin/marvel-link";
import { VillainForm } from "@/components/admin/villain-form";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { PageHeader, Panel, SectionTitle } from "@/components/ui/panel";
import { formatDate, pluralize } from "@/lib/format";
import { VILLAIN_STATUS_LABELS } from "@/lib/labels";
import { requireStaff } from "@/lib/server/auth";
import { listIncidentTypes } from "@/lib/server/services/incidents";
import { getVillain } from "@/lib/server/services/villains";

export const metadata: Metadata = { title: "Fiche vilain" };

export default async function AdminVillainPage({ params }: PageProps<"/admin/vilains/[id]">) {
  await requireStaff();
  const { id } = await params;
  const [villain, types] = await Promise.all([getVillain(id), listIncidentTypes()]);
  if (!villain) notFound();

  return (
    <>
      <Link href="/admin/vilains" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="size-4" aria-hidden />
        Répertoire des vilains
      </Link>
      <PageHeader
        eyebrow={`Fiche créée le ${formatDate(villain.createdAt)}`}
        title={villain.alias}
        description={
          <span className="mt-1 inline-flex flex-wrap items-center gap-2">
            <Badge tone={villain.status === "IMPRISONED" ? "success" : "danger"} dot>
              {VILLAIN_STATUS_LABELS[villain.status]}
            </Badge>
            <Link href={`/admin/incidents?villain=${villain.id}`} className="text-sky-300 hover:underline">
              {pluralize(villain.incidentsCount, "incident lié", "incidents liés")}
            </Link>
          </span>
        }
        actions={<MarvelEncyclopediaLink query={villain.alias} />}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel className="p-5 sm:p-6">
          <VillainForm
            endpoint={{ method: "PUT", path: `/api/admin/villains/${villain.id}` }}
            types={types.map((type) => ({ id: type.id, label: type.label }))}
            villain={{ ...villain, specialtyIds: villain.specialties.map((specialty) => specialty.id) }}
            submitLabel="Enregistrer la fiche"
          />
        </Panel>
        <aside className="flex flex-col gap-6">
          {villain.imageUrl && (
            <Panel className="overflow-hidden">
              {/* Image URLs are typed by moderators and can point to any host. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={villain.imageUrl} alt={`Portrait de ${villain.alias}`} className="aspect-square w-full object-cover" />
            </Panel>
          )}
          <Panel className="p-5">
            <SectionTitle>Incidents</SectionTitle>
            <p className="mb-3 text-sm text-slate-400">
              {villain.incidentsCount > 0
                ? `${pluralize(villain.incidentsCount, "incident est lié", "incidents sont liés")} à ce vilain.`
                : "Aucun incident n'est encore lié à ce vilain."}
            </p>
            <LinkButton href={`/admin/incidents?villain=${villain.id}`} variant="secondary" size="sm">
              Voir les incidents
            </LinkButton>
          </Panel>
          <Panel className="border-rose-400/20 p-5">
            <SectionTitle>Supprimer</SectionTitle>
            <p className="mb-3 text-sm text-slate-400">
              La fiche disparaît de l&apos;encyclopédie. Les incidents liés sont conservés, sans vilain identifié.
            </p>
            <ActionButton
              endpoint={{ method: "DELETE", path: `/api/admin/villains/${villain.id}`, redirectTo: "/admin/vilains" }}
              variant="danger"
              confirm={{
                title: `Supprimer ${villain.alias} ?`,
                description:
                  villain.incidentsCount > 0
                    ? `${pluralize(villain.incidentsCount, "incident perdra", "incidents perdront")} son lien avec ce vilain. Cette action est définitive.`
                    : "Cette action est définitive.",
                confirmLabel: "Supprimer la fiche",
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Supprimer la fiche
            </ActionButton>
          </Panel>
        </aside>
      </div>
    </>
  );
}
