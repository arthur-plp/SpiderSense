/** Loading state of every admin page: header, a few tiles and a list. */
export function AdminPageSkeleton() {
  return (
    <div role="status" aria-live="polite" className="animate-fade-in">
      <span className="sr-only">Chargement…</span>
      <div className="mb-6 flex flex-col gap-2" aria-hidden>
        <span className="h-3 w-24 animate-pulse rounded bg-sky-300/15" />
        <span className="h-8 w-64 max-w-full animate-pulse rounded-lg bg-white/10" />
        <span className="h-4 w-96 max-w-full animate-pulse rounded bg-white/5" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
        {[0, 1, 2, 3].map((tile) => (
          <div key={tile} className="panel h-24 animate-pulse rounded-2xl" />
        ))}
      </div>
      <div className="panel mt-6 flex flex-col gap-3 rounded-2xl p-4" aria-hidden>
        {[0, 1, 2, 3, 4].map((row) => (
          <span key={row} className="h-10 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}
