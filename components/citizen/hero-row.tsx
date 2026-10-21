import { Film, LifeBuoy, MapPin, Siren } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { Stars } from "@/components/ui/stars";
import { formatDistance } from "@/lib/geo";
import { HERO_AVAILABILITY, type HeroAvailability } from "@/lib/labels";
import type { HeroDto } from "@/lib/server/services/heroes";

/** Status dot on the avatar. */
const AVAILABILITY_DOT: Record<HeroAvailability, string> = {
  AVAILABLE: "bg-emerald-400",
  BUSY: "bg-sky-400",
  OFF_DUTY: "bg-slate-500",
};

/** Hero card of the citizen bottom sheet: identity, powers, availability, distance, stats. */
export function HeroRow({ hero, distance }: { hero: HeroDto; distance: number | null }) {
  const availability = HERO_AVAILABILITY[hero.availability];
  return (
    <Link
      href={`/citoyen/encyclopedie/heros/${hero.id}`}
      className={cn("glass flex gap-3 rounded-2xl p-3 transition active:scale-[0.99]", hero.availability === "OFF_DUTY" && "opacity-70")}
    >
      <span className="relative h-fit">
        <Avatar src={hero.avatarUrl} label={hero.alias} size={52} />
        <span className={cn("absolute bottom-0.5 right-0.5 size-3 rounded-full ring-2 ring-ink-900", AVAILABILITY_DOT[hero.availability])} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate font-semibold text-white">{hero.alias}</span>
            <span className="block truncate text-xs text-slate-400">
              {hero.firstName} {hero.lastName}
            </span>
          </span>
          {distance !== null && (
            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold text-sky-100">
              <MapPin className="size-3" aria-hidden />
              {formatDistance(distance)}
            </span>
          )}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={availability.tone} dot>
            {availability.label}
          </Badge>
          {hero.powers.slice(0, 2).map((power) => (
            <span key={power} className="rounded-full bg-white/6 px-2 py-0.5 text-[10px] text-slate-300">
              {power}
            </span>
          ))}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
          <Stars value={hero.rating} count={hero.ratingCount} size={11} />
          <span className="flex items-center gap-1">
            <Siren className="size-3" aria-hidden />
            {hero.interventions} interventions
          </span>
          <span className="flex items-center gap-1">
            <LifeBuoy className="size-3" aria-hidden />
            {hero.citizensSaved} secourus
          </span>
          <span className="flex items-center gap-1">
            <Film className="size-3" aria-hidden />
            {hero.moviesCount}
          </span>
        </span>
      </span>
    </Link>
  );
}
