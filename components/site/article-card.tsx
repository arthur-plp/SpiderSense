import { ArrowRight, Newspaper } from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { formatDate } from "@/lib/format";
import type { ArticleSummary } from "@/lib/server/services/articles";

/** Blog teaser; the whole card is clickable through the title link. */
export function ArticleCard({ article, className }: { article: ArticleSummary; className?: string }) {
  return (
    <article className={cn("glass group relative flex flex-col overflow-hidden rounded-3xl transition-colors hover:border-sky-300/40", className)}>
      <ArticleCover coverUrl={article.coverUrl} className="h-40" />
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs text-slate-400">
          <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
          <span aria-hidden> · </span>
          {article.readingMinutes} min de lecture
        </p>
        <h3 className="mt-2 text-lg font-bold leading-snug text-white">
          <Link href={`/blog/${article.slug}`} className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-sky-400">
            {article.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">{article.excerpt}</p>
        <span aria-hidden className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-sky-300 group-hover:text-sky-200">
          Lire l&apos;article
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}

/** Cover picture, or a decorative gradient when the article has none. */
export function ArticleCover({ coverUrl, className }: { coverUrl: string | null; className?: string }) {
  if (coverUrl) {
    return (
      // Covers are arbitrary URLs entered in the editor, outside next/image's allowed hosts.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={coverUrl} alt="" className={cn("w-full object-cover", className)} />
    );
  }
  return (
    <div
      aria-hidden
      className={cn(
        "relative grid place-items-center overflow-hidden bg-[radial-gradient(120%_120%_at_0%_0%,rgb(56_189_248/0.35),transparent_55%),radial-gradient(120%_120%_at_100%_100%,rgb(255_61_90/0.25),transparent_55%)]",
        className,
      )}
    >
      <Newspaper className="size-10 text-white/30" />
    </div>
  );
}
