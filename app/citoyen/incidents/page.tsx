import { Plus, Siren } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { IncidentRow } from "@/components/citizen/incident-row";
import { MobilePage, MobilePageSkeleton } from "@/components/citizen/mobile-page";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { EmptyState, SectionTitle } from "@/components/ui/panel";
import { requireUser } from "@/lib/server/auth";
import { listActiveIncidents, listIncidentsReportedBy } from "@/lib/server/services/incidents";
import Link from "next/link";

export const metadata: Metadata = { title: "Mes incidents" };

export default function MyIncidentsPage({ searchParams }: PageProps<"/citoyen/incidents">) {
  return (
    <Suspense fallback={<MobilePageSkeleton title="Incidents" />}>
      <MyIncidents searchParams={searchParams} />
    </Suspense>
  );
}

async function MyIncidents({ searchParams }: Pick<PageProps<"/citoyen/incidents">, "searchParams">) {
  const user = await requireUser();
  const { vue } = await searchParams;
  const tab = vue === "en-cours" ? "active" : "mine";
  const [mine, active] = await Promise.all([listIncidentsReportedBy(user.id), listActiveIncidents()]);
  const list = tab === "mine" ? mine : active;

  return (
    <MobilePage
      title="Incidents"
      action={
        <LinkButton href="/citoyen/incidents/nouveau" size="sm" aria-label="Déclarer un incident">
          <Plus className="size-4" aria-hidden /> Déclarer
        </LinkButton>
      }
    >
      <nav aria-label="Listes d'incidents" className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-ink-900/80 p-1">
        {(
          [
            ["mine", "/citoyen/incidents", `Mes signalements (${mine.length})`],
            ["active", "/citoyen/incidents?vue=en-cours", `En cours (${active.length})`],
          ] as const
        ).map(([value, href, label]) => (
          <Link
            key={value}
            href={href}
            aria-current={tab === value ? "page" : undefined}
            className={cn("rounded-xl py-2 text-center text-sm font-semibold", tab === value ? "bg-sky-400/20 text-sky-50 ring-1 ring-sky-300/40" : "text-slate-400")}
          >
            {label}
          </Link>
        ))}
      </nav>
      {tab === "active" && (
        <p className="mb-3 text-xs text-slate-400">
          Vérifiez ici qu&apos;un incident n&apos;est pas déjà déclaré à l&apos;endroit où vous vous trouvez avant d&apos;en signaler un nouveau.
        </p>
      )}
      <SectionTitle>{tab === "mine" ? "Historique" : "Incidents en cours"}</SectionTitle>
      {list.length === 0 ? (
        <EmptyState icon={<Siren className="size-8" />} title={tab === "mine" ? "Aucun signalement" : "Aucun incident en cours"}>
          {tab === "mine" ? "Utilisez le buzzer SOS ou le formulaire pour déclarer un incident." : "Tout est calme pour le moment."}
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {list.map((incident) => (
            <li key={incident.id}>
              <IncidentRow incident={incident} />
            </li>
          ))}
        </ul>
      )}
    </MobilePage>
  );
}
