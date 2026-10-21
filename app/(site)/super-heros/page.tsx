import { BookUser, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/site/container";
import { HeroCard } from "@/components/site/hero-card";
import { CardGridSkeleton, Skeleton } from "@/components/site/skeleton";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { pluralize } from "@/lib/format";
import { listHeroes } from "@/lib/server/services/heroes";

export const metadata: Metadata = {
  title: "Super-héros",
  description: "Les super-héros validés par Spider Sense : pouvoirs, disponibilité, interventions et note donnée par les citoyens.",
};

export default function HeroesPage() {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader
        eyebrow="Annuaire"
        title="Les super-héros de Spider Sense"
        description="Tous les héros validés par notre équipe de modération, avec leurs pouvoirs, leurs interventions et la note que leur donnent les citoyens."
      />
      <Suspense
        fallback={
          <>
            <Skeleton className="mb-6 h-5 w-64" />
            <CardGridSkeleton count={6} />
          </>
        }
      >
        <HeroDirectory />
      </Suspense>

      <aside className="glass mt-12 flex flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand ring-1 ring-brand/30">
          <BookUser size={22} aria-hidden />
        </span>
        <div className="flex-1">
          <h2 className="font-semibold text-white">Besoin de contacter un héros ?</h2>
          <p className="mt-1 text-sm text-slate-400">
            Leurs coordonnées sont réservées aux membres connectés, dans l&apos;encyclopédie des super-héros de l&apos;application citoyenne.
          </p>
        </div>
        <LinkButton href="/citoyen" variant="secondary">
          Ouvrir l&apos;application
        </LinkButton>
      </aside>
    </Container>
  );
}

async function HeroDirectory() {
  const heroes = await listHeroes();
  if (heroes.length === 0) {
    return (
      <EmptyState icon={<ShieldCheck size={28} aria-hidden />} title="Aucun super-héros validé pour le moment">
        Les héros apparaîtront ici dès que la modération aura validé leur profil.
      </EmptyState>
    );
  }
  const available = heroes.filter((hero) => hero.availability === "AVAILABLE").length;
  return (
    <section aria-labelledby="liste-heros">
      <h2 id="liste-heros" className="sr-only">
        Liste des super-héros
      </h2>
      <p className="mb-6 text-sm text-slate-400">
        {pluralize(heroes.length, "super-héros", "super-héros")}, dont{" "}
        <strong className="font-semibold text-emerald-300">{pluralize(available, "disponible")}</strong> en ce moment.
      </p>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {heroes.map((hero) => (
          <li key={hero.id} className="flex">
            <HeroCard hero={hero} showBio className="w-full" />
          </li>
        ))}
      </ul>
    </section>
  );
}
