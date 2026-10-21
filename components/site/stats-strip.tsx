import { Lock, type LucideIcon, ShieldCheck, Users } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { Loading, Skeleton } from "./skeleton";

type Stat = { label: string; value: number; icon: LucideIcon; tone: string };

/** Platform-wide counters (5.8.1) shown on the home page. */
export function StatsStrip({ interventions, citizensSaved, villainsImprisoned }: { interventions: number; citizensSaved: number; villainsImprisoned: number }) {
  const stats: Stat[] = [
    { label: "Interventions de super-héros", value: interventions, icon: ShieldCheck, tone: "bg-sky-400/15 text-sky-200 ring-sky-300/25" },
    { label: "Citoyens secourus", value: citizensSaved, icon: Users, tone: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/25" },
    { label: "Vilains sous les verrous", value: villainsImprisoned, icon: Lock, tone: "bg-brand/15 text-amber-200 ring-brand/30" },
  ];
  return (
    <dl className="glass grid divide-y divide-white/10 rounded-3xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {stats.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className="flex items-center gap-4 p-5 sm:p-6">
          <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ring-1 ${tone}`}>
            <Icon size={22} aria-hidden />
          </span>
          <div className="flex flex-col-reverse">
            <dt className="text-sm text-slate-400">{label}</dt>
            <dd className="text-3xl font-black tabular-nums tracking-tight text-white">{formatNumber(value)}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

export function StatsStripSkeleton() {
  return (
    <Loading label="Chargement des statistiques…" className="glass grid divide-y divide-white/10 rounded-3xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex items-center gap-4 p-5 sm:p-6">
          <Skeleton className="size-12" rounded="rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
      ))}
    </Loading>
  );
}
