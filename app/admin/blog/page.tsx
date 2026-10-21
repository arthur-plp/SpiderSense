import { Newspaper, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, Td, Th, Tr } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { formatShortDate, pluralize } from "@/lib/format";
import { requireStaff } from "@/lib/server/auth";
import { listAdminArticles } from "@/lib/server/services/admin/articles";

export const metadata: Metadata = { title: "Blog" };

export default async function AdminBlogPage() {
  await requireStaff();
  const articles = await listAdminArticles();
  const published = articles.filter((article) => article.status === "PUBLISHED").length;

  return (
    <>
      <PageHeader
        eyebrow="Communication"
        title="Blog"
        description={`${pluralize(published, "article publié", "articles publiés")} et ${pluralize(articles.length - published, "brouillon")}.`}
        actions={
          <LinkButton href="/admin/blog/nouveau">
            <Plus className="size-4" aria-hidden />
            Nouvel article
          </LinkButton>
        }
      />

      {articles.length === 0 ? (
        <EmptyState icon={<Newspaper className="size-8" />} title="Aucun article">
          Rédigez le premier article du blog.
        </EmptyState>
      ) : (
        <DataTable caption="Articles du blog" minWidth={760}>
          <thead>
            <tr>
              <Th>Article</Th>
              <Th>Statut</Th>
              <Th>Auteur</Th>
              <Th>Publication</Th>
              <Th>Modifié</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <Tr key={article.id}>
                <Td className="max-w-md">
                  <Link href={`/admin/blog/${article.id}`} className="font-semibold text-slate-100 hover:text-sky-200">
                    {article.title}
                  </Link>
                  <p className="truncate font-mono text-xs text-slate-500">/blog/{article.slug}</p>
                </Td>
                <Td>
                  <Badge tone={article.status === "PUBLISHED" ? "success" : "neutral"} dot>
                    {article.status === "PUBLISHED" ? "Publié" : "Brouillon"}
                  </Badge>
                </Td>
                <Td>{article.authorName ?? <span className="text-slate-500">—</span>}</Td>
                <Td className="whitespace-nowrap text-xs text-slate-400">
                  {article.publishedAt ? formatShortDate(article.publishedAt) : "—"}
                </Td>
                <Td className="whitespace-nowrap text-xs text-slate-400">{formatShortDate(article.updatedAt)}</Td>
                <Td className="text-right">
                  <LinkButton href={`/admin/blog/${article.id}`} variant="ghost" size="sm">
                    Modifier
                  </LinkButton>
                </Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}
