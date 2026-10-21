import "server-only";

export type ImdbTitle = {
  imdbId: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  cast: string | null;
  kind: string;
};

type SuggestionResponse = {
  d?: {
    id: string;
    l: string;
    y?: number;
    s?: string;
    qid?: string;
    q?: string;
    i?: { imageUrl?: string };
  }[];
};

const MOVIE_KINDS = new Set(["movie", "tvMovie", "tvSeries", "tvMiniSeries", "short", "video"]);

/**
 * Searches IMDb through its public suggestion endpoint (the one behind
 * imdb.com's search box): no API key, returns titles, years, posters and cast.
 */
export async function searchImdb(query: string): Promise<ImdbTitle[]> {
  const term = query.trim().toLowerCase();
  if (term.length < 2) return [];
  const slug = encodeURIComponent(term);
  const response = await fetch(`https://v3.sg.media-imdb.com/suggestion/x/${slug}.json`, {
    signal: AbortSignal.timeout(5000),
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`IMDb a répondu ${response.status}`);
  const body = (await response.json()) as SuggestionResponse;
  return (body.d ?? [])
    .filter((item) => item.id.startsWith("tt") && (!item.qid || MOVIE_KINDS.has(item.qid)))
    .map((item) => ({
      imdbId: item.id,
      title: item.l,
      year: item.y ?? null,
      posterUrl: item.i?.imageUrl ?? null,
      cast: item.s ?? null,
      kind: item.q ?? "film",
    }));
}

/** Resolves a single title (used to trust only server-fetched data). */
export async function getImdbTitle(imdbId: string): Promise<ImdbTitle | null> {
  if (!/^tt\d{5,10}$/.test(imdbId)) return null;
  const results = await searchImdb(imdbId);
  return results.find((title) => title.imdbId === imdbId) ?? null;
}
