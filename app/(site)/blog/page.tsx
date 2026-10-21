import { Newspaper } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ArticleCard } from "@/components/site/article-card";
import { Container } from "@/components/site/container";
import { CardGridSkeleton } from "@/components/site/skeleton";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { listPublishedArticles } from "@/lib/server/services/articles";

export const metadata: Metadata = {
  title: "Blog",
  description: "Actualités de la plateforme, bilans des interventions et conseils de sécurité.",
};

export default function BlogPage() {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader
        eyebrow="Le blog"
        title="Actualités et conseils"
        description="Les nouvelles de la plateforme, les bilans de nos super-héros et nos conseils pour bien réagir face à un super-vilain."
      />
      <Suspense fallback={<CardGridSkeleton count={6} cardClassName="h-80" />}>
        <ArticleList />
      </Suspense>
    </Container>
  );
}

async function ArticleList() {
  const articles = await listPublishedArticles();
  if (articles.length === 0) {
    return (
      <EmptyState icon={<Newspaper size={28} aria-hidden />} title="Aucun article publié pour le moment">
        Revenez bientôt : la rédaction prépare ses premiers articles.
      </EmptyState>
    );
  }
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <li key={article.id} className="flex">
          <ArticleCard article={article} className="w-full" />
        </li>
      ))}
    </ul>
  );
}
