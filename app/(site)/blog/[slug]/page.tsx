import { ArrowLeft, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArticleCard, ArticleCover } from "@/components/site/article-card";
import { Container } from "@/components/site/container";
import { Loading, Skeleton } from "@/components/site/skeleton";
import { formatDate } from "@/lib/format";
import { getPublishedArticle, listPublishedArticles } from "@/lib/server/services/articles";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const article = await getPublishedArticle((await params).slug);
  if (!article) return { title: "Article introuvable" };
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: { type: "article", title: article.title, description: article.excerpt, publishedTime: article.publishedAt },
  };
}

export default function ArticlePage({ params }: PageProps<"/blog/[slug]">) {
  return (
    <Container className="py-10 sm:py-14">
      <Link href="/blog" className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white">
        <ArrowLeft size={16} aria-hidden />
        Tous les articles
      </Link>
      <Suspense fallback={<ArticleSkeleton />}>
        <ArticleContent params={params} />
      </Suspense>
    </Container>
  );
}

async function ArticleContent({ params }: Pick<PageProps<"/blog/[slug]">, "params">) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);
  if (!article) notFound();
  const others = (await listPublishedArticles(4)).filter((other) => other.id !== article.id).slice(0, 3);

  return (
    <>
      <article className="mx-auto mt-8 max-w-3xl">
        <header>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-slate-400">
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={14} aria-hidden />
              {article.readingMinutes} min de lecture
            </span>
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">{article.title}</h1>
        </header>
        {article.coverUrl && <ArticleCover coverUrl={article.coverUrl} className="mt-8 max-h-112 rounded-3xl" />}
        {/* contentHtml is sanitized server-side when the article is saved. */}
        <div className="prose-hero mt-8 text-base sm:text-lg" dangerouslySetInnerHTML={{ __html: article.contentHtml }} />
        <footer className="mt-12 border-t border-white/10 pt-6 text-sm text-slate-400">Publié par l&apos;équipe Spider Sense.</footer>
      </article>

      {others.length > 0 && (
        <section aria-labelledby="autres-articles" className="mt-16">
          <h2 id="autres-articles" className="text-xl font-bold text-white">
            À lire aussi
          </h2>
          <ul className="mt-6 grid gap-5 md:grid-cols-3">
            {others.map((other) => (
              <li key={other.id} className="flex">
                <ArticleCard article={other} className="w-full" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ArticleSkeleton() {
  return (
    <Loading label="Chargement de l'article…" className="mx-auto mt-8 max-w-3xl space-y-4">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-10 w-4/5" />
      <div className="space-y-3 pt-6">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-4" />
        ))}
        <Skeleton className="h-4 w-2/3" />
      </div>
    </Loading>
  );
}
