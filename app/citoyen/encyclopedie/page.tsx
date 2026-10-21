import type { Metadata } from "next";
import { Suspense } from "react";
import { Encyclopedia } from "@/components/citizen/encyclopedia";
import { MobilePage, MobilePageSkeleton } from "@/components/citizen/mobile-page";
import { requireUser } from "@/lib/server/auth";
import { listHeroesWithContact } from "@/lib/server/services/heroes";
import { listVillains } from "@/lib/server/services/villains";

export const metadata: Metadata = { title: "Encyclopédie" };

export default function EncyclopediaPage({ searchParams }: PageProps<"/citoyen/encyclopedie">) {
  return (
    <Suspense fallback={<MobilePageSkeleton title="Encyclopédie" />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/citoyen/encyclopedie">, "searchParams">) {
  await requireUser();
  const [heroes, villains, { onglet }] = await Promise.all([listHeroesWithContact(), listVillains(), searchParams]);
  return (
    <MobilePage title="Encyclopédie">
      <Encyclopedia heroes={heroes} villains={villains} initialTab={onglet === "vilains" ? "vilains" : "heros"} />
      <p className="mt-6 text-center text-xs text-slate-500">
        Fiches alimentées par les signalements des citoyens et la modération (sources :{" "}
        <a href="https://www.marvel.com/characters" target="_blank" rel="noopener noreferrer" className="underline">encyclopédie Marvel</a>).
      </p>
    </MobilePage>
  );
}
