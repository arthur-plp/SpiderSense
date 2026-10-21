import { MapPin, Siren } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IncidentRow } from "@/components/citizen/incident-row";
import { MobilePage, MobilePageSkeleton } from "@/components/citizen/mobile-page";
import { Badge } from "@/components/ui/badge";
import { GlassCard, SectionTitle } from "@/components/ui/panel";
import { formatDate, fullName } from "@/lib/format";
import { VILLAIN_STATUS_LABELS } from "@/lib/labels";
import { requireUser } from "@/lib/server/auth";
import { listIncidentsOfVillain } from "@/lib/server/services/incidents";
import { getVillain } from "@/lib/server/services/villains";

export const metadata: Metadata = { title: "Fiche super-vilain" };

export default function VillainSheetPage({ params }: PageProps<"/citoyen/encyclopedie/vilains/[id]">) {
  return (
    <Suspense fallback={<MobilePageSkeleton title="Super-vilain" />}>
      <VillainSheet params={params} />
    </Suspense>
  );
}

async function VillainSheet({ params }: Pick<PageProps<"/citoyen/encyclopedie/vilains/[id]">, "params">) {
  await requireUser();
  const { id } = await params;
  const villain = await getVillain(id);
  if (!villain) notFound();
  const incidents = await listIncidentsOfVillain(villain.id, 10);
  return (
    <MobilePage title={villain.alias} back="/citoyen/encyclopedie?onglet=vilains">
      <GlassCard className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">{villain.alias}</h2>
            <p className="text-sm text-slate-400">{fullName(villain) || "Identité inconnue"}</p>
          </div>
          <Badge tone={villain.status === "IMPRISONED" ? "success" : "danger"} dot>
            {VILLAIN_STATUS_LABELS[villain.status]}
          </Badge>
        </div>
        {villain.description && <p className="mt-3 text-sm leading-relaxed text-slate-300">{villain.description}</p>}
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-slate-500">Spécialité illicite</dt>
          <dd className="flex flex-wrap gap-1.5">
            {villain.specialties.map((specialty) => (
              <span key={specialty.id} className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-100 ring-1 ring-inset ring-rose-300/25">
                {specialty.label}
              </span>
            ))}
          </dd>
          <dt className="text-slate-500">Secteur principal</dt>
          <dd className="flex items-center gap-1 text-slate-200">
            <MapPin className="size-3.5 text-slate-400" aria-hidden /> {villain.mainSector ?? "Inconnu"}
          </dd>
          <dt className="text-slate-500">Incidents liés</dt>
          <dd className="flex items-center gap-1 text-slate-200">
            <Siren className="size-3.5 text-slate-400" aria-hidden /> {villain.incidentsCount}
          </dd>
          {villain.imprisonedAt && (
            <>
              <dt className="text-slate-500">En prison depuis</dt>
              <dd className="text-slate-200">{formatDate(villain.imprisonedAt)}</dd>
            </>
          )}
        </dl>
      </GlassCard>
      {incidents.length > 0 && (
        <section className="mt-6">
          <SectionTitle>Derniers incidents</SectionTitle>
          <ul className="flex flex-col gap-2.5">
            {incidents.map((incident) => (
              <li key={incident.id}>
                <IncidentRow incident={incident} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </MobilePage>
  );
}
