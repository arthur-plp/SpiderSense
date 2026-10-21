import type { Metadata } from "next";
import { Suspense } from "react";
import { MobilePage, MobilePageSkeleton } from "@/components/citizen/mobile-page";
import { MovieLibrary } from "@/components/movies/movie-library";
import { requireUser } from "@/lib/server/auth";
import { listLibrary } from "@/lib/server/services/movies";

export const metadata: Metadata = { title: "Vidéothèque" };

export default function CitizenLibraryPage() {
  return (
    <Suspense fallback={<MobilePageSkeleton title="Vidéothèque" />}>
      <Library />
    </Suspense>
  );
}

async function Library() {
  await requireUser();
  const movies = await listLibrary();
  return (
    <MobilePage title="Vidéothèque">
      <p className="mb-4 text-sm text-slate-400">Les films dans lesquels apparaissent nos super-héros, d&apos;après IMDb.</p>
      <MovieLibrary movies={movies} compact />
    </MobilePage>
  );
}
