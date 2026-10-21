import { Inbox, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, Td, Th, Tr } from "@/components/admin/data-table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/panel";
import { Stars } from "@/components/ui/stars";
import { formatNumber, pluralize } from "@/lib/format";
import { HERO_AVAILABILITY } from "@/lib/labels";
import { requireStaff } from "@/lib/server/auth";
import { getModerationCounters } from "@/lib/server/services/admin/overview";
import { listHeroesWithContact } from "@/lib/server/services/heroes";

export const metadata: Metadata = { title: "Super-héros" };

export default async function AdminHeroesPage() {
  await requireStaff();
  const [heroes, counters] = await Promise.all([listHeroesWithContact(), getModerationCounters()]);

  return (
    <>
      <PageHeader
        eyebrow="Annuaire"
        title="Super-héros"
        description={`${pluralize(heroes.length, "super-héros validé", "super-héros validés")}, avec leurs coordonnées pour les joindre en urgence.`}
        actions={
          <LinkButton href="/admin/demandes#heros" variant="secondary">
            <Inbox className="size-4" aria-hidden />
            Demandes en attente
            {counters.pendingHeroes > 0 && <Badge tone="warning">{formatNumber(counters.pendingHeroes)}</Badge>}
          </LinkButton>
        }
      />

      {heroes.length === 0 ? (
        <EmptyState icon={<Shield className="size-8" />} title="Aucun super-héros validé" />
      ) : (
        <DataTable caption="Liste des super-héros" minWidth={920}>
          <thead>
            <tr>
              <Th>Super-héros</Th>
              <Th>Email</Th>
              <Th>Téléphone</Th>
              <Th>Disponibilité</Th>
              <Th>Interventions</Th>
              <Th>Réputation</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {heroes.map((hero) => (
              <Tr key={hero.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <Avatar src={hero.avatarUrl} label={hero.alias} size={34} />
                    <div>
                      <Link href={`/admin/utilisateurs/${hero.id}`} className="font-semibold text-slate-100 hover:text-sky-200">
                        {hero.alias}
                      </Link>
                      <p className="text-xs text-slate-400">
                        {hero.firstName} {hero.lastName}
                      </p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <a href={`mailto:${hero.email}`} className="break-all hover:text-sky-200">
                    {hero.email}
                  </a>
                </Td>
                <Td className="whitespace-nowrap">
                  <a href={`tel:${hero.phone.replace(/[^+\d]/g, "")}`} className="hover:text-sky-200">
                    {hero.phone}
                  </a>
                </Td>
                <Td>
                  {hero.activeIncidentId ? (
                    <Link href={`/admin/incidents/${hero.activeIncidentId}`} className="rounded-full">
                      <Badge tone={HERO_AVAILABILITY.BUSY.tone} dot>
                        {HERO_AVAILABILITY.BUSY.label}
                      </Badge>
                    </Link>
                  ) : (
                    <Badge tone={HERO_AVAILABILITY[hero.availability].tone} dot>
                      {HERO_AVAILABILITY[hero.availability].label}
                    </Badge>
                  )}
                </Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {formatNumber(hero.interventions)}
                  <span className="text-xs text-slate-500"> · {formatNumber(hero.succeeded)} réussies</span>
                </Td>
                <Td>
                  <Stars value={hero.rating} count={hero.ratingCount} />
                </Td>
                <Td className="text-right">
                  <LinkButton href={`/admin/utilisateurs/${hero.id}`} variant="ghost" size="sm">
                    Détails
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
