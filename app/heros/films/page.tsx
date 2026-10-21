import { Film, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { HeroPage } from "@/components/hero/hero-page";
import { MovieSearch } from "@/components/hero/movie-search";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Panel, SectionTitle } from "@/components/ui/panel";
import { SubmitButton } from "@/components/ui/submit-button";
import { removeMovieAction } from "@/lib/actions/account";
import { REVIEW_STATUS_LABELS, REVIEW_STATUS_TONES } from "@/lib/labels";
import { requireHero } from "@/lib/server/auth";
import { listHeroMovies } from "@/lib/server/services/movies";

export const metadata: Metadata = { title: "Mes films" };

export default async function HeroMoviesPage() {
  const hero = await requireHero();
  const movies = await listHeroMovies(hero.id);
  return (
    <HeroPage>
      <PageHeader
        eyebrow="Espace professionnel"
        title="Mes films"
        description="Référencez les films dans lesquels vous apparaissez. Chaque ajout est vérifié par un modérateur avant d'apparaître dans la vidéothèque."
      />
      <Panel className="mb-6 p-5">
        <SectionTitle>Ajouter un film</SectionTitle>
        <MovieSearch knownIds={movies.filter((movie) => movie.status !== "REJECTED").map((movie) => movie.imdbId)} />
      </Panel>

      <SectionTitle>Ma vidéothèque ({movies.length})</SectionTitle>
      {movies.length === 0 ? (
        <EmptyState icon={<Film className="size-8" />} title="Aucun film pour l'instant">Recherchez un titre ci-dessus pour l&apos;ajouter.</EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {movies.map((movie) => (
            <li key={movie.movieId} className="panel group flex flex-col overflow-hidden rounded-2xl">
              <div className="relative aspect-[2/3] bg-ink-700">
                {movie.posterUrl ? (
                  <Image src={movie.posterUrl} alt={`Affiche de ${movie.title}`} fill sizes="(min-width: 1024px) 20vw, 45vw" className="object-cover" />
                ) : (
                  <Film className="absolute inset-0 m-auto size-8 text-slate-500" aria-hidden />
                )}
                {/* Opaque backing keeps the badge readable on bright posters. */}
                <span className="absolute left-2 top-2 rounded-full bg-ink-950/90">
                  <Badge tone={REVIEW_STATUS_TONES[movie.status]}>{REVIEW_STATUS_LABELS[movie.status]}</Badge>
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="text-sm font-semibold leading-snug text-white">{movie.title}</p>
                <p className="text-xs text-slate-500">{movie.year}</p>
                <form action={removeMovieAction.bind(null, movie.movieId)} className="mt-auto">
                  <SubmitButton variant="ghost" size="sm" className="-ml-2 text-slate-400 hover:text-rose-300" aria-label={`Retirer ${movie.title}`}>
                    <Trash2 className="size-3.5" aria-hidden />
                    Retirer
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </HeroPage>
  );
}
