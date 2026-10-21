import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArticleForm } from "@/components/admin/article-form";
import { PageHeader, Panel } from "@/components/ui/panel";
import { saveArticleAction } from "@/lib/actions/admin/articles";
import { requireStaff } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Nouvel article" };

export default async function NewArticlePage() {
  await requireStaff();
  return (
    <>
      <Link href="/admin/blog" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="size-4" aria-hidden />
        Tous les articles
      </Link>
      <PageHeader
        eyebrow="Blog"
        title="Nouvel article"
        description="Enregistrez-le en brouillon pour le relire, ou publiez-le directement sur le site."
      />
      <Panel className="max-w-4xl p-5 sm:p-6">
        <ArticleForm action={saveArticleAction.bind(null, null)} />
      </Panel>
    </>
  );
}
