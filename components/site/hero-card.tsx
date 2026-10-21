import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { Stars } from "@/components/ui/stars";
import { formatNumber } from "@/lib/format";
import { HERO_AVAILABILITY } from "@/lib/labels";
import type { HeroDto } from "@/lib/server/services/heroes";

const MAX_POWERS = 4;

/** Public hero profile: no contact details (reserved to signed-in users). */
export function HeroCard({ hero, showBio = false, className }: { hero: HeroDto; showBio?: boolean; className?: string }) {
  const availability = HERO_AVAILABILITY[hero.availability];
  const extraPowers = hero.powers.length - MAX_POWERS;
  return (
    <article id={`heros-${hero.id}`} className={cn("glass flex scroll-mt-24 flex-col rounded-3xl p-5", className)}>
      <header className="flex items-start gap-3.5">
        <Avatar src={hero.avatarUrl} label={hero.alias} size={56} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-bold text-white">{hero.alias}</h3>
          <Stars value={hero.rating} count={hero.ratingCount} className="mt-0.5" />
        </div>
        <Badge tone={availability.tone} dot className="mt-1">
          {availability.label}
        </Badge>
      </header>

      {showBio && hero.bio && <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-300">{hero.bio}</p>}

      {hero.powers.length > 0 && (
        <ul aria-label="Super-pouvoirs" className="mt-4 flex flex-wrap gap-1.5">
          {hero.powers.slice(0, MAX_POWERS).map((power) => (
            <li key={power} className="rounded-full bg-white/6 px-2.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-inset ring-white/10">
              {power}
            </li>
          ))}
          {extraPowers > 0 && (
            <li className="rounded-full px-2 py-1 text-xs text-slate-400">
              +{extraPowers}
              <span className="sr-only"> autres pouvoirs</span>
            </li>
          )}
        </ul>
      )}

      <div className="mt-auto pt-5">
        <dl className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center">
          <HeroStat label="Interventions" value={hero.interventions} />
          <HeroStat label="Citoyens secourus" value={hero.citizensSaved} />
          <HeroStat label="Vilains arrêtés" value={hero.villainsImprisoned} />
        </dl>
      </div>
    </article>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-[11px] leading-tight text-slate-400">{label}</dt>
      <dd className="text-lg font-bold tabular-nums text-white">{formatNumber(value)}</dd>
    </div>
  );
}
