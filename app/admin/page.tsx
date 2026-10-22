import { Clapperboard, Inbox, MailCheck, Plus, Siren, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActivityList } from "@/components/admin/activity-list";
import { PrioritySelect } from "@/components/admin/priority-select";
import { QueueCard } from "@/components/admin/queue-card";
import { StatusBadge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { IncidentIcon } from "@/components/ui/incident-icon";
import { EmptyState, PageHeader, Panel, SectionTitle, StatTile } from "@/components/ui/panel";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatNumber } from "@/lib/format";
import { requireStaff } from "@/lib/server/auth";
import { listRecentActivity } from "@/lib/server/services/admin/activity";
import { listAdminIncidents } from "@/lib/server/services/admin/incidents";
import { getModerationCounters } from "@/lib/server/services/admin/overview";
import { getGlobalStats } from "@/lib/server/services/stats";

export const metadata: Metadata = { title: "Vue d'ensemble" };

const percent = (part: number, total: number) => (total === 0 ? "—" : `${Math.round((part / total) * 100)} %`);

export default async function AdminOverviewPage() {
  const user = await requireStaff();
  const [stats, counters, activity, toPrioritize] = await Promise.all([
    getGlobalStats(),
    getModerationCounters(),
    listRecentActivity(8),
    listAdminIncidents({
      status: "ACTIVE",
      priority: "NONE",
      typeId: null,
      villainId: null,
      includeDeleted: false,
      sort: "recent",
      page: 1,
    }),
  ]);
  const maxShare = Math.max(1, ...stats.typeShares.map((share) => share.count));

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title={`Bonjour ${user.firstName}`}
        description="Ce qui attend la modération, l'état des interventions et les dernières actions sur la plateforme."
        actions={
          <LinkButton href="/admin/incidents/nouveau" variant="danger">
            <Plus className="size-4" aria-hidden />
            Signaler un incident
          </LinkButton>
        }
      />

      <section aria-labelledby="queues-title">
        <SectionTitle>
          <span id="queues-title">À traiter</span>
        </SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <QueueCard
            href="/admin/incidents?status=ACTIVE&priority=NONE&sort=oldest"
            label="Incidents à prioriser"
            hint="Signalés sans priorité"
            count={counters.incidentsToPrioritize}
            icon={Siren}
          />
          <QueueCard href="/admin/demandes#heros" label="Demandes de héros" hint="Statut super-héros" count={counters.pendingHeroes} icon={Inbox} />
          <QueueCard href="/admin/demandes#films" label="Films proposés" hint="Vidéothèque des héros" count={counters.pendingMovies} icon={Clapperboard} />
          <QueueCard
            href="/admin/demandes#emails"
            label="Changements d'email"
            hint="En attente de validation"
            count={counters.pendingEmailChanges}
            icon={MailCheck}
          />
          <QueueCard
            href="/admin/utilisateurs?status=unverified"
            label="Citoyens à vérifier"
            hint="Sans badge « vérifié »"
            count={counters.unverifiedCitizens}
            icon={UserCheck}
          />
        </div>
      </section>

      <section aria-labelledby="kpi-title" className="mt-8">
        <SectionTitle>
          <span id="kpi-title">En chiffres</span>
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatTile label="Incidents actifs" value={formatNumber(stats.activeIncidents)} hint={`${formatNumber(stats.totalIncidents)} au total`} />
          <StatTile
            label="Interventions réussies"
            value={percent(stats.succeeded, stats.succeeded + stats.failed)}
            hint={`${formatNumber(stats.succeeded)} réussies · ${formatNumber(stats.failed)} échouées`}
          />
          <StatTile
            label="Citoyens secourus"
            value={formatNumber(stats.citizensSaved)}
            hint={`dont ${formatNumber(stats.endangeredCitizensSaved)} en danger`}
          />
          <StatTile
            label="Vilains emprisonnés"
            value={formatNumber(stats.villainsImprisoned)}
            hint={`sur ${formatNumber(stats.villainsIdentified)} identifiés`}
          />
          <StatTile
            label="Utilisateurs"
            value={formatNumber(counters.users)}
            hint={counters.disabledUsers > 0 ? `${formatNumber(counters.disabledUsers)} désactivé(s)` : "Aucun compte désactivé"}
          />
          <StatTile label="Avis" value={formatNumber(counters.reviews)} hint={`${formatNumber(counters.hiddenReviews)} masqué(s)`} />
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section aria-labelledby="prioritize-title">
          <SectionTitle
            action={
              <Link href="/admin/incidents?status=ACTIVE&priority=NONE&sort=oldest" className="text-xs font-medium text-sky-300 hover:underline">
                Tout voir
              </Link>
            }
          >
            <span id="prioritize-title">Incidents à prioriser</span>
          </SectionTitle>
          <Panel className="p-2">
            {toPrioritize.rows.length === 0 ? (
              <EmptyState title="Tout est priorisé" className="border-0">
                Chaque incident actif a reçu une priorité.
              </EmptyState>
            ) : (
              <ul className="flex flex-col">
                {toPrioritize.rows.slice(0, 6).map((incident) => (
                  <li key={incident.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-white/[0.03]">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300">
                      <IncidentIcon code={incident.typeCode} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/incidents/${incident.id}`} className="block truncate text-sm font-semibold text-slate-100 hover:text-sky-200">
                        {incident.typeLabel} · {incident.city}
                      </Link>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        <RelativeTime value={incident.createdAt} />
                        <StatusBadge status={incident.status} />
                      </p>
                    </div>
                    <PrioritySelect endpoint={{ method: "PATCH", path: `/api/incidents/${incident.id}/priority` }} priority={incident.priority} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>

        <section aria-labelledby="activity-title">
          <SectionTitle
            action={
              <Link href="/admin/activite" className="text-xs font-medium text-sky-300 hover:underline">
                Journal complet
              </Link>
            }
          >
            <span id="activity-title">Activité récente</span>
          </SectionTitle>
          <Panel className="px-4 py-1">
            {activity.length === 0 ? (
              <EmptyState title="Aucune activité" className="my-3 border-0" />
            ) : (
              <ActivityList entries={activity} compact />
            )}
          </Panel>
        </section>
      </div>

      {stats.typeShares.length > 0 && (
        <section aria-labelledby="types-title" className="mt-8">
          <SectionTitle>
            <span id="types-title">Répartition des incidents par type</span>
          </SectionTitle>
          <Panel className="p-4 sm:p-5">
            <ul className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
              {stats.typeShares.map((share) => (
                <li key={share.code}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-slate-200">
                      <IncidentIcon code={share.code} size={15} className="text-slate-400" />
                      {share.label}
                    </span>
                    <span className="tabular-nums text-slate-400">
                      {formatNumber(share.count)} · {Math.round(share.percent)} %
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-white/5" aria-hidden>
                    <div className="h-2 rounded-full bg-sky-400/80" style={{ width: `${(share.count / maxShare) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}
    </>
  );
}
