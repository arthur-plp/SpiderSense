import { Activity, Film, HeartPulse, LifeBuoy, Lock, Siren, Skull, Star, Swords, Users } from "lucide-react";
import type { Metadata } from "next";
import { ShareBars } from "@/components/charts/share-bars";
import { WeeklyColumns } from "@/components/charts/weekly-columns";
import { HeroPage } from "@/components/hero/hero-page";
import { PageHeader, Panel, SectionTitle, StatTile } from "@/components/ui/panel";
import { formatNumber, formatRating } from "@/lib/format";
import { requireHero } from "@/lib/server/auth";
import { getGlobalStats, getHeroStats } from "@/lib/server/services/stats";

export const metadata: Metadata = { title: "Statistiques" };

export default async function HeroStatsPage() {
  const hero = await requireHero();
  const [global, personal] = await Promise.all([getGlobalStats(), getHeroStats(hero.id)]);
  const successRate = personal.interventions > 0 ? Math.round((personal.succeeded / personal.interventions) * 100) : null;

  return (
    <HeroPage>
      <PageHeader eyebrow="Espace professionnel" title="Statistiques" description="Vos résultats personnels et la situation globale de la plateforme." />

      <SectionTitle>Mes statistiques</SectionTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Interventions" value={formatNumber(personal.interventions)} icon={<Siren className="size-4" />} hint={successRate !== null ? `${successRate} % de réussite` : "Aucune intervention"} />
        <StatTile label="Super-vilains mis en prison" value={formatNumber(personal.villainsImprisoned)} icon={<Lock className="size-4" />} />
        <StatTile label="Note des citoyens" value={`${formatRating(personal.rating)} / 5`} icon={<Star className="size-4" />} hint={`${personal.ratingCount} avis publiés`} />
        <StatTile label="Films dans lesquels vous apparaissez" value={formatNumber(personal.moviesCount)} icon={<Film className="size-4" />} />
        <StatTile label="Citoyens secourus" value={formatNumber(personal.citizensSaved)} icon={<LifeBuoy className="size-4" />} hint="Personnes impliquées dans vos interventions réussies" />
        <StatTile
          label="Pire ennemi"
          value={personal.worstEnemy?.alias ?? "—"}
          icon={<Swords className="size-4" />}
          hint={personal.worstEnemy ? `${personal.worstEnemy.encounters} affrontement(s)` : "Aucun vilain identifié"}
        />
      </div>

      <Panel className="mt-4 p-5">
        <SectionTitle>Mes interventions, 8 dernières semaines</SectionTitle>
        <WeeklyColumns weeks={personal.weekly} />
      </Panel>

      <SectionTitle className="mt-10">Statistiques globales</SectionTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Interventions au total" value={formatNumber(global.interventions)} icon={<Activity className="size-4" />} hint={`${global.activeIncidents} incident(s) actif(s)`} />
        <StatTile label="Citoyens secourus" value={formatNumber(global.citizensSaved)} icon={<Users className="size-4" />} hint="Selon le résultat des interventions" />
        <StatTile label="Citoyens en danger secourus" value={formatNumber(global.endangeredCitizensSaved)} icon={<HeartPulse className="size-4" />} hint="Meurtres, enlèvements, prises d'otages…" />
        <StatTile label="Super-vilains identifiés" value={formatNumber(global.villainsIdentified)} icon={<Skull className="size-4" />} />
        <StatTile label="Super-vilains en prison" value={formatNumber(global.villainsImprisoned)} icon={<Lock className="size-4" />} />
        <StatTile label="Taux de réussite" value={global.interventions > 0 ? `${Math.round((global.succeeded / Math.max(1, global.succeeded + global.failed)) * 100)} %` : "—"} icon={<Star className="size-4" />} hint={`${global.succeeded} réussies · ${global.failed} échouées`} />
      </div>

      <Panel className="mt-4 p-5">
        <SectionTitle>Répartition des incidents par type</SectionTitle>
        <ShareBars shares={global.typeShares} />
      </Panel>
    </HeroPage>
  );
}
