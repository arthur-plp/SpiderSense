import { ArrowLeft, BadgeCheck, Ban, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/action-button";
import { ActivityList } from "@/components/admin/activity-list";
import { DescriptionList } from "@/components/admin/description-list";
import { IncidentMiniList } from "@/components/admin/incident-mini-list";
import { RoleForm } from "@/components/admin/role-form";
import { AccountBadges, RoleBadge } from "@/components/admin/user-badges";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { formatDate, formatDateTime, pluralize } from "@/lib/format";
import { CIVILITY_LABELS, REVIEW_STATUS_LABELS, REVIEW_STATUS_TONES } from "@/lib/labels";
import { requireStaff } from "@/lib/server/auth";
import { listUserActivity } from "@/lib/server/services/admin/activity";
import { assignableRoles, getUserModeration } from "@/lib/server/services/admin/users";
import { getAccount } from "@/lib/server/services/account";
import { isUuid, listIncidentsReportedBy, listInterventionsOf } from "@/lib/server/services/incidents";

export const metadata: Metadata = { title: "Profil utilisateur" };

export default async function AdminUserPage({ params }: PageProps<"/admin/utilisateurs/[id]">) {
  const actor = await requireStaff();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [account, moderation, reported, interventions, activity] = await Promise.all([
    getAccount(id),
    getUserModeration(id),
    listIncidentsReportedBy(id),
    listInterventionsOf(id),
    listUserActivity(id),
  ]);
  if (!account) notFound();

  const name = `${account.firstName} ${account.lastName}`;
  const isSelf = actor.id === account.id;
  const isStaffAccount = account.role === "MODERATOR" || account.role === "ADMIN";
  const canToggle = !isSelf && (!isStaffAccount || actor.role === "ADMIN");
  const address = [
    account.street,
    account.addressComplement,
    [account.postalCode, account.city].filter(Boolean).join(" "),
    account.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Link href="/admin/utilisateurs" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="size-4" aria-hidden />
        Tous les utilisateurs
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar src={account.avatarUrl} label={name} size={64} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{name}</h1>
            {account.hero && <p className="text-sm font-medium text-amber-200">{account.hero.alias}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <RoleBadge role={account.role} />
              <AccountBadges disabledAt={account.disabledAt} emailVerifiedAt={account.emailVerifiedAt} verifiedAt={account.verifiedAt} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {!account.verifiedAt && !account.disabledAt && !isStaffAccount && (
            <ActionButton endpoint={{ method: "POST", path: `/api/admin/users/${account.id}/verification` }} variant="primary" size="md">
              <UserCheck className="size-4" aria-hidden />
              Citoyen vérifié
            </ActionButton>
          )}
          {canToggle &&
            (account.disabledAt ? (
              <ActionButton endpoint={{ method: "PATCH", path: `/api/admin/users/${account.id}/status`, body: { disabled: false } }} variant="secondary" size="md" showSuccess>
                Réactiver le compte
              </ActionButton>
            ) : (
              <ActionButton
                endpoint={{ method: "PATCH", path: `/api/admin/users/${account.id}/status`, body: { disabled: true } }}
                variant="danger"
                size="md"
                confirm={{
                  title: `Désactiver le compte de ${name} ?`,
                  description:
                    "L'utilisateur est déconnecté de tous ses appareils et ne peut plus se connecter tant que le compte n'est pas réactivé.",
                  confirmLabel: "Désactiver",
                }}
              >
                <Ban className="size-4" aria-hidden />
                Désactiver
              </ActionButton>
            ))}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel className="p-5">
            <SectionTitle>Profil</SectionTitle>
            <DescriptionList
              items={[
                { label: "Civilité", value: CIVILITY_LABELS[account.civility] },
                { label: "Nom complet", value: name },
                ...(account.hero ? [{ label: "Nom de super-héros", value: account.hero.alias }] : []),
                { label: "Date de naissance", value: formatDate(account.birthDate) },
                {
                  label: "Email",
                  value: (
                    <>
                      <a href={`mailto:${account.email}`} className="break-all text-sky-300 hover:underline">
                        {account.email}
                      </a>
                      {account.pendingEmail && (
                        <span className="mt-1 block text-xs text-amber-200">
                          Changement demandé vers {account.pendingEmail.newEmail} —{" "}
                          <Link href="/admin/demandes#emails" className="underline">
                            examiner
                          </Link>
                        </span>
                      )}
                    </>
                  ),
                },
                {
                  label: "Téléphone",
                  value: (
                    <a href={`tel:${account.phone.replace(/[^+\d]/g, "")}`} className="hover:text-sky-200">
                      {account.phone}
                    </a>
                  ),
                },
                { label: "Adresse", value: address, className: "sm:col-span-2" },
                { label: "Inscrit le", value: formatDateTime(account.createdAt) },
                {
                  label: "Compte activé le",
                  value: account.emailVerifiedAt ? formatDateTime(account.emailVerifiedAt) : <Badge tone="warning">Pas encore activé</Badge>,
                },
                {
                  label: "Citoyen vérifié le",
                  value: account.verifiedAt ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <BadgeCheck className="size-4 text-emerald-300" aria-hidden />
                      {formatDateTime(account.verifiedAt)}
                      {moderation.verifiedByName && <span className="text-xs text-slate-500">par {moderation.verifiedByName}</span>}
                    </span>
                  ) : null,
                },
                ...(account.disabledAt
                  ? [
                      {
                        label: "Désactivé le",
                        value: `${formatDateTime(account.disabledAt)}${moderation.disabledByName ? ` par ${moderation.disabledByName}` : ""}`,
                      },
                    ]
                  : []),
                {
                  label: "Newsletter",
                  value: account.newsletter ? (account.newsletter.isEnabled ? "Abonné" : "Abonnement suspendu") : "Non abonné",
                },
                { label: "Sessions actives", value: pluralize(moderation.activeSessions, "appareil") },
              ]}
            />
          </Panel>

          {account.hero && (
            <Panel className="p-5">
              <SectionTitle
                action={
                  account.hero.status === "PENDING" ? (
                    <Link href="/admin/demandes#heros" className="text-xs font-medium text-sky-300 hover:underline">
                      Examiner la demande
                    </Link>
                  ) : undefined
                }
              >
                Profil de super-héros
              </SectionTitle>
              <DescriptionList
                items={[
                  { label: "Nom de héros", value: account.hero.alias },
                  {
                    label: "Statut",
                    value: <Badge tone={REVIEW_STATUS_TONES[account.hero.status]}>{REVIEW_STATUS_LABELS[account.hero.status]}</Badge>,
                  },
                  { label: "Pouvoirs", value: account.hero.powers.join(", "), className: "sm:col-span-2" },
                  { label: "Biographie", value: account.hero.bio, className: "sm:col-span-2" },
                  { label: "Disponibilité", value: account.hero.onDuty ? "En service" : "Hors service" },
                  { label: "Validé le", value: account.hero.reviewedAt && formatDateTime(account.hero.reviewedAt) },
                ]}
              />
            </Panel>
          )}

          <Panel className="p-5">
            <SectionTitle>Incidents signalés ({reported.length})</SectionTitle>
            {reported.length > 0 ? (
              <IncidentMiniList incidents={reported} showHero />
            ) : (
              <p className="text-sm text-slate-500">Aucun incident signalé.</p>
            )}
          </Panel>

          {(interventions.length > 0 || account.role === "HERO") && (
            <Panel className="p-5">
              <SectionTitle>Interventions ({interventions.length})</SectionTitle>
              {interventions.length > 0 ? (
                <IncidentMiniList incidents={interventions} />
              ) : (
                <p className="text-sm text-slate-500">Aucune intervention pour le moment.</p>
              )}
            </Panel>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          {actor.role === "ADMIN" && (
            <Panel className="p-5">
              <SectionTitle>Rôle et droits</SectionTitle>
              {isSelf ? (
                <p className="text-sm text-slate-400">Vous ne pouvez pas modifier votre propre rôle.</p>
              ) : (
                <RoleForm
                  endpoint={{ method: "PUT", path: `/api/admin/users/${account.id}/role` }}
                  role={account.role}
                  roles={assignableRoles(account.hero?.status ?? null)}
                  userName={name}
                />
              )}
            </Panel>
          )}

          <Panel className="px-5 pb-2 pt-5">
            <SectionTitle
              action={
                <Link href="/admin/activite" className="text-xs font-medium text-sky-300 hover:underline">
                  Journal
                </Link>
              }
            >
              Activité récente
            </SectionTitle>
            {activity.length > 0 ? (
              <ActivityList entries={activity} compact />
            ) : (
              <p className="pb-3 text-sm text-slate-500">Aucune activité enregistrée.</p>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}
