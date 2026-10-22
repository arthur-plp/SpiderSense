"use client";

import { Clock, MapPin, Phone, ShieldCheck, Skull, Users, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { IncidentIcon } from "@/components/ui/incident-icon";
import { RelativeTime } from "@/components/ui/relative-time";
import { apiRequest } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { type IncidentPriority, PRIORITY_LABELS } from "@/lib/labels";
import type { IncidentDto } from "@/lib/server/services/incidents";
import { CloseInterventionForm, type InterventionReport } from "./close-intervention-form";

export type VillainOption = { id: string; alias: string; status: "AT_LARGE" | "IMPRISONED" };

type IncidentDetailProps = {
  incident: IncidentDto;
  heroId: string;
  heroBusy: boolean;
  distance: number | null;
  villains: VillainOption[];
  pending: boolean;
  finishing: boolean;
  onClose: () => void;
  onTake: () => void;
  onPriority: (priority: IncidentPriority) => void;
  onStartFinish: () => void;
  onFinish: (report: InterventionReport) => void;
};

const PRIORITIES: IncidentPriority[] = ["HIGH", "NORMAL", "LOW"];
const PRIORITY_STYLES: Record<IncidentPriority, string> = {
  HIGH: "data-[active=true]:bg-rose-500/25 data-[active=true]:text-rose-100 data-[active=true]:ring-rose-400/60",
  NORMAL: "data-[active=true]:bg-amber-400/20 data-[active=true]:text-amber-100 data-[active=true]:ring-amber-300/60",
  LOW: "data-[active=true]:bg-sky-400/20 data-[active=true]:text-sky-100 data-[active=true]:ring-sky-300/60",
};

/** Right-hand drawer: full details and every action available to the hero. */
export function IncidentDetail({
  incident,
  heroId,
  heroBusy,
  distance,
  villains,
  pending,
  finishing,
  onClose,
  onTake,
  onPriority,
  onStartFinish,
  onFinish,
}: IncidentDetailProps) {
  const mine = incident.hero?.id === heroId && incident.status === "IN_PROGRESS";
  const [contact, setContact] = useState<{ incidentId: string; firstName: string; phone: string } | null>(null);

  useEffect(() => {
    if (!mine) return;
    let cancelled = false;
    apiRequest<{ contact: { firstName: string; phone: string } }>("GET", `/api/incidents/${incident.id}/reporter-contact`).then((result) => {
      if (!cancelled && result.ok) setContact({ incidentId: incident.id, ...result.data.contact });
    });
    return () => {
      cancelled = true;
    };
  }, [incident.id, mine]);

  const reporter = mine && contact?.incidentId === incident.id ? contact : null;
  const editablePriority = incident.status === "REPORTED" || incident.status === "IN_PROGRESS";

  return (
    <aside
      aria-label={`Détail : ${incident.typeLabel}`}
      className="glass glass-strong flex h-full flex-col overflow-hidden rounded-3xl animate-slide-up"
    >
      <header className="flex items-start gap-3 border-b border-white/10 p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-200 ring-1 ring-sky-300/30">
          <IncidentIcon code={incident.typeCode} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-white">{incident.typeLabel}</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <StatusBadge status={incident.status} />
            <PriorityBadge priority={incident.priority} />
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fermer le détail">
          <X className="size-5" />
        </Button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <p className="text-sm leading-relaxed text-slate-200">{incident.description}</p>

        <dl className="grid grid-cols-1 gap-3 text-sm">
          <InfoRow icon={<MapPin className="size-4" />} label="Lieu">
            {[incident.street, incident.postalCode, incident.city].filter(Boolean).join(", ")}
            {distance !== null && <span className="text-sky-300"> · à {formatDistance(distance)}</span>}
          </InfoRow>
          <InfoRow icon={<Clock className="size-4" />} label="Signalé">
            <RelativeTime value={incident.createdAt} /> ({formatDateTime(incident.createdAt)})
          </InfoRow>
          <InfoRow icon={<Users className="size-4" />} label="Personnes impliquées">
            {incident.peopleInvolved}
          </InfoRow>
          <InfoRow icon={<Skull className="size-4" />} label="Super-vilain">
            {incident.villain ? incident.villain.alias : incident.reportedVillainName ? `${incident.reportedVillainName} (signalé)` : "Non identifié"}
          </InfoRow>
          <InfoRow icon={<ShieldCheck className="size-4" />} label="Super-héros">
            {incident.hero ? (incident.hero.id === heroId ? "Vous" : incident.hero.alias) : "Aucun pour l'instant"}
          </InfoRow>
          {reporter && (
            <InfoRow icon={<Phone className="size-4" />} label="Contact du citoyen">
              {reporter.firstName} ·{" "}
              <a className="text-sky-300 underline" href={`tel:${reporter.phone.replace(/\s/g, "")}`}>
                {reporter.phone}
              </a>
            </InfoRow>
          )}
        </dl>

        {editablePriority && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Gravité</h3>
            <div role="radiogroup" aria-label="Priorité de l'incident" className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  role="radio"
                  aria-checked={incident.priority === priority}
                  data-active={incident.priority === priority}
                  disabled={pending}
                  onClick={() => onPriority(priority)}
                  className={cn(
                    "rounded-xl bg-white/5 py-2 text-sm font-semibold text-slate-300 ring-1 ring-inset ring-white/10 transition hover:bg-white/10 disabled:opacity-60",
                    PRIORITY_STYLES[priority],
                  )}
                >
                  {PRIORITY_LABELS[priority]}
                </button>
              ))}
            </div>
          </section>
        )}

        <Timeline incident={incident} />

        {mine && finishing && (
          <CloseInterventionForm incident={incident} villains={villains} pending={pending} onSubmit={onFinish} />
        )}
      </div>

      <footer className="border-t border-white/10 p-4">
        {incident.status === "REPORTED" && (
          <Button size="lg" className="w-full" disabled={heroBusy || pending} onClick={onTake}>
            {heroBusy ? "Vous avez déjà une intervention en cours" : "Prendre en charge l'incident"}
          </Button>
        )}
        {mine && !finishing && (
          <Button size="lg" variant="brand" className="w-full" onClick={onStartFinish}>
            Terminer l&apos;intervention
          </Button>
        )}
        {incident.status === "IN_PROGRESS" && !mine && (
          <p className="text-center text-sm text-slate-400">{incident.hero?.alias} est déjà sur place.</p>
        )}
        {(incident.status === "SUCCEEDED" || incident.status === "FAILED") && (
          <p className="text-center text-sm text-slate-400">
            Intervention terminée {incident.interventionEndedAt && <RelativeTime value={incident.interventionEndedAt} />}
            {incident.villainImprisoned && " · vilain mis en prison"}
          </p>
        )}
      </footer>
    </aside>
  );
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="mt-0.5 text-sky-300/80">
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="min-w-0 text-slate-300">
        <span className="block text-[11px] uppercase tracking-wider text-slate-500" aria-hidden>
          {label}
        </span>
        {children}
      </dd>
    </div>
  );
}

function Timeline({ incident }: { incident: IncidentDto }) {
  const steps = [
    { label: "Signalé", at: incident.createdAt, done: true },
    { label: "Intervention en cours", at: incident.interventionStartedAt, done: incident.interventionStartedAt !== null },
    {
      label: incident.status === "FAILED" ? "Échoué" : "Résolu",
      at: incident.interventionEndedAt,
      done: incident.interventionEndedAt !== null,
    },
  ];
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Chronologie</h3>
      <ol className="relative space-y-3 border-l border-white/10 pl-5">
        {steps.map((step) => (
          <li key={step.label} className="relative">
            <span
              className={cn(
                "absolute -left-[25px] top-1 size-2.5 rounded-full ring-4 ring-ink-900",
                step.done ? "bg-sky-400" : "bg-slate-600",
              )}
              aria-hidden
            />
            <p className={cn("text-sm font-medium", step.done ? "text-slate-100" : "text-slate-500")}>{step.label}</p>
            {step.at && <p className="text-xs text-slate-500">{formatDateTime(step.at)}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
