"use client";

import { Film, LoaderCircle, Plus, Search } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";

type ImdbTitle = { imdbId: string; title: string; year: number | null; posterUrl: string | null; cast: string | null; kind: string };

/** Live IMDb search; adding a movie sends it to moderation (5.8.4). */
export function MovieSearch({ knownIds }: { knownIds: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ImdbTitle[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/api/imdb/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        const body = (await response.json()) as { results: ImdbTitle[] };
        setResults(body.results);
        setStatus(response.ok ? "idle" : "error");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("error");
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const add = (title: ImdbTitle) =>
    startTransition(async () => {
      const result = await apiRequest("POST", "/api/me/movies", { imdbId: title.imdbId });
      setFeedback((all) => ({ ...all, [title.imdbId]: result.ok ? "Envoyé en modération" : result.error }));
      if (result.ok) router.refresh();
    });

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Rechercher un film sur IMDb</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un film sur IMDb (titre ou identifiant tt…)" className="field h-11 pl-10" />
        {status === "loading" && <LoaderCircle className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-400" aria-hidden />}
      </label>
      {status === "error" && <p className="mt-2 text-sm text-rose-300">IMDb est injoignable pour le moment, réessayez plus tard.</p>}
      {query.trim().length >= 2 && results.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2" aria-live="polite">
          {results.map((title) => {
            const known = knownIds.includes(title.imdbId);
            return (
              <li key={title.imdbId} className="panel flex items-center gap-3 rounded-xl p-2.5">
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-ink-700">
                  {title.posterUrl ? (
                    <Image src={title.posterUrl} alt="" fill sizes="44px" className="object-cover" />
                  ) : (
                    <Film className="absolute inset-0 m-auto size-5 text-slate-500" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{title.title}</p>
                  <p className="truncate text-xs text-slate-400">
                    {title.year ?? "—"} · {title.kind}
                    {title.cast && ` · ${title.cast}`}
                  </p>
                  {feedback[title.imdbId] && <p className="text-xs text-sky-300">{feedback[title.imdbId]}</p>}
                </div>
                <Button size="sm" variant="secondary" disabled={pending || known || Boolean(feedback[title.imdbId])} onClick={() => add(title)} aria-label={`Ajouter ${title.title}`}>
                  <Plus className="size-4" aria-hidden />
                  {known ? "Déjà ajouté" : "Ajouter"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
