import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/site/container";
import { CardGridSkeleton, Skeleton } from "@/components/site/skeleton";
import { MovieLibrary } from "@/components/movies/movie-library";
import { PageHeader } from "@/components/ui/panel";
import { listLibrary } from "@/lib/server/services/movies";

export const metadata: Metadata = {
  title: "Vidéothèque",
  description: "Les films dans lesquels apparaissent les super-héros de Heros-SOS, avec leur fiche IMDb.",
};

export default function VideoLibraryPage() {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader
        eyebrow="Vidéothèque"
        title="Nos héros à l'écran"
        description="Les films où apparaissent les super-héros de la plateforme, validés par la modération. Filtrez par héros ou cherchez un titre."
      />
      <Suspense
        fallback={
          <>
            <Skeleton className="h-11" />
            <CardGridSkeleton count={8} grid="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4" className="mt-12" cardClassName="h-80" />
          </>
        }
      >
        <LibraryContent />
      </Suspense>
    </Container>
  );
}

async function LibraryContent() {
  const movies = await listLibrary();
  return <MovieLibrary movies={movies} />;
}
