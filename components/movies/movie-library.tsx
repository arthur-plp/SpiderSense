"use client";

import { Clapperboard, ExternalLink, Film, Search, X } from "lucide-react";
import Image from "next/image";
import { useId, useMemo, useState } from "react";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/panel";
import type { LibraryMovie } from "@/lib/server/services/movies";

type Hero = LibraryMovie["heroes"][number];

// Hosts allowed in next.config `images.remotePatterns`; others are shown unoptimized.
const OPTIMIZED_POSTER_HOSTS = new Set(["m.media-amazon.com"]);

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function isOptimizable(url: string): boolean {
  try {
    return OPTIMIZED_POSTER_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

const imdbUrl = (imdbId: string) => `https://www.imdb.com/title/${encodeURIComponent(imdbId)}/`;

/**
 * Vidéothèque (1.2): approved movies with search by title and filter by hero.
 * `compact` switches to a list layout for the citizen mobile app.
 */
export function MovieLibrary({ movies, compact = false }: { movies: LibraryMovie[]; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [heroId, setHeroId] = useState("");
  const searchId = useId();
  const heroSelectId = useId();

  const heroes = useMemo(() => {
    const aliases = new Map<string, string>();
    for (const movie of movies) for (const hero of movie.heroes) aliases.set(hero.id, hero.alias);
    return [...aliases]
      .map(([id, alias]) => ({ id, alias }))
      .sort((a, b) => a.alias.localeCompare(b.alias, "fr"));
  }, [movies]);

  if (movies.length === 0) {
    return (
      <EmptyState icon={<Clapperboard size={28} aria-hidden />} title="La vidéothèque est encore vide">
        Les films des super-héros apparaîtront ici dès qu&apos;ils auront été validés par la modération.
      </EmptyState>
    );
  }

  const needle = normalize(query.trim());
  const visible = movies.filter(
    (movie) =>
      (!heroId || movie.heroes.some((hero) => hero.id === heroId)) &&
      (!needle || normalize(movie.title).includes(needle)),
  );
  const selectedHero = heroes.find((hero) => hero.id === heroId);
  const filtered = Boolean(needle || heroId);
  const toggleHero = (id: string) => setHeroId((current) => (current === id ? "" : id));
  const reset = () => {
    setQuery("");
    setHeroId("");
  };

  return (
    <div>
      <div className={cn("flex flex-col gap-3", !compact && "sm:flex-row")}>
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            Rechercher un film par son titre
          </label>
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un film…"
            autoComplete="off"
            className="field pl-10"
          />
        </div>
        <div className={cn(!compact && "sm:w-64")}>
          <label htmlFor={heroSelectId} className="sr-only">
            Filtrer par super-héros
          </label>
          <Select id={heroSelectId} value={heroId} onChange={(event) => setHeroId(event.target.value)}>
            <option value="">Tous les super-héros</option>
            {heroes.map((hero) => (
              <option key={hero.id} value={hero.id}>
                {hero.alias}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3 flex min-h-8 flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm text-slate-400">
          {visible.length} film{visible.length > 1 ? "s" : ""}
          {selectedHero && <> avec {selectedHero.alias}</>}
        </p>
        {filtered && (
          <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-sky-300 hover:bg-white/5 hover:text-sky-200">
            <X size={14} aria-hidden />
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<Film size={28} aria-hidden />} title="Aucun film ne correspond" className="mt-4">
          Essayez un autre titre ou un autre super-héros.
        </EmptyState>
      ) : compact ? (
        <ul className="mt-4 space-y-3">
          {visible.map((movie) => (
            <li key={movie.id}>
              <MovieRow movie={movie} activeHeroId={heroId} onHeroClick={toggleHero} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((movie) => (
            <li key={movie.id} className="flex">
              <MovieCard movie={movie} activeHeroId={heroId} onHeroClick={toggleHero} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type MovieItemProps = { movie: LibraryMovie; activeHeroId: string; onHeroClick: (heroId: string) => void };

function MovieCard({ movie, activeHeroId, onHeroClick }: MovieItemProps) {
  return (
    <article className="glass flex w-full flex-col overflow-hidden rounded-2xl sm:rounded-3xl">
      <MoviePoster movie={movie} sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw" className="w-full" />
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <h3 className="text-sm font-bold leading-snug text-white sm:text-base">{movie.title}</h3>
        {movie.year && <p className="mt-0.5 text-xs text-slate-400">{movie.year}</p>}
        {movie.synopsis && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-400 sm:text-sm">{movie.synopsis}</p>}
        <HeroChips heroes={movie.heroes} activeHeroId={activeHeroId} onHeroClick={onHeroClick} />
        <ImdbLink movie={movie} className="mt-auto pt-3" />
      </div>
    </article>
  );
}

function MovieRow({ movie, activeHeroId, onHeroClick }: MovieItemProps) {
  return (
    <article className="glass flex gap-3.5 rounded-2xl p-3">
      <MoviePoster movie={movie} sizes="88px" className="w-22 shrink-0 self-start rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-semibold leading-snug text-white">
          {movie.title}
          {movie.year && <span className="font-normal text-slate-400"> · {movie.year}</span>}
        </h3>
        {movie.synopsis && <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-400">{movie.synopsis}</p>}
        <HeroChips heroes={movie.heroes} activeHeroId={activeHeroId} onHeroClick={onHeroClick} />
        <ImdbLink movie={movie} className="mt-auto pt-2" />
      </div>
    </article>
  );
}

function HeroChips({ heroes, activeHeroId, onHeroClick }: { heroes: Hero[]; activeHeroId: string; onHeroClick: (heroId: string) => void }) {
  return (
    <ul aria-label="Super-héros du film" className="mt-2.5 flex flex-wrap gap-1.5">
      {heroes.map((hero) => {
        const active = hero.id === activeHeroId;
        return (
          <li key={hero.id}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onHeroClick(hero.id)}
              title={active ? "Afficher tous les films" : `Voir les films avec ${hero.alias}`}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors",
                active ? "bg-sky-400 text-ink-950 ring-sky-300" : "bg-sky-400/10 text-sky-200 ring-sky-300/25 hover:bg-sky-400/20",
              )}
            >
              {hero.alias}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ImdbLink({ movie, className }: { movie: LibraryMovie; className?: string }) {
  return (
    <a
      href={imdbUrl(movie.imdbId)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-amber-200", className)}
    >
      Voir sur IMDb
      <ExternalLink size={13} aria-hidden />
      <span className="sr-only">: {movie.title} (nouvel onglet)</span>
    </a>
  );
}

function MoviePoster({ movie, sizes, className }: { movie: LibraryMovie; sizes: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = movie.posterUrl;
  return (
    <div className={cn("relative aspect-2/3 overflow-hidden bg-ink-800", className)}>
      {url && !failed ? (
        <Image
          src={url}
          alt={`Affiche de « ${movie.title} »`}
          fill
          sizes={sizes}
          unoptimized={!isOptimizable(url)}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      ) : (
        <div aria-hidden className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[radial-gradient(120%_90%_at_20%_0%,rgb(56_189_248/0.3),transparent_60%),radial-gradient(120%_90%_at_100%_100%,rgb(245_184_46/0.18),transparent_55%)] p-3 text-center">
          <Film className="size-7 text-white/40" />
          <span className="line-clamp-3 text-[11px] font-semibold uppercase tracking-wider text-white/60">{movie.title}</span>
        </div>
      )}
    </div>
  );
}
