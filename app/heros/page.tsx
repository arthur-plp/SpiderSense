import type { Metadata } from "next";
import { Suspense } from "react";
import { OperationsCenter } from "@/components/hero/operations-center";
import { requireHero } from "@/lib/server/auth";
import { getHero, listHeroes } from "@/lib/server/services/heroes";
import { listHeroBoardIncidents } from "@/lib/server/services/incidents";
import { listVillainOptions } from "@/lib/server/services/villains";

export const metadata: Metadata = { title: "Opérations" };

export default function HeroOperationsPage({ searchParams }: PageProps<"/heros">) {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <Operations searchParams={searchParams} />
    </Suspense>
  );
}

async function Operations({ searchParams }: Pick<PageProps<"/heros">, "searchParams">) {
  const user = await requireHero();
  const [incidents, heroes, villains, me, params] = await Promise.all([
    listHeroBoardIncidents(),
    listHeroes(),
    listVillainOptions(),
    getHero(user.id),
    searchParams,
  ]);
  const focus = typeof params.incident === "string" ? params.incident : null;
  return (
    <OperationsCenter
      hero={{
        id: user.id,
        alias: user.hero?.alias ?? user.firstName,
        position: me?.latitude != null && me.longitude != null ? { lat: me.latitude, lng: me.longitude } : null,
      }}
      initialIncidents={incidents}
      initialHeroes={heroes}
      villains={villains}
      initialSelectedId={focus && incidents.some((incident) => incident.id === focus) ? focus : null}
    />
  );
}

function MapSkeleton() {
  return (
    <div className="relative h-dvh overflow-hidden bg-[radial-gradient(80%_60%_at_60%_40%,#0b1a33,#04060d)]">
      <div className="glass absolute bottom-4 left-4 top-24 w-[440px] animate-pulse rounded-3xl" />
      <p className="absolute left-1/2 top-1/2 -translate-x-1/2 text-sm text-slate-500">Chargement de la carte…</p>
    </div>
  );
}
