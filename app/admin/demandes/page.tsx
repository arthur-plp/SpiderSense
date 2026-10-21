import { ArrowRight, BadgeCheck, Clapperboard, ExternalLink, Inbox, MailCheck, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import { RelativeTime } from "@/components/ui/relative-time";
import { decideEmailChangeAction, decideHeroApplicationAction, decideMovieAction } from "@/lib/actions/admin/requests";
import { formatNumber } from "@/lib/format";
import { requireStaff } from "@/lib/server/auth";
import { listPendingEmailChanges, listPendingHeroApplications, listPendingMovies } from "@/lib/server/services/admin/requests";

export const metadata: Metadata = { title: "Demandes" };

function RequestSection({
  id,
  title,
  description,
  count,
  icon,
  children,
}: {
  id: string;
  title: string;
  description: string;
  count: number;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sky-300/80">{icon}</span>
        <h2 id={`${id}-title`} className="text-lg font-semibold text-white">
          {title}
        </h2>
        <Badge tone={count > 0 ? "warning" : "neutral"}>{formatNumber(count)}</Badge>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-slate-400">{description}</p>
      {children}
    </section>
  );
}

export default async function AdminRequestsPage() {
  await requireStaff();
  const [heroes, emails, movies] = await Promise.all([
    listPendingHeroApplications(),
    listPendingEmailChanges(),
    listPendingMovies(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Modération"
        title="Demandes"
        description="Les demandes des utilisateurs qui attendent une décision. Chaque décision est notifiée par email."
        actions={
          <nav aria-label="Sections" className="flex flex-wrap gap-2">
            {[
              { href: "#heros", label: "Héros", count: heroes.length },
              { href: "#emails", label: "Emails", count: emails.length },
              { href: "#films", label: "Films", count: movies.length },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                {link.label}
                <span className="tabular-nums text-slate-400">{link.count}</span>
              </a>
            ))}
          </nav>
        }
      />

      <div className="flex flex-col gap-10">
        <RequestSection
          id="heros"
          title="Statut de super-héros"
          description="Un citoyen demande à être reconnu comme super-héros. Une fois validé, il accède à l'espace professionnel et peut intervenir sur les incidents."
          count={heroes.length}
          icon={<Shield className="size-5" aria-hidden />}
        >
          {heroes.length === 0 ? (
            <EmptyState icon={<Inbox className="size-7" />} title="Aucune demande de statut héros" />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {heroes.map((application) => {
                const name = `${application.firstName} ${application.lastName}`;
                return (
                  <Panel key={application.userId} className="flex flex-col gap-4 p-5">
                    <div className="flex items-start gap-3">
                      <Avatar src={application.avatarUrl} label={application.alias} size={48} />
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold text-white">{application.alias}</p>
                        <p className="flex flex-wrap items-center gap-1.5 text-sm text-slate-300">
                          <Link href={`/admin/utilisateurs/${application.userId}`} className="hover:text-sky-200">
                            {name}
                          </Link>
                          {application.verified && (
                            <Badge tone="success">
                              <BadgeCheck className="size-3" aria-hidden />
                              Citoyen vérifié
                            </Badge>
                          )}
                        </p>
                        <p className="break-all text-xs text-slate-500">
                          {application.email} · {application.phone} · {application.city}
                        </p>
                      </div>
                      <RelativeTime value={application.requestedAt} className="shrink-0 text-xs text-slate-500" />
                    </div>
                    {application.powers.length > 0 && (
                      <ul className="flex flex-wrap gap-1.5" aria-label="Pouvoirs">
                        {application.powers.map((power) => (
                          <li key={power}>
                            <Badge tone="info">{power}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                    {application.bio && <p className="text-sm text-slate-300">{application.bio}</p>}
                    <div className="mt-auto flex flex-wrap items-start gap-2 border-t border-white/5 pt-4">
                      <ActionButton action={decideHeroApplicationAction.bind(null, application.userId, true)} variant="primary" size="md">
                        Valider le statut
                      </ActionButton>
                      <ActionButton
                        action={decideHeroApplicationAction.bind(null, application.userId, false)}
                        variant="secondary"
                        size="md"
                        confirm={{
                          title: `Refuser la demande de ${application.alias} ?`,
                          description: "L'utilisateur est prévenu par email et pourra compléter son profil puis refaire une demande.",
                          confirmLabel: "Refuser",
                        }}
                      >
                        Refuser
                      </ActionButton>
                      <Link
                        href={`/admin/utilisateurs/${application.userId}`}
                        className="ml-auto inline-flex h-10 items-center gap-1 text-sm text-sky-300 hover:underline"
                      >
                        Profil complet
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </div>
                  </Panel>
                );
              })}
            </div>
          )}
        </RequestSection>

        <RequestSection
          id="emails"
          title="Changements d'adresse email"
          description="L'adresse email sert d'identifiant : elle ne change qu'après validation. La décision est envoyée à la nouvelle adresse si elle est acceptée, à l'ancienne sinon."
          count={emails.length}
          icon={<MailCheck className="size-5" aria-hidden />}
        >
          {emails.length === 0 ? (
            <EmptyState icon={<Inbox className="size-7" />} title="Aucun changement d'email en attente" />
          ) : (
            <Panel className="divide-y divide-white/5">
              {emails.map((request) => {
                const name = `${request.firstName} ${request.lastName}`;
                return (
                  <div key={request.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar src={request.avatarUrl} label={name} size={36} />
                      <div className="min-w-0">
                        <Link href={`/admin/utilisateurs/${request.userId}`} className="font-semibold text-slate-100 hover:text-sky-200">
                          {name}
                        </Link>
                        <p className="flex flex-wrap items-center gap-x-2 text-sm">
                          <span className="break-all text-slate-500 line-through decoration-slate-600">{request.currentEmail}</span>
                          <ArrowRight className="size-3.5 text-slate-500" aria-label="devient" />
                          <span className="break-all font-medium text-sky-200">{request.newEmail}</span>
                        </p>
                        <RelativeTime value={request.requestedAt} className="text-xs text-slate-500" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      <ActionButton action={decideEmailChangeAction.bind(null, request.id, true)} variant="primary">
                        Valider
                      </ActionButton>
                      <ActionButton
                        action={decideEmailChangeAction.bind(null, request.id, false)}
                        confirm={{
                          title: "Refuser ce changement d'email ?",
                          description: `${name} conserve l'adresse ${request.currentEmail}.`,
                          confirmLabel: "Refuser",
                        }}
                      >
                        Refuser
                      </ActionButton>
                    </div>
                  </div>
                );
              })}
            </Panel>
          )}
        </RequestSection>

        <RequestSection
          id="films"
          title="Films proposés"
          description="Les super-héros proposent les films dans lesquels ils apparaissent. Une fois validés, ils rejoignent la vidéothèque publique."
          count={movies.length}
          icon={<Clapperboard className="size-5" aria-hidden />}
        >
          {movies.length === 0 ? (
            <EmptyState icon={<Inbox className="size-7" />} title="Aucun film en attente" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {movies.map((movie) => (
                <Panel key={`${movie.heroId}-${movie.movieId}`} className="flex gap-4 p-4">
                  <div className="h-36 w-24 shrink-0 overflow-hidden rounded-lg bg-white/5">
                    {movie.posterUrl ? (
                      // Posters come from IMDb's CDN, whose hosts vary: a plain img avoids an allow-list.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={movie.posterUrl} alt={`Affiche de ${movie.title}`} loading="lazy" className="size-full object-cover" />
                    ) : (
                      <span className="flex size-full items-center justify-center text-slate-600">
                        <Clapperboard className="size-6" aria-hidden />
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="font-semibold text-white">
                      {movie.title} {movie.year && <span className="font-normal text-slate-400">({movie.year})</span>}
                    </p>
                    <p className="text-sm text-amber-200">
                      <Link href={`/admin/utilisateurs/${movie.heroId}`} className="hover:underline">
                        {movie.heroAlias}
                      </Link>
                    </p>
                    {movie.synopsis && <p className="line-clamp-2 text-xs text-slate-400">{movie.synopsis}</p>}
                    <a
                      href={`https://www.imdb.com/title/${movie.imdbId}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-sky-300 hover:underline"
                    >
                      Fiche IMDb
                      <ExternalLink className="size-3" aria-hidden />
                      <span className="sr-only">(nouvel onglet)</span>
                    </a>
                    <div className="mt-auto flex flex-wrap items-start gap-2 pt-2">
                      <ActionButton action={decideMovieAction.bind(null, movie.heroId, movie.movieId, true)} variant="primary">
                        Valider
                      </ActionButton>
                      <ActionButton action={decideMovieAction.bind(null, movie.heroId, movie.movieId, false)}>Refuser</ActionButton>
                    </div>
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </RequestSection>
      </div>
    </>
  );
}
