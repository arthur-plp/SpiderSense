import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/admin/action-button";
import { ArticleForm } from "@/components/admin/article-form";
import { DescriptionList } from "@/components/admin/description-list";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Panel, SectionTitle } from "@/components/ui/panel";
import { formatDateTime } from "@/lib/format";
import { requireStaff } from "@/lib/server/auth";
import { getAdminArticle } from "@/lib/server/services/admin/articles";

export const metadata: Metadata = { title: "Modifier l'article" };

export default async function AdminArticlePage({ params }: PageProps<"/admin/blog/[id]">) {
  await requireStaff();
  const { id } = await params;
  const article = await getAdminArticle(id);
  if (!article) notFound();
  const published = article.status === "PUBLISHED";

  return (
    <>
      <Link href="/admin/blog" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="size-4" aria-hidden />
        Tous les articles
      </Link>
      <PageHeader
        eyebrow="Blog"
        title={article.title}
        description={
          <span className="mt-1 inline-flex flex-wrap items-center gap-2">
            <Badge tone={published ? "success" : "neutral"} dot>
              {published ? "Publié" : "Brouillon"}
            </Badge>
            {published && (
              <a
                href={`/blog/${article.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sky-300 hover:underline"
              >
                Voir sur le site
                <ExternalLink className="size-3.5" aria-hidden />
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            )}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <Panel className="p-5 sm:p-6">
          <ArticleForm
            endpoint={{ method: "PUT", path: `/api/admin/articles/${article.id}` }}
            article={{
              title: article.title,
              slug: article.slug,
              coverUrl: article.coverUrl,
              contentHtml: article.contentHtml,
              status: article.status,
            }}
          />
        </Panel>
        <aside className="flex flex-col gap-6">
          <Panel className="p-5">
            <SectionTitle>Informations</SectionTitle>
            <DescriptionList
              className="sm:grid-cols-1"
              items={[
                { label: "Auteur", value: article.authorName },
                { label: "Créé le", value: formatDateTime(article.createdAt) },
                { label: "Publié le", value: article.publishedAt && formatDateTime(article.publishedAt) },
                { label: "Dernière modification", value: formatDateTime(article.updatedAt) },
              ]}
            />
          </Panel>
          {article.coverUrl && (
            <Panel className="overflow-hidden">
              {/* Cover URLs are typed by moderators and can point to any host. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.coverUrl} alt="Image de couverture" className="aspect-video w-full object-cover" />
            </Panel>
          )}
          <Panel className="border-rose-400/20 p-5">
            <SectionTitle>Supprimer</SectionTitle>
            <p className="mb-3 text-sm text-slate-400">
              {published ? "L'article disparaît immédiatement du site." : "Le brouillon est définitivement supprimé."}
            </p>
            <ActionButton
              endpoint={{ method: "DELETE", path: `/api/admin/articles/${article.id}`, redirectTo: "/admin/blog" }}
              variant="danger"
              confirm={{
                title: "Supprimer cet article ?",
                description: `« ${article.title} » sera définitivement supprimé.`,
                confirmLabel: "Supprimer",
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Supprimer l&apos;article
            </ActionButton>
          </Panel>
        </aside>
      </div>
    </>
  );
}
