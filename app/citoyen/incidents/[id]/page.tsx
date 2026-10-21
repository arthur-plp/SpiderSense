import { CircleCheck, Clock, MapPin, ShieldCheck, Skull, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { AutoRefresh } from "@/components/citizen/auto-refresh";
import { IncidentMap } from "@/components/citizen/incident-map";
import { MobilePage, MobilePageSkeleton } from "@/components/citizen/mobile-page";
import { RateForm } from "@/components/citizen/rate-form";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { IncidentIcon } from "@/components/ui/incident-icon";
import { GlassCard, Panel, SectionTitle } from "@/components/ui/panel";
import { RelativeTime } from "@/components/ui/relative-time";
import { Stars } from "@/components/ui/stars";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/server/auth";
import { getIncident } from "@/lib/server/services/incidents";
import { getReviewForIncident } from "@/lib/server/services/reviews";

export const metadata: Metadata = { title: "Incident" };

export default function IncidentPage({ params, searchParams }: PageProps<"/citoyen/incidents/[id]">) {
  return (
    <Suspense fallback={<MobilePageSkeleton title="Incident" />}>
      <IncidentDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function IncidentDetail({ params, searchParams }: Pick<PageProps<"/citoyen/incidents/[id]">, "params" | "searchParams">) {
  const user = await requireUser();
  const [{ id }, { nouveau }] = await Promise.all([params, searchParams]);
  const incident = await getIncident(id);
  if (!incident) notFound();
  const mine = incident.reporterId === user.id;
  // Removed incidents stay visible to their reporter only (with the reason).
  if (incident.deletedAt && !mine && !user.isStaff) notFound();
  const review = mine ? await getReviewForIncident(incident.id) : null;
  const active = incident.status === "REPORTED" || incident.status === "IN_PROGRESS";
  const closed = !active;

  const steps = [
    { label: "Signalé", at: incident.createdAt, done: true },
    { label: incident.hero ? `${incident.hero.alias} intervient` : "En attente d'un super-héros", at: incident.interventionStartedAt, done: incident.interventionStartedAt !== null },
    { label: incident.status === "FAILED" ? "Intervention échouée" : "Incident résolu", at: incident.interventionEndedAt, done: closed },
  ];

  return (
    <MobilePage title={incident.typeLabel} back="/citoyen/incidents">
      {active && !incident.deletedAt && <AutoRefresh />}
      {nouveau && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5 text-sm text-emerald-100">
          <CircleCheck className="size-5 shrink-0" aria-hidden /> Signalement envoyé : les super-héros sont prévenus.
        </p>
      )}
      {incident.deletedAt && (
        <p className="mb-4 rounded-2xl border border-slate-400/20 bg-white/5 px-3 py-2.5 text-sm text-slate-300">
          Ce signalement a été retiré par la modération (probablement un doublon d&apos;un incident déjà déclaré au même endroit).
        </p>
      )}

      <GlassCard className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-sky-200">
            <IncidentIcon code={incident.typeCode} size={24} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={incident.status} />
              <PriorityBadge priority={incident.priority} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">{incident.description}</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-2.5 text-sm text-slate-300">
          <Info icon={<MapPin className="size-4" />} label="Lieu">{[incident.street, incident.postalCode, incident.city].filter(Boolean).join(", ")}</Info>
          <Info icon={<Clock className="size-4" />} label="Date">
            {formatDateTime(incident.occurredAt)} (<RelativeTime value={incident.occurredAt} />)
          </Info>
          <Info icon={<Users className="size-4" />} label="Personnes impliquées">{incident.peopleInvolved}</Info>
          {(incident.villain || incident.reportedVillainName) && (
            <Info icon={<Skull className="size-4" />} label="Super-vilain">
              {incident.villain ? (
                <Link className="text-sky-300 underline" href={`/citoyen/encyclopedie/vilains/${incident.villain.id}`}>{incident.villain.alias}</Link>
              ) : (
                `${incident.reportedVillainName} (signalé)`
              )}
              {incident.villainImprisoned && " · mis en prison"}
            </Info>
          )}
        </dl>
      </GlassCard>

      {incident.latitude !== null && incident.longitude !== null && (
        <div className="mt-4">
          <IncidentMap lat={incident.latitude} lng={incident.longitude} typeCode={incident.typeCode} status={incident.status} priority={incident.priority} />
        </div>
      )}

      {!incident.deletedAt && (
        <Panel className="mt-4 p-4">
          <SectionTitle>Suivi de l&apos;intervention</SectionTitle>
          <ol className="relative space-y-4 border-l border-white/10 pl-5">
            {steps.map((step) => (
              <li key={step.label} className="relative">
                <span className={cn("absolute -left-[25px] top-1 size-2.5 rounded-full ring-4 ring-ink-900", step.done ? "bg-sky-400" : "bg-slate-600")} aria-hidden />
                <p className={cn("text-sm font-medium", step.done ? "text-white" : "text-slate-500")}>{step.label}</p>
                {step.at && <p className="text-xs text-slate-500">{formatDateTime(step.at)}</p>}
              </li>
            ))}
          </ol>
          {incident.hero && (
            <Link href={`/citoyen/encyclopedie/heros/${incident.hero.id}`} className="mt-4 flex items-center gap-2 text-sm font-semibold text-sky-300">
              <ShieldCheck className="size-4" aria-hidden /> Voir la fiche de {incident.hero.alias}
            </Link>
          )}
        </Panel>
      )}

      {mine && closed && incident.hero && !incident.deletedAt && (
        <Panel id="noter" className="mt-4 scroll-mt-24 p-4">
          <SectionTitle>Noter le super-héros</SectionTitle>
          {review ? (
            <div className="text-sm">
              <Stars value={review.rating} />
              {review.comment && <p className="mt-2 text-slate-300">« {review.comment} »</p>}
              {review.hidden && <p className="mt-1 text-xs text-amber-300">Avis masqué par la modération.</p>}
              {review.heroReply && (
                <p className="mt-3 rounded-xl border-l-2 border-sky-400/60 bg-sky-400/5 px-3 py-2 text-slate-300">
                  <span className="block text-xs font-semibold text-sky-300">Réponse de {incident.hero.alias}</span>
                  {review.heroReply}
                </p>
              )}
            </div>
          ) : (
            <RateForm incidentId={incident.id} heroAlias={incident.hero.alias} />
          )}
        </Panel>
      )}
    </MobilePage>
  );
}

function Info({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <dt className="mt-0.5 text-sky-300/80">
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
