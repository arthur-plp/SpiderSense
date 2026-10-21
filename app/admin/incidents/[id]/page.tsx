import { ArrowLeft, Copy, Mail, Phone, Skull, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/action-button";
import { ActivityList } from "@/components/admin/activity-list";
import { DeleteIncidentForm } from "@/components/admin/delete-incident-form";
import { DescriptionList } from "@/components/admin/description-list";
import { IncidentEditForm } from "@/components/admin/incident-form";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { IncidentIcon } from "@/components/ui/incident-icon";
import { PageHeader, Panel, SectionTitle } from "@/components/ui/panel";
import { RelativeTime } from "@/components/ui/relative-time";
import { Stars } from "@/components/ui/stars";
import {
  createVillainFromIncidentAction,
  deleteIncidentAction,
  updateIncidentAction,
} from "@/lib/actions/admin/incidents";
import { formatDateTime } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { requireStaff } from "@/lib/server/auth";
import { getIncidentAdminDetail } from "@/lib/server/services/admin/incidents";
import { listIncidentTypes } from "@/lib/server/services/incidents";
import { listVillainOptions } from "@/lib/server/services/villains";

export const metadata: Metadata = { title: "Incident" };

export default async function AdminIncidentPage({ params }: PageProps<"/admin/incidents/[id]">) {
  await requireStaff();
  const { id } = await params;
  const [detail, types, villains] = await Promise.all([getIncidentAdminDetail(id), listIncidentTypes(), listVillainOptions()]);
  if (!detail) notFound();
  const { incident, reporter, timeline, review, deletedBy, duplicates } = detail;
  const deleted = incident.deletedAt !== null;
  const deletion = timeline.findLast((entry) => entry.action === "incident.delete");
  const deletionReason = typeof deletion?.metadata?.reason === "string" ? deletion.metadata.reason : null;
  const address = [incident.street, [incident.postalCode, incident.city].filter(Boolean).join(" "), incident.country]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Link href="/admin/incidents" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="size-4" aria-hidden />
        Tous les incidents
      </Link>
      <PageHeader
        eyebrow={`Signalé le ${formatDateTime(incident.createdAt)}`}
        title={`${incident.typeLabel} · ${incident.city}`}
        description={
          <span className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={incident.status} />
            <PriorityBadge priority={incident.priority} />
            {deleted && <Badge tone="danger">Supprimé</Badge>}
            {incident.endangersCitizens && <Badge tone="warning">Citoyens en danger</Badge>}
          </span>
        }
      />

      {deleted && (
        <div role="status" className="mb-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p className="font-semibold">
            Incident supprimé {incident.deletedAt && `le ${formatDateTime(incident.deletedAt)}`}
            {deletedBy && ` par ${deletedBy.firstName} ${deletedBy.lastName}`}.
          </p>
          {deletionReason && <p className="mt-1 text-rose-200/80">Motif : {deletionReason}</p>}
        </div>
      )}

      {duplicates.length > 0 && (
        <section aria-labelledby="duplicates-title" className="mb-6 rounded-2xl border border-amber-300/30 bg-amber-400/8 p-4">
          <h2 id="duplicates-title" className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <Copy className="size-4" aria-hidden />
            Doublon possible : {duplicates.length > 1 ? `${duplicates.length} incidents similaires` : "un incident similaire"}
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {duplicates.map(({ incident: other, distance }) => (
              <li key={other.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <Link href={`/admin/incidents/${other.id}`} className="font-medium text-sky-300 hover:underline">
                  {other.typeLabel} · {other.street ?? other.city}
                </Link>
                <span className="text-xs text-amber-100/70">
                  à {formatDistance(distance)} · survenu le {formatDateTime(other.occurredAt)}
                </span>
                <StatusBadge status={other.status} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-100/70">
            S&apos;il s&apos;agit de la même situation, supprimez le signalement le plus récent avec le motif « Doublon ».
          </p>
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel className="p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-200">
                <IncidentIcon code={incident.typeCode} size={22} />
              </span>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{incident.description}</p>
            </div>
            <DescriptionList
              items={[
                { label: "Survenu le", value: formatDateTime(incident.occurredAt) },
                { label: "Signalé", value: <RelativeTime value={incident.createdAt} /> },
                { label: "Adresse", value: address },
                {
                  label: "Coordonnées",
                  value:
                    incident.latitude !== null && incident.longitude !== null
                      ? `${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}`
                      : null,
                },
                { label: "Personnes impliquées", value: String(incident.peopleInvolved) },
                { label: "Vilain signalé par le témoin", value: incident.reportedVillainName },
                {
                  label: "Vilain identifié",
                  value: incident.villain ? (
                    <Link href={`/admin/vilains/${incident.villain.id}`} className="text-sky-300 hover:underline">
                      {incident.villain.alias}
                      {incident.villain.imprisoned ? " (emprisonné)" : ""}
                    </Link>
                  ) : null,
                },
              ]}
            />
            {!deleted && !incident.villain && incident.reportedVillainName && (
              <div className="mt-5 flex flex-col gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-sm text-slate-300">
                  <Skull className="size-4 text-slate-500" aria-hidden />
                  « {incident.reportedVillainName} » n&apos;est lié à aucune fiche de l&apos;encyclopédie.
                </p>
                <ActionButton action={createVillainFromIncidentAction.bind(null, incident.id)} showSuccess>
                  Créer le vilain depuis le nom signalé
                </ActionButton>
              </div>
            )}
          </Panel>

          {!deleted && (
            <Panel className="p-5">
              <SectionTitle>Modifier le signalement</SectionTitle>
              <IncidentEditForm
                action={updateIncidentAction.bind(null, incident.id)}
                types={types.map((type) => ({ id: type.id, label: type.label }))}
                villains={villains}
                incident={{
                  typeId: incident.typeId,
                  description: incident.description,
                  peopleInvolved: incident.peopleInvolved,
                  reportedVillainName: incident.reportedVillainName,
                  priority: incident.priority,
                  villainId: incident.villain?.id ?? null,
                  villainImprisoned: incident.villainImprisoned,
                  street: incident.street,
                  postalCode: incident.postalCode,
                  city: incident.city,
                  country: incident.country,
                  latitude: incident.latitude,
                  longitude: incident.longitude,
                }}
              />
            </Panel>
          )}

          {!deleted && (
            <Panel className="border-rose-400/20 p-5">
              <SectionTitle>Supprimer</SectionTitle>
              <p className="mb-4 flex items-start gap-2 text-sm text-slate-400">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden />
                Pour les doublons et les signalements abusifs. L&apos;incident reste visible dans l&apos;historique du déclarant.
              </p>
              <DeleteIncidentForm
                action={deleteIncidentAction.bind(null, incident.id)}
                inProgress={incident.status === "IN_PROGRESS"}
                defaultReason={duplicates.length > 0 ? "DUPLICATE" : "FALSE_REPORT"}
              />
            </Panel>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <Panel className="p-5">
            <SectionTitle>Déclarant</SectionTitle>
            {reporter ? (
              <div className="flex flex-col gap-2 text-sm">
                <Link href={`/admin/utilisateurs/${reporter.id}`} className="font-semibold text-slate-100 hover:text-sky-200">
                  {reporter.firstName} {reporter.lastName}
                </Link>
                <a href={`mailto:${reporter.email}`} className="flex items-center gap-2 break-all text-slate-300 hover:text-sky-200">
                  <Mail className="size-4 shrink-0 text-slate-500" aria-hidden />
                  {reporter.email}
                </a>
                <a href={`tel:${reporter.phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-2 text-slate-300 hover:text-sky-200">
                  <Phone className="size-4 shrink-0 text-slate-500" aria-hidden />
                  {reporter.phone}
                </a>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Le compte du déclarant a été supprimé.</p>
            )}
          </Panel>

          <Panel className="p-5">
            <SectionTitle>Intervention</SectionTitle>
            {incident.hero ? (
              <DescriptionList
                className="sm:grid-cols-1"
                items={[
                  {
                    label: "Super-héros",
                    value: (
                      <Link href={`/admin/utilisateurs/${incident.hero.id}`} className="font-semibold text-sky-300 hover:underline">
                        {incident.hero.alias}
                      </Link>
                    ),
                  },
                  { label: "Prise en charge", value: incident.interventionStartedAt && formatDateTime(incident.interventionStartedAt) },
                  { label: "Fin d'intervention", value: incident.interventionEndedAt && formatDateTime(incident.interventionEndedAt) },
                  ...(incident.status === "SUCCEEDED"
                    ? [{ label: "Vilain emprisonné", value: incident.villainImprisoned ? "Oui" : "Non" }]
                    : []),
                ]}
              />
            ) : (
              <p className="text-sm text-slate-500">Aucun super-héros n&apos;a encore pris en charge cet incident.</p>
            )}
          </Panel>

          {review && (
            <Panel className="p-5">
              <SectionTitle
                action={
                  <Link href="/admin/avis" className="text-xs font-medium text-sky-300 hover:underline">
                    Modérer
                  </Link>
                }
              >
                Avis du citoyen
              </SectionTitle>
              <div className="flex items-center gap-2">
                <Stars value={review.rating} />
                {review.hidden && <Badge tone="danger">Masqué</Badge>}
              </div>
              {review.comment && <p className="mt-2 text-sm text-slate-300">« {review.comment} »</p>}
            </Panel>
          )}

          <Panel className="px-5 pb-2 pt-5">
            <SectionTitle>Historique</SectionTitle>
            <p className="border-b border-white/5 pb-2.5 text-xs text-slate-400">
              Incident survenu le <span className="text-slate-200">{formatDateTime(incident.occurredAt)}</span>
            </p>
            {timeline.length > 0 ? (
              <ActivityList entries={timeline} compact />
            ) : (
              <p className="py-3 text-sm text-slate-500">Aucune action enregistrée.</p>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
