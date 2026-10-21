import { Film, LifeBuoy, Lock, Mail, Phone, Siren } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MobilePage, MobilePageSkeleton } from "@/components/citizen/mobile-page";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GlassCard, Panel, SectionTitle } from "@/components/ui/panel";
import { RelativeTime } from "@/components/ui/relative-time";
import { Stars } from "@/components/ui/stars";
import { formatDate, formatNumber } from "@/lib/format";
import { HERO_AVAILABILITY } from "@/lib/labels";
import { requireUser } from "@/lib/server/auth";
import { getHero } from "@/lib/server/services/heroes";
import { listHeroMovies } from "@/lib/server/services/movies";
import { listHeroReviews } from "@/lib/server/services/reviews";

export const metadata: Metadata = { title: "Fiche super-héros" };

export default function HeroSheetPage({ params }: PageProps<"/citoyen/encyclopedie/heros/[id]">) {
  return (
    <Suspense fallback={<MobilePageSkeleton title="Super-héros" />}>
      <HeroSheet params={params} />
    </Suspense>
  );
}

async function HeroSheet({ params }: Pick<PageProps<"/citoyen/encyclopedie/heros/[id]">, "params">) {
  await requireUser();
  const { id } = await params;
  const hero = await getHero(id);
  if (!hero) notFound();
  const [reviews, movies] = await Promise.all([listHeroReviews(hero.id), listHeroMovies(hero.id, true)]);
  const availability = HERO_AVAILABILITY[hero.availability];

  return (
    <MobilePage title={hero.alias} back="/citoyen/encyclopedie">
      <GlassCard className="flex flex-col items-center p-5 text-center">
        <Avatar src={hero.avatarUrl} label={hero.alias} size={92} />
        <h2 className="mt-3 text-2xl font-bold text-white">{hero.alias}</h2>
        <p className="text-sm text-slate-400">
          {hero.firstName} {hero.lastName}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Badge tone={availability.tone} dot>
            {availability.label}
          </Badge>
          <Stars value={hero.rating} count={hero.ratingCount} />
        </div>
        {hero.bio && <p className="mt-3 text-sm text-slate-300">{hero.bio}</p>}
        <ul className="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Pouvoirs">
          {hero.powers.map((power) => (
            <li key={power} className="rounded-full bg-sky-400/10 px-2.5 py-1 text-xs font-medium text-sky-100 ring-1 ring-inset ring-sky-300/25">
              {power}
            </li>
          ))}
        </ul>
      </GlassCard>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {[
          { label: "Interventions", value: hero.interventions, icon: Siren },
          { label: "Citoyens secourus", value: hero.citizensSaved, icon: LifeBuoy },
          { label: "Vilains en prison", value: hero.villainsImprisoned, icon: Lock },
          { label: "Films", value: hero.moviesCount, icon: Film },
        ].map(({ label, value, icon: Icon }) => (
          <Panel key={label} className="p-3">
            <Icon className="size-4 text-sky-300/80" aria-hidden />
            <p className="mt-1.5 text-xl font-bold text-white">{formatNumber(value)}</p>
            <p className="text-[11px] text-slate-400">{label}</p>
          </Panel>
        ))}
      </div>

      <Panel className="mt-4 p-4 text-sm">
        <SectionTitle>Contact</SectionTitle>
        <a href={`mailto:${hero.email}`} className="flex items-center gap-2 py-1 text-slate-200">
          <Mail className="size-4 text-sky-300/80" aria-hidden /> {hero.email}
        </a>
        <a href={`tel:${hero.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 py-1 text-slate-200">
          <Phone className="size-4 text-sky-300/80" aria-hidden /> {hero.phone}
        </a>
        <p className="mt-2 text-xs text-slate-500">Super-héros vérifié depuis le {formatDate(hero.memberSince)}.</p>
      </Panel>

      {movies.length > 0 && (
        <section className="mt-6">
          <SectionTitle>Filmographie</SectionTitle>
          <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {movies.map((movie) => (
              <li key={movie.movieId} className="w-24 shrink-0 snap-start">
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-ink-700">
                  {movie.posterUrl && <Image src={movie.posterUrl} alt={`Affiche de ${movie.title}`} fill sizes="96px" className="object-cover" />}
                </div>
                <p className="mt-1.5 line-clamp-2 text-[11px] font-medium text-slate-300">{movie.title}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <SectionTitle>Avis des citoyens ({reviews.length})</SectionTitle>
        <ul className="flex flex-col gap-2.5">
          {reviews.slice(0, 10).map((review) => (
            <li key={review.id}>
              <Panel className="p-3.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Stars value={review.rating} size={12} />
                  <span className="text-xs text-slate-500">
                    {review.citizenName} · <RelativeTime value={review.createdAt} />
                  </span>
                </div>
                {review.comment && <p className="mt-1.5 text-slate-300">« {review.comment} »</p>}
                {review.heroReply && (
                  <p className="mt-2 rounded-lg border-l-2 border-sky-400/60 bg-sky-400/5 px-2.5 py-1.5 text-xs text-slate-300">
                    <span className="font-semibold text-sky-300">{hero.alias} :</span> {review.heroReply}
                  </p>
                )}
              </Panel>
            </li>
          ))}
          {reviews.length === 0 && <p className="text-sm text-slate-500">Pas encore d&apos;avis.</p>}
        </ul>
      </section>
    </MobilePage>
  );
}
