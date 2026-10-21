import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

type Params = Record<string, string | string[] | undefined>;

function hrefFor(pathname: string, params: Params, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) if (item) search.append(key, item);
  }
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** Previous / next links that keep the current filters. */
export function Pagination({
  pathname,
  params,
  page,
  pageSize,
  total,
}: {
  pathname: string;
  params: Params;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
      <p>
        {formatNumber(from)}–{formatNumber(to)} sur {formatNumber(total)} · page {page}/{pages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={hrefFor(pathname, params, page - 1)} className={buttonClasses("secondary", "sm")} rel="prev">
            <ChevronLeft className="size-4" aria-hidden />
            Précédent
          </Link>
        ) : (
          <span className={buttonClasses("secondary", "sm", "pointer-events-none opacity-40")} aria-disabled>
            <ChevronLeft className="size-4" aria-hidden />
            Précédent
          </span>
        )}
        {page < pages ? (
          <Link href={hrefFor(pathname, params, page + 1)} className={buttonClasses("secondary", "sm")} rel="next">
            Suivant
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className={buttonClasses("secondary", "sm", "pointer-events-none opacity-40")} aria-disabled>
            Suivant
            <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
